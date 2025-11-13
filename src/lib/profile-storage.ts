import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  updated_at?: string;
}

export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
  return data as Profile;
};

export const updateProfile = async (userId: string, profile: Omit<Profile, 'updated_at'>): Promise<Profile | null> => {
  // A política RLS garantirá que apenas o proprietário possa atualizar.
  const { data, error } = await supabase
    .from("profiles")
    .update({
      first_name: profile.first_name,
      last_name: profile.last_name,
      avatar_url: profile.avatar_url,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId) // Use userId do argumento para garantir que o usuário correto está atualizando
    .select()
    .single();

  if (error) {
    console.error("Error updating profile:", error);
    return null;
  }
  return data as Profile;
};