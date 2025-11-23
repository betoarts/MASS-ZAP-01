import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Clock, User } from "lucide-react";
import { useSession } from "@/components/auth/SessionContextProvider";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { differenceInDays } from "date-fns";

interface Profile {
  is_admin: boolean;
  account_status: string | null;
  trial_ends_at: string | null;
}

export const AccountStatusCard = () => {
  const { user } = useSession();
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("is_admin, account_status, trial_ends_at")
          .eq("id", user.id)
          .single();

        if (!error && data) {
          setProfile(data);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  if (loading) {
    return <Skeleton className="h-[120px] w-full" />;
  }

  if (!profile) return null;

  const isAdmin = profile.is_admin;
  const isTrial = profile.trial_ends_at && new Date(profile.trial_ends_at) > new Date();
  const trialDaysLeft = (isTrial && profile.trial_ends_at) ? differenceInDays(new Date(profile.trial_ends_at), new Date()) : 0;

  return (
    <Card className="bg-gradient-to-r from-purple-50 to-white dark:from-purple-900/20 dark:to-background border-purple-100 dark:border-purple-900/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <User className="h-5 w-5 text-purple-600" />
          Status da Conta
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
              {isAdmin ? <Shield className="h-5 w-5" /> : <User className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tipo de Conta</p>
              <p className="font-semibold text-lg">{isAdmin ? "Administrador" : "Usuário Padrão"}</p>
            </div>
          </div>

          {!isAdmin && isTrial && (
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-orange-100 text-orange-700">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Período de Teste</p>
                <p className="font-semibold text-lg">
                  {trialDaysLeft > 0 ? `${trialDaysLeft} dias restantes` : "Expira hoje"}
                </p>
              </div>
            </div>
          )}
          
           {!isAdmin && !isTrial && profile.account_status === 'active' && (
            <div className="flex items-center gap-3">
               <div className="p-2 rounded-full bg-green-100 text-green-700">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                 <p className="text-sm text-muted-foreground">Status</p>
                 <p className="font-semibold text-lg">Ativo</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
