// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

  let userId: string | undefined;
  let customerId: string | undefined;
  let instanceId: string | undefined;

  const addLog = async (campaignId: string | null, userId: string, event_type: string, message: string, metadata?: Record<string, any>) => {
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
    const body = await req.json();
    userId = body.userId;
    customerId = body.customerId;
    instanceId = body.instanceId;
    const messageText = body.messageText;
    const mediaUrl = body.mediaUrl;
    const mediaCaption = body.mediaCaption;
    const linkPreview = body.linkPreview;
    const mentionsEveryOne = body.mentionsEveryOne;

    if (!userId || !customerId || !instanceId || !messageText) {
      await addLog(null, userId || 'unknown', 'error', 'Parâmetros obrigatórios ausentes para envio de proposta.', { body });
      return new Response(JSON.stringify({ error: 'Parâmetros obrigatórios ausentes.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Cliente
    const { data: customer, error: customerError } = await supabaseClient
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      await addLog(null, userId, 'error', `Cliente não encontrado ou erro ao buscar detalhes: ${customerError?.message || 'Não encontrado'}`, { customerId });
      return new Response(JSON.stringify({ error: 'Cliente não encontrado ou erro ao buscar detalhes.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Instância
    const { data: instance, error: instanceError } = await supabaseClient
      .from('instances')
      .select('*')
      .eq('id', instanceId)
      .eq('user_id', userId) // Ensure the instance belongs to the user
      .single();

    if (instanceError || !instance) {
      await addLog(null, userId, 'error', `Instância não encontrada ou erro ao buscar detalhes: ${instanceError?.message || 'Não encontrada'}`, { instanceId });
      return new Response(JSON.stringify({ error: 'Instância não encontrada ou erro ao buscar detalhes.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    let personalizedMessage = messageText;
    let personalizedCaption = mediaCaption || '';

    const firstName = customer.name?.split(' ')[0] || 'Cliente';
    const fullName = customer.name || 'Cliente';

    personalizedMessage = personalizedMessage.replace(/{{primeiro_nome}}/g, firstName);
    personalizedMessage = personalizedMessage.replace(/{{nome_completo}}/g, fullName);
    personalizedCaption = personalizedCaption.replace(/{{primeiro_nome}}/g, firstName);
    personalizedCaption = personalizedCaption.replace(/{{nome_completo}}/g, fullName);

    const phoneNumber = customer.phone_number;
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
          linkPreview,
          mentionsEveryOne,
        };
        const res = await fetch(evolutionApiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(textPayload),
        });
        if (res.ok) {
          await addLog(null, userId, 'proposal_sent', `Proposta de texto enviada para ${phoneNumber}.`, { customer_id: customer.id, phone_number: phoneNumber, type: 'text' });
          messageSentSuccessfully = true;
        } else {
          const errorBody = await res.json();
          await addLog(null, userId, 'proposal_failed', `Falha ao enviar proposta de texto para ${phoneNumber}.`, { customer_id: customer.id, phone_number: phoneNumber, error_response: errorBody, type: 'text' });
        }
      } catch (fetchError: any) {
        await addLog(null, userId, 'proposal_error', `Erro de rede ao enviar proposta de texto para ${phoneNumber}: ${fetchError.message}`, { customer_id: customer.id, phone_number: phoneNumber, error_details: fetchError.message, type: 'text' });
      }
    }

    // Mídia
    if (mediaUrl) {
      if (personalizedMessage && messageSentSuccessfully) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      try {
        const mediaPayload = {
          number: phoneNumber,
          mediatype: mediaUrl.includes('.mp4') ? 'video' : mediaUrl.includes('.pdf') ? 'document' : 'image',
          media: mediaUrl,
          caption: personalizedCaption,
          delay: 1200,
          linkPreview,
          mentionsEveryOne,
        };
        const res = await fetch(evolutionMediaApiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(mediaPayload),
        });
        if (res.ok) {
          await addLog(null, userId, 'proposal_sent', `Proposta com mídia enviada para ${phoneNumber}.`, { customer_id: customer.id, phone_number: phoneNumber, type: 'media' });
        } else {
          const errorBody = await res.json();
          await addLog(null, userId, 'proposal_failed', `Falha ao enviar proposta com mídia para ${phoneNumber}.`, { customer_id: customer.id, phone_number: phoneNumber, error_response: errorBody, type: 'media' });
        }
      } catch (fetchError: any) {
        await addLog(null, userId, 'proposal_error', `Erro de rede ao enviar proposta com mídia para ${phoneNumber}: ${fetchError.message}`, { customer_id: customer.id, phone_number: phoneNumber, error_details: fetchError.message, type: 'media' });
      }
    }

    return new Response(JSON.stringify({ message: `Proposta enviada para o cliente ${customerId} com sucesso.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    if (userId) {
      await addLog(null, userId, 'proposal_failed_global', `Falha ao enviar proposta devido a erro inesperado: ${error.message}`, { error_details: error.message });
    }
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});