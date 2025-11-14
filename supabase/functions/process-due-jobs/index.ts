// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-ignore
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
    // @ts-ignore
    Deno.env.get('SUPABASE_URL') ?? '',
    // @ts-ignore
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
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
        await supabase
          .from('jobs')
          .update({ status: 'processing' })
          .eq('id', job.id);

        const { data: execution } = await supabase
          .from('executions')
          .select('*, flows(*)')
          .eq('id', job.execution_id)
          .single();

        if (!execution) continue;

        const context = execution.context || {};

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

        await supabase
          .from('jobs')
          .update({ status: 'completed', processed_at: new Date().toISOString() })
          .eq('id', job.id);

        if (job.node_type !== 'wait' && job.node_type !== 'end') {
          await scheduleNextNodes(job, execution, supabase);
        }

      } catch (error: any) {
        console.error('Erro processando job:', error);
        
        const newRetryCount = job.retry_count + 1;
        if (newRetryCount < job.max_retries) {
          const backoffSeconds = Math.pow(2, newRetryCount) * 60;
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
  const instanceId = job.node_data.instanceId;
  const contactListId = job.node_data.contactListId;

  if (!instanceId) {
    throw new Error('Instância não configurada no bloco de mensagem');
  }

  // Buscar instância específica
  const { data: instance, error: instanceError } = await supabase
    .from('instances')
    .select('*')
    .eq('id', instanceId)
    .single();

  if (instanceError || !instance) {
    throw new Error('Instância não encontrada');
  }

  const messagesToSend = [];

  // Se tem lista de contatos, enviar para todos
  if (contactListId) {
    const { data: contacts } = await supabase
      .from('contacts')
      .select('*')
      .eq('contact_list_id', contactListId);

    if (!contacts || contacts.length === 0) {
      // Não é um erro fatal se a lista estiver vazia, apenas não envia nada.
      return;
    }

    for (const contact of contacts) {
      const baseContext = { ...context };
      
      // Standardize contact data for replacement using standard placeholders
      const fullName = contact.full_name || contact.first_name || '';
      const firstName = contact.first_name || fullName.split(' ')[0] || 'Amigo';

      const replacementContext = {
        phone: contact.phone_number,
        nome_completo: fullName,
        primeiro_nome: firstName,
        ...contact.custom_data,
      };
      
      const finalContext = { ...baseContext, ...replacementContext };
      messagesToSend.push({ instance, context: finalContext, message });
    }
  } else {
    // Enviar apenas para o contexto atual (assumindo que 'phone' está em context)
    const baseContext = { ...context };
    
    // Standardize context data for replacement
    const name = baseContext.name || baseContext.fullName || baseContext.nome_completo || '';
    const firstName = baseContext.firstName || baseContext.primeiro_nome || name.split(' ')[0] || 'Amigo';

    const replacementContext = {
      phone: baseContext.phone, // Assumes phone is present in context
      nome_completo: name,
      primeiro_nome: firstName,
    };
    
    const finalContext = { ...baseContext, ...replacementContext };
    messagesToSend.push({ instance, context: finalContext, message });
  }

  for (const { instance, context: msgContext, message } of messagesToSend) {
    await sendMessage(instance, msgContext, message);
    // Delay entre mensagens (apenas se houver mais de uma mensagem)
    if (messagesToSend.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

async function sendMessage(instance: any, context: any, message: string) {
  let finalMessage = message;
  
  // Substituir variáveis no message
  for (const key in context) {
    // Garante que apenas strings sejam usadas para substituição e evita substituição de objetos complexos
    if (typeof context[key] === 'string' || typeof context[key] === 'number') {
        finalMessage = finalMessage.replace(new RegExp(`{{${key}}}`, 'g'), String(context[key]));
    }
  }

  const phoneNumber = context.phone || '';
  if (!phoneNumber) {
    throw new Error('Número de telefone não encontrado no contexto');
  }

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
    // JEXL espera que o contexto seja passado diretamente
    result = await jexl.eval(expression, context);
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
  let body = job.node_data.body || '';
  
  // Substituir variáveis no body
  for (const key in context) {
    // Garante que apenas strings sejam usadas para substituição e evita substituição de objetos complexos
    if (typeof context[key] === 'string' || typeof context[key] === 'number') {
        body = body.replace(new RegExp(`{{${key}}}`, 'g'), String(context[key]));
    }
  }
  
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'POST' ? body : undefined,
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