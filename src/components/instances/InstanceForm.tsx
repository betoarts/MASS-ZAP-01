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
import { Instance } from "@/lib/storage";
import { QrCode, Wifi, WifiOff } from "lucide-react";
import { InstanceQRConnection } from "./InstanceQRConnection";

const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, {
    message: "O nome da instância deve ter pelo menos 2 caracteres.",
  }),
  url: z.string().url({
    message: "A URL do servidor deve ser uma URL válida.",
  }),
  instanceName: z.string().min(1, {
    message: "O nome da instância Evolution é obrigatório.",
  }),
  apiKey: z.string().min(1, {
    message: "A chave da API é obrigatória.",
  }),
});

interface InstanceFormProps {
  initialData?: Instance | null;
  onSave: (instance: Instance) => void;
}

export const InstanceForm: React.FC<InstanceFormProps> = ({ initialData, onSave }) => {
  const [isQRDialogOpen, setIsQRDialogOpen] = React.useState(false);
  const [connectionStatus, setConnectionStatus] = React.useState<string>("unknown");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: "",
      url: "",
      instanceName: "",
      apiKey: "",
    },
  });

  // Função para verificar status de conexão
  const checkConnectionStatus = React.useCallback(async () => {
    const currentData = form.getValues();
    if (currentData.url && currentData.instanceName && currentData.apiKey) {
      try {
        const response = await fetch(
          `${currentData.url}/instance/connectionState/${currentData.instanceName}`,
          {
            headers: {
              "apikey": currentData.apiKey,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setConnectionStatus(data.instance?.state || "disconnected");
        } else {
          setConnectionStatus("error");
        }
      } catch (error) {
        console.error("Error checking connection status:", error);
        setConnectionStatus("error");
      }
    }
  }, [form]);

  // Verificar status quando o formulário é carregado com dados existentes
  React.useEffect(() => {
    if (initialData) {
      checkConnectionStatus();
    }
  }, [initialData, checkConnectionStatus]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    onSave(values as Instance);
  }

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case "open":
        return <Wifi className="h-4 w-4 text-green-500" />;
      case "disconnected":
        return <WifiOff className="h-4 w-4 text-gray-400" />;
      case "connecting":
        return <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-400" />;
    }
  };

  const getConnectionText = () => {
    switch (connectionStatus) {
      case "open":
        return "Conectado";
      case "disconnected":
        return "Desconectado";
      case "connecting":
        return "Conectando...";
      default:
        return "Status desconhecido";
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Instância</FormLabel>
                <FormControl>
                  <Input placeholder="Campanha Principal" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL do Servidor</FormLabel>
                <FormControl>
                  <Input placeholder="https://evolution.vendaszapp.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="instanceName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Instância Evolution</FormLabel>
                <FormControl>
                  <Input placeholder="{instance}" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="apiKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chave da API</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="<api-key>" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Status de Conexão e Botão QR Code */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              {getConnectionIcon()}
              <span className="text-sm font-medium">{getConnectionText()}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsQRDialogOpen(true)}
              disabled={!form.formState.isValid}
            >
              <QrCode className="mr-2 h-4 w-4" />
              Conectar QR Code
            </Button>
          </div>

          <Button type="submit" className="w-full">
            {initialData ? "Salvar Alterações" : "Adicionar Instância"}
          </Button>
        </form>
      </Form>

      {/* Diálogo de Conexão QR Code */}
      <InstanceQRConnection
        isOpen={isQRDialogOpen}
        onOpenChange={setIsQRDialogOpen}
        instance={{
          id: form.getValues("id") || "",
          name: form.getValues("name"),
          url: form.getValues("url"),
          instanceName: form.getValues("instanceName"),
          apiKey: form.getValues("apiKey"),
        }}
      />
    </>
  );
};