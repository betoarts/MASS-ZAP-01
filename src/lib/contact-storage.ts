import { supabase } from "@/integrations/supabase/client";

export interface Contact {
  id: string;
  contact_list_id: string;
  phoneNumber: string;
  fullName?: string;
  firstName?: string;
  custom_data?: Record<string, string | undefined>;
}

export interface ContactList {
  id: string;
  name: string;
  user_id?: string;
  contacts: Contact[];
}

export const getContactLists = async (): Promise<ContactList[]> => {
  const { data, error } = await supabase.from("contact_lists").select("*");
  if (error) {
    console.error("Error fetching contact lists:", error);
    return [];
  }
  
  const listsWithContacts = await Promise.all(
    data.map(async (list) => {
      const contacts = await getContactsByListId(list.id);
      return { ...list, contacts };
    })
  );
  return listsWithContacts as ContactList[];
};

export const addContactList = async (userId: string, newList: Omit<ContactList, 'id' | 'contacts' | 'user_id'>): Promise<ContactList | null> => {
  const { data, error } = await supabase
    .from("contact_lists")
    .insert({
      user_id: userId,
      name: newList.name,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding contact list:", error);
    return null;
  }
  return { ...data as ContactList, contacts: [] };
};

export const updateContactList = async (userId: string, updatedList: Omit<ContactList, 'contacts' | 'user_id'>): Promise<ContactList | null> => {
  // A política RLS garantirá que apenas o proprietário possa atualizar.
  const { data, error } = await supabase
    .from("contact_lists")
    .update({
      name: updatedList.name,
      updated_at: new Date().toISOString(),
    })
    .eq("id", updatedList.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating contact list:", error);
    return null;
  }
  return { ...data as ContactList, contacts: [] };
};

export const deleteContactList = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from("contact_lists").delete().eq("id", id);
  if (error) {
    console.error("Error deleting contact list:", error);
    return false;
  }
  return true;
};

export const getContactListById = async (id: string): Promise<ContactList | null> => {
  const { data: listData, error: listError } = await supabase
    .from("contact_lists")
    .select("*")
    .eq("id", id)
    .single();

  if (listError) {
    console.error("Error fetching contact list by ID:", listError);
    return null;
  }

  const { data: contactsData, error: contactsError } = await supabase
    .from("contacts")
    .select("*")
    .eq("contact_list_id", id);

  if (contactsError) {
    console.error("Error fetching contacts for list:", contactsError);
    return { ...listData as ContactList, contacts: [] };
  }

  // Explicitly map snake_case from DB to camelCase in interface for contacts
  const mappedContacts = contactsData.map(dbContact => ({
    id: dbContact.id,
    contact_list_id: dbContact.contact_list_id,
    phoneNumber: dbContact.phone_number,
    fullName: dbContact.full_name,
    firstName: dbContact.first_name,
    custom_data: dbContact.custom_data,
  })) as Contact[];

  return { ...listData as ContactList, contacts: mappedContacts };
};

export const getContactsByListId = async (listId: string): Promise<Contact[]> => {
  const { data, error } = await supabase.from("contacts").select("*").eq("contact_list_id", listId);
  if (error) {
    console.error("Error fetching contacts for list:", error);
    return [];
  }
  // Explicitly map snake_case from DB to camelCase in interface
  return data.map(dbContact => ({
    id: dbContact.id,
    contact_list_id: dbContact.contact_list_id,
    phoneNumber: dbContact.phone_number,
    fullName: dbContact.full_name,
    firstName: dbContact.first_name,
    custom_data: dbContact.custom_data,
  })) as Contact[];
};

export const addContact = async (userId: string, newContact: Omit<Contact, 'id'>): Promise<Contact | null> => {
  // A política RLS garantirá que o usuário só possa adicionar contatos às suas próprias listas.
  const { data, error } = await supabase
    .from("contacts")
    .insert({
      contact_list_id: newContact.contact_list_id,
      phone_number: newContact.phoneNumber,
      full_name: newContact.fullName,
      first_name: newContact.firstName,
      custom_data: newContact.custom_data,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding contact:", error);
    return null;
  }
  return data as Contact;
};

export const bulkAddContactsToList = async (userId: string, contactListId: string, newContacts: Omit<Contact, 'id'>[]): Promise<boolean> => {
  const contactsToInsert = newContacts.map(contact => ({
    contact_list_id: contactListId,
    phone_number: contact.phoneNumber,
    full_name: contact.fullName,
    first_name: contact.firstName,
    custom_data: contact.custom_data,
  }));

  const { error } = await supabase.from("contacts").insert(contactsToInsert);

  if (error) {
    console.error("Error bulk adding contacts:", error);
    return false;
  }
  return true;
};

export const updateContact = async (userId: string, updatedContact: Contact): Promise<Contact | null> => {
  // A política RLS garantirá que o usuário só possa atualizar contatos em suas próprias listas.
  const { data, error } = await supabase
    .from("contacts")
    .update({
      phone_number: updatedContact.phoneNumber,
      full_name: updatedContact.fullName,
      first_name: updatedContact.firstName,
      custom_data: updatedContact.custom_data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", updatedContact.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating contact:", error);
    return null;
  }
  return data as Contact;
};

export const deleteContact = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) {
    console.error("Error deleting contact:", error);
    return false;
  }
  return true;
};