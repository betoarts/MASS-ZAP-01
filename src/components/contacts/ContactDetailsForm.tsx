"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Contact } from "@/lib/contact-storage";

const formSchema = z.object({
  phoneNumber: z.string().min(10, {
    message: "O número de telefone deve ter pelo menos 10 dígitos (incluindo DDD).",
  }),
  fullName: z.string().optional(),
  firstName: z.string().optional(),
  customData: z.string().optional().transform((val) => {
    if (!val) return undefined;
    try {
      const parsed = JSON.parse(val);
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error("Dados personalizados devem ser um objeto JSON válido.");
      }
      return parsed;
    } catch (e) {
      throw new Error("Dados personalizados devem ser um objeto JSON válido.");
    }
  }),
});

interface ContactDetailsFormProps {
  initialData?: Contact | null;
  onSave: (contact: Omit<Contact, 'id' | 'contact_list_id'>) => void;
}

export const ContactDetailsForm: React.FC<ContactDetailsFormProps> = ({ initialData, onSave }) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phoneNumber: initialData?.phoneNumber || "",
      fullName: initialData?.fullName || "",
      firstName: initialData?.firstName || "",
      customData: initialData?.custom_data ? JSON.stringify(initialData.custom_data, null, 2) : "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const contactToSave: Omit<Contact, 'id' | 'contact_list_id'> = {
      phoneNumber: values.phoneNumber,
      fullName: values.fullName || undefined,
      firstName: values.firstName || undefined,
      custom_data: values.customData,
    };
    onSave(contactToSave);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Telefone</FormLabel>
              <FormControl>
                <Input placeholder="5511987654321" {...field} />
              </FormControl>
              <FormDescription>
                Formato numérico, ex: 5511987654321
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="João da Silva" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Primeiro Nome (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="João" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="customData"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dados Personalizados (JSON Opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='{"cidade": "São Paulo", "idade": 30}'
                  className="resize-y min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          {initialData ? "Salvar Alterações" : "Adicionar Contato"}
        </Button>
      </form>
    </Form>
  );
};