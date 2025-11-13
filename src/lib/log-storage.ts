import { supabase } from "@/integrations/supabase/client";

export interface CampaignLog {
  id: string;
  user_id: string;
  campaign_id: string;
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