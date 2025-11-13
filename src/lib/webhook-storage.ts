import { supabase } from "@/integrations/supabase/client";

export interface WebhookSource {
  id: string;
  user_id: string;
  name: string;
  source_type: 'hubspot' | 'salesforce' | 'pipedrive' | 'universal';
  field_mapping: Record<string, string>;
  filters?: Record<string, any>;
  api_key: string; // Adicionado
  created_at: string;
  updated_at: string;
}

export const getWebhookSources = async (userId: string): Promise<WebhookSource[]> => {
  const { data, error } = await supabase
    .from("webhook_sources")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching webhook sources:", error);
    return [];
  }
  return data as WebhookSource[];
};

export const createWebhookSource = async (userId: string, source: Omit<WebhookSource, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<WebhookSource | null> => {
  const { data, error } = await supabase
    .from("webhook_sources")
    .insert({
      user_id: userId,
      name: source.name,
      source_type: source.source_type,
      field_mapping: source.field_mapping,
      filters: source.filters,
      api_key: source.api_key, // Adicionado
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating webhook source:", error);
    return null;
  }
  return data as WebhookSource;
};

export const updateWebhookSource = async (userId: string, source: Omit<WebhookSource, 'user_id' | 'created_at' | 'updated_at'>): Promise<WebhookSource | null> => {
  const { data, error } = await supabase
    .from("webhook_sources")
    .update({
      name: source.name,
      source_type: source.source_type,
      field_mapping: source.field_mapping,
      filters: source.filters,
      api_key: source.api_key, // Adicionado
      updated_at: new Date().toISOString(),
    })
    .eq("id", source.id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating webhook source:", error);
    return null;
  }
  return data as WebhookSource;
};

export const deleteWebhookSource = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from("webhook_sources").delete().eq("id", id);
  if (error) {
    console.error("Error deleting webhook source:", error);
    return false;
  }
  return true;
};