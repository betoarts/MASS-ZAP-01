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

  // Initialize Supabase client with service role key to bypass RLS
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

  // Function to add a log entry (using the service role client)
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
    console.log('Campaign scheduler invoked.');

    // Fetch campaigns that are scheduled and whose scheduled_at time has passed
    const { data: campaignsToRun, error: fetchError } = await supabaseClient
      .from('campaigns')
      .select('id, name, user_id, scheduled_at')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString()); // scheduled_at <= now

    if (fetchError) {
      console.error('Error fetching scheduled campaigns:', fetchError.message);
      return new Response(JSON.stringify({ error: `Error fetching scheduled campaigns: ${fetchError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    if (!campaignsToRun || campaignsToRun.length === 0) {
      console.log('No campaigns to run at this time.');
      return new Response(JSON.stringify({ message: 'No campaigns to run.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`Found ${campaignsToRun.length} campaigns to run.`);

    for (const campaign of campaignsToRun) {
      if (!campaign.user_id) {
        console.error(`Skipping campaign ${campaign.id} ("${campaign.name}") because user_id is missing.`);
        // We cannot add a log to campaign_logs without a user_id, so we just log to console.
        continue; // Skip to the next campaign
      }

      try {
        // Update campaign status to 'running' before invoking send-campaign
        const { error: updateError } = await supabaseClient
          .from('campaigns')
          .update({ status: 'running', updated_at: new Date().toISOString() })
          .eq('id', campaign.id);

        if (updateError) {
          console.error(`Error updating status for campaign ${campaign.id}:`, updateError.message);
          await addLog(campaign.id, campaign.user_id, 'scheduler_error', `Failed to update status to 'running': ${updateError.message}`);
          continue; // Skip to the next campaign
        }

        await addLog(campaign.id, campaign.user_id, 'scheduler_started', `Campaign "${campaign.name}" status updated to 'running' by scheduler. Invoking send-campaign.`);

        // Invoke the send-campaign Edge Function, passing the user_id
        const { data, error: invokeError } = await supabaseClient.functions.invoke('send-campaign', {
          body: { campaignId: campaign.id, userId: campaign.user_id }, // Pass user_id here
          // No headers needed for internal invocation if send-campaign uses service role key
        });

        if (invokeError) {
          console.error(`Error invoking send-campaign for campaign ${campaign.id}:`, invokeError.message);
          await addLog(campaign.id, campaign.user_id, 'scheduler_error', `Failed to invoke send-campaign: ${invokeError.message}`, { invoke_error: invokeError.message });
          // Optionally, set campaign status to 'failed' if invocation fails
          await supabaseClient.from('campaigns').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', campaign.id);
        } else {
          console.log(`Successfully invoked send-campaign for campaign ${campaign.id}. Response:`, data);
          await addLog(campaign.id, campaign.user_id, 'scheduler_invoked', `Successfully invoked send-campaign.`, { invoke_response: data });
        }
      } catch (campaignProcessError: any) {
        console.error(`Unexpected error processing campaign ${campaign.id}:`, campaignProcessError.message);
        await addLog(campaign.id, campaign.user_id, 'scheduler_error', `Unexpected error during campaign processing: ${campaignProcessError.message}`, { error_details: campaignProcessError.message });
        await supabaseClient.from('campaigns').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', campaign.id);
      }
    }

    return new Response(JSON.stringify({ message: `Scheduler finished. Processed ${campaignsToRun.length} campaigns.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Global error in campaign scheduler:', error.message);
    return new Response(JSON.stringify({ error: `Global scheduler error: ${error.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});