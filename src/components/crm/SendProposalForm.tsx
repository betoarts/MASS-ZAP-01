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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { Customer } from "@/lib/crm-storage";
import { Instance, getInstances } from "@/lib/storage";
import { useSession } from "@/components/auth/SessionContextProvider";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  instanceId: z.string().min(1, {
    message: "Selecione uma instância para envio.",
  }),
  messageText: z.string().min(1, {
    message: "A mensagem da proposta não pode ser vazia.",
  }),
  mediaUrl: z.string().url({ message: "URL de mídia inválida." }).or(z.literal("")).optional(),
  mediaCaption: z.string().optional(),
  linkPreview: z.boolean().default(false),
  mentionsEveryOne: z.boolean().default(false), // Geralmente não aplicável para envio individual, mas mantido por consistência
});

interface SendProposalFormProps {
  customer: Customer;
  onProposalSent: () => void;
}

export const SendProposalForm: React.FC<SendProposalFormProps> = ({ customer, onProposalSent }) => {
  const { user } = useSession();
  const [instances, setInstances] = React.useState<Instance[]>([]);
  const [isLoadingInstances, setIsLoadingInstances] = React.useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      instanceId: "",
      messageText: "",
      mediaUrl: "",
      mediaCaption: "",
      linkPreview: false,
      mentionsEveryOne: false,
    },
  });

  const messageTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const mediaCaptionInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const fetchInstances = async () => {
      if (user) {
        setIsLoadingInstances(true);
        const fetchedInstances = await getInstances(user.id);
        setInstances(fetchedInstances);
        if (fetchedInstances.length > 0) {
          form.setValue("instanceId", fetchedInstances[0].id!); // Pre-select first instance
        }
        setIsLoadingInstances(false);
      }
    };
    fetchInstances();
  }, [user, form]);

  const handleEmojiClick = (emojiData: EmojiClickData, fieldName: "messageText" | "mediaCaption") => {
    if (fieldName === "messageText") {
      const textarea = messageTextareaRef.current;
      if (textarea) {
        const { selectionStart, selectionEnd, value } = textarea;
        const newText = value.substring(0, selectionStart) + emojiData.emoji + value.substring(selectionEnd);
        form.setValue("messageText", newText);
        const newCursorPosition = selectionStart + emojiData.emoji.length;
        textarea.focus();
        textarea.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    } else if (fieldName === "mediaCaption") {
      const input = mediaCaptionInputRef.current;
      if (input) {
        const { selectionStart, selectionEnd, value } = input;
        const newText = value.substring(0, selectionStart) + emojiData.emoji + value.substring(selectionEnd);
        form.setValue("mediaCaption", newText);
        const newCursorPosition = selectionStart + emojiData.emoji.length;
        input.focus();
        input.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast.error("Você precisa estar logado para enviar propostas.");
      return;
    }

    const loadingToastId = toast.loading(`Enviando proposta para ${customer.name}...`);

    try {
      const { data, error } = await supabase.functions.invoke('send-proposal', {
        body: {
          userId: user.id,
          customerId: customer.id,
          instanceId: values.instanceId,
          messageText: values.messageText,
          mediaUrl: values.mediaUrl || undefined,
          mediaCaption: values.mediaCaption || undefined,
          linkPreview: values.linkPreview,
          mentionsEveryOne: values.mentionsEveryOne,
          phone_number: customer.phone_number,
          name: customer.name,
        },
      });

      if (error) {
        console.error("Error invoking send-proposal function:", error);
        toast.error("Falha ao enviar proposta.", { description: error.message, id: loadingToastId });
      } else {
        toast.success(`Proposta enviada com sucesso para ${customer.name}!`, { id: loadingToastId });
        onProposalSent();
        form.reset(); // Reset form after successful send
      }
    } catch (error: any) {
      console.error("Unexpected error sending proposal:", error);
      toast.error("Erro inesperado ao enviar proposta.", { description: error.message, id: loadingToastId });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="instanceId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Instância Evolution</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingInstances}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma instância" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {instances.length === 0 ? (
                    <SelectItem value="no-instances" disabled>Nenhuma instância disponível</SelectItem>
                  ) : (
                    instances.map((instance) => (
                      <SelectItem key={instance.id} value={instance.id!}>
                        {instance.name} ({instance.instanceName})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormDescription>
                A instância do WhatsApp que será usada para enviar a proposta.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="messageText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mensagem da Proposta</FormLabel>
              <div className="relative">
                <FormControl>
                  <Textarea
                    placeholder={`Olá {{primeiro_nome}}, aqui está a proposta que conversamos!`}
                    className="resize-y min-h-[100px] pr-10"
                    {...field}
                    ref={messageTextareaRef}
                  />
                </FormControl>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      aria-label="Selecionar emoji para mensagem"
                    >
                      <Smile className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <EmojiPicker
                      onEmojiClick={(emojiData) => handleEmojiClick(emojiData, "messageText")}
                      autoFocusSearch={false}
                      theme={Theme.AUTO}
                      width={300}
                      height={350}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <FormDescription>
                Use variáveis como <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">{"{{primeiro_nome}}"}</code> ou <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">{"{{nome_completo}}"}</code> para personalizar.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="mediaUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL da Mídia (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="https://exemplo.com/proposta.pdf" {...field} />
              </FormControl>
              <FormDescription>
                URL de uma imagem, vídeo ou documento para anexar à proposta.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="mediaCaption"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Legenda da Mídia (Opcional)</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    placeholder="Sua proposta personalizada!"
                    className="pr-10"
                    {...field}
                    ref={mediaCaptionInputRef}
                  />
                </FormControl>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1/2 -translate-y-1/2 right-2 h-8 w-8"
                      aria-label="Selecionar emoji para legenda"
                    >
                      <Smile className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <EmojiPicker
                      onEmojiClick={(emojiData) => handleEmojiClick(emojiData, "mediaCaption")}
                      autoFocusSearch={false}
                      theme={Theme.AUTO}
                      width={300}
                      height={350}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <FormDescription>
                Texto que acompanhará a mídia. Também suporta variáveis de personalização.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col space-y-2">
          <FormField
            control={form.control}
            name="linkPreview"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Ativar Pré-visualização de Link</FormLabel>
                  <FormDescription>
                    Exibe uma pré-visualização de links na mensagem.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mentionsEveryOne"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Mencionar Todos no Grupo</FormLabel>
                  <FormDescription>
                    (Apenas para grupos) Menciona todos os participantes.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || isLoadingInstances || instances.length === 0}>
          {form.formState.isSubmitting ? "Enviando..." : "Enviar Proposta"}
        </Button>
      </form>
    </Form>
  );
};