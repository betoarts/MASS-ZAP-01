"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Contact, ContactList, bulkAddContactsToList } from "@/lib/contact-storage";
import Papa from "papaparse";
import { toast } from "sonner";
import { useSession } from "@/components/auth/SessionContextProvider"; // Import useSession

const formSchema = z.object({
  file: z.any().refine((file) => file?.size > 0, "Um arquivo CSV é obrigatório."), // CORREÇÃO AQUI: usando 'size'
  phoneNumberColumn: z.string().min(1, "Mapeamento do número de telefone é obrigatório."),
  fullNameColumn: z.string().optional(),
  firstNameColumn: z.string().optional(),
});

interface ContactImportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  contactList: ContactList;
  onImportSuccess: () => void;
}

export const ContactImportDialog: React.FC<ContactImportDialogProps> = ({
  isOpen,
  onOpenChange,
  contactList,
  onImportSuccess,
}) => {
  const [csvHeaders, setCsvHeaders] = React.useState<string[]>([]);
  const [csvDataPreview, setCsvDataPreview] = React.useState<any[]>([]);
  const { user } = useSession(); // Get user from session

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      file: undefined,
      phoneNumberColumn: "",
      fullNameColumn: "",
      firstNameColumn: "",
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        preview: 5, // Only parse first 5 rows for preview
        complete: (results) => {
          if (results.errors.length) {
            toast.error("Erro ao analisar CSV", { description: results.errors[0].message });
            return;
          }
          setCsvHeaders(Object.keys(results.data[0] || {}));
          setCsvDataPreview(results.data);
          form.setValue("file", file);
          form.clearErrors("file");
        },
        error: (error) => {
          toast.error("Erro ao analisar CSV", { description: error.message });
        },
      });
    } else {
      setCsvHeaders([]);
      setCsvDataPreview([]);
      form.setValue("file", undefined);
    }
  };

  const parseAndMapContacts = (data: any[], phoneNumberCol: string, fullNameCol?: string, firstNameCol?: string): Omit<Contact, 'id'>[] => {
    // Regex atualizado para aceitar apenas dígitos, sem o '+' inicial
    const phoneRegex = /^[1-9]\d{1,14}$/; 

    const mapped = data.map((row, index) => {
      const rawPhoneNumber = row[phoneNumberCol]?.toString() || '';
      let cleanedPhoneNumber = rawPhoneNumber.replace(/\D/g, ''); // Remove TODOS os caracteres não numéricos

      console.log(`Processando linha ${index + 1}:`);
      console.log(`  Número de telefone original: "${rawPhoneNumber}"`);
      console.log(`  Número de telefone limpo: "${cleanedPhoneNumber}"`);

      const isValidPhoneNumber = phoneRegex.test(cleanedPhoneNumber);
      console.log(`  Válido (regex /^[1-9]\\d{1,14}$/): ${isValidPhoneNumber}`);

      if (!isValidPhoneNumber) {
        console.warn(`  Contato na linha ${index + 1} ignorado devido a número de telefone inválido: "${rawPhoneNumber}"`);
        return null; // Retorna null para ser filtrado depois
      }

      const contact: Omit<Contact, 'id'> = {
        contact_list_id: contactList.id,
        phoneNumber: cleanedPhoneNumber,
      };

      if (fullNameCol && row[fullNameCol]) {
        contact.fullName = row[fullNameCol];
      }
      if (firstNameCol && row[firstNameCol]) {
        contact.firstName = row[firstNameCol];
      }

      // Add custom data
      const customData: Record<string, string | undefined> = {};
      csvHeaders.forEach(header => {
        if (header !== phoneNumberCol && header !== fullNameCol && header !== firstNameCol) {
          customData[header.toLowerCase().replace(/[^a-z0-9]/g, '_')] = row[header];
        }
      });
      if (Object.keys(customData).length > 0) {
        contact.custom_data = customData;
      }
      console.log(`  Contato mapeado:`, contact);
      return contact;
    }).filter((c): c is Omit<Contact, 'id'> => c !== null); // Filtra contatos nulos

    console.log(`Total de contatos válidos após mapeamento: ${mapped.length}`);
    return mapped;
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast.error("Você precisa estar logado para importar contatos.");
      return;
    }

    const file = values.file;
    if (!file) return;

    const loadingToastId = toast.loading("Importando contatos...");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        if (results.errors.length) {
          toast.error("Erro ao analisar CSV", { description: results.errors[0].message, id: loadingToastId });
          return;
        }

        const mappedContacts = parseAndMapContacts(
          results.data,
          values.phoneNumberColumn,
          values.fullNameColumn,
          values.firstNameColumn
        );

        if (mappedContacts.length === 0) {
          toast.error("Nenhum contato válido encontrado no CSV após a limpeza e validação. Verifique o formato dos números de telefone.", { id: loadingToastId });
          return;
        }

        const success = await bulkAddContactsToList(user.id, contactList.id, mappedContacts);

        if (success) {
          toast.success(`${mappedContacts.length} contatos importados com sucesso para a lista "${contactList.name}"!`, { id: loadingToastId });
          onImportSuccess();
          onOpenChange(false);
          form.reset();
          setCsvHeaders([]);
          setCsvDataPreview([]);
        } else {
          toast.error("Falha ao importar contatos.", { id: loadingToastId });
        }
      },
      error: (error) => {
        toast.error("Erro ao analisar CSV", { description: error.message, id: loadingToastId });
      },
    });
  };

  React.useEffect(() => {
    if (!isOpen) {
      form.reset();
      setCsvHeaders([]);
      setCsvDataPreview([]);
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Contatos para "{contactList.name}"</DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV e mapeie as colunas para os campos de contato.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="file"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Arquivo CSV</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {csvHeaders.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Mapeamento de Colunas</h3>
                <FormField
                  control={form.control}
                  name="phoneNumberColumn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Telefone (Obrigatório)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a coluna do número de telefone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {csvHeaders.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fullNameColumn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo (Opcional)</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value === "none-selected" ? "" : value)} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a coluna do nome completo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none-selected">Nenhum</SelectItem>
                          {csvHeaders.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="firstNameColumn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primeiro Nome (Opcional)</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value === "none-selected" ? "" : value)} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a coluna do primeiro nome" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none-selected">Nenhum</SelectItem>
                          {csvHeaders.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <h3 className="text-lg font-semibold mt-6">Pré-visualização dos Dados</h3>
                <div className="rounded-md border max-h-[200px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {csvHeaders.map((header) => (
                          <TableHead key={header}>{header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvDataPreview.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {csvHeaders.map((header) => (
                            <TableCell key={`${rowIndex}-${header}`}>
                              {row[header]}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="submit" disabled={!form.formState.isValid || form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Importando..." : "Importar Contatos"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};