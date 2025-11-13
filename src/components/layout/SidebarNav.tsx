"use client";

import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  Settings,
  Users,
  Send,
  FileText,
  UserCircle,
  LogOut,
  Briefcase,
  MessageCircle,
  Webhook,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SidebarNavProps {
  onLinkClick?: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({ onLinkClick }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    {
      title: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      title: "Instâncias",
      href: "/instances",
      icon: Settings,
    },
    {
      title: "Contatos",
      href: "/contacts",
      icon: Users,
    },
    {
      title: "Campanhas",
      href: "/campaigns",
      icon: Send,
    },
    {
      title: "Clientes (CRM)",
      href: "/crm",
      icon: Briefcase,
    },
    {
      title: "Webhooks",
      href: "/webhooks",
      icon: Webhook,
    },
    {
      title: "Logs",
      href: "/logs",
      icon: FileText,
    },
    {
      title: "Perfil",
      href: "/profile",
      icon: UserCircle,
    },
  ];

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Erro ao fazer logout:", error.message);
      toast.error("Falha ao fazer logout.", { description: error.message });
    } else {
      toast.success("Você foi desconectado com sucesso.");
      navigate("/login");
      onLinkClick?.();
    }
  };

  const handleSupportClick = () => {
    const whatsappLink = "https://wa.me/5554991680204?text=Preciso%20de%20ajuda%20para%20conectar%20uma%20instancia%20ou%20criar";
    window.open(whatsappLink, "_blank", "noopener,noreferrer");
    onLinkClick?.();
  };

  return (
    <ScrollArea className="h-full py-4 px-2 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex flex-col space-y-1">
        <div className="mb-4 px-4">
          <img src="/logo.gif" alt="MassZapp Logo" className="w-full h-auto object-contain" />
        </div>
        {navItems.map((item) => (
          <Tooltip key={item.href}>
            <TooltipTrigger asChild>
              <Link to={item.href} onClick={onLinkClick}>
                <Button
                  variant={location.pathname === item.href ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    location.pathname === item.href
                      ? "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90"
                      : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.title}
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              {item.title}
            </TooltipContent>
          </Tooltip>
        ))}
        
        {/* Botão de Suporte WhatsApp */}
        <div className="mt-auto pt-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start text-green-600 hover:bg-green-100 hover:text-green-700"
                onClick={handleSupportClick}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Suporte WhatsApp
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              Suporte via WhatsApp
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="mt-auto pt-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start text-red-500 hover:bg-red-100 hover:text-red-600"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              Sair da conta
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </ScrollArea>
  );
};