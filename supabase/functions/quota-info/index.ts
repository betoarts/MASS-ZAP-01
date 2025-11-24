// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const body = await req.json() as { userId: string }
    const userId = body.userId
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: grantsRows, error: grantsError } = await supabase
      .from("campaign_logs")
      .select("metadata, created_at")
      .eq("event_type", "quota_granted")
      .contains("metadata", { target_user_id: userId })

    if (grantsError) {
      return new Response(JSON.stringify({ error: grantsError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    let granted = 0
    const grants: Array<{ amount: number; created_at: string }> = []
    for (const row of grantsRows || []) {
      const amount = (row as any)?.metadata?.amount
      if (typeof amount === "number" && amount > 0) {
        granted += amount
        grants.push({ amount, created_at: (row as any)?.created_at as string })
      }
    }

    const { count: usedCount, error: usedError } = await supabase
      .from("campaign_logs")
      .select("id", { count: "exact" })
      .eq("user_id", userId)
      .in("event_type", ["message_sent", "proposal_sent"]) 
      .limit(1)

    if (usedError) {
      return new Response(JSON.stringify({ error: usedError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const used = usedCount ?? 0
    const remaining = Math.max(granted - used, 0)

    return new Response(JSON.stringify({ granted, used, remaining, grants }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})