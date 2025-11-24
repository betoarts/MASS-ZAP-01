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
import { Customer } from "@/lib/crm-storage";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "O nome do cliente deve ter pelo menos 2 caracteres.",
  }),
  phone_number: z.string().regex(/^55\d{10,13}$/, "Número deve iniciar com 55 e conter DDD+Número (ex: 5511987654321)."),
  email: z.string().email({ message: "E-mail inválido." }).or(z.literal("")).optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

interface ClientFormProps {
  initialData?: Customer | null;
  onSave: (customer: Omit<Customer, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
}

export const ClientForm: React.FC<ClientFormProps> = ({ initialData, onSave }) => {
  const [countryCode, setCountryCode] = React.useState<string>('55');
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: "",
      phone_number: "55",
      email: "",
      address: "",
      notes: "",
    },
  });

  React.useEffect(() => {
    form.reset(initialData || {
      name: "",
      phone_number: "55",
      email: "",
      address: "",
      notes: "",
    });
  }, [initialData, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const normalizePhone = (raw: string) => {
      const digits = String(raw || '').replace(/\D+/g, '');
      if (!digits) return raw;
      if (digits.startsWith(countryCode)) return digits;
      if (raw.startsWith('+')) return digits;
      if (digits.length === 10 || digits.length === 11) return `${countryCode}${digits}`;
      return digits;
    };
    const normalized = { ...values, phone_number: normalizePhone(values.phone_number) };
    onSave(normalized as Omit<Customer, 'id' | 'user_id' | 'created_at' | 'updated_at'>);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormItem>
          <FormLabel>País (DDI)</FormLabel>
          <Select value={countryCode} onValueChange={setCountryCode}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o país" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="55">Brasil (+55)</SelectItem>
            </SelectContent>
          </Select>
          <FormDescription>
            Selecione o DDI do país. Brasil (+55) é obrigatório.
          </FormDescription>
        </FormItem>
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
                <Input
                  placeholder={`${countryCode}11987654321`}
                  {...field}
                  value={field.value}
                  onChange={(e) => {
                    const raw = e.target.value || "";
                    const digits = raw.replace(/\D+/g, "");
                    const ddiRegex = new RegExp(`^${countryCode}+`);
                    const rest = digits.replace(ddiRegex, "");
                    const next = `${countryCode}${rest}`;
                    field.onChange(next);
                  }}
                  onKeyDown={(e) => {
                    const input = e.target as HTMLInputElement;
                    const pos = input.selectionStart ?? 0;
                    if ((e.key === "Backspace" || e.key === "Delete") && pos <= countryCode.length) {
                      e.preventDefault();
                    }
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const text = (e.clipboardData.getData("text") || "").replace(/\D+/g, "");
                    const next = text.startsWith(countryCode) ? text : `${countryCode}${text}`;
                    field.onChange(next);
                  }}
                />
              </FormControl>
              <FormDescription>
                Deve iniciar com o DDI selecionado (Brasil +55) seguido de DDD + Número.
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