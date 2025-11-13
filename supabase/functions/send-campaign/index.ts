// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function for random delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Initialize Supabase client for the Edge Function with service role key
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

  let campaignId: string | undefined;
  let userId: string | undefined;

  // Function to add a log entry
  const addLog = async (campaignId: string, userId: string, event_type: string, message: string, metadata?: Record<string, any>) => {
    await supabaseClient
      .from('campaign_logs')
      .insert({
        user_id: userId,
        campaign_id: campaignId,
        event_type: event_type,
        message: message,
        metadata: metadata,
      });
  };

  try {
    const body = await req.json();
    campaignId = body.campaignId;
    userId = body.userId; // Get userId directly from the request body

    if (!userId) {
      console.error('User ID is missing in the request body.');
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (!campaignId) {
      await addLog(campaignId || 'unknown', userId, 'error', 'Campaign ID is required for send-campaign function.');
      return new Response(JSON.stringify({ error: 'Campaign ID is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log(`Received request to send campaign: ${campaignId} by user: ${userId}`);
    await addLog(campaignId, userId, 'campaign_received', `Request received to process campaign.`);

    // 1. Fetch campaign details
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error('Error fetching campaign:', campaignError?.message || 'Campaign not found');
      await addLog(campaignId, userId, 'error', `Campaign not found or error fetching details: ${campaignError?.message || 'Not found'}`);
      return new Response(JSON.stringify({ error: 'Campaign not found or error fetching details' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Update campaign status to 'running' if it was 'scheduled' or 'draft'
    if (campaign.status === 'scheduled' || campaign.status === 'draft') {
      await supabaseClient
        .from('campaigns')
        .update({ status: 'running', updated_at: new Date().toISOString() })
        .eq('id', campaignId);
      await addLog(campaignId, userId, 'campaign_status_update', `Campaign status set to 'running'.`);
    } else if (campaign.status === 'stopped' || campaign.status === 'failed' || campaign.status === 'completed') {
      // If campaign is already stopped, failed, or completed, do not proceed
      await addLog(campaignId, userId, 'campaign_aborted', `Campaign "${campaign.name}" is already in status "${campaign.status}". Aborting processing.`);
      return new Response(JSON.stringify({ message: `Campaign ${campaignId} is already ${campaign.status}.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }


    // 2. Fetch associated instance details
    const { data: instance, error: instanceError } = await supabaseClient
      .from('instances')
      .select('*')
      .eq('id', campaign.instance_id)
      .single();

    if (instanceError || !instance) {
      console.error('Error fetching instance:', instanceError?.message || 'Instance not found');
      await supabaseClient.from('campaigns').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', campaignId);
      await addLog(campaignId, userId, 'campaign_status_update', `Campaign status set to 'failed'. Instance not found: ${instanceError?.message || 'Not found'}`);
      return new Response(JSON.stringify({ error: 'Instance not found or error fetching details' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // 3. Fetch associated contact list and contacts
    const { data: contacts, error: contactsError } = await supabaseClient
      .from('contacts')
      .select('*')
      .eq('contact_list_id', campaign.contact_list_id);

    if (contactsError || !contacts || contacts.length === 0) {
      console.error('Error fetching contacts:', contactsError?.message || 'No contacts found for this list');
      await supabaseClient.from('campaigns').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', campaignId);
      await addLog(campaignId, userId, 'campaign_status_update', `Campaign status set to 'failed'. No contacts found for list: ${contactsError?.message || 'Not found'}`);
      return new Response(JSON.stringify({ error: 'No contacts found for this list or error fetching details' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    console.log(`Sending campaign ${campaign.name} to ${contacts.length} contacts using instance ${instance.name}`);
    await addLog(campaignId, userId, 'campaign_started', `Campaign "${campaign.name}" started. Sending to ${contacts.length} contacts.`);

    // 4. Iterate through contacts, personalize messages, apply random delays.
    for (const contact of contacts) {
      // Check if campaign status is still 'running' before sending each message
      const { data: currentCampaignStatus, error: statusError } = await supabaseClient
        .from('campaigns')
        .select('status')
        .eq('id', campaignId)
        .single();

      if (statusError || (currentCampaignStatus?.status !== 'running' && currentCampaignStatus?.status !== 'scheduled')) {
        console.log(`Campaign ${campaignId} stopped or paused. Aborting further messages.`);
        await addLog(campaignId, userId, 'campaign_stopped', `Campaign "${campaign.name}" stopped by user or changed status. Aborting further messages.`);
        // Update campaign status to 'stopped' if it was running/scheduled and now being aborted
        if (currentCampaignStatus?.status === 'running' || currentCampaignStatus?.status === 'scheduled') {
          await supabaseClient.from('campaigns').update({ status: 'stopped', updated_at: new Date().toISOString() }).eq('id', campaignId);
        }
        break; // Exit loop if campaign is no longer running
      }

      let personalizedMessage = campaign.message_text;
      let personalizedCaption = campaign.media_caption || '';

      // Basic personalization for message and caption
      const firstName = contact.first_name || contact.full_name?.split(' ')[0] || 'Amigo';
      const fullName = contact.full_name || contact.first_name || 'Amigo';

      personalizedMessage = personalizedMessage.replace(/{{primeiro_nome}}/g, firstName);
      personalizedMessage = personalizedMessage.replace(/{{nome_completo}}/g, fullName);
      personalizedCaption = personalizedCaption.replace(/{{primeiro_nome}}/g, firstName);
      personalizedCaption = personalizedCaption.replace(/{{nome_completo}}/g, fullName);

      // Add custom data personalization for message and caption
      if (contact.custom_data) {
        for (const key in contact.custom_data) {
          const placeholder = new RegExp(`{{${key}}}`, 'g');
          const value = contact.custom_data[key] || '';
          personalizedMessage = personalizedMessage.replace(placeholder, value);
          personalizedCaption = personalizedCaption.replace(placeholder, value);
        }
      }

      const phoneNumber = contact.phone_number; // Assuming phone_number is already in E.164 format or similar

      const evolutionApiUrl = `${instance.url}/message/sendText/${instance.instance_name}`;
      const evolutionMediaApiUrl = `${instance.url}/message/sendMedia/${instance.instance_name}`;

      const headers = {
        'Content-Type': 'application/json',
        'apikey': instance.api_key,
      };

      let messageSentSuccessfully = false;

      // --- Send Text Message ---
      if (personalizedMessage) {
        try {
          const textPayload = {
            number: phoneNumber,
            text: personalizedMessage,
            delay: 1200, // Fixed delay for Evolution API internal processing
            linkPreview: campaign.link_preview,
            mentionsEveryOne: campaign.mentions_every_one,
          };
          console.log(`Sending text to ${phoneNumber} for campaign ${campaignId}`);
          const res = await fetch(evolutionApiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(textPayload),
          });
          if (res.ok) {
            await addLog(campaignId, userId, 'message_sent', `Text message sent to ${phoneNumber}.`, { contact_id: contact.id, phone_number: phoneNumber, type: 'text' });
            messageSentSuccessfully = true;
          } else {
            const errorBody = await res.json();
            console.error(`Failed to send text message to ${phoneNumber}:`, errorBody);
            await addLog(campaignId, userId, 'message_failed', `Failed to send text message to ${phoneNumber}.`, { contact_id: contact.id, phone_number: phoneNumber, error_response: errorBody, type: 'text' });
          }
        } catch (fetchError: any) {
          console.error(`Network error sending text message to ${phoneNumber}:`, fetchError.message);
          await addLog(campaignId, userId, 'message_error', `Network error sending text message to ${phoneNumber}: ${fetchError.message}`, { contact_id: contact.id, phone_number: phoneNumber, error_details: fetchError.message, type: 'text' });
        }
      }

      // --- Send Media Message (if media_url exists) ---
      if (campaign.media_url) {
        // Add a small delay between text and media messages for the same contact
        if (personalizedMessage && messageSentSuccessfully) {
          console.log(`Waiting 2 seconds before sending media to ${phoneNumber}...`);
          await sleep(2000); // 2-second delay
        }

        try {
          const mediaPayload = {
            number: phoneNumber,
            mediatype: campaign.media_url.includes('.mp4') ? 'video' : campaign.media_url.includes('.pdf') ? 'document' : 'image', // Basic type detection
            media: campaign.media_url,
            caption: personalizedCaption,
            delay: 1200, // Fixed delay for Evolution API internal processing
            linkPreview: campaign.link_preview,
            mentionsEveryOne: campaign.mentions_every_one,
          };
          console.log(`Sending media to ${phoneNumber} for campaign ${campaignId}`);
          const res = await fetch(evolutionMediaApiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(mediaPayload),
          });
          if (res.ok) {
            await addLog(campaignId, userId, 'message_sent', `Media message sent to ${phoneNumber}.`, { contact_id: contact.id, phone_number: phoneNumber, type: 'media' });
          } else {
            const errorBody = await res.json();
            console.error(`Failed to send media message to ${phoneNumber}:`, errorBody);
            await addLog(campaignId, userId, 'message_failed', `Failed to send media message to ${phoneNumber}.`, { contact_id: contact.id, phone_number: phoneNumber, error_response: errorBody, type: 'media' });
          }
        } catch (fetchError: any) {
          console.error(`Network error sending media message to ${phoneNumber}:`, fetchError.message);
          await addLog(campaignId, userId, 'message_error', `Network error sending media message to ${phoneNumber}: ${fetchError.message}`, { contact_id: contact.id, phone_number: phoneNumber, error_details: fetchError.message, type: 'media' });
        }
      }

      // Apply random delay between messages to different contacts (anti-spam)
      const delay = Math.floor(Math.random() * (campaign.max_delay - campaign.min_delay + 1) + campaign.min_delay) * 1000;
      console.log(`Waiting for ${delay / 1000} seconds before next contact...`);
      await sleep(delay);
    }

    // After loop, check campaign status again to avoid overwriting a 'stopped' status set by user
    const { data: finalCampaignStatus, error: finalStatusError } = await supabaseClient
      .from('campaigns')
      .select('status')
      .eq('id', campaignId)
      .single();

    if (!finalStatusError && finalCampaignStatus?.status !== 'stopped' && finalCampaignStatus?.status !== 'failed') {
      // Only set to 'completed' if it wasn't stopped or failed during processing
      await supabaseClient
        .from('campaigns')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', campaignId);
      await addLog(campaignId, userId, 'campaign_completed', `Campaign "${campaign.name}" completed successfully.`);
    } else if (finalCampaignStatus?.status === 'stopped') {
      await addLog(campaignId, userId, 'campaign_completed_after_stop', `Campaign "${campaign.name}" finished processing after being stopped.`);
    }


    return new Response(JSON.stringify({ message: `Campaign ${campaignId} processed successfully.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Error processing campaign:', error.message);
    if (campaignId && userId) {
      await supabaseClient
        .from('campaigns')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', campaignId);
      await addLog(campaignId, userId, 'campaign_failed', `Campaign "${campaignId}" failed due to an unexpected error: ${error.message}`, { error_details: error.message });
    } else {
      console.error('Could not log campaign failure due to missing campaignId or userId.');
    }
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});