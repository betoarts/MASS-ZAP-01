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
  Workflow,
  Shield
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSession } from "@/components/auth/SessionContextProvider";

interface SidebarNavProps {
  onLinkClick?: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({ onLinkClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useSession();
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      if (data?.is_admin) {
        setIsAdmin(true);
      }
    };
    checkAdmin();
  }, [user]);

  const navItems = [
    { title: "Dashboard", href: "/", icon: LayoutDashboard },
    { title: "Instâncias", href: "/instances", icon: Settings },
    { title: "Contatos", href: "/contacts", icon: Users },
    { title: "Campanhas", href: "/campaigns", icon: Send },
    { title: "FlowZapp", href: "/flows", icon: Workflow },
    { title: "Clientes (CRM)", href: "/crm", icon: Briefcase },
    { title: "Webhooks", href: "/webhooks", icon: Webhook },
    { title: "Logs", href: "/logs", icon: FileText },
    { title: "Perfil", href: "/profile", icon: UserCircle },
  ];

  if (isAdmin) {
    navItems.push({ title: "Admin Panel", href: "/admin", icon: Shield });
  }

  const handleLogout = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) {
        navigate("/login");
        onLinkClick?.();
        return;
      }
      const { error } = await supabase.auth.signOut();
      if (error && error.message && !/Auth session missing/i.test(error.message)) {
        toast.error("Falha ao fazer logout.", { description: error.message });
      } else {
        toast.success("Você foi desconectado com sucesso.");
        navigate("/login");
        onLinkClick?.();
      }
    } catch (e: any) {
      navigate("/login");
      onLinkClick?.();
    }
  };

  const handleSupportClick = () => {
    const whatsappLink =
      "https://wa.me/5554991680204?text=Preciso%20de%20ajuda%20para%20conectar%20uma%20instancia%20ou%20criar";
    window.open(whatsappLink, "_blank", "noopener,noreferrer");
    onLinkClick?.();
  };

  return (
    <aside className="h-full bg-transparent">
      <div className="m-3 rounded-3xl border border-purple-100/70 bg-white/70 dark:bg-white/5 dark:border-white/10 shadow-[0_4px_24px_rgba(89,63,255,0.08)]">
        <ScrollArea className="h-full py-4 px-3">
          <div className="flex flex-col space-y-2">
            <div className="mb-3 px-3 pt-1">
              <img
                src="/logo.gif"
                alt="MassZapp Logo"
                className="w-full h-auto object-contain rounded-2xl ring-1 ring-purple-100/60"
              />
            </div>
            {navItems.map((item) => {
              const active = location.pathname === item.href || (item.href !== "/" && location.pathname.startsWith(item.href));
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link to={item.href} onClick={onLinkClick}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start rounded-xl h-10",
                          "text-purple-700 hover:text-purple-800",
                          "hover:bg-purple-100/60",
                          active &&
                            "bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-900 shadow-sm"
                        )}
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.title}
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.title}</TooltipContent>
                </Tooltip>
              );
            })}

            <div className="mt-2 pt-2 border-t border-purple-100/60" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start rounded-xl h-10 text-green-700 hover:text-green-800 hover:bg-green-100/60"
                  onClick={handleSupportClick}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Suporte WhatsApp
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Suporte via WhatsApp</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start rounded-xl h-10 text-red-600 hover:text-red-700 hover:bg-red-100/60"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sair da conta</TooltipContent>
            </Tooltip>
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
};