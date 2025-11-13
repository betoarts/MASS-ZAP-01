// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

type ProxyBody =
  | {
      action: "connectionState" | "connect"
      instanceId: string
      userId: string
    }
  | {
      action: "connectionState" | "connect"
      url: string
      instanceName: string
      apiKey: string
    }

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const supabase = createClient(
    // @ts-ignore
    Deno.env.get("SUPABASE_URL") ?? "",
    // @ts-ignore
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  )

  try {
    const body = (await req.json()) as ProxyBody

    let baseUrl = ""
    let instanceName = ""
    let apiKey = ""

    if ("instanceId" in body) {
      if (!body.userId) {
        return new Response(JSON.stringify({ error: "userId é obrigatório quando instanceId é usado" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      const { data, error } = await supabase
        .from("instances")
        .select("url, instance_name, api_key, user_id")
        .eq("id", body.instanceId)
        .eq("user_id", body.userId)
        .single()

      if (error || !data) {
        return new Response(JSON.stringify({ error: "Instância não encontrada ou sem permissão" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      baseUrl = data.url
      instanceName = data.instance_name
      apiKey = data.api_key
    } else {
      // uso direto (formulário antes de salvar)
      baseUrl = body.url
      instanceName = body.instanceName
      apiKey = body.apiKey
      if (!baseUrl || !instanceName || !apiKey) {
        return new Response(JSON.stringify({ error: "Parâmetros url, instanceName e apiKey são obrigatórios." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
    }

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      apikey: apiKey,
    }

    let targetUrl = ""
    if (body.action === "connectionState") {
      targetUrl = `${baseUrl}/instance/connectionState/${encodeURIComponent(instanceName)}`
    } else if (body.action === "connect") {
      targetUrl = `${baseUrl}/instance/connect/${encodeURIComponent(instanceName)}`
    } else {
      return new Response(JSON.stringify({ error: "Ação inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const res = await fetch(targetUrl, { method: "GET", headers })
    const text = await res.text()

    // tentar parsear json, mas se não der, devolve texto
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      data = { raw: text }
    }

    return new Response(JSON.stringify({ success: res.ok, status: res.status, data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})