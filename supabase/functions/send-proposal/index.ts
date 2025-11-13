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
      .from('campaign_logs') // Reusing campaign_logs for simplicity, or create a new crm_logs table
      .insert({
        user_id: userId,
        campaign_id: campaignId, // Can be null for direct proposals
        event_type: event_type,
        message: message,
        metadata: metadata,
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
    const mentionsEveryOne = body.mentionsEveryOne; // Likely not applicable for single client, but can be passed

    if (!userId || !customerId || !instanceId || !messageText) {
      await addLog(null, userId || 'unknown', 'error', 'Missing required parameters for sending proposal.', { body });
      return new Response(JSON.stringify({ error: 'Missing required parameters.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Fetch customer details
    const { data: customer, error: customerError } = await supabaseClient
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      await addLog(null, userId, 'error', `Customer not found or error fetching details: ${customerError?.message || 'Not found'}`, { customerId });
      return new Response(JSON.stringify({ error: 'Customer not found or error fetching details.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Fetch instance details
    const { data: instance, error: instanceError } = await supabaseClient
      .from('instances')
      .select('*')
      .eq('id', instanceId)
      .single();

    if (instanceError || !instance) {
      await addLog(null, userId, 'error', `Instance not found or error fetching details: ${instanceError?.message || 'Not found'}`, { instanceId });
      return new Response(JSON.stringify({ error: 'Instance not found or error fetching details.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    let personalizedMessage = messageText;
    let personalizedCaption = mediaCaption || '';

    // Basic personalization (similar to campaign-scheduler)
    const firstName = customer.name?.split(' ')[0] || 'Cliente';
    const fullName = customer.name || 'Cliente';

    personalizedMessage = personalizedMessage.replace(/{{primeiro_nome}}/g, firstName);
    personalizedMessage = personalizedMessage.replace(/{{nome_completo}}/g, fullName);
    personalizedCaption = personalizedCaption.replace(/{{primeiro_nome}}/g, firstName);
    personalizedCaption = personalizedCaption.replace(/{{nome_completo}}/g, fullName);

    // Add custom data personalization if needed (e.g., from customer.notes or a new custom_data column)
    // For now, assuming basic name personalization.

    const phoneNumber = customer.phone_number;
    const evolutionApiUrl = `${instance.url}/message/sendText/${instance.instance_name}`;
    const evolutionMediaApiUrl = `${instance.url}/message/sendMedia/${instance.instance_name}`;

    const headers = {
      'Content-Type': 'application/json',
      'apikey': instance.api_key,
    };

    let messageSentSuccessfully = false;

    // Send Text Message
    if (personalizedMessage) {
      try {
        const textPayload = {
          number: phoneNumber,
          text: personalizedMessage,
          delay: 1200,
          linkPreview: linkPreview,
          mentionsEveryOne: mentionsEveryOne,
        };
        const res = await fetch(evolutionApiUrl, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(textPayload),
        });
        if (res.ok) {
          await addLog(null, userId, 'proposal_sent', `Text proposal sent to ${phoneNumber}.`, { customer_id: customer.id, phone_number: phoneNumber, type: 'text' });
          messageSentSuccessfully = true;
        } else {
          const errorBody = await res.json();
          await addLog(null, userId, 'proposal_failed', `Failed to send text proposal to ${phoneNumber}.`, { customer_id: customer.id, phone_number: phoneNumber, error_response: errorBody, type: 'text' });
        }
      } catch (fetchError: any) {
        await addLog(null, userId, 'proposal_error', `Network error sending text proposal to ${phoneNumber}: ${fetchError.message}`, { customer_id: customer.id, phone_number: phoneNumber, error_details: fetchError.message, type: 'text' });
      }
    }

    // Send Media Message (if media_url exists)
    if (mediaUrl) {
      if (personalizedMessage && messageSentSuccessfully) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay
      }

      try {
        const mediaPayload = {
          number: phoneNumber,
          mediatype: mediaUrl.includes('.mp4') ? 'video' : mediaUrl.includes('.pdf') ? 'document' : 'image',
          media: mediaUrl,
          caption: personalizedCaption,
          delay: 1200,
          linkPreview: linkPreview,
          mentionsEveryOne: mentionsEveryOne,
        };
        const res = await fetch(evolutionMediaApiUrl, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(mediaPayload),
        });
        if (res.ok) {
          await addLog(null, userId, 'proposal_sent', `Media proposal sent to ${phoneNumber}.`, { customer_id: customer.id, phone_number: phoneNumber, type: 'media' });
        } else {
          const errorBody = await res.json();
          await addLog(null, userId, 'proposal_failed', `Failed to send media proposal to ${phoneNumber}.`, { customer_id: customer.id, phone_number: phoneNumber, error_response: errorBody, type: 'media' });
        }
      } catch (fetchError: any) {
        await addLog(null, userId, 'proposal_error', `Network error sending media proposal to ${phoneNumber}: ${fetchError.message}`, { customer_id: customer.id, phone_number: phoneNumber, error_details: fetchError.message, type: 'media' });
      }
    }

    return new Response(JSON.stringify({ message: `Proposal sent to customer ${customerId} successfully.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Error processing send proposal:', error.message);
    if (userId) {
      await addLog(null, userId, 'proposal_failed_global', `Failed to send proposal due to unexpected error: ${error.message}`, { error_details: error.message });
    }
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});