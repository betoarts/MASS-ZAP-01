"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ContactList } from "@/lib/contact-storage";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "O nome da lista de contatos deve ter pelo menos 2 caracteres.",
  }),
});

interface ContactListFormProps {
  initialData?: ContactList | null;
  onSave: (listName: string) => void;
}

export const ContactListForm: React.FC<ContactListFormProps> = ({ initialData, onSave }) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    onSave(values.name);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Lista de Contatos</FormLabel>
              <FormControl>
                <Input placeholder="Minha Campanha de Natal" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          {initialData ? "Salvar Alterações" : "Adicionar Lista"}
        </Button>
      </form>
    </Form>
  );
};