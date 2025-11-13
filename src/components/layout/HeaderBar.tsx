"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Bell } from "lucide-react";
import { useSession } from "@/components/auth/SessionContextProvider";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getProfile } from "@/lib/profile-storage";

export const HeaderBar: React.FC = () => {
  const { user } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const [firstName, setFirstName] = React.useState<string>("");
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);

  const deriveFirstNameFromEmail = (email?: string | null) => {
    if (!email) return "";
    const namePart = email.split("@")[0];
    const cleaned = namePart.replace(/[._-]+/g, " ").trim();
    const first = cleaned.split(" ")[0] || "";
    return first ? first.charAt(0).toUpperCase() + first.slice(1) : "";
  };

  React.useEffect(() => {
    let isMounted = true;
    const loadHeaderData = async () => {
      if (!user) {
        if (isMounted) {
          setFirstName("");
          setAvatarUrl(null);
        }
        return;
      }
      const profile = await getProfile(user.id);
      const meta = (user.user_metadata as any) || {};
      const metaFirst = (meta?.first_name as string | undefined)?.trim();
      const resolvedFirst =
        profile?.first_name?.trim() ||
        (metaFirst ? metaFirst : "") ||
        deriveFirstNameFromEmail(user.email);

      const resolvedAvatar =
        (profile?.avatar_url?.trim?.() || "") ||
        (meta?.avatar_url?.trim?.() || "") ||
        null;

      if (isMounted) {
        setFirstName(resolvedFirst);
        setAvatarUrl(resolvedAvatar);
      }
    };
    loadHeaderData();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const initials = React.useMemo(() => {
    const email = user?.email ?? "";
    if (!email) return "MZ";
    const name = email.split("@")[0];
    const parts = name.split(/[.\-_]/);
    const init = (parts[0]?.[0] ?? "M") + (parts[1]?.[0] ?? "Z");
    return init.toUpperCase();
  }, [user?.email]);

  const pageTitle = React.useMemo(() => {
    if (location.pathname.startsWith("/instances")) return "Instâncias";
    if (location.pathname.startsWith("/contacts/")) return "Contatos da Lista";
    if (location.pathname.startsWith("/contacts")) return "Contatos";
    if (location.pathname.startsWith("/campaigns")) return "Campanhas";
    if (location.pathname.startsWith("/logs")) return "Logs";
    if (location.pathname.startsWith("/profile")) return "Meu Perfil";
    if (location.pathname.startsWith("/crm")) return "Clientes (CRM)";
    if (location.pathname.startsWith("/webhooks")) return "Webhooks";
    return "Dashboard";
  }, [location.pathname]);

  return (
    <div className="sticky top-0 z-30 mb-6">
      <div className="rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur supports-[backdrop-filter]:backdrop-blur border border-purple-100/70 dark:border-white/10 px-4 sm:px-6 py-3 shadow-[0_2px_12px_rgba(89,63,255,0.08)]">
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <div className="text-sm text-purple-700/80 dark:text-purple-200">
              {firstName ? `Olá, ${firstName}` : "Olá"}
            </div>
            <div className="font-semibold text-purple-900 dark:text-purple-100">{pageTitle}</div>
          </div>

          <div className="flex-1" />

          <div className={cn("relative w-full max-w-md")}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
            <Input
              placeholder="Pesquisar..."
              className="pl-9 pr-3 h-10 rounded-full bg-white/80 dark:bg-white/10 border-purple-100 focus-visible:ring-2 focus-visible:ring-purple-400/60 placeholder:text-purple-300"
            />
          </div>

          <div className="flex-1" />

          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-purple-600 hover:text-purple-700 hover:bg-purple-100/60"
            aria-label="Notificações"
          >
            <Bell className="h-5 w-5" />
          </Button>

          <button
            onClick={() => navigate("/profile")}
            className="ml-1 inline-flex items-center justify-center rounded-full border border-purple-100 bg-white/70 dark:bg-white/10 dark:border-white/10 hover:shadow-sm transition-all"
            aria-label="Perfil"
          >
            <Avatar className="h-9 w-9">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={firstName || user?.email || "Avatar"} />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-500 text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeaderBar;