"use client";

import * as React from "react";
import { useSession } from "@/components/auth/SessionContextProvider";
import { getInstances } from "@/lib/storage";
import { getContactLists } from "@/lib/contact-storage";
import { getCampaigns } from "@/lib/campaign-storage";
import { getCustomers } from "@/lib/crm-storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const UserIsolationCheck: React.FC = () => {
  const { user } = useSession();
  const [debugInfo, setDebugInfo] = React.useState<{
    instances: number;
    contactLists: number;
    campaigns: number;
    customers: number;
    userId: string;
  }>({
    instances: 0,
    contactLists: 0,
    campaigns: 0,
    customers: 0,
    userId: '',
  });

  React.useEffect(() => {
    const fetchDebugData = async () => {
      if (!user) return;

      const [instances, contactLists, campaigns, customers] = await Promise.all([
        getInstances(user.id),
        getContactLists(),
        getCampaigns(),
        getCustomers(),
      ]);

      setDebugInfo({
        instances: instances.length,
        contactLists: contactLists.length,
        campaigns: campaigns.length,
        customers: customers.length,
        userId: user.id,
      });
    };

    fetchDebugData();
  }, [user]);

  if (!user) return null;

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-sm">Debug: Isolamento de Usuário</CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-1">
        <div>User ID: {debugInfo.userId}</div>
        <div>Instâncias: {debugInfo.instances}</div>
        <div>Listas de Contatos: {debugInfo.contactLists}</div>
        <div>Campanhas: {debugInfo.campaigns}</div>
        <div>Clientes: {debugInfo.customers}</div>
      </CardContent>
    </Card>
  );
};