import { supabase } from "@/integrations/supabase/client";

export interface Instance {
  id?: string;
  name: string;
  url: string;
  instanceName: string;
  apiKey: string;
  user_id?: string; // Added for Supabase RLS
}

export const getInstances = async (): Promise<Instance[]> => {
  const { data, error } = await supabase.from("instances").select("*");
  if (error) {
    console.error("Error fetching instances:", error);
    return [];
  }
  // Explicitly map snake_case from DB to camelCase in interface
  return data.map(dbInstance => ({
    id: dbInstance.id,
    name: dbInstance.name,
    url: dbInstance.url,
    instanceName: dbInstance.instance_name,
    apiKey: dbInstance.api_key,
    user_id: dbInstance.user_id,
  })) as Instance[];
};

export const saveInstance = async (userId: string, instance: Omit<Instance, 'user_id'>): Promise<Instance | null> => {
  if (instance.id) {
    // Update existing instance
    const { data, error } = await supabase
      .from("instances")
      .update({
        name: instance.name,
        url: instance.url,
        instance_name: instance.instanceName,
        api_key: instance.apiKey,
        updated_at: new Date().toISOString(),
      })
      .eq("id", instance.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating instance:", error);
      return null;
    }
    // Explicitly map snake_case from DB to camelCase in interface for the returned data
    return data ? {
      id: data.id,
      name: data.name,
      url: data.url,
      instanceName: data.instance_name,
      apiKey: data.api_key,
      user_id: data.user_id,
    } as Instance : null;
  } else {
    // Insert new instance
    const { data, error } = await supabase
      .from("instances")
      .insert({
        user_id: userId,
        name: instance.name,
        url: instance.url,
        instance_name: instance.instanceName,
        api_key: instance.apiKey,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding instance:", error);
      return null;
    }
    // Explicitly map snake_case from DB to camelCase in interface for the returned data
    return data ? {
      id: data.id,
      name: data.name,
      url: data.url,
      instanceName: data.instance_name,
      apiKey: data.api_key,
      user_id: data.user_id,
    } as Instance : null;
  }
};

export const getInstanceById = async (id: string): Promise<Instance | null> => {
  const { data, error } = await supabase.from("instances").select("*").eq("id", id).single();
  if (error) {
    console.error("Error fetching instance by ID:", error);
    return null;
  }
  // Explicitly map snake_case from DB to camelCase in interface
  return data ? {
    id: data.id,
    name: data.name,
    url: data.url,
    instanceName: data.instance_name,
    apiKey: data.api_key,
    user_id: data.user_id,
  } as Instance : null;
};

export const deleteInstance = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from("instances").delete().eq("id", id);
  if (error) {
    console.error("Error deleting instance:", error);
    return false;
  }
  return true;
};