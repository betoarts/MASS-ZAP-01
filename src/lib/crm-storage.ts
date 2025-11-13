import { supabase } from "@/integrations/supabase/client";

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  phone_number: string;
  email?: string;
  address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const getCustomers = async (): Promise<Customer[]> => {
  const { data, error } = await supabase.from("customers").select("*").order("name", { ascending: true });
  if (error) {
    console.error("Error fetching customers:", error);
    return [];
  }
  return data as Customer[];
};

export const getCustomerById = async (id: string): Promise<Customer | null> => {
  const { data, error } = await supabase.from("customers").select("*").eq("id", id).single();
  if (error) {
    console.error("Error fetching customer by ID:", error);
    return null;
  }
  return data as Customer;
};

export const addCustomer = async (userId: string, newCustomer: Omit<Customer, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Customer | null> => {
  const { data, error } = await supabase
    .from("customers")
    .insert({
      user_id: userId,
      name: newCustomer.name,
      phone_number: newCustomer.phone_number,
      email: newCustomer.email,
      address: newCustomer.address,
      notes: newCustomer.notes,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding customer:", error);
    return null;
  }
  return data as Customer;
};

export const updateCustomer = async (userId: string, updatedCustomer: Omit<Customer, 'user_id' | 'created_at' | 'updated_at'> & { id: string }): Promise<Customer | null> => {
  const { data, error } = await supabase
    .from("customers")
    .update({
      name: updatedCustomer.name,
      phone_number: updatedCustomer.phone_number,
      email: updatedCustomer.email,
      address: updatedCustomer.address,
      notes: updatedCustomer.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", updatedCustomer.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating customer:", error);
    return null;
  }
  return data as Customer;
};

export const deleteCustomer = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) {
    console.error("Error deleting customer:", error);
    return false;
  }
  return true;
};