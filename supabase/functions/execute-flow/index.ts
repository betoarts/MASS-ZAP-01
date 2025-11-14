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

  const supabase = createClient(
    // @ts-ignore
    Deno.env.get('SUPABASE_URL') ?? '',
    // @ts-ignore
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    const { flowId, userId, context } = await req.json();

    if (!flowId || !userId) {
      return new Response(JSON.stringify({ error: 'flowId e userId são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar o flow
    const { data: flow, error: flowError } = await supabase
      .from('flows')
      .select('*')
      .eq('id', flowId)
      .eq('user_id', userId)
      .single();

    if (flowError || !flow) {
      return new Response(JSON.stringify({ error: 'Flow não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Criar execution
    const { data: execution, error: execError } = await supabase
      .from('executions')
      .insert({
        user_id: userId,
        flow_id: flowId,
        status: 'running',
        context: context || {},
      })
      .select()
      .single();

    if (execError || !execution) {
      return new Response(JSON.stringify({ error: 'Erro ao criar execution' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Encontrar o node "start"
    const startNode = flow.nodes.find((n: any) => n.type === 'start');
    if (!startNode) {
      return new Response(JSON.stringify({ error: 'Flow sem node de início' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Encontrar próximos nodes conectados ao start
    const nextEdges = flow.edges.filter((e: any) => e.source === startNode.id);
    
    for (const edge of nextEdges) {
      const nextNode = flow.nodes.find((n: any) => n.id === edge.target);
      if (nextNode) {
        await supabase.from('jobs').insert({
          user_id: userId,
          execution_id: execution.id,
          node_id: nextNode.id,
          node_type: nextNode.type,
          node_data: nextNode.data,
          status: 'pending',
          scheduled_at: new Date().toISOString(),
        });
      }
    }

    return new Response(JSON.stringify({ executionId: execution.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});