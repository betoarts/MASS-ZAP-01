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
  const [status, setStatus] = React.useState<"loading" | "allowed" | "blocked" | "paused" | "trial_expired">("loading");
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

  return <>{children}</>;
};