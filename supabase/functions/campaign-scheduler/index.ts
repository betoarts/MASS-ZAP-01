// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    // @ts-ignore
    Deno.env.get('SUPABASE_URL') ?? '',
    // @ts-ignore
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        persistSession: false,
      },
    }
  );

  const addLog = async (campaignId: string, userId: string, event_type: string, message: string, metadata?: Record<string, unknown>) => {
    await supabaseClient
      .from('campaign_logs')
      .insert({
        user_id: userId,
        campaign_id: campaignId,
        event_type,
        message,
        metadata,
      });
  };

  try {
    const { data: campaignsToRun, error: fetchError } = await supabaseClient
      .from('campaigns')
      .select('id, name, user_id, scheduled_at')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString());

    if (fetchError) {
      return new Response(JSON.stringify({ error: `Erro ao buscar campanhas agendadas: ${fetchError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    if (!campaignsToRun || campaignsToRun.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhuma campanha para executar agora.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    for (const campaignInfo of campaignsToRun) {
      if (!campaignInfo.user_id) {
        continue;
      }

      const campaignId = campaignInfo.id;
      const userId = campaignInfo.user_id;

      try {
        // Update status to running
        const { error: updateError } = await supabaseClient
          .from('campaigns')
          .update({ status: 'running', updated_at: new Date().toISOString() })
          .eq('id', campaignId);

        if (updateError) {
          await addLog(campaignId, userId, 'scheduler_error', `Falha ao atualizar status para "em execução": ${updateError.message}`);
          continue;
        }

        await addLog(campaignId, userId, 'scheduler_started', `Status da campanha "${campaignInfo.name}" atualizado para "em execução" pelo agendador.`);
        await addLog(campaignId, userId, 'campaign_received', 'Processando campanha...');

        // Fetch campaign details
        const { data: campaign, error: campaignError } = await supabaseClient
          .from('campaigns')
          .select('*')
          .eq('id', campaignId)
          .single();

        if (campaignError || !campaign) {
          await addLog(campaignId, userId, 'error', `Campanha não encontrada: ${campaignError?.message || 'Não encontrada'}`);
          await supabaseClient.from('campaigns').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', campaignId);
          continue;
        }

        // Fetch instance
        const { data: instance, error: instanceError } = await supabaseClient
          .from('instances')
          .select('*')
          .eq('id', campaign.instance_id)
          .eq('user_id', userId)
          .single();

        if (instanceError || !instance) {
          await supabaseClient.from('campaigns').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', campaignId);
          await addLog(campaignId, userId, 'error', `Instância não encontrada: ${instanceError?.message || 'Não encontrada'}`);
          continue;
        }

        // Fetch contacts
        const { data: contacts, error: contactsError } = await supabaseClient
          .from('contacts')
          .select('*')
          .eq('contact_list_id', campaign.contact_list_id);

        if (contactsError || !contacts || contacts.length === 0) {
          await supabaseClient.from('campaigns').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', campaignId);
          await addLog(campaignId, userId, 'error', `Nenhum contato encontrado: ${contactsError?.message || 'Lista vazia'}`);
          continue;
        }

        await addLog(campaignId, userId, 'campaign_started', `Campanha "${campaign.name}" iniciada. Enviando para ${contacts.length} contatos.`);

        // Send messages to contacts
        for (const contact of contacts) {
          const { data: currentStatus } = await supabaseClient
            .from('campaigns')
            .select('status')
            .eq('id', campaignId)
            .single();

          if (currentStatus?.status !== 'running' && currentStatus?.status !== 'scheduled') {
            await addLog(campaignId, userId, 'campaign_stopped', `Campanha parada. Interrompendo envios.`);
            break;
          }

          let personalizedMessage = campaign.message_text;
          let personalizedCaption = campaign.media_caption || '';

          const firstName = contact.first_name || contact.full_name?.split(' ')[0] || 'Amigo';
          const fullName = contact.full_name || contact.first_name || 'Amigo';

          personalizedMessage = personalizedMessage.replace(/{{primeiro_nome}}/g, firstName);
          personalizedMessage = personalizedMessage.replace(/{{nome_completo}}/g, fullName);
          personalizedCaption = personalizedCaption.replace(/{{primeiro_nome}}/g, firstName);
          personalizedCaption = personalizedCaption.replace(/{{nome_completo}}/g, fullName);

          if (contact.custom_data) {
            for (const key in contact.custom_data) {
              const placeholder = new RegExp(`{{${key}}}`, 'g');
              const value = (contact.custom_data as Record<string, unknown>)[key] || '';
              personalizedMessage = personalizedMessage.replace(placeholder, String(value));
              personalizedCaption = personalizedCaption.replace(placeholder, String(value));
            }
          }

          const phoneNumber = contact.phone_number;
          const evolutionApiUrl = `${instance.url}/message/sendText/${instance.instance_name}`;
          const evolutionMediaApiUrl = `${instance.url}/message/sendMedia/${instance.instance_name}`;

          const headers = {
            'Content-Type': 'application/json',
            'apikey': instance.api_key,
          };

          let messageSentSuccessfully = false;

          // Send text message
          if (personalizedMessage) {
            try {
              const textPayload = {
                number: phoneNumber,
                text: personalizedMessage,
                delay: 1200,
                linkPreview: campaign.link_preview,
                mentionsEveryOne: campaign.mentions_every_one,
              };
              const res = await fetch(evolutionApiUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(textPayload),
              });
              if (res.ok) {
                await addLog(campaignId, userId, 'message_sent', `Mensagem de texto enviada para ${phoneNumber}.`, { contact_id: contact.id, phone_number: phoneNumber, type: 'text' });
                messageSentSuccessfully = true;
              } else {
                const errorBody = await res.json();
                await addLog(campaignId, userId, 'message_failed', `Falha ao enviar texto para ${phoneNumber}.`, { contact_id: contact.id, phone_number: phoneNumber, error_response: errorBody, type: 'text' });
              }
            } catch (fetchError) {
              const errorMsg = fetchError instanceof Error ? fetchError.message : 'Unknown error';
              await addLog(campaignId, userId, 'message_error', `Erro ao enviar texto para ${phoneNumber}: ${errorMsg}`, { contact_id: contact.id, phone_number: phoneNumber, type: 'text' });
            }
          }

          // Send media message
          if (campaign.media_url) {
            if (personalizedMessage && messageSentSuccessfully) {
              await sleep(2000);
            }

            try {
              const mediaPayload = {
                number: phoneNumber,
                mediatype: campaign.media_url.includes('.mp4') ? 'video' : campaign.media_url.includes('.pdf') ? 'document' : 'image',
                media: campaign.media_url,
                caption: personalizedCaption,
                delay: 1200,
                linkPreview: campaign.link_preview,
                mentionsEveryOne: campaign.mentions_every_one,
              };
              const res = await fetch(evolutionMediaApiUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(mediaPayload),
              });
              if (res.ok) {
                await addLog(campaignId, userId, 'message_sent', `Mensagem de mídia enviada para ${phoneNumber}.`, { contact_id: contact.id, phone_number: phoneNumber, type: 'media' });
              } else {
                const errorBody = await res.json();
                await addLog(campaignId, userId, 'message_failed', `Falha ao enviar mídia para ${phoneNumber}.`, { contact_id: contact.id, phone_number: phoneNumber, error_response: errorBody, type: 'media' });
              }
            } catch (fetchError) {
              const errorMsg = fetchError instanceof Error ? fetchError.message : 'Unknown error';
              await addLog(campaignId, userId, 'message_error', `Erro ao enviar mídia para ${phoneNumber}: ${errorMsg}`, { contact_id: contact.id, phone_number: phoneNumber, type: 'media' });
            }
          }

          const delay = Math.floor(Math.random() * (campaign.max_delay - campaign.min_delay + 1) + campaign.min_delay) * 1000;
          await sleep(delay);
        }

        // Check final status and mark as completed
        const { data: finalStatus } = await supabaseClient
          .from('campaigns')
          .select('status')
          .eq('id', campaignId)
          .single();

        if (finalStatus?.status !== 'stopped' && finalStatus?.status !== 'failed') {
          await supabaseClient
            .from('campaigns')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', campaignId);
          await addLog(campaignId, userId, 'campaign_completed', `Campanha "${campaign.name}" concluída com sucesso.`);
        } else if (finalStatus?.status === 'stopped') {
          await addLog(campaignId, userId, 'campaign_completed_after_stop', `Campanha finalizada após ser parada.`);
        }

      } catch (campaignProcessError) {
        const errorMsg = campaignProcessError instanceof Error ? campaignProcessError.message : 'Unknown error';
        await addLog(campaignId, userId, 'scheduler_error', `Erro inesperado ao processar campanha: ${errorMsg}`, { error_details: errorMsg });
        await supabaseClient.from('campaigns').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', campaignId);
      }
    }

    return new Response(JSON.stringify({ message: `Agendador finalizado. Processadas ${campaignsToRun.length} campanha(s).` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: `Erro global no agendador: ${errorMsg}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});