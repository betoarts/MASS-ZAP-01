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

interface QRCodeResponse {
  pairingCode?: string;
  code?: string;
  base64?: string; // Adicionando campo base64
  count?: number;
}

interface ConnectionStateResponse {
  instance?: {
    instanceName: string;
    state: string;
  };
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
  const [qrCode, setQrCode] = React.useState<string>("");
  const [connectionState, setConnectionState] = React.useState<string>("disconnected");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const pollingRef = React.useRef<NodeJS.Timeout | null>(null);

  const getConnectionStatus = async () => {
    try {
      console.log(`[QR] Checking connection status for ${instance.instanceName}...`);
      const response = await fetch(
        `${instance.url}/instance/connectionState/${instance.instanceName}`,
        {
          headers: {
            "apikey": instance.apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(`[QR] Connection status response:`, response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[QR] Failed to get connection status: ${response.status} - ${errorText}`);
        throw new Error(`Failed to get connection status: ${response.status}`);
      }

      const data: ConnectionStateResponse = await response.json();
      console.log(`[QR] Connection status data:`, data);
      return data.instance?.state || "disconnected";
    } catch (error) {
      console.error("[QR] Error getting connection status:", error);
      return "disconnected";
    }
  };

  const generateQRCode = async () => {
    console.log(`[QR] Botão clicado! Gerando QR code...`);
    setIsLoading(true);
    
    try {
      const url = `${instance.url}/instance/connect/${instance.instanceName}`;
      console.log(`[QR] Request URL: ${url}`);
      console.log(`[QR] Headers:`, {
        "apikey": instance.apiKey,
        "Content-Type": "application/json",
      });

      const response = await fetch(url, {
        headers: {
          "apikey": instance.apiKey,
          "Content-Type": "application/json",
        },
      });

      console.log(`[QR] QR Code response status:`, response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[QR] Failed to generate QR code: ${response.status} - ${errorText}`);
        throw new Error(`Failed to generate QR code: ${response.status} - ${errorText}`);
      }

      const data: QRCodeResponse = await response.json();
      console.log(`[QR] QR Code response data:`, data);
      
      // Verificar qual campo contém o QR Code
      if (data.base64) {
        console.log(`[QR] Using base64 field, length: ${data.base64.length}`);
        console.log(`[QR] Base64 preview: ${data.base64.substring(0, 50)}...`);
        
        // O QR code já vem em formato data URL completo
        setQrCode(data.base64);
        setConnectionState("waiting_scan");
        setIsConnecting(true);
        
        // Iniciar polling para verificar status
        startPolling();
        
        toast.success("QR Code gerado com sucesso!");
      } else if (data.code) {
        console.log(`[QR] Using code field, length: ${data.code.length}`);
        console.log(`[QR] Code preview: ${data.code.substring(0, 50)}...`);
        
        // Se tiver apenas o campo code, tentar usar ele (mas provavelmente não é uma imagem)
        console.warn("[QR] Using 'code' field - this might not be a valid image!");
        setQrCode(`data:image/png;base64,${data.code}`);
        setConnectionState("waiting_scan");
        setIsConnecting(true);
        
        // Iniciar polling para verificar status
        startPolling();
        
        toast.success("QR Code gerado com sucesso!");
      } else {
        console.error(`[QR] No QR code fields found. Available fields:`, Object.keys(data));
        throw new Error("No QR code received - missing 'base64' or 'code' field");
      }
    } catch (error) {
      console.error("[QR] Error generating QR code:", error);
      toast.error(`Erro ao gerar QR Code: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setConnectionState("error");
    } finally {
      setIsLoading(false);
    }
  };

  const startPolling = () => {
    console.log(`[QR] Starting polling for connection status...`);
    
    // Limpar polling anterior se existir
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    // Verificar status a cada 3 segundos
    pollingRef.current = setInterval(async () => {
      console.log(`[QR] Polling connection status...`);
      const status = await getConnectionStatus();
      console.log(`[QR] Current status: ${status}`);
      setConnectionState(status);
      
      if (status === "open") {
        console.log(`[QR] Connection established!`);
        setIsConnecting(false);
        toast.success("Conexão estabelecida com sucesso!");
        // Parar polling após conexão bem-sucedida
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    }, 3000);
  };

  const handleDisconnect = async () => {
    console.log(`[QR] Attempting to disconnect ${instance.instanceName}...`);
    
    try {
      // Note: A API Evolution pode não ter um endpoint DELETE para desconectar
      // Neste caso, vamos apenas limpar o estado local
      setConnectionState("disconnected");
      setQrCode("");
      setIsConnecting(false);
      toast.success("Estado de conexão resetado!");
      
      // Parar polling
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    } catch (error) {
      console.error("[QR] Error disconnecting:", error);
      toast.error("Erro ao desconectar");
    }
  };

  React.useEffect(() => {
    // Limpar polling quando o componente for desmontado
    return () => {
      console.log(`[QR] Cleaning up polling...`);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (isOpen && instance) {
      console.log(`[QR] Dialog opened, checking initial status...`);
      // Obter status inicial quando abrir
      getConnectionStatus().then(status => {
        console.log(`[QR] Initial status: ${status}`);
        setConnectionState(status);
      });
    }
  }, [isOpen, instance]);

  // Mapear status da API para nossos estados internos
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

  // Verificar se deve mostrar o botão de gerar QR Code
  const shouldShowQRButton = () => {
    const displayStatus = getDisplayStatus(connectionState);
    return (displayStatus === "disconnected" || displayStatus === "connecting") && !qrCode;
  };

  // Verificar se deve mostrar o QR Code
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
                <Button 
                  onClick={generateQRCode} 
                  disabled={isLoading}
                  className="w-full"
                >
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
                    <img 
                      src={qrCode} 
                      alt="QR Code WhatsApp" 
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                  <p className="text-sm text-center text-muted-foreground">
                    Abra o WhatsApp no seu celular, toque em <strong>Menu ⋯</strong> ou <strong>Configurações ⚙️</strong>, 
                    depois em <strong>Aparelhos Conectados</strong> e escaneie este código.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={generateQRCode}
                    disabled={isLoading}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Atualizar QR Code
                  </Button>
                </>
              )}

              {getDisplayStatus(connectionState) === "open" && (
                <Button 
                  variant="destructive" 
                  onClick={handleDisconnect}
                  className="w-full"
                >
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