import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard";
import { Users, ShieldCheck, ShieldAlert, Server, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { InstanceListAdmin } from "@/components/admin/InstanceListAdmin";

export const AdminDashboard = () => {
  const [stats, setStats] = React.useState({
    totalUsers: 0,
    activeTrials: 0,
    blockedUsers: 0,
    totalInstances: 0,
    activeInstances: 0,
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        // Fetch profiles stats
        const { data: profiles } = await supabase
          .from("profiles")
          .select("account_status, trial_ends_at");

        const totalUsers = profiles?.length || 0;
        const activeTrials = profiles?.filter(p => p.trial_ends_at && new Date(p.trial_ends_at) > new Date()).length || 0;
        const blockedUsers = profiles?.filter(p => p.account_status === 'blocked' || p.account_status === 'paused').length || 0;

        // Fetch instances stats
        const { data: instances } = await supabase
          .from("instances")
          .select("id, user_id");

        const totalInstances = instances?.length || 0;
        let activeInstances = 0;
        if (instances && instances.length > 0) {
          const results = await Promise.all(
            instances.map(async (inst: any) => {
              try {
                const { data, error } = await supabase.functions.invoke("evolution-proxy", {
                  body: { action: "connectionState", instanceId: inst.id, userId: inst.user_id },
                });
                if (error) return false;
                const payload = (data as any)?.data || {};
                const state: string = payload?.instance?.state || payload?.state || "";
                return state === "open";
              } catch {
                return false;
              }
            })
          );
          activeInstances = results.filter(Boolean).length;
        }

        setStats({
          totalUsers,
          activeTrials,
          blockedUsers,
          totalInstances,
          activeInstances,
        });
      } catch (error) {
        console.error("Error fetching admin stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Dashboard Admin</h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardStatCard
          title="Total de Usuários"
          value={stats.totalUsers}
          icon={Users}
          description="Usuários cadastrados"
        />
        <DashboardStatCard
          title="Trials Ativos"
          value={stats.activeTrials}
          icon={Activity}
          description="Usuários em período de teste"
        />
        <DashboardStatCard
          title="Usuários Bloqueados"
          value={stats.blockedUsers}
          icon={ShieldAlert}
          description="Contas bloqueadas ou pausadas"
        />
        <DashboardStatCard
          title="Total de Instâncias"
          value={stats.totalInstances}
          icon={Server}
          description="Instâncias cadastradas"
        />
        <DashboardStatCard
          title="Instâncias Conectadas"
          value={stats.activeInstances}
          icon={ShieldCheck}
          description="Conectadas agora"
        />
      </div>

      <div className="mt-8">
        <InstanceListAdmin />
      </div>
    </div>
  );
};
