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
import { Campaign } from "@/lib/campaign-storage";
import { Instance } from "@/lib/storage";
import { ContactList } from "@/lib/contact-storage";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Smile } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { MediaUpload } from "./MediaUpload";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "O nome da campanha deve ter pelo menos 2 caracteres.",
  }),
  instanceId: z.string().min(1, {
    message: "Selecione uma instância.",
  }),
  contactListId: z.string().min(1, {
    message: "Selecione uma lista de contatos.",
  }),
  messageText: z.string().min(1, {
    message: "A mensagem não pode ser vazia.",
  }),
  mediaUrl: z.string().optional(),
  mediaCaption: z.string().optional(),
  linkPreview: z.boolean().default(false),
  mentionsEveryOne: z.boolean().default(false),
  scheduledAt: z.string().optional(), // ISO string for date/time
  minDelay: z.coerce.number().min(1, { message: "Delay mínimo deve ser pelo menos 1 segundo." }).default(5),
  maxDelay: z.coerce.number().min(1, { message: "Delay máximo deve ser pelo menos 1 segundo." }).default(15),
});

interface CampaignFormProps {
  initialData?: Campaign | null;
  onSave: (campaign: z.infer<typeof formSchema>) => void;
  instances: Instance[];
  contactLists: ContactList[];
}

export const CampaignForm: React.FC<CampaignFormProps> = ({
  initialData,
  onSave,
  instances,
  contactLists,
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      instanceId: initialData.instance_id,
      contactListId: initialData.contact_list_id,
      messageText: initialData.message_text,
      mediaUrl: initialData.media_url,
      mediaCaption: initialData.media_caption,
      linkPreview: initialData.link_preview,
      mentionsEveryOne: initialData.mentions_every_one,
      scheduledAt: initialData.scheduled_at,
      minDelay: initialData.min_delay,
      maxDelay: initialData.max_delay,
    } : {
      name: "",
      instanceId: "",
      contactListId: "",
      messageText: "",
      mediaUrl: "",
      mediaCaption: "",
      linkPreview: false,
      mentionsEveryOne: false,
      minDelay: 5,
      maxDelay: 15,
      scheduledAt: undefined,
    },
  });

  const messageTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const mediaCaptionInputRef = React.useRef<HTMLInputElement>(null); // Ref para o input de legenda

  // Ensure maxDelay is always greater than or equal to minDelay
  React.useEffect(() => {
    const minDelay = form.watch("minDelay");
    const maxDelay = form.watch("maxDelay");
    if (minDelay && maxDelay && minDelay > maxDelay) {
      form.setValue("maxDelay", minDelay);
    }
  }, [form.watch("minDelay"), form.watch("maxDelay"), form]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    onSave(values);
  }

  const handleEmojiClick = (emojiData: EmojiClickData, fieldName: "messageText" | "mediaCaption") => {
    if (fieldName === "messageText") {
      const textarea = messageTextareaRef.current;
      if (textarea) {
        const { selectionStart, selectionEnd, value } = textarea;
        const newText = value.substring(0, selectionStart) + emojiData.emoji + value.substring(selectionEnd);
        form.setValue("messageText", newText);
        // Manually set cursor position after inserting emoji
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
        // Manually set cursor position after inserting emoji
        const newCursorPosition = selectionStart + emojiData.emoji.length;
        input.focus();
        input.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Campanha</FormLabel>
              <FormControl>
                <Input placeholder="Campanha de Lançamento" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="instanceId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Instância Evolution</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma instância" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {instances.map((instance) => (
                    <SelectItem key={instance.id} value={instance.id!}>
                      {instance.name} ({instance.instanceName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                A instância do WhatsApp que será usada para enviar as mensagens.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contactListId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lista de Contatos</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma lista de contatos" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {contactLists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name} ({list.contacts.length} contatos)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                A lista de contatos para quem as mensagens serão enviadas.
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
              <FormLabel>Mensagem de Texto</FormLabel>
              <div className="relative">
                <FormControl>
                  <Textarea
                    placeholder="Olá {{primeiro_nome}}, temos uma novidade para você!"
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
              <FormLabel>Mídia (Opcional)</FormLabel>
              <FormControl>
                <MediaUpload
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormDescription>
                Envie uma imagem, vídeo ou documento para anexar à mensagem.
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
                    placeholder="Confira nossa nova promoção!"
                    className="pr-10" // Adiciona padding para o botão de emoji
                    {...field}
                    ref={mediaCaptionInputRef} // Atribui a ref ao input
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="minDelay"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Delay Mínimo (segundos)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormDescription>
                  Tempo mínimo entre o envio de mensagens.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maxDelay"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Delay Máximo (segundos)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormDescription>
                  Tempo máximo entre o envio de mensagens.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="scheduledAt"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Agendar Envio (Opcional)</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(new Date(field.value), "PPP HH:mm", { locale: ptBR })
                      ) : (
                        <span>Selecionar data e hora</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        // Keep existing time if available, otherwise set to current time
                        const existingDate = field.value ? new Date(field.value) : new Date();
                        date.setHours(existingDate.getHours());
                        date.setMinutes(existingDate.getMinutes());
                        form.setValue("scheduledAt", date.toISOString());
                      } else {
                        form.setValue("scheduledAt", undefined);
                      }
                    }}
                    initialFocus
                    locale={ptBR}
                  />
                  <div className="p-3 border-t border-border">
                    <Input
                      type="time"
                      value={field.value ? format(new Date(field.value), "HH:mm") : ""}
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value.split(':').map(Number);
                        const date = field.value ? new Date(field.value) : new Date();
                        date.setHours(hours);
                        date.setMinutes(minutes);
                        form.setValue("scheduledAt", date.toISOString());
                      }}
                      className="w-full"
                    />
                  </div>
                </PopoverContent>
              </Popover>
              <FormDescription>
                Defina uma data e hora para a campanha ser iniciada automaticamente.
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

        <Button type="submit" className="w-full">
          {initialData ? "Salvar Alterações" : "Criar Campanha"}
        </Button>
      </form>
    </Form>
  );
};