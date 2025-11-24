import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Campaign {
  id: string;
  user_id: string;
  name: string;
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'stopped' | 'completed' | 'failed';
  instance_id: string;
  contact_list_id: string;
  message_text: string;
  media_url?: string;
  media_caption?: string;
  scheduled_at?: string;
  min_delay: number;
  max_delay: number;
  link_preview: boolean;
  mentions_every_one: boolean;
  created_at: string;
}

interface Instance {
  id: string;
  user_id: string;
  name: string;
  url: string;
  api_key: string;
  instance_name: string;
}

interface Contact {
  id: string;
  contact_list_id: string;
  phone_number: string;
  first_name?: string;
  full_name?: string;
  email?: string;
  custom_data?: Record<string, string>;
}

// Helper function for random delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const supabaseClient = createClient(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        persistSession: false,
      },
    }
  );

  let campaignId: string | undefined;
  let userId: string | undefined;

  const addLog = async (campaignId: string, userId: string, event_type: string, message: string, metadata?: Record<string, unknown>) => {
    await supabaseClient
      .from('campaign_logs')
      .insert({
        user_id: userId,
        campaign_id: campaignId === 'unknown' ? null : campaignId,
        event_type,
        message,
        metadata,
      });
  };

  try {
    const body = await req.json();
    campaignId = body.campaignId;
    userId = body.userId;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'ID do usuário é obrigatório' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (!campaignId) {
      await addLog('unknown', userId, 'error', 'ID da campanha é obrigatório para a função send-campaign.');
      return new Response(JSON.stringify({ error: 'ID da campanha é obrigatório' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    await addLog(campaignId, userId, 'campaign_received', 'Solicitação recebida para processar a campanha.');

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (!profile?.is_admin) {
      const { data: grants } = await supabaseClient
        .from('campaign_logs')
        .select('metadata')
        .eq('user_id', userId)
        .eq('event_type', 'quota_granted');
      let grantedTotal = 0;
      for (const g of grants || []) {
        const amt = (g as any)?.metadata?.amount;
        if (typeof amt === 'number' && amt > 0) grantedTotal += amt;
      }
      const { count: usedCount } = await supabaseClient
        .from('campaign_logs')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .in('event_type', ['message_sent', 'proposal_sent'])
        .limit(1);
      const remaining = grantedTotal - (usedCount ?? 0);
      if (remaining <= 10 && remaining > 0) {
        await addLog(campaignId, userId, 'quota_low', `Saldo baixo: faltam ${remaining} mensagens.`, { remaining });
      }
      if ((usedCount ?? 0) >= grantedTotal) {
        await addLog(campaignId, userId, 'quota_exceeded', 'Limite de mensagens atingido.');
        await supabaseClient.from('profiles').update({ account_status: 'paused' }).eq('id', userId);
        return new Response(JSON.stringify({ error: 'Limite de mensagens atingido. Solicite mais pacotes.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        });
      }
    }

    // 1. Buscar detalhes da campanha
    const { data: campaignData, error: campaignError } = await supabaseClient
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single();

    if (campaignError || !campaignData) {
      await addLog(campaignId, userId, 'error', `Campanha não encontrada ou erro ao buscar detalhes: ${campaignError?.message || 'Não encontrada'}`);
      return new Response(JSON.stringify({ error: 'Campanha não encontrada ou erro ao buscar detalhes' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    const campaign = campaignData as Campaign;

    // Atualizar status para 'running' quando aplicável
    if (campaign.status === 'scheduled' || campaign.status === 'draft') {
      await supabaseClient
        .from('campaigns')
        .update({ status: 'running', updated_at: new Date().toISOString() })
        .eq('id', campaignId);
      await addLog(campaignId, userId, 'campaign_status_update', 'Status da campanha definido para "em execução".');
    } else if (campaign.status === 'stopped' || campaign.status === 'failed' || campaign.status === 'completed') {
      await addLog(campaignId, userId, 'campaign_aborted', `A campanha "${campaign.name}" já está no status "${campaign.status}". Abortando processamento.`);
      return new Response(JSON.stringify({ message: `Campanha ${campaignId} já está em ${campaign.status}.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 2. Buscar instância
    const { data: instanceData, error: instanceError } = await supabaseClient
      .from('instances')
      .select('*')
      .eq('id', campaign.instance_id)
      .eq('user_id', userId) // Ensure the instance belongs to the user
      .single();

    if (instanceError || !instanceData) {
      await supabaseClient.from('campaigns').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', campaignId);
      await addLog(campaignId, userId, 'campaign_status_update', `Status da campanha definido para "falha". Instância não encontrada: ${instanceError?.message || 'Não encontrada'}`);
      return new Response(JSON.stringify({ error: 'Instância não encontrada ou erro ao buscar detalhes' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    const instance = instanceData as Instance;

    // 3. Buscar contatos
    const { data: listOwner } = await supabaseClient
      .from('contact_lists')
      .select('id')
      .eq('id', campaign.contact_list_id)
      .eq('user_id', userId)
      .single();
      
    if (!listOwner) {
      await supabaseClient.from('campaigns').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', campaignId);
      await addLog(campaignId, userId, 'campaign_status_update', `Status da campanha definido para "falha". Lista de contatos não pertence ao usuário.`);
      return new Response(JSON.stringify({ error: 'Lista de contatos não pertence ao usuário' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    const { data: contactsData, error: contactsError } = await supabaseClient
      .from('contacts')
      .select('*')
      .eq('contact_list_id', campaign.contact_list_id);

    if (contactsError || !contactsData || contactsData.length === 0) {
      await supabaseClient.from('campaigns').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', campaignId);
      await addLog(campaignId, userId, 'campaign_status_update', `Status da campanha definido para "falha". Nenhum contato encontrado para a lista: ${contactsError?.message || 'Não encontrado'}`);
      return new Response(JSON.stringify({ error: 'Nenhum contato encontrado para esta lista ou erro ao buscar detalhes' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    const contacts = contactsData as Contact[];

    await addLog(campaignId, userId, 'campaign_started', `Campanha "${campaign.name}" iniciada. Enviando para ${contacts.length} contatos.`);

    // 4. Envio
    for (const contact of contacts) {
      const { data: currentCampaignStatus } = await supabaseClient
        .from('campaigns')
        .select('status')
        .eq('id', campaignId)
        .single();

      if (currentCampaignStatus?.status !== 'running' && currentCampaignStatus?.status !== 'scheduled') {
        await addLog(campaignId, userId, 'campaign_stopped', `Campanha "${campaign.name}" parada pelo usuário ou com status alterado. Interrompendo envios.`);
        if (currentCampaignStatus?.status === 'running' || currentCampaignStatus?.status === 'scheduled') {
          await supabaseClient.from('campaigns').update({ status: 'stopped', updated_at: new Date().toISOString() }).eq('id', campaignId);
        }
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
          const value = contact.custom_data[key] || '';
          personalizedMessage = personalizedMessage.replace(placeholder, value);
          personalizedCaption = personalizedCaption.replace(placeholder, value);
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

      // Texto
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
            await addLog(campaignId, userId, 'message_failed', `Falha ao enviar mensagem de texto para ${phoneNumber}.`, { contact_id: contact.id, phone_number: phoneNumber, error_response: errorBody, type: 'text' });
          }
        } catch (fetchError: unknown) {
          const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
          await addLog(campaignId, userId, 'message_error', `Erro de rede ao enviar mensagem de texto para ${phoneNumber}: ${errorMessage}`, { contact_id: contact.id, phone_number: phoneNumber, error_details: errorMessage, type: 'text' });
        }
      }

      // Mídia
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
            await addLog(campaignId, userId, 'message_failed', `Falha ao enviar mensagem de mídia para ${phoneNumber}.`, { contact_id: contact.id, phone_number: phoneNumber, error_response: errorBody, type: 'media' });
          }
        } catch (fetchError: unknown) {
          const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
          await addLog(campaignId, userId, 'message_error', `Erro de rede ao enviar mensagem de mídia para ${phoneNumber}: ${errorMessage}`, { contact_id: contact.id, phone_number: phoneNumber, error_details: errorMessage, type: 'media' });
        }
      }

      const delay = Math.floor(Math.random() * (campaign.max_delay - campaign.min_delay + 1) + campaign.min_delay) * 1000;
      await sleep(delay);
    }

    const { data: finalCampaignStatus } = await supabaseClient
      .from('campaigns')
      .select('status')
      .eq('id', campaignId)
      .single();

    if (finalCampaignStatus?.status !== 'stopped' && finalCampaignStatus?.status !== 'failed') {
      await supabaseClient
        .from('campaigns')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', campaignId);
      await addLog(campaignId, userId, 'campaign_completed', `Campanha "${campaign.name}" concluída com sucesso.`);
    } else if (finalCampaignStatus?.status === 'stopped') {
      await addLog(campaignId, userId, 'campaign_completed_after_stop', `Campanha "${campaign.name}" finalizada após ser parada.`);
    }

    return new Response(JSON.stringify({ message: `Campanha ${campaignId} processada com sucesso.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (campaignId && userId) {
      await supabaseClient
        .from('campaigns')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', campaignId);
      await addLog(campaignId, userId, 'campaign_failed', `Campanha "${campaignId}" falhou devido a um erro inesperado: ${errorMessage}`, { error_details: errorMessage });
    }
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});