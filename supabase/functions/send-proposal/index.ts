// @ts-expect-error - Deno global types and remote imports
/// <reference types="https://deno.land/x/types@1.0.0/types.d.ts" />

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
// @ts-expect-error - Remote ES module import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    // @ts-expect-error - Deno.env is available in Deno runtime
    Deno.env.get('SUPABASE_URL') ?? '',
    // @ts-expect-error - Deno.env is available in Deno runtime
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
    const mediaType = body.mediaType as ("image" | "video" | "document" | undefined);
    const mimeType = body.mimeType as (string | undefined);
    const fileName = body.fileName as (string | undefined);
    const delayInput = body.delay as (number | undefined);
    const mentioned = body.mentioned as (string[] | undefined);
    const quoted = body.quoted as (Record<string, any> | undefined);
    const lowerMimetypeInput = body.mimetype as (string | undefined);
    
    // New fields for direct sending
    let phoneNumber = body.phone_number;
    let customerName = body.name;

    if (!userId || !instanceId || (!messageText && !mediaUrl)) {
      const missing: string[] = [];
      if (!userId) missing.push('userId');
      if (!instanceId) missing.push('instanceId');
      if (!messageText && !mediaUrl) missing.push('messageText|mediaUrl');
      await addLog(null, userId || 'unknown', 'error', `Parâmetros obrigatórios ausentes: ${missing.join(', ')}`, { body, missing });
      return new Response(JSON.stringify({ success: false, error: `Parâmetros obrigatórios ausentes: ${missing.join(', ')}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('is_admin, instance_count')
      .eq('id', userId)
      .single();
    if (!profile?.is_admin) {
      const grantedTotal = (profile?.instance_count as number | null) ?? 0;
      const { count: usedCount } = await supabaseClient
        .from('campaign_logs')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .in('event_type', ['message_sent', 'proposal_sent'])
        .limit(1);
      const remaining = grantedTotal - (usedCount ?? 0);
      if (remaining <= 10 && remaining > 0) {
        await addLog(null, userId, 'quota_low', `Saldo baixo: faltam ${remaining} mensagens.`, { remaining });
      }
      if (remaining <= 0) {
        await addLog(null, userId, 'quota_exceeded', 'Seu pacote de mensagens acabou. Entre em contato com suporte.');
        await supabaseClient.from('profiles').update({ account_status: 'paused' }).eq('id', userId);
        return new Response(JSON.stringify({ success: false, error: 'Seu pacote de mensagens acabou. Entre em contato com suporte.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        });
      }
    }
    // Cliente lookup if customerId is provided and valid
    let customer = null;
    if (customerId && customerId !== 'temp') {
      const { data: fetchedCustomer, error: customerError } = await supabaseClient
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (customerError || !fetchedCustomer) {
        await addLog(null, userId, 'error', `Cliente não encontrado ou erro ao buscar detalhes: ${customerError?.message || 'Não encontrado'}`, { customerId });
        return new Response(JSON.stringify({ success: false, error: 'Cliente não encontrado ou erro ao buscar detalhes.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        });
      }
      customer = fetchedCustomer;
      phoneNumber = customer.phone_number;
      customerName = customer.name;
    }

    const normalizePhone = (raw: string) => {
      const digits = String(raw || '').replace(/\D+/g, '');
      if (!digits) return raw;
      if (digits.startsWith('55')) return digits;
      if (raw?.startsWith('+')) return digits;
      if (digits.length === 10 || digits.length === 11) return `55${digits}`;
      return digits;
    };
    phoneNumber = normalizePhone(phoneNumber);

    if (!phoneNumber) {
       return new Response(JSON.stringify({ success: false, error: 'Número de telefone não fornecido.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
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
      return new Response(JSON.stringify({ success: false, error: 'Instância não encontrada ou erro ao buscar detalhes.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    let personalizedMessage = messageText;
    let personalizedCaption = mediaCaption || '';

    const firstName = customerName?.split(' ')[0] || 'Cliente';
    const fullName = customerName || 'Cliente';

    personalizedMessage = personalizedMessage.replace(/{{primeiro_nome}}/g, firstName);
    personalizedMessage = personalizedMessage.replace(/{{nome_completo}}/g, fullName);
    personalizedCaption = personalizedCaption.replace(/{{primeiro_nome}}/g, firstName);
    personalizedCaption = personalizedCaption.replace(/{{nome_completo}}/g, fullName);

    const evolutionApiUrl = `${instance.url}/message/sendText/${instance.instance_name}`;
    const evolutionMediaApiUrl = `${instance.url}/message/sendMedia/${instance.instance_name}`;

    const headers = {
      'Content-Type': 'application/json',
      'apikey': instance.api_key,
    };

    let messageSentSuccessfully = false;
    let textError: unknown = null;
    let mediaError: unknown = null;

    // Texto
    if (personalizedMessage) {
      try {
        const textPayload = {
          number: phoneNumber,
          text: personalizedMessage,
          delay: typeof delayInput === 'number' ? delayInput : 1200,
          linkPreview,
          mentionsEveryOne,
        };
        const res = await fetch(evolutionApiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(textPayload),
        });
        if (res.ok) {
          await addLog(null, userId, 'proposal_sent', `Proposta de texto enviada para ${phoneNumber}.`, { customer_id: customer?.id || null, phone_number: phoneNumber, type: 'text', instance_id: instanceId });
          messageSentSuccessfully = true;
        } else {
          const errorBody = await res.json();
          textError = errorBody;
          await addLog(null, userId, 'proposal_failed', `Falha ao enviar proposta de texto para ${phoneNumber}.`, { customer_id: customer?.id || null, phone_number: phoneNumber, error_response: errorBody, type: 'text', instance_id: instanceId });
        }
      } catch (fetchError: unknown) {
        textError = (fetchError as Error).message;
        await addLog(null, userId, 'proposal_error', `Erro de rede ao enviar proposta de texto para ${phoneNumber}: ${(fetchError as Error).message}`, { customer_id: customer?.id || null, phone_number: phoneNumber, error_details: (fetchError as Error).message, type: 'text', instance_id: instanceId });
      }
    }

    // Mídia
    if (mediaUrl) {
      const detectMediaType = (url: string) => {
        const lower = url.toLowerCase();
        if (lower.endsWith('.mp4') || lower.includes('video')) return 'video';
        if (lower.endsWith('.pdf')) return 'document';
        if (lower.endsWith('.doc') || lower.endsWith('.docx')) return 'document';
        if (lower.endsWith('.xls') || lower.endsWith('.xlsx')) return 'document';
        if (lower.endsWith('.ppt') || lower.endsWith('.pptx')) return 'document';
        return 'image';
      };
      if (personalizedMessage && messageSentSuccessfully) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      try {
        let typeDetected = mediaType || detectMediaType(mediaUrl);
        const rawUrl = String(mediaUrl || '');
        const mediaUrlClean = rawUrl.trim().replace(/^`+|`+$/g, '').replace(/^"+|"+$/g, '');
        if (/[`"]/.test(rawUrl)) {
          await addLog(null, userId, 'warning', 'URL de mídia continha crases/aspas; limpa antes do envio.', { original_url: rawUrl, cleaned_url: mediaUrlClean });
        }
        const lowerUrl = mediaUrlClean.toLowerCase();
        // Derive filename from URL if missing
        let finalFileName = fileName;
        if (!finalFileName) {
          const urlPart = mediaUrlClean.split('/').pop()?.split('?')[0] || '';
          finalFileName = urlPart || (typeDetected === 'document' ? 'documento.pdf' : typeDetected === 'video' ? 'video.mp4' : 'image.png');
        }
        // Derive mimetype if missing
        let finalMime = mimeType || lowerMimetypeInput;
        if (!finalMime) {
          if (lowerUrl.endsWith('.pdf')) finalMime = 'application/pdf';
          else if (lowerUrl.endsWith('.png')) finalMime = 'image/png';
          else if (lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg')) finalMime = 'image/jpeg';
          else if (lowerUrl.endsWith('.gif')) finalMime = 'image/gif';
          else if (lowerUrl.endsWith('.mp4')) finalMime = 'video/mp4';
          else if (typeDetected === 'document') finalMime = 'application/pdf';
          else if (typeDetected === 'video') finalMime = 'video/mp4';
          else finalMime = 'image/png';
        }
        // Enforce document when file/mime indicates PDF
        if (finalMime === 'application/pdf' || (finalFileName || '').toLowerCase().endsWith('.pdf')) {
          typeDetected = 'document';
        }
        // Ensure .pdf extension for document type
        if (typeDetected === 'document' && !(finalFileName || '').toLowerCase().endsWith('.pdf')) {
          finalFileName = `${finalFileName || 'proposal'}.pdf`;
        }
        const effectiveCaption = (personalizedCaption || '').trim() || (typeDetected === 'document' ? 'Proposta' : typeDetected === 'video' ? 'Vídeo' : 'Imagem');
        const mediaPayload: Record<string, any> = {
          number: phoneNumber,
          mediatype: typeDetected,
          mimetype: finalMime,
          fileName: finalFileName,
          media: mediaUrlClean,
          caption: effectiveCaption,
          delay: typeof delayInput === 'number' ? delayInput : 1200,
          linkPreview,
          mentionsEveryOne,
        };

        // Sanitize filename
        if (mediaPayload.fileName) {
          const nameParts = mediaPayload.fileName.split('.');
          const ext = nameParts.pop();
          const name = nameParts.join('.');
          const safeName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]/g, "_");
          mediaPayload.fileName = `${safeName}.${ext}`;
        }
        
        // Force document type if PDF
        if (mediaPayload.mimetype === 'application/pdf') {
            mediaPayload.mediatype = 'document';
        }

        await addLog(null, userId, 'debug_payload', `Sending media payload to Evolution`, { payload: mediaPayload });

        if (Array.isArray(mentioned) && mentioned.length > 0) mediaPayload.mentioned = mentioned;
        if (quoted && typeof quoted === 'object') mediaPayload.quoted = quoted;
        const res = await fetch(evolutionMediaApiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(mediaPayload),
        });
        if (res.ok) {
          await addLog(null, userId, 'proposal_sent', `Proposta com mídia enviada para ${phoneNumber}.`, { customer_id: customer?.id || null, phone_number: phoneNumber, type: 'media', instance_id: instanceId });
        } else {
          const errorBody1 = await res.text();
          mediaError = errorBody1;
          await addLog(null, userId, 'proposal_failed', `Falha ao enviar proposta com mídia (URL) para ${phoneNumber}.`, { customer_id: customer?.id || null, phone_number: phoneNumber, error_response: errorBody1, type: 'media', instance_id: instanceId, attempt: 'url', payload_snapshot: mediaPayload });
          // Fallback: tentar enviar em base64 caso URL pública falhe
          const getBase64 = async (url: string) => {
            const r = await fetch(url);
            if (!r.ok) throw new Error('Falha ao baixar mídia para base64');
            const buf = await r.arrayBuffer();
            const bytes = new Uint8Array(buf);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            // @ts-ignore
            return btoa(binary);
          };
          try {
            const base64Media = await getBase64(mediaUrlClean);
            const mediaPayloadBase64 = { 
              ...mediaPayload, 
              media: `data:${finalMime};base64,${base64Media}`,
              mediatype: 'document',
              mimetype: 'application/pdf',
            };
            const res2 = await fetch(evolutionMediaApiUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify(mediaPayloadBase64),
            });
            if (res2.ok) {
              await addLog(null, userId, 'proposal_sent', `Proposta com mídia (base64) enviada para ${phoneNumber}.`, { customer_id: customer?.id || null, phone_number: phoneNumber, type: 'media', instance_id: instanceId, fallback: 'base64' });
            } else {
              const errorBody2 = await res2.text();
              mediaError = errorBody2;
              await addLog(null, userId, 'proposal_failed', `Falha ao enviar proposta com mídia (base64) para ${phoneNumber}.`, { customer_id: customer?.id || null, phone_number: phoneNumber, error_response: errorBody2, type: 'media', instance_id: instanceId, attempt: 'base64', payload_snapshot: mediaPayloadBase64 });
            }
          } catch (fbErr) {
            mediaError = (fbErr as Error).message;
            await addLog(null, userId, 'proposal_error', `Erro no fallback base64 ao enviar mídia: ${(fbErr as Error).message}`, { customer_id: customer?.id || null, phone_number: phoneNumber, error_details: (fbErr as Error).message, type: 'media', instance_id: instanceId });
          }
        }
      } catch (fetchError: unknown) {
        mediaError = (fetchError as Error).message;
        await addLog(null, userId, 'proposal_error', `Erro de rede ao enviar proposta com mídia para ${phoneNumber}: ${(fetchError as Error).message}`, { customer_id: customer?.id || null, phone_number: phoneNumber, error_details: (fetchError as Error).message, type: 'media', instance_id: instanceId });
      }
    }

    if (textError || mediaError) {
      const onlyTextFailed = !!textError && !mediaError;
      const onlyMediaFailed = !!mediaError && !textError;
      const bothFailed = !!textError && !!mediaError;

      if (bothFailed) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Falha ao enviar proposta.',
          details: { text: textError, media: mediaError }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      const warning = onlyTextFailed
        ? 'Texto não foi enviado, mídia enviada com sucesso.'
        : 'Mídia não foi enviada, texto enviado com sucesso.';

      return new Response(JSON.stringify({
        success: true,
        warning,
        details: { text: textError, media: mediaError }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ success: true, message: `Proposta enviada para o cliente ${customerId || phoneNumber} com sucesso.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: unknown) {
    if (userId) {
      await addLog(null, userId, 'proposal_failed_global', `Falha ao enviar proposta devido a erro inesperado: ${(error as Error).message}`, { error_details: (error as Error).message });
    }
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});