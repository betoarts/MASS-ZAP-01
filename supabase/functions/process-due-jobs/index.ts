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
        } else if (job.node_type === 'send_media') {
          await processSendMedia(job, context, supabase);
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

        if (job.node_type !== 'wait' && job.node_type !== 'end' && job.node_type !== 'condition') {
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

// --- Funções Auxiliares ---

function getMessageContexts(job: any, context: any, contacts: any[]): { instance: any, context: any, message: string, mediaUrl?: string, mediaCaption?: string }[] {
  const messagesToSend = [];
  const message = job.node_data.message || '';
  const mediaUrl = job.node_data.mediaUrl;
  const mediaCaption = job.node_data.mediaCaption;
  const instance = job.instance;

  if (contacts.length > 0) {
    // Se houver lista de contatos, iteramos sobre eles
    for (const contact of contacts) {
      const baseContext = { ...context };
      
      const fullName = contact.full_name || contact.first_name || '';
      const firstName = contact.first_name || fullName.split(' ')[0] || 'Amigo';

      // Contexto específico do contato
      const replacementContext = {
        phone: contact.phone_number,
        nome_completo: fullName,
        primeiro_nome: firstName,
        ...contact.custom_data,
      };
      
      // O contexto final para substituição é a união do contexto da execução e do contexto do contato
      const finalContext = { ...baseContext, ...replacementContext };
      messagesToSend.push({ instance, context: finalContext, message, mediaUrl, mediaCaption });
    }
  } else {
    // Se não houver lista, enviamos apenas para o contexto da execução (assumindo que 'phone' está lá)
    const baseContext = { ...context };
    
    const name = baseContext.name || baseContext.fullName || baseContext.nome_completo || '';
    const firstName = baseContext.firstName || baseContext.primeiro_nome || name.split(' ')[0] || 'Amigo';

    const replacementContext = {
      phone: baseContext.phone,
      nome_completo: name,
      primeiro_nome: firstName,
    };
    
    const finalContext = { ...baseContext, ...replacementContext };
    messagesToSend.push({ instance, context: finalContext, message, mediaUrl, mediaCaption });
  }
  return messagesToSend;
}

async function fetchInstanceAndContacts(job: any, userId: string, supabase: any) {
  const instanceId = job.node_data.instanceId;
  const contactListId = job.node_data.contactListId;

  if (!instanceId) {
    throw new Error('Instância não configurada no bloco');
  }

  const { data: instance, error: instanceError } = await supabase
    .from('instances')
    .select('*')
    .eq('id', instanceId)
    .single();

  if (instanceError || !instance) {
    throw new Error('Instância não encontrada');
  }

  let contacts = [];
  if (contactListId) {
    // Busca contatos da lista, garantindo que o usuário tem permissão (RLS)
    const { data: fetchedContacts } = await supabase
      .from('contacts')
      .select('id, phone_number, full_name, first_name, custom_data')
      .eq('contact_list_id', contactListId);
    
    contacts = fetchedContacts || [];
  } else if (job.node_type === 'send_message' || job.node_type === 'send_media') {
    // Se não há lista, mas é um nó de envio, tentamos enviar para o contexto (1 contato)
    contacts = []; 
  }

  return { instance, contacts };
}

async function processSendMessage(job: any, context: any, supabase: any) {
  const { instance, contacts } = await fetchInstanceAndContacts(job, job.user_id, supabase);
  
  const messagesToSend = getMessageContexts(
    { ...job, instance }, 
    context, 
    contacts
  );

  if (messagesToSend.length === 0 && job.node_data.contactListId) {
    // Se a lista estava configurada, mas vazia, não é um erro fatal.
    return; 
  }
  if (messagesToSend.length === 0 && !context.phone) {
    throw new Error('Número de telefone não encontrado no contexto para envio individual.');
  }

  for (const { instance, context: msgContext, message } of messagesToSend) {
    await sendText(instance, msgContext, message);
    if (messagesToSend.length > 1) {
        // Adiciona um pequeno delay entre mensagens se for envio em massa
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

async function processSendMedia(job: any, context: any, supabase: any) {
  const { instance, contacts } = await fetchInstanceAndContacts(job, job.user_id, supabase);
  
  const messagesToSend = getMessageContexts(
    { ...job, instance }, 
    context, 
    contacts
  );

  if (messagesToSend.length === 0 && job.node_data.contactListId) {
    return; 
  }
  if (messagesToSend.length === 0 && !context.phone) {
    throw new Error('Número de telefone não encontrado no contexto para envio individual.');
  }
  if (!job.node_data.mediaUrl) {
    throw new Error('URL da mídia não configurada.');
  }

  for (const { instance, context: msgContext, mediaUrl, mediaCaption } of messagesToSend) {
    await sendMedia(instance, msgContext, mediaUrl!, mediaCaption);
    if (messagesToSend.length > 1) {
        // Adiciona um pequeno delay entre mensagens se for envio em massa
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

async function sendText(instance: any, context: any, message: string) {
  let finalMessage = message;
  
  // Substituição de variáveis
  for (const key in context) {
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
    throw new Error(`Erro ao enviar mensagem de texto para ${phoneNumber}: ${errorBody}`);
  }
}

async function sendMedia(instance: any, context: any, mediaUrl: string, mediaCaption?: string) {
  let finalCaption = mediaCaption || '';
  
  // Substituição de variáveis na legenda
  for (const key in context) {
    if (typeof context[key] === 'string' || typeof context[key] === 'number') {
        finalCaption = finalCaption.replace(new RegExp(`{{${key}}}`, 'g'), String(context[key]));
    }
  }

  const phoneNumber = context.phone || '';
  if (!phoneNumber) {
    throw new Error('Número de telefone não encontrado no contexto');
  }

  const evolutionMediaApiUrl = `${instance.url}/message/sendMedia/${instance.instance_name}`;
  
  const mediaType = mediaUrl.includes('.mp4') ? 'video' : mediaUrl.includes('.pdf') ? 'document' : 'image';

  const mediaPayload = {
    number: phoneNumber,
    mediatype: mediaType,
    media: mediaUrl,
    caption: finalCaption,
    delay: 1200,
  };

  const response = await fetch(evolutionMediaApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': instance.api_key,
    },
    body: JSON.stringify(mediaPayload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Erro ao enviar mídia para ${phoneNumber}: ${errorBody}`);
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