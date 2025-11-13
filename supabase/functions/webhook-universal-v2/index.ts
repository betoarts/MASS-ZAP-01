// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Resto do código...

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

  let source: string | null = null; // Declarar source no escopo correto

  try {
    const url = new URL(req.url);
    source = url.searchParams.get('source'); // Atribuir valor aqui
    const listId = url.searchParams.get('list_id');
    const apiKey = url.searchParams.get('api_key');

    // Validações básicas
    if (!source || !listId || !apiKey) {
      return new Response(JSON.stringify({ 
        error: 'Parâmetros obrigatórios: source, list_id, api_key' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // ... resto do código ...

  } catch (error: any) {
    console.error('Erro no webhook universal:', error);
    
    // Registra erro - source agora está disponível no escopo
    if (source) {
      await supabaseClient.from('campaign_logs').insert({
        user_id: source,
        event_type: 'webhook_error',
        message: `Erro no webhook universal: ${error.message}`,
        metadata: { error: error.message, stack: error.stack }
      });
    }

    return new Response(JSON.stringify({ 
      error: 'Erro interno no webhook universal',
      message: error.message
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});