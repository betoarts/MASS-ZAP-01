// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função auxiliar para encontrar um valor em um objeto aninhado
function getNestedValue(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || typeof current !== 'object' || !current.hasOwnProperty(part)) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

// Função principal de processamento
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    // @ts-ignore
    Deno.env.get('SUPABASE_URL') ?? '',
    // @ts-ignore
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  let userId: string | null = null; // Renomeado de 'source' para 'userId' para clareza
  let listId: string | null = null;
  let apiKey: string | null = null;

  // Função para adicionar um log (usando o cliente com service role key)
  const addLog = async (logUserId: string, event_type: string, message: string, metadata?: Record<string, any>) => {
    await supabaseClient
      .from('campaign_logs') // Reutilizando campaign_logs para logs de webhook
      .insert({
        user_id: logUserId,
        campaign_id: null, // Não associado a uma campanha específica
        event_type: event_type,
        message: message,
        metadata: metadata,
      });
  };

  try {
    const url = new URL(req.url);
    userId = url.searchParams.get('source');
    listId = url.searchParams.get('list_id');
    apiKey = url.searchParams.get('api_key');

    // 1. Validações básicas dos parâmetros da URL
    if (!userId || !listId || !apiKey) {
      const missingParams = [];
      if (!userId) missingParams.push('source (userId)');
      if (!listId) missingParams.push('list_id');
      if (!apiKey) missingParams.push('api_key');
      const errorMessage = `Parâmetros obrigatórios faltando: ${missingParams.join(', ')}`;
      await addLog(userId || 'unknown', 'webhook_error', errorMessage, { url_params: { userId, listId, apiKey } });
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Validar a API Key
    const { data: webhookSource, error: sourceError } = await supabaseClient
      .from('webhook_sources')
      .select('api_key, field_mapping, filters')
      .eq('user_id', userId)
      .eq('id', listId) // Assumindo que listId pode ser usado para identificar a fonte se for um webhook por lista
      .single();

    if (sourceError || !webhookSource) {
      const errorMessage = `Fonte de webhook não encontrada ou erro de acesso para userId: ${userId}, listId: ${listId}.`;
      await addLog(userId, 'webhook_auth_error', errorMessage, { sourceError: sourceError?.message, listId });
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (webhookSource.api_key !== apiKey) {
      const errorMessage = `API Key inválida para userId: ${userId}, listId: ${listId}.`;
      await addLog(userId, 'webhook_auth_error', errorMessage, { providedApiKey: apiKey, expectedApiKeyPrefix: webhookSource.api_key.substring(0, 5) + '...' });
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Processar o corpo da requisição
    const requestBody = await req.json();
    await addLog(userId, 'webhook_received', `Webhook recebido para lista ${listId}.`, { body: requestBody });

    // Aplicar filtros (se existirem)
    if (webhookSource.filters) {
      const filters = webhookSource.filters as Record<string, any>;
      let passedFilters = true;
      for (const key in filters) {
        const expectedValue = filters[key];
        const actualValue = getNestedValue(requestBody, key);
        if (actualValue !== expectedValue) {
          passedFilters = false;
          break;
        }
      }
      if (!passedFilters) {
        const message = `Webhook ignorado: não passou nos filtros definidos.`;
        await addLog(userId, 'webhook_filtered', message, { filters: webhookSource.filters, receivedBody: requestBody });
        return new Response(JSON.stringify({ message: message }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // 4. Mapear campos e extrair dados do contato
    const fieldMapping = webhookSource.field_mapping as Record<string, string>;
    let phoneNumber: string | undefined;
    let fullName: string | undefined;
    let firstName: string | undefined;
    const customData: Record<string, any> = {};

    // Tentar encontrar o número de telefone primeiro
    const phoneKeys = ['phone', 'mobile', 'telefone', 'celular', 'whatsapp', 'phone_number', 'mobilephone'];
    for (const key of phoneKeys) {
      const mappedKey = fieldMapping[key] || key; // Usar mapeamento se existir, senão a própria chave
      const value = getNestedValue(requestBody, mappedKey);
      if (value) {
        phoneNumber = String(value).replace(/\D/g, ''); // Limpar para apenas dígitos
        // Validação básica de número de telefone (10 a 15 dígitos, não começando com 0)
        if (/^[1-9]\d{9,14}$/.test(phoneNumber)) {
          break;
        } else {
          phoneNumber = undefined; // Reset se inválido
        }
      }
    }

    if (!phoneNumber) {
      const errorMessage = `Número de telefone inválido ou não encontrado no payload.`;
      await addLog(userId, 'webhook_error', errorMessage, { receivedBody: requestBody, fieldMapping });
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Tentar encontrar nome completo e primeiro nome
    const nameKeys = ['name', 'nome', 'fullname', 'full_name'];
    for (const key of nameKeys) {
      const mappedKey = fieldMapping[key] || key;
      const value = getNestedValue(requestBody, mappedKey);
      if (value) {
        fullName = String(value);
        firstName = fullName.split(' ')[0];
        break;
      }
    }
    const firstNameKeys = ['firstname', 'first_name'];
    for (const key of firstNameKeys) {
      const mappedKey = fieldMapping[key] || key;
      const value = getNestedValue(requestBody, mappedKey);
      if (value && !firstName) { // Só atribui se firstName ainda não foi encontrado
        firstName = String(value);
        break;
      }
    }

    // Coletar dados personalizados
    for (const key in requestBody) {
      // Evitar sobrescrever campos padrão já mapeados
      if (!phoneKeys.includes(key.toLowerCase()) && !nameKeys.includes(key.toLowerCase()) && !firstNameKeys.includes(key.toLowerCase())) {
        customData[key] = requestBody[key];
      }
    }

    // 5. Inserir ou atualizar contato
    const { data: existingContacts, error: fetchContactError } = await supabaseClient
      .from('contacts')
      .select('id')
      .eq('contact_list_id', listId)
      .eq('phone_number', phoneNumber);

    if (fetchContactError) {
      const errorMessage = `Erro ao buscar contato existente: ${fetchContactError.message}`;
      await addLog(userId, 'webhook_error', errorMessage, { phoneNumber, listId, fetchContactError: fetchContactError.message });
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const contactData = {
      contact_list_id: listId,
      phone_number: phoneNumber,
      full_name: fullName,
      first_name: firstName,
      custom_data: Object.keys(customData).length > 0 ? customData : null,
    };

    let responseMessage = '';
    if (existingContacts && existingContacts.length > 0) {
      // Atualizar contato existente
      const contactId = existingContacts[0].id;
      const { error: updateError } = await supabaseClient
        .from('contacts')
        .update({ ...contactData, updated_at: new Date().toISOString() })
        .eq('id', contactId);

      if (updateError) {
        const errorMessage = `Erro ao atualizar contato: ${updateError.message}`;
        await addLog(userId, 'webhook_error', errorMessage, { contactId, updateError: updateError.message });
        return new Response(JSON.stringify({ error: errorMessage }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      responseMessage = `Contato ${phoneNumber} atualizado na lista ${listId}.`;
      await addLog(userId, 'contact_updated', responseMessage, { contactId, phoneNumber, listId });
    } else {
      // Inserir novo contato
      const { error: insertError } = await supabaseClient
        .from('contacts')
        .insert(contactData);

      if (insertError) {
        const errorMessage = `Erro ao inserir novo contato: ${insertError.message}`;
        await addLog(userId, 'webhook_error', errorMessage, { phoneNumber, listId, insertError: insertError.message });
        return new Response(JSON.stringify({ error: errorMessage }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      responseMessage = `Novo contato ${phoneNumber} adicionado à lista ${listId}.`;
      await addLog(userId, 'contact_added', responseMessage, { phoneNumber, listId });
    }

    return new Response(JSON.stringify({ message: responseMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Erro no webhook universal:', error);
    const errorMessage = `Erro interno no webhook universal: ${error.message}`;
    await addLog(userId || 'unknown', 'webhook_error', errorMessage, { error: error.message, stack: error.stack, url_params: { userId, listId, apiKey } });

    return new Response(JSON.stringify({
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});