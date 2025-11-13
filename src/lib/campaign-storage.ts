import { supabase } from "@/integrations/supabase/client";
import { CampaignFormData } from "./campaign-utils"; // Importar CampaignFormData

export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'completed' | 'failed' | 'stopped';

export interface Campaign {
  id: string;
  user_id?: string; // Added for Supabase RLS
  name: string;
  instance_id: string; // Changed from instanceId to match DB
  contact_list_id: string; // Changed from contactListId to match DB
  message_text: string; // Changed from messageText to match DB
  media_url?: string; // Changed from mediaUrl to match DB
  media_caption?: string; // Changed from mediaCaption to match DB
  link_preview: boolean; // Changed from linkPreview to match DB
  mentions_every_one: boolean; // Changed from mentionsEveryOne to match DB
  scheduled_at?: string; // ISO string for date/time
  min_delay: number; // Changed from minDelay to match DB
  max_delay: number; // Changed from maxDelay to match DB
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
      instance_id: newCampaignData.instanceId, // Mapeamento corrigido
      contact_list_id: newCampaignData.contactListId, // Mapeamento corrigido
      message_text: newCampaignData.messageText, // Mapeamento corrigido
      media_url: newCampaignData.mediaUrl, // Mapeamento corrigido
      media_caption: newCampaignData.mediaCaption, // Mapeamento corrigido
      link_preview: newCampaignData.linkPreview, // Mapeamento corrigido
      mentions_every_one: newCampaignData.mentionsEveryOne, // Mapeamento corrigido
      scheduled_at: newCampaignData.scheduledAt, // Mapeamento corrigido
      min_delay: newCampaignData.minDelay, // Mapeamento corrigido
      max_delay: newCampaignData.maxDelay, // Mapeamento corrigido
      status: 'draft', // Default status
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
      instance_id: updatedCampaignData.instanceId, // Mapeamento corrigido
      contact_list_id: updatedCampaignData.contactListId, // Mapeamento corrigido
      message_text: updatedCampaignData.messageText, // Mapeamento corrigido
      media_url: updatedCampaignData.mediaUrl, // Mapeamento corrigido
      media_caption: updatedCampaignData.mediaCaption, // Mapeamento corrigido
      link_preview: updatedCampaignData.linkPreview, // Mapeamento corrigido
      mentions_every_one: updatedCampaignData.mentionsEveryOne, // Mapeamento corrigido
      scheduled_at: updatedCampaignData.scheduledAt, // Mapeamento corrigido
      min_delay: updatedCampaignData.minDelay, // Mapeamento corrigido
      max_delay: updatedCampaignData.maxDelay, // Mapeamento corrigido
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