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
  | {
      action: "grantQuota"
      userId: string
      amount: number
      adminId?: string
    }
  | {
      action: "getQuota"
      userId: string
    }
  | {
      action: "instanceCounts"
      instanceIds: string[]
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
      "Accept": "application/json",
      apikey: apiKey,
    }

    if (body.action === "grantQuota") {
      const amount = (body as any)?.amount
      const userId = (body as any)?.userId
      const adminId = (body as any)?.adminId ?? "admin"
      if (!userId || !amount || amount <= 0) {
        return new Response(JSON.stringify({ success: false, error: "Parâmetros inválidos" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      const { error } = await supabase
        .from("campaign_logs")
        .insert({
          user_id: userId,
          campaign_id: null,
          event_type: "quota_granted",
          message: `Pacote liberado: ${amount} mensagens`,
          metadata: { amount, granted_by: adminId },
        })
      if (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (body.action === "getQuota") {
      const userId = (body as any)?.userId
      if (!userId) {
        return new Response(JSON.stringify({ success: false, error: "userId obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      const { data: grantsRows } = await supabase
        .from("campaign_logs")
        .select("metadata")
        .eq("event_type", "quota_granted")
        .contains("metadata", { target_user_id: userId })

      let granted = 0
      for (const row of grantsRows || []) {
        const amount = (row as any)?.metadata?.amount
        if (typeof amount === "number" && amount > 0) granted += amount
      }
      const { count: usedCount } = await supabase
        .from("campaign_logs")
        .select("id", { count: "exact" })
        .eq("user_id", userId)
        .in("event_type", ["message_sent", "proposal_sent"]).limit(1)
      const used = usedCount ?? 0
      const remaining = Math.max(granted - used, 0)
      return new Response(JSON.stringify({ success: true, data: { granted, used, remaining } }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (body.action === "instanceCounts") {
      const instanceIds = (body as any)?.instanceIds as string[]
      if (!Array.isArray(instanceIds) || instanceIds.length === 0) {
        return new Response(JSON.stringify({ success: false, error: "instanceIds obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id, instance_id")
        .in("instance_id", instanceIds)

      const campaignIdToInstance = new Map<string, string>()
      const campaignIds: string[] = []
      for (const c of campaigns || []) {
        campaignIdToInstance.set((c as any).id, (c as any).instance_id)
        campaignIds.push((c as any).id)
      }

      let messageLogs: Array<{ campaign_id: string }> = []
      if (campaignIds.length > 0) {
        const { data: msgData } = await supabase
          .from("campaign_logs")
          .select("campaign_id")
          .in("campaign_id", campaignIds)
          .eq("event_type", "message_sent")
        messageLogs = (msgData as any[]) || []
      }

      const { data: proposalData } = await supabase
        .from("campaign_logs")
        .select("metadata")
        .eq("event_type", "proposal_sent")

      const counts = new Map<string, number>()
      for (const id of instanceIds) counts.set(id, 0)

      for (const log of messageLogs) {
        const instId = campaignIdToInstance.get((log as any).campaign_id)
        if (!instId) continue
        counts.set(instId, (counts.get(instId) || 0) + 1)
      }

      for (const row of proposalData || []) {
        const iid = (row as any)?.metadata?.instance_id
        if (!iid) continue
        if (!instanceIds.includes(iid)) continue
        counts.set(iid, (counts.get(iid) || 0) + 1)
      }

      const result: Record<string, number> = {}
      for (const [k, v] of counts.entries()) result[k] = v
      return new Response(JSON.stringify({ success: true, data: { counts: result } }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
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