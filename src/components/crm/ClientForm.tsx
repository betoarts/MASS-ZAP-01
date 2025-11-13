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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Customer } from "@/lib/crm-storage";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "O nome do cliente deve ter pelo menos 2 caracteres.",
  }),
  phone_number: z.string().min(10, {
    message: "O número de telefone deve ter pelo menos 10 dígitos (incluindo DDD).",
  }).regex(/^[1-9]\d{1,14}$/, "Número de telefone inválido (formato numérico, ex: 5511987654321)."),
  email: z.string().email({ message: "E-mail inválido." }).or(z.literal("")).optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

interface ClientFormProps {
  initialData?: Customer | null;
  onSave: (customer: Omit<Customer, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
}

export const ClientForm: React.FC<ClientFormProps> = ({ initialData, onSave }) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: "",
      phone_number: "",
      email: "",
      address: "",
      notes: "",
    },
  });

  React.useEffect(() => {
    form.reset(initialData || {
      name: "",
      phone_number: "",
      email: "",
      address: "",
      notes: "",
    });
  }, [initialData, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    onSave(values as Omit<Customer, 'id' | 'user_id' | 'created_at' | 'updated_at'>);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Cliente</FormLabel>
              <FormControl>
                <Input placeholder="Nome Completo do Cliente" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Telefone</FormLabel>
              <FormControl>
                <Input placeholder="5511987654321" {...field} />
              </FormControl>
              <FormDescription>
                Formato: Código do País + DDD + Número (ex: 5511987654321).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="cliente@exemplo.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Endereço (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Rua Exemplo, 123 - Cidade" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Informações adicionais sobre o cliente..." className="resize-y min-h-[80px]" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          {initialData ? "Salvar Alterações" : "Adicionar Cliente"}
        </Button>
      </form>
    </Form>
  );
};