"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, QrCode, WifiOff, Wifi, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Instance } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/auth/SessionContextProvider";

interface QRCodeResponse {
  pairingCode?: string;
  code?: string;
  base64?: string;
  count?: number;
}

interface ConnectionStateResponse {
  instance?: {
    instanceName: string;
    state: string;
  };
  state?: string;
}

interface InstanceQRConnectionProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  instance: Instance;
}

export const InstanceQRConnection: React.FC<InstanceQRConnectionProps> = ({
  isOpen,
  onOpenChange,
  instance,
}) => {
  const { user } = useSession();
  const [qrCode, setQrCode] = React.useState<string>("");
  const [connectionState, setConnectionState] = React.useState<string>("disconnected");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const pollingRef = React.useRef<NodeJS.Timeout | null>(null);

  const callProxy = React.useCallback(
    async (action: "connectionState" | "connect") => {
      const hasPersistedId = !!instance.id && !!user?.id;
      const body = hasPersistedId
        ? { action, instanceId: instance.id as string, userId: user!.id }
        : { action, url: instance.url, instanceName: instance.instanceName, apiKey: instance.apiKey };

      const { data, error } = await supabase.functions.invoke("evolution-proxy", { body });
      if (error) {
        throw new Error(error.message);
      }
      return data as { success: boolean; status: number; data: any };
    },
    [instance, user]
  );

  const getConnectionStatus = async () => {
    try {
      const res = await callProxy("connectionState");
      if (!res.success) {
        console.error("[QR] evolution-proxy connectionState non-OK:", res);
        const details =
          typeof res.data === "string"
            ? res.data
            : res.data?.message || res.data?.error || JSON.stringify(res.data);
        toast.error("Servidor Evolution indisponível", {
          description: `Status ${res.status}. ${details ?? ""}`.trim(),
        });
        return "disconnected";
      }
      const payload = res.data as ConnectionStateResponse;
      const state =
        (payload.instance && (payload.instance as any).state) ||
        (payload as any).state ||
        "disconnected";
      return String(state);
    } catch (error) {
      console.error("[QR] Error getting connection status:", error);
      return "disconnected";
    }
  };

  const generateQRCode = async () => {
    setIsLoading(true);
    try {
      const res = await callProxy("connect");
      if (!res.success) {
        console.error("[QR] evolution-proxy connect non-OK:", res);
        const details =
          typeof res.data === "string"
            ? res.data
            : res.data?.message || res.data?.error || JSON.stringify(res.data);
        toast.error("Não foi possível gerar o QR Code", {
          description: `Status ${res.status}. ${details ?? ""}`.trim(),
        });
        setConnectionState("error");
        return;
      }

      const data = res.data as QRCodeResponse;

      if ((data as any).base64) {
        setQrCode((data as any).base64 as string);
      } else if ((data as any).code) {
        setQrCode(`data:image/png;base64,${(data as any).code}`);
      } else {
        const maybeBase64 = (res.data && (res.data as any).qr) || (res.data && (res.data as any).image);
        if (maybeBase64) {
          setQrCode(String(maybeBase64));
        } else {
          throw new Error("QR code não encontrado na resposta.");
        }
      }

      setConnectionState("waiting_scan");
      setIsConnecting(true);
      startPolling();
      toast.success("QR Code gerado com sucesso!");
    } catch (error: any) {
      console.error("[QR] Error generating QR code:", error);
      toast.error(`Erro ao gerar QR Code: ${error.message || "Erro desconhecido"}`);
      setConnectionState("error");
    } finally {
      setIsLoading(false);
    }
  };

  const startPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      const status = await getConnectionStatus();
      setConnectionState(status);
      if (status === "open") {
        setIsConnecting(false);
        toast.success("Conexão estabelecida com sucesso!");
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    }, 3000);
  };

  const handleDisconnect = async () => {
    setConnectionState("disconnected");
    setQrCode("");
    setIsConnecting(false);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    toast.success("Estado de conexão resetado!");
  };

  React.useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  React.useEffect(() => {
    if (isOpen && instance) {
      getConnectionStatus().then(setConnectionState);
    }
  }, [isOpen, instance]);

  const getDisplayStatus = (apiStatus: string) => {
    switch (apiStatus) {
      case "open":
        return "open";
      case "close":
        return "disconnected";
      case "connecting":
        return "connecting";
      default:
        return apiStatus;
    }
  };

  const getStatusBadge = () => {
    const displayStatus = getDisplayStatus(connectionState);
    switch (displayStatus) {
      case "open":
        return <Badge className="bg-green-100 text-green-800">Conectado</Badge>;
      case "connecting":
        return <Badge className="bg-yellow-100 text-yellow-800">Conectando...</Badge>;
      case "waiting_scan":
        return <Badge className="bg-blue-100 text-blue-800">Aguardando Leitura</Badge>;
      case "disconnected":
        return <Badge variant="outline">Desconectado</Badge>;
      default:
        return <Badge variant="secondary">{displayStatus}</Badge>;
    }
  };

  const getStatusIcon = () => {
    const displayStatus = getDisplayStatus(connectionState);
    switch (displayStatus) {
      case "open":
        return <Wifi className="h-8 w-8 text-green-500" />;
      case "connecting":
      case "waiting_scan":
        return <Loader2 className="h-8 w-8 text-yellow-500 animate-spin" />;
      default:
        return <WifiOff className="h-8 w-8 text-gray-400" />;
    }
  };

  const shouldShowQRButton = () => {
    const displayStatus = getDisplayStatus(connectionState);
    return (displayStatus === "disconnected" || displayStatus === "connecting") && !qrCode;
  };

  const shouldShowQRCode = () => {
    const displayStatus = getDisplayStatus(connectionState);
    return qrCode && displayStatus !== "open";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar WhatsApp</DialogTitle>
          <DialogDescription>
            Escaneie o QR Code com seu WhatsApp para conectar a instância "{instance.name}"
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Status da Conexão</span>
              {getStatusBadge()}
            </CardTitle>
            <CardDescription>
              {getDisplayStatus(connectionState) === "open"
                ? "Sua instância está conectada ao WhatsApp"
                : "Siga as instruções abaixo para conectar"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center space-y-4">
              {getStatusIcon()}

              {shouldShowQRButton() && (
                <Button onClick={generateQRCode} disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando QR Code...
                    </>
                  ) : (
                    <>
                      <QrCode className="mr-2 h-4 w-4" />
                      Gerar QR Code
                    </>
                  )}
                </Button>
              )}

              {shouldShowQRCode() && (
                <>
                  <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300">
                    <img src={qrCode} alt="QR Code WhatsApp" className="w-48 h-48 object-contain" />
                  </div>
                  <p className="text-sm text-center text-muted-foreground">
                    Abra o WhatsApp no seu celular, toque em <strong>Menu ⋯</strong> ou{" "}
                    <strong>Configurações ⚙️</strong>, depois em <strong>Aparelhos Conectados</strong> e escaneie este código.
                  </p>
                  <Button variant="outline" onClick={generateQRCode} disabled={isLoading}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Atualizar QR Code
                  </Button>
                </>
              )}

              {getDisplayStatus(connectionState) === "open" && (
                <Button variant="destructive" onClick={handleDisconnect} className="w-full">
                  <WifiOff className="mr-2 h-4 w-4" />
                  Desconectar WhatsApp
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};