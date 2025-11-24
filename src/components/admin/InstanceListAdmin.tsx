import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { InstanceStatus, InstanceStatusCard } from "./InstanceStatusCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Server, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InstanceListAdminProps {
  className?: string;
}

export const InstanceListAdmin: React.FC<InstanceListAdminProps> = ({ className }) => {
  const [instances, setInstances] = React.useState<InstanceStatus[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchInstances = async () => {
    setLoading(true);
    try {
      // Fetch all instances with user information
      // Since instances.user_id references auth.users, we need to fetch profiles separately
      const { data: instancesData, error: instancesError } = await supabase
        .from("instances")
        .select("*");

      if (instancesError) {
        console.error("Error fetching instances:", instancesError);
        return;
      }

      // Fetch user profiles for all instance owners
      const userIds = instancesData?.map(instance => instance.user_id) || [];
      let profilesData: any[] = [];
      let profilesError: any = null;
      if (userIds.length > 0) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, phone")
          .in("id", userIds);
        profilesData = data || [];
        profilesError = error;
      }

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
      }

      // Create a map of user profiles for easy lookup
      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      // For now, we'll assume all instances are connected since we don't have a status column
      // In a real implementation, you'd check the actual connection status from your WhatsApp service
      const mappedInstancesBase: InstanceStatus[] = instancesData?.map((item: any) => {
        const profile = profilesMap.get(item.user_id);
        const fullName = profile?.first_name && profile?.last_name 
          ? `${profile.first_name} ${profile.last_name}`
          : undefined;
        return {
          id: item.id,
          name: item.name,
          instanceName: item.instance_name,
          url: item.url,
          userId: item.user_id,
          userName: fullName || profile?.phone || undefined,
          userEmail: undefined,
          status: "connecting",
          createdAt: item.created_at,
        };
      }) || [];

      const withStatuses: InstanceStatus[] = await Promise.all(
        mappedInstancesBase.map(async (inst) => {
          try {
            const { data, error } = await supabase.functions.invoke("evolution-proxy", {
              body: { action: "connectionState", instanceId: inst.id, userId: inst.userId },
            });
            if (error) {
              return { ...inst, status: "disconnected", connectionState: undefined };
            }
            const payload = (data as any)?.data || {};
            const state: string = payload?.instance?.state || payload?.state || "";
            const status: InstanceStatus["status"] = state === "open" ? "connected" : state === "connecting" ? "connecting" : "disconnected";
            return { ...inst, status, connectionState: state };
          } catch {
            return { ...inst, status: "disconnected", connectionState: undefined };
          }
        })
      );

      // Compute sent message counts per instance via secure function
      const instanceIds = instancesData?.map((i: any) => i.id) || [];
      let countsMap: Record<string, number> = {};
      if (instanceIds.length > 0) {
        try {
          const { data } = await supabase.functions.invoke("evolution-proxy", {
            body: { action: "instanceCounts", instanceIds },
          });
          countsMap = ((data as any)?.data?.counts) || {};
        } catch {}
      }

      const withCounts = withStatuses.map((inst) => ({
        ...inst,
        sentCount: countsMap[inst.id] ?? 0,
      }));

      setInstances(withCounts);
    } catch (error) {
      console.error("Error processing instances:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInstances();
  };

  React.useEffect(() => {
    fetchInstances();
  }, []);

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Server className="h-5 w-5" />
            Instâncias WhatsApp
          </h3>
          <Button variant="ghost" size="sm" disabled>
            <RefreshCw className="h-4 w-4 animate-spin" />
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Server className="h-5 w-5" />
          Instâncias WhatsApp
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="hover:bg-accent"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </Button>
      </div>

      {instances.length === 0 ? (
        <div className="text-center py-8">
          <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">Nenhuma instância encontrada</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            As instâncias aparecerão aqui quando os usuários as conectarem
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {instances.map((instance) => (
            <InstanceStatusCard
              key={instance.id}
              instance={instance}
              onRefresh={handleRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
};