import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import jexl from 'https://esm.sh/jexl@2.3.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    // Buscar jobs pendentes que já passaram do horário agendado
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .limit(10);

    if (jobsError || !jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhum job para processar' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    for (const job of jobs) {
      try {
        // Marcar como processing
        await supabase
          .from('jobs')
          .update({ status: 'processing' })
          .eq('id', job.id);

        // Buscar execution e flow
        const { data: execution } = await supabase
          .from('executions')
          .select('*, flows(*)')
          .eq('id', job.execution_id)
          .single();

        if (!execution) continue;

        const context = execution.context || {};

        // Processar de acordo com o tipo
        if (job.node_type === 'send_message') {
          await processSendMessage(job, context, supabase);
        } else if (job.node_type === 'wait') {
          await processWait(job, execution, supabase);
        } else if (job.node_type === 'condition') {
          await processCondition(job, execution, context, supabase);
        } else if (job.node_type === 'webhook') {
          await processWebhook(job, context, supabase);
        } else if (job.node_type === 'end') {
          await processEnd(job, execution, supabase);
        }

        // Marcar job como completed
        await supabase
          .from('jobs')
          .update({ status: 'completed', processed_at: new Date().toISOString() })
          .eq('id', job.id);

        // Avançar para próximos nodes (exceto wait e end)
        if (job.node_type !== 'wait' && job.node_type !== 'end') {
          await scheduleNextNodes(job, execution, supabase);
        }

      } catch (error: any) {
        console.error('Erro processando job:', error);
        
        // Retry logic
        const newRetryCount = job.retry_count + 1;
        if (newRetryCount < job.max_retries) {
          const backoffSeconds = Math.pow(2, newRetryCount) * 60; // exponential backoff
          const nextSchedule = new Date(Date.now() + backoffSeconds * 1000).toISOString();
          
          await supabase
            .from('jobs')
            .update({
              status: 'pending',
              retry_count: newRetryCount,
              scheduled_at: nextSchedule,
              error_message: error.message,
            })
            .eq('id', job.id);
        } else {
          await supabase
            .from('jobs')
            .update({
              status: 'failed',
              error_message: error.message,
              processed_at: new Date().toISOString(),
            })
            .eq('id', job.id);

          await supabase
            .from('executions')
            .update({ status: 'failed', error_message: error.message })
            .eq('id', job.execution_id);
        }
      }
    }

    return new Response(JSON.stringify({ processed: jobs.length }), {
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

async function processSendMessage(job: any, context: any, supabase: any) {
  const message = job.node_data.message || '';
  
  // Substituir placeholders
  let finalMessage = message;
  for (const key in context) {
    finalMessage = finalMessage.replace(new RegExp(`{{${key}}}`, 'g'), context[key]);
  }

  // Buscar instância do usuário (assumindo que há uma tabela instances)
  const { data: instances } = await supabase
    .from('instances')
    .select('*')
    .eq('user_id', job.user_id)
    .limit(1);

  if (!instances || instances.length === 0) {
    throw new Error('Nenhuma instância configurada');
  }

  const instance = instances[0];
  const phoneNumber = context.phone || '';

  if (!phoneNumber) {
    throw new Error('Número de telefone não encontrado no contexto');
  }

  // Enviar via Evolution API
  const evolutionUrl = `${instance.url}/message/sendText/${instance.instance_name}`;
  const response = await fetch(evolutionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': instance.api_key,
    },
    body: JSON.stringify({
      number: phoneNumber,
      text: finalMessage,
      delay: 1200,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Erro ao enviar mensagem: ${errorBody}`);
  }
}

async function processWait(job: any, execution: any, supabase: any) {
  const delay = job.node_data.delay || 30;
  const delayUnit = job.node_data.delayUnit || 'seconds';
  
  let delayMs = delay * 1000;
  if (delayUnit === 'minutes') delayMs = delay * 60 * 1000;
  if (delayUnit === 'hours') delayMs = delay * 60 * 60 * 1000;

  const nextSchedule = new Date(Date.now() + delayMs).toISOString();

  // Agendar próximos nodes
  const flow = execution.flows;
  const nextEdges = flow.edges.filter((e: any) => e.source === job.node_id);
  
  for (const edge of nextEdges) {
    const nextNode = flow.nodes.find((n: any) => n.id === edge.target);
    if (nextNode) {
      await supabase.from('jobs').insert({
        user_id: job.user_id,
        execution_id: job.execution_id,
        node_id: nextNode.id,
        node_type: nextNode.type,
        node_data: nextNode.data,
        status: 'pending',
        scheduled_at: nextSchedule,
      });
    }
  }
}

async function processCondition(job: any, execution: any, context: any, supabase: any) {
  const expression = job.node_data.expression || 'true';
  
  let result = false;
  try {
    result = await jexl.eval(expression, { context });
  } catch (error) {
    console.error('Erro ao avaliar expressão:', error);
    result = false;
  }

  const flow = execution.flows;
  const handleId = result ? 'true' : 'false';
  const nextEdge = flow.edges.find((e: any) => e.source === job.node_id && e.sourceHandle === handleId);
  
  if (nextEdge) {
    const nextNode = flow.nodes.find((n: any) => n.id === nextEdge.target);
    if (nextNode) {
      await supabase.from('jobs').insert({
        user_id: job.user_id,
        execution_id: job.execution_id,
        node_id: nextNode.id,
        node_type: nextNode.type,
        node_data: nextNode.data,
        status: 'pending',
        scheduled_at: new Date().toISOString(),
      });
    }
  }
}

async function processWebhook(job: any, context: any, supabase: any) {
  const url = job.node_data.url || '';
  const method = job.node_data.method || 'POST';
  
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'POST' ? JSON.stringify(context) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Webhook falhou: ${response.statusText}`);
  }
}

async function processEnd(job: any, execution: any, supabase: any) {
  await supabase
    .from('executions')
    .update({
      status: 'success',
      completed_at: new Date().toISOString(),
    })
    .eq('id', job.execution_id);
}

async function scheduleNextNodes(job: any, execution: any, supabase: any) {
  const flow = execution.flows;
  const nextEdges = flow.edges.filter((e: any) => e.source === job.node_id);
  
  for (const edge of nextEdges) {
    const nextNode = flow.nodes.find((n: any) => n.id === edge.target);
    if (nextNode) {
      await supabase.from('jobs').insert({
        user_id: job.user_id,
        execution_id: job.execution_id,
        node_id: nextNode.id,
        node_type: nextNode.type,
        node_data: nextNode.data,
        status: 'pending',
        scheduled_at: new Date().toISOString(),
      });
    }
  }
}