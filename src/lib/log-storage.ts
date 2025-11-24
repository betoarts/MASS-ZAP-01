import { supabase } from "@/integrations/supabase/client";

export interface CampaignLog {
  id: string;
  user_id: string;
  campaign_id: string | null;
  event_type: string;
  message: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export const addCampaignLog = async (userId: string, log: Omit<CampaignLog, 'id' | 'created_at' | 'user_id'>): Promise<CampaignLog | null> => {
  const { data, error } = await supabase
    .from("campaign_logs")
    .insert({
      user_id: userId,
      campaign_id: log.campaign_id,
      event_type: log.event_type,
      message: log.message,
      metadata: log.metadata,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding campaign log:", error);
    return null;
  }
  return data as CampaignLog;
};

export const getCampaignLogsByCampaignId = async (campaignId: string): Promise<CampaignLog[]> => {
  const { data, error } = await supabase
    .from("campaign_logs")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching campaign logs:", error);
    return [];
  }
  return data as CampaignLog[];
};

export const getAllCampaignLogs = async (): Promise<CampaignLog[]> => {
  const { data, error } = await supabase
    .from("campaign_logs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all campaign logs:", error);
    return [];
  }
  return data as CampaignLog[];
};

// Novo: conta quantas mensagens foram enviadas por campanhas (1 por mensagem para cada contato)
export const getMessageSentCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from("campaign_logs")
    .select("id", { count: "exact" })
    .eq("event_type", "message_sent")
    .not("campaign_id", "is", null)
    .limit(1);

  if (error) {
    console.error("Error counting sent messages:", error);
    return 0;
  }
  return count ?? 0;
};

export const getUserMessageSentCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from("campaign_logs")
    .select("id", { count: "exact" })
    .eq("user_id", userId)
    .in("event_type", ["message_sent", "proposal_sent"]) 
    .limit(1);
  if (error) {
    console.error("Error counting user sent messages:", error);
    return 0;
  }
  return count ?? 0;
};

export const getUserQuota = async (userId: string): Promise<{ granted: number; used: number; remaining: number }> => {
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("instance_count")
    .eq("id", userId)
    .single();
  if (pErr) {
    console.error("Error fetching profile for quota:", pErr);
    return { granted: 0, used: 0, remaining: 0 };
  }
  const granted = (profile?.instance_count as number | null) ?? 0;
  const used = await getUserMessageSentCount(userId);
  const remaining = Math.max(granted - used, 0);
  return { granted, used, remaining };
};

export const grantUserQuota = async (adminId: string, userId: string, amount: number): Promise<boolean> => {
  if (!amount || amount <= 0) return false;
  const { error } = await supabase
    .from("campaign_logs")
    .insert({
      user_id: adminId,
      campaign_id: null,
      event_type: "quota_granted",
      message: `Pacote liberado: ${amount} mensagens`,
      metadata: { amount, granted_by: adminId, target_user_id: userId },
    });
  if (error) {
    console.error("Error granting user quota:", error);
    return false;
  }
  return true;
};

export const getUserQuotaGrants = async (userId: string): Promise<Array<{ amount: number; created_at: string }>> => {
  const { data, error } = await supabase
    .from("campaign_logs")
    .select("metadata, created_at")
    .eq("event_type", "quota_granted")
    .contains("metadata", { target_user_id: userId })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Error fetching user quota grants:", error);
    return [];
  }
  const grants: Array<{ amount: number; created_at: string }> = [];
  for (const row of data || []) {
    const amount = (row as any)?.metadata?.amount;
    if (typeof amount === "number" && amount > 0) {
      grants.push({ amount, created_at: (row as any)?.created_at as string });
    }
  }
  return grants;
};
