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

  const addLog = async (campaignId: string, userId: string, event_type: string, message: string, metadata?: Record<string, any>) => {
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

    for (const campaign of campaignsToRun) {
      if (!campaign.user_id) {
        continue;
      }

      try {
        const { error: updateError } = await supabaseClient
          .from('campaigns')
          .update({ status: 'running', updated_at: new Date().toISOString() })
          .eq('id', campaign.id);

        if (updateError) {
          await addLog(campaign.id, campaign.user_id, 'scheduler_error', `Falha ao atualizar status para "em execução": ${updateError.message}`);
          continue;
        }

        await addLog(campaign.id, campaign.user_id, 'scheduler_started', `Status da campanha "${campaign.name}" atualizado para "em execução" pelo agendador. Invocando send-campaign.`);

        const { data, error: invokeError } = await supabaseClient.functions.invoke('send-campaign', {
          body: { campaignId: campaign.id, userId: campaign.user_id },
        });

        if (invokeError) {
          await addLog(campaign.id, campaign.user_id, 'scheduler_error', `Falha ao invocar send-campaign: ${invokeError.message}`, { invoke_error: invokeError.message });
          await supabaseClient.from('campaigns').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', campaign.id);
        } else {
          await addLog(campaign.id, campaign.user_id, 'scheduler_invoked', `Função send-campaign invocada com sucesso.`, { invoke_response: data });
        }
      } catch (campaignProcessError: any) {
        await addLog(campaign.id, campaign.user_id, 'scheduler_error', `Erro inesperado ao processar campanha: ${campaignProcessError.message}`, { error_details: campaignProcessError.message });
        await supabaseClient.from('campaigns').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', campaign.id);
      }
    }

    return new Response(JSON.stringify({ message: `Agendador finalizado. Processadas ${campaignsToRun.length} campanha(s).` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: `Erro global no agendador: ${error.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});