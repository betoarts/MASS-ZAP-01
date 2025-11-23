"use client";

import * as React from "react";
import { useSession } from "@/components/auth/SessionContextProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Lock, Clock } from "lucide-react";

interface RequireSubscriptionProps {
  children: React.ReactNode;
  allowed?: Array<string>;
}

export const RequireSubscription: React.FC<RequireSubscriptionProps> = ({ children }) => {
  const { user } = useSession();
  const [status, setStatus] = React.useState<"loading" | "allowed" | "blocked" | "paused" | "trial_expired" | "pending">("loading");
  const [trialEndsAt, setTrialEndsAt] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin, account_status, trial_ends_at")
        .eq("id", user.id)
        .single();

      if (!isMounted) return;

      if (profile?.is_admin) {
        setStatus("allowed");
        return;
      }

      const accountStatus = profile?.account_status || "active";
      const trialEnd = profile?.trial_ends_at;
      setTrialEndsAt(trialEnd);

      if (accountStatus === "blocked") {
        setStatus("blocked");
        return;
      }

      if (accountStatus === "pending") {
        setStatus("pending");
        return;
      }

      if (accountStatus === "paused") {
        setStatus("paused");
        return;
      }

      if (trialEnd && new Date(trialEnd) < new Date()) {
        setStatus("trial_expired");
        return;
      }

      setStatus("allowed");
    };

    checkStatus();
    return () => {
      isMounted = false;
    };
  }, [user]);

  if (status === "loading") {
    return <div className="p-8 text-center text-muted-foreground">Verificando status da conta...</div>;
  }

  if (status === "blocked") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center space-y-4 bg-red-50 rounded-lg border border-red-100">
        <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-2">
          <Lock className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-red-800">Conta Bloqueada</h2>
        <p className="text-red-600 max-w-md">
          Sua conta foi bloqueada administrativamente. Entre em contato com o suporte para mais informações.
        </p>
      </div>
    );
  }

  if (status === "paused") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center space-y-4 bg-yellow-50 rounded-lg border border-yellow-100">
        <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center mb-2">
          <AlertTriangle className="h-8 w-8 text-yellow-600" />
        </div>
        <h2 className="text-2xl font-bold text-yellow-800">Conta Pausada</h2>
        <p className="text-yellow-600 max-w-md">
          Sua conta está temporariamente pausada. Entre em contato com o administrador para reativar.
        </p>
      </div>
    );
  }

  if (status === "trial_expired") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center space-y-4 bg-purple-50 rounded-lg border border-purple-100">
        <div className="h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center mb-2">
          <Clock className="h-8 w-8 text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold text-purple-800">Período de Teste Expirado</h2>
        <p className="text-purple-600 max-w-md">
          Seu período de teste terminou em {trialEndsAt && new Date(trialEndsAt).toLocaleDateString()}.
          Entre em contato com o administrador para estender seu acesso.
        </p>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center space-y-4 bg-blue-50 rounded-lg border border-blue-100">
        <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-2">
          <Lock className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-blue-800">Aprovação Pendente</h2>
        <p className="text-blue-600 max-w-md">
          Sua conta está aguardando aprovação de um administrador. Entre em contato com o suporte para liberar seu acesso.
        </p>
        <Button 
          className="bg-green-600 hover:bg-green-700 text-white gap-2"
          onClick={() => window.open("https://wa.me/5554991680204?text=Preciso%20de%20ajuda%20para%20conectar%20uma%20instancia%20ou%20criar", "_blank")}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
          Falar com Suporte
        </Button>
      </div>
    );
  }

  return <>{children}</>;
};