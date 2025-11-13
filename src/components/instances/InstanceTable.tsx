"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, CircleDotDashed, CircleCheck, CircleX, QrCode, Download, Upload } from "lucide-react";
import { Instance } from "@/lib/storage";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { InstanceQRConnection } from "./InstanceQRConnection";
import { InstanceConfigExport } from "./InstanceConfigExport";
import { toast } from "sonner";
import { useSession } from "@/components/auth/SessionContextProvider";

interface InstanceTableProps {
  instances: Instance[];
  onEdit: (instance: Instance) => void;
  onDelete: (id: string) => void;
  onImportConfig?: (config: Omit<Instance, 'id' | 'user_id'>) => void;
}

export const InstanceTable: React.FC<InstanceTableProps> = ({ instances, onEdit, onDelete, onImportConfig }) => {
  const { user } = useSession();
  const [connectionStates, setConnectionStates] = React.useState<Record<string, string>>({});
  const [qrDialogInstance, setQRDialogInstance] = React.useState<Instance | null>(null);
  const [exportDialogInstance, setExportDialogInstance] = React.useState<Instance | null>(null);
  const [importDialogOpen, setImportDialogOpen] = React.useState(false);
  const [selectedInstanceForImport, setSelectedInstanceForImport] = React.useState<Instance | null>(null);

  // Função para verificar status de conexão de uma instância
  const checkConnectionStatus = React.useCallback(async (instance: Instance) => {
    try {
      const response = await fetch(
        `${instance.url}/instance/connectionState/${instance.instanceName}`,
        {
          headers: {
            "apikey": instance.apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.instance?.state || "disconnected";
      }
      return "disconnected";
    } catch (error) {
      console.error(`Error checking connection status for ${instance.name}:`, error);
      return "error";
    }
  }, []);

  // Verificar status de todas as instâncias quando a lista mudar
  React.useEffect(() => {
    const checkAllConnections = async () => {
      const states: Record<string, string> = {};
      
      for (const instance of instances) {
        const status = await checkConnectionStatus(instance);
        states[instance.id!] = status;
      }
      
      setConnectionStates(states);
    };

    if (instances.length > 0) {
      checkAllConnections();
    }
  }, [instances, checkConnectionStatus]);

  const getStatusBadge = (instanceId: string) => {
    const status = connectionStates[instanceId] || "unknown";
    
    switch (status) {
      case "open":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Conectado</Badge>;
      case "connecting":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Conectando</Badge>;
      case "disconnected":
        return <Badge variant="outline">Desconectado</Badge>;
      case "error":
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const getStatusIcon = (instanceId: string) => {
    const status = connectionStates[instanceId] || "unknown";
    
    switch (status) {
      case "open":
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <CircleCheck className="h-5 w-5 text-green-500" />
            </TooltipTrigger>
            <TooltipContent>Conectado</TooltipContent>
          </Tooltip>
        );
      case "connecting":
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <CircleDotDashed className="h-5 w-5 text-yellow-500 animate-spin" />
            </TooltipTrigger>
            <TooltipContent>Conectando</TooltipContent>
          </Tooltip>
        );
      case "disconnected":
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <CircleX className="h-5 w-5 text-gray-400" />
            </TooltipTrigger>
            <TooltipContent>Desconectado</TooltipContent>
          </Tooltip>
        );
      default:
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <CircleDotDashed className="h-5 w-5 text-gray-400" />
            </TooltipTrigger>
            <TooltipContent>Status desconhecido</TooltipContent>
          </Tooltip>
        );
    }
  };

  const handleExportConfig = (instance: Instance) => {
    setExportDialogInstance(instance);
  };

  const handleImportConfig = (instance: Instance) => {
    setSelectedInstanceForImport(instance);
    setImportDialogOpen(true);
  };

  const handleImportComplete = (config: Omit<Instance, 'id' | 'user_id'>) => {
    if (selectedInstanceForImport && onImportConfig) {
      onImportConfig(config);
      toast.success(`Configurações importadas para ${selectedInstanceForImport.name}`);
    }
    setImportDialogOpen(false);
    setSelectedInstanceForImport(null);
  };

  const handleQRConnect = (instance: Instance) => {
    setQRDialogInstance(instance);
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>URL do Servidor</TableHead>
              <TableHead>Instância Evolution</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {instances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Nenhuma instância configurada. Adicione uma para começar!
                </TableCell>
              </TableRow>
            ) : (
              instances.map((instance) => (
                <TableRow key={instance.id}>
                  <TableCell className="font-medium">{instance.name}</TableCell>
                  <TableCell>{instance.url}</TableCell>
                  <TableCell>{instance.instanceName}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(instance.id!)}
                      {getStatusBadge(instance.id!)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleExportConfig(instance)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Exportar Configurações</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleImportConfig(instance)}
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Importar Configurações</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleQRConnect(instance)}
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Conectar via QR Code</TooltipContent>
                      </Tooltip>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(instance)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(instance.id!)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Diálogos */}
      {qrDialogInstance && (
        <InstanceQRConnection
          isOpen={!!qrDialogInstance}
          onOpenChange={(open) => !open && setQRDialogInstance(null)}
          instance={qrDialogInstance}
        />
      )}

      {exportDialogInstance && (
        <InstanceConfigExport
          isOpen={!!exportDialogInstance}
          onOpenChange={(open) => !open && setExportDialogInstance(null)}
          instance={exportDialogInstance!}
          mode="export"
        />
      )}

      {selectedInstanceForImport && (
        <InstanceConfigExport
          isOpen={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          instance={selectedInstanceForImport}
          mode="import"
          onImport={handleImportComplete}
        />
      )}
    </>
  );
};