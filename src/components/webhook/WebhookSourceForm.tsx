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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WebhookSource } from "@/lib/webhook-storage";

const formSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  source_type: z.string().min(1, "Selecione um tipo de fonte"),
  field_mapping: z.string().min(10, "Mapeamento de campos é obrigatório"),
  filters: z.string().optional(),
  api_key: z.string().min(1, "A chave da API é obrigatória. Gere uma aleatória se não tiver."), // Adicionado
});

interface WebhookSourceFormProps {
  initialData?: WebhookSource | null;
  onSave: (source: Omit<WebhookSource, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
}

export const WebhookSourceForm: React.FC<WebhookSourceFormProps> = ({ initialData, onSave }) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      source_type: initialData?.source_type || "",
      field_mapping: initialData?.field_mapping ? JSON.stringify(initialData.field_mapping, null, 2) : "",
      filters: initialData?.filters ? JSON.stringify(initialData.filters, null, 2) : "",
      api_key: initialData?.api_key || "", // Adicionado
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const fieldMapping = JSON.parse(values.field_mapping);
      const filters = values.filters ? JSON.parse(values.filters) : undefined;

      onSave({
        name: values.name,
        source_type: values.source_type as WebhookSource['source_type'],
        field_mapping: fieldMapping,
        filters: filters,
        api_key: values.api_key, // Adicionado
      });
    } catch (error) {
      form.setError("field_mapping", { message: "JSON inválido no mapeamento de campos" });
      if (values.filters) {
        form.setError("filters", { message: "JSON inválido nos filtros" });
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Fonte</FormLabel>
              <FormControl>
                <Input placeholder="HubSpot Principal" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="source_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Fonte</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="universal">Universal</SelectItem>
                  <SelectItem value="hubspot">HubSpot</SelectItem>
                  <SelectItem value="salesforce">Salesforce</SelectItem>
                  <SelectItem value="pipedrive">Pipedrive</SelectItem>
                  <SelectItem value="rdstation">RD Station</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="api_key"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Chave da API</FormLabel>
              <FormControl>
                <Input placeholder="Sua chave de API secreta" {...field} />
              </FormControl>
              <FormDescription>
                Use esta chave na URL do webhook para autenticação.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="field_mapping"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mapeamento de Campos (JSON)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={`{\n  "telefone": "phoneNumber",\n  "nome": "fullName",\n  "email": "email"\n}`}
                  className="font-mono text-sm"
                  rows={6}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Mapeie os campos do seu CRM para os campos do MassZapp
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="filters"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Filtros (JSON Opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={`{\n  "status": "lead",\n  "origem": "website"\n}`}
                  className="font-mono text-sm"
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Filtros para processar apenas contatos específicos
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          {initialData ? "Salvar Alterações" : "Criar Fonte"}
        </Button>
      </form>
    </Form>
  );
};