import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, MoreHorizontal, ShieldAlert, ShieldCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email?: string; // Joined from auth.users if possible, or we just use what we have
  account_status: "active" | "paused" | "blocked";
  trial_ends_at: string | null;
  instance_count: number;
  created_at: string;
  is_admin: boolean;
}

export const AdminUsers = () => {
  const [users, setUsers] = React.useState<Profile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [selectedUser, setSelectedUser] = React.useState<Profile | null>(null);
  const [trialDays, setTrialDays] = React.useState(7);
  const [isTrialDialogOpen, setIsTrialDialogOpen] = React.useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Note: Joining with auth.users is not directly possible via client SDK easily without a view or function.
      // For now, we'll list profiles. If we need emails, we might need a secure function or just rely on profile data if synced.
      // Assuming profiles has what we need or we can't get email easily without admin API.
      // Let's fetch profiles.
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers((data as unknown as Profile[]) || []);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error("Erro ao carregar usuários", { description: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchUsers();
  }, []);

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ account_status: newStatus })
        .eq("id", userId);

      if (error) throw error;
      toast.success(`Status atualizado para ${newStatus}`);
      fetchUsers();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error("Erro ao atualizar status", { description: errorMessage });
    }
  };

  const handleAddTrial = async () => {
    if (!selectedUser) return;
    try {
      const currentEnd = selectedUser.trial_ends_at ? new Date(selectedUser.trial_ends_at) : new Date();
      // If trial expired or null, start from now. If active, add to end.
      const baseDate = currentEnd < new Date() ? new Date() : currentEnd;
      const newDate = addDays(baseDate, trialDays);

      const { error } = await supabase
        .from("profiles")
        .update({ trial_ends_at: newDate.toISOString(), account_status: 'active' }) // Ensure active if giving trial
        .eq("id", selectedUser.id);

      if (error) throw error;
      toast.success(`Trial estendido até ${format(newDate, "dd/MM/yyyy")}`);
      setIsTrialDialogOpen(false);
      fetchUsers();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error("Erro ao adicionar dias de trial", { description: errorMessage });
    }
  };

  const filteredUsers = users.filter((u) =>
    (u.first_name?.toLowerCase() || "").includes(search.toLowerCase()) ||
    (u.last_name?.toLowerCase() || "").includes(search.toLowerCase()) ||
    (u.id.includes(search))
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-100 text-green-800">Ativo</Badge>;
      case "paused": return <Badge className="bg-yellow-100 text-yellow-800">Pausado</Badge>;
      case "blocked": return <Badge className="bg-red-100 text-red-800">Bloqueado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Gerenciar Usuários</h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou ID..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border bg-white dark:bg-gray-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Trial Até</TableHead>
              <TableHead>Instâncias</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">Carregando...</TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">Nenhum usuário encontrado</TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{user.first_name} {user.last_name}</span>
                      <span className="text-xs text-muted-foreground font-mono">{user.id}</span>
                      {user.is_admin && <Badge variant="secondary" className="w-fit mt-1 text-[10px]">Admin</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(user.account_status || 'active')}</TableCell>
                  <TableCell>
                    {user.trial_ends_at ? (
                      <span className={new Date(user.trial_ends_at) < new Date() ? "text-red-500" : "text-green-600"}>
                        {format(new Date(user.trial_ends_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{user.instance_count || 0}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => { setSelectedUser(user); setIsTrialDialogOpen(true); }}>
                          <ShieldCheck className="mr-2 h-4 w-4" /> Adicionar Trial
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleStatusChange(user.id, "active")}>
                          Ativar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(user.id, "paused")}>
                          Pausar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(user.id, "blocked")} className="text-red-600">
                          <ShieldAlert className="mr-2 h-4 w-4" /> Bloquear
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isTrialDialogOpen} onOpenChange={setIsTrialDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Dias de Trial</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Adicionar dias gratuitos para <strong>{selectedUser?.first_name}</strong>.
              Isso estenderá a data atual de término ou iniciará um novo período a partir de hoje.
            </p>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => setTrialDays(7)}>7 Dias</Button>
              <Button variant="outline" onClick={() => setTrialDays(15)}>15 Dias</Button>
              <Button variant="outline" onClick={() => setTrialDays(30)}>30 Dias</Button>
            </div>
            <div className="grid gap-2">
              <label htmlFor="days" className="text-sm font-medium">Dias personalizados</label>
              <Input
                id="days"
                type="number"
                value={trialDays}
                onChange={(e) => setTrialDays(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsTrialDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddTrial}>Confirmar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
