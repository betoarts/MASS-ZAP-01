import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Server, User, Clock, Zap, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InstanceStatus {
  id: string;
  name: string;
  instanceName: string;
  url: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  status: "connected" | "disconnected" | "connecting";
  connectionState?: string;
  lastSeen?: string;
  createdAt?: string;
  sentCount?: number;
}

interface InstanceStatusCardProps {
  instance: InstanceStatus;
  onRefresh?: () => void;
}

export const InstanceStatusCard: React.FC<InstanceStatusCardProps> = ({ instance, onRefresh }) => {
  const statusConfig = {
    connected: {
      icon: CheckCircle,
      color: "text-green-500",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      badgeVariant: "default" as const,
      label: "Conectado",
    },
    disconnected: {
      icon: XCircle,
      color: "text-gray-500",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      badgeVariant: "secondary" as const,
      label: "Desconectado",
    },
    connecting: {
      icon: Clock,
      color: "text-yellow-500",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      badgeVariant: "outline" as const,
      label: "Conectando...",
    },
  };

  const config = statusConfig[instance.status];
  const Icon = config.icon;

  return (
    <Card className={cn("transition-all hover:shadow-lg", config.borderColor)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", config.bgColor)}>
              <Server className={cn("h-5 w-5", config.color)} />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">{instance.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {instance.instanceName}
                {instance.connectionState ? ` • estado: ${instance.connectionState}` : ""}
              </p>
            </div>
          </div>
          <Badge variant={config.badgeVariant} className={cn("ml-auto", config.color)}>
            <Icon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Proprietário:</span>
          <span className="font-medium">{instance.userName || instance.userEmail || "Usuário desconhecido"}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <Zap className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">URL:</span>
          <span className="font-mono text-xs truncate max-w-[200px]">{instance.url}</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Mensagens enviadas:</span>
          <span className="font-medium">{typeof instance.sentCount === "number" ? instance.sentCount : "-"}</span>
        </div>

        {instance.lastSeen && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Última atividade:</span>
            <span className="text-xs text-muted-foreground">
              {new Date(instance.lastSeen).toLocaleString('pt-BR')}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            Criado em: {instance.createdAt ? new Date(instance.createdAt).toLocaleDateString('pt-BR') : "Desconhecido"}
          </span>
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className="h-8 px-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};