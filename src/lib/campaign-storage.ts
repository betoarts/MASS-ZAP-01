import { supabase } from "@/integrations/supabase/client";
import { CampaignFormData } from "./campaign-utils";

export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'completed' | 'failed';

export interface Campaign {
  id: string;
  user_id?: string;
  name: string;
  instance_id: string;
  contact_list_id: string;
  message_text: string;
  media_url?: string;
  media_caption?: string;
  link_preview: boolean;
  mentions_every_one: boolean;
  scheduled_at?: string;
  min_delay: number;
  max_delay: number;
  status: CampaignStatus;
  created_at: string;
  updated_at?: string;
}

export const getCampaigns = async (): Promise<Campaign[]> => {
  const { data, error } = await supabase.from("campaigns").select("*");
  if (error) {
    console.error("Error fetching campaigns:", error);
    return [];
  }
  return data as Campaign[];
};

export const addCampaign = async (userId: string, newCampaignData: CampaignFormData): Promise<Campaign | null> => {
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      user_id: userId,
      name: newCampaignData.name,
      instance_id: newCampaignData.instanceId,
      contact_list_id: newCampaignData.contactListId,
      message_text: newCampaignData.messageText,
      media_url: newCampaignData.mediaUrl,
      media_caption: newCampaignData.mediaCaption,
      link_preview: newCampaignData.linkPreview,
      mentions_every_one: newCampaignData.mentionsEveryOne,
      scheduled_at: newCampaignData.scheduledAt,
      min_delay: newCampaignData.minDelay,
      max_delay: newCampaignData.maxDelay,
      status: 'draft',
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding campaign:", error);
    return null;
  }
  return data as Campaign;
};

export const updateCampaign = async (userId: string, updatedCampaignData: CampaignFormData & { id: string, status: CampaignStatus }): Promise<Campaign | null> => {
  const { data, error } = await supabase
    .from("campaigns")
    .update({
      name: updatedCampaignData.name,
      instance_id: updatedCampaignData.instanceId,
      contact_list_id: updatedCampaignData.contactListId,
      message_text: updatedCampaignData.messageText,
      media_url: updatedCampaignData.mediaUrl,
      media_caption: updatedCampaignData.mediaCaption,
      link_preview: updatedCampaignData.linkPreview,
      mentions_every_one: updatedCampaignData.mentionsEveryOne,
      scheduled_at: updatedCampaignData.scheduledAt,
      min_delay: updatedCampaignData.minDelay,
      max_delay: updatedCampaignData.maxDelay,
      status: updatedCampaignData.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", updatedCampaignData.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating campaign:", error);
    return null;
  }
  return data as Campaign;
};

// Atualiza somente o status
export const updateCampaignStatus = async (id: string, status: CampaignStatus): Promise<Campaign | null> => {
  const { data, error } = await supabase
    .from("campaigns")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating campaign status:", error);
    return null;
  }
  return data as Campaign;
};

export const deleteCampaign = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) {
    console.error("Error deleting campaign:", error);
    return false;
  }
  return true;
};

export const getCampaignById = async (id: string): Promise<Campaign | null> => {
  const { data, error } = await supabase.from("campaigns").select("*").eq("id", id).single();
  if (error) {
    console.error("Error fetching campaign by ID:", error);
    return null;
  }
  return data as Campaign;
};