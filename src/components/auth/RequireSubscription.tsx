"use client";

import * as React from "react";
import { useSession } from "@/components/auth/SessionContextProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface RequireSubscriptionProps {
  children: React.ReactNode;
  allowed?: Array<string>;
}

export const RequireSubscription: React.FC<RequireSubscriptionProps> = ({ children, allowed = ["trialing", "active"] }) => {
  const { user } = useSession();
  const [status, setStatus] = React.useState<string | null>(null);
  const [isAdmin, setIsAdmin] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const load = async () => {
      if (!user) { setLoading(false); setStatus(null); return; }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      setIsAdmin(!!profile?.is_admin);
      const { data } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1);
      const s = data && data[0]?.status ? String(data[0].status) : null;
      setStatus(s);
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const startCheckout = async () => {
    if (!user) return;
    const priceId = import.meta.env.VITE_STRIPE_PRICE_ID as string | undefined;
    if (!priceId) return;
    const { data } = await supabase.functions.invoke("stripe-create-checkout-session", {
      body: { userId: user.id, priceId, success_url: window.location.origin + "/", cancel_url: window.location.origin + "/" },
    });
    if (data?.url) window.location.href = data.url;
  };

  const openBillingPortal = async () => {
    if (!user) return;
    const { data } = await supabase.functions.invoke("stripe-create-billing-portal", {
      body: { userId: user.id, return_url: window.location.origin + "/" },
    });
    if (data?.url) window.location.href = data.url;
  };

  if (loading) return <div className="p-6">Carregando...</div>;
  if (isAdmin) return <>{children}</>;
  if (!user || !status || !allowed.includes(status)) {
    return (
      <div className="p-6 border rounded-md">
        <div className="mb-3 font-semibold">Assinatura necessária</div>
        <div className="text-sm mb-4">Para acessar este recurso, ative uma assinatura ou use o período de teste.</div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={startCheckout}>Assinar</Button>
          <Button onClick={openBillingPortal}>Gerenciar</Button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};