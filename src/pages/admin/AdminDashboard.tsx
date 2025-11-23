import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard";
import { Users, ShieldCheck, ShieldAlert, Server, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
          .select("id"); // We might need a status column if it exists, but for now just count

        const totalInstances = instances?.length || 0;

        setStats({
          totalUsers,
          activeTrials,
          blockedUsers,
          totalInstances,
          activeInstances: totalInstances, // Assuming all listed are active for now
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
          description="Instâncias conectadas"
        />
      </div>
    </div>
  );
};
