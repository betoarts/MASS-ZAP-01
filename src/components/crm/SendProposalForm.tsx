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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  mediaType: z.enum(["image", "video", "document"]).optional(),
});

interface SendProposalFormProps {
  customer: Customer;
  onProposalSent: () => void;
}

export const SendProposalForm: React.FC<SendProposalFormProps> = ({ customer, onProposalSent }) => {
  const { user } = useSession();
  const [instances, setInstances] = React.useState<Instance[]>([]);
  const [isLoadingInstances, setIsLoadingInstances] = React.useState(true);
  const [accountStatus, setAccountStatus] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [selectedFileName, setSelectedFileName] = React.useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      instanceId: "",
      messageText: "",
      mediaUrl: "",
      mediaCaption: "",
      linkPreview: false,
      mentionsEveryOne: false,
      mediaType: undefined,
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

  React.useEffect(() => {
    const fetchStatus = async () => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("account_status").eq("id", user.id).single();
      setAccountStatus((data as any)?.account_status ?? null);
    };
    fetchStatus();
  }, [user]);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Usuário não autenticado.");
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const path = `proposals/${authUser.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('campaign_media').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: ext === 'pdf' ? 'application/pdf' : file.type,
      });
      if (uploadError) throw uploadError;
      const { data: pub } = supabase.storage.from('campaign_media').getPublicUrl(path);
      const publicUrl = pub?.publicUrl || "";
      form.setValue("mediaUrl", publicUrl);
      setSelectedFileName(file.name);
      const mime = (file.type || '').toLowerCase();
      if (!form.getValues("mediaType")) {
        if (mime.includes('pdf')) form.setValue('mediaType', 'document');
        else if (mime.includes('video')) form.setValue('mediaType', 'video');
        else form.setValue('mediaType', 'image');
      }
    } finally {
      setUploading(false);
    }
  };

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
      const normalizePhone = (raw: string) => {
        const digits = String(raw || "").replace(/\D+/g, "");
        if (!digits) return raw;
        if (digits.startsWith("55")) return digits;
        if (raw.startsWith("+")) return digits;
        if (digits.length === 10 || digits.length === 11) return `55${digits}`;
        return digits;
      };
      // Derivar mimetype e fileName
      const mediaTypeVal = form.getValues('mediaType');
      let mimeType: string | undefined;
      let fileName: string | undefined;
      if (values.mediaUrl) {
        fileName = selectedFileName || (values.mediaUrl.split('/').pop()?.split('?')[0] || undefined);
        const lower = (fileName || '').toLowerCase();
        if (lower.endsWith('.pdf')) mimeType = 'application/pdf';
        else if (lower.endsWith('.png')) mimeType = 'image/png';
        else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mimeType = 'image/jpeg';
        else if (lower.endsWith('.gif')) mimeType = 'image/gif';
        else if (lower.endsWith('.mp4')) mimeType = 'video/mp4';
        else if (mediaTypeVal === 'document') mimeType = 'application/pdf';
        else if (mediaTypeVal === 'video') mimeType = 'video/mp4';
        else if (mediaTypeVal === 'image') mimeType = 'image/png';
        // defaults: fileName fallback
        if (!fileName) {
          fileName = mediaTypeVal === 'document' ? 'proposal.pdf' : mediaTypeVal === 'video' ? 'video.mp4' : 'image.png';
        }
      }

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
          phone_number: normalizePhone(customer.phone_number),
          name: customer.name,
          mediaType: form.getValues('mediaType'),
          mimeType,
          fileName,
        },
      });

      if (error) {
        console.error("Error invoking send-proposal function:", error);
        toast.error("Falha ao enviar proposta.", { description: error.message, id: loadingToastId });
      } else if (data && (data.error || data.success === false)) {
        console.error("Error from send-proposal function:", data);
        let errorDescription = data.error;
        const parseDetail = (detail: any) => {
          if (!detail) return undefined;
          if (typeof detail === "string") return detail;
          if (typeof detail.error === "string") return detail.error;
          if (typeof detail.message === "string") return detail.message;
          try { return JSON.stringify(detail); } catch { return undefined; }
        };
        if (data.details) {
          const textErr = parseDetail(data.details.text);
          const mediaErr = parseDetail(data.details.media);
          if (textErr) errorDescription += ` (Texto: ${textErr})`;
          if (mediaErr) errorDescription += ` (Mídia: ${mediaErr})`;
        }
        toast.error("Falha ao enviar proposta.", { description: errorDescription, id: loadingToastId });
      } else if (data && data.success === true && data.warning) {
        toast.success(`Proposta enviada para ${customer.name} com avisos.`, { description: data.warning, id: loadingToastId });
        onProposalSent();
        form.reset();
      } else {
        toast.success(`Proposta enviada com sucesso para ${customer.name}!`, { id: loadingToastId });
        onProposalSent();
        form.reset();
      }
    } catch (error: any) {
      console.error("Unexpected error sending proposal:", error);
      toast.error("Erro inesperado ao enviar proposta.", { description: error.message, id: loadingToastId });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {accountStatus === "paused" && (
          <Alert variant="destructive">
            <AlertTitle>Pacote de mensagens encerrado</AlertTitle>
            <AlertDescription>Seu pacote de mensagens acabou. Entre em contato com suporte para liberar mais envios.</AlertDescription>
          </Alert>
        )}
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
          name="mediaType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Mídia</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de mídia" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="image">Imagem</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem>
                  <SelectItem value="document">Documento (PDF)</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Selecione o tipo de mídia. Para PDF, use Documento (sem base64).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <FormLabel>Enviar Arquivo (Opcional)</FormLabel>
          <Input
            type="file"
            accept={
              form.getValues('mediaType') === 'video'
                ? 'video/*'
                : form.getValues('mediaType') === 'document'
                ? '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx'
                : 'image/*'
            }
            disabled={uploading || accountStatus === 'paused'}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              handleFileUpload(file);
            }}
          />
          {selectedFileName && (
            <div className="text-sm text-muted-foreground">Selecionado: {selectedFileName}</div>
          )}
        </div>

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

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || isLoadingInstances || instances.length === 0 || accountStatus === "paused"}>
          {form.formState.isSubmitting ? "Enviando..." : "Enviar Proposta"}
        </Button>
      </form>
    </Form>
  );
};