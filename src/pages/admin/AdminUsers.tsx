import { useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, MoreHorizontal, UserPlus, MessageSquare, PlusCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { addCustomer, getCustomers } from "@/lib/crm-storage";
import { SendProposalForm } from "@/components/crm/SendProposalForm";
import { useSession } from "@/components/auth/SessionContextProvider";
import { InstanceForm } from "@/components/instances/InstanceForm";
import { saveInstance, Instance } from "@/lib/storage";
import { grantUserQuota, getUserQuota } from "@/lib/log-storage";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email?: string;
  phone?: string | null;
  account_status: "active" | "paused" | "blocked" | "pending";
  trial_ends_at: string | null;
  instance_count: number;
  created_at: string;
  is_admin: boolean;
}

export function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTrialDialogOpen, setIsTrialDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [trialDays, setTrialDays] = useState("3");
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [selectedUserForMessage, setSelectedUserForMessage] = useState<Profile | null>(null);
  const [isInstanceDialogOpen, setIsInstanceDialogOpen] = useState(false);
  const [selectedUserForInstance, setSelectedUserForInstance] = useState<Profile | null>(null);
  const { user: currentUser } = useSession();
  const [isQuotaDialogOpen, setIsQuotaDialogOpen] = useState(false);
  const [selectedUserForQuota, setSelectedUserForQuota] = useState<Profile | null>(null);
  const [quotaAmount, setQuotaAmount] = useState("100");
  const [quotaMap, setQuotaMap] = useState<Record<string, number>>({});
  const [showPausedOnly, setShowPausedOnly] = useState(false);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setUsers(profiles as Profile[]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao carregar usuários", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const loadQuotas = async () => {
      const entries = await Promise.all(users.map(async (u) => {
        try {
          const { data, error } = await supabase.functions.invoke("evolution-proxy", {
            body: { action: "getQuota", userId: u.id },
          });
          if (error) return [u.id, 0] as const;
          const remaining = (data as any)?.data?.remaining ?? 0;
          return [u.id, remaining] as const;
        } catch {
          return [u.id, 0] as const;
        }
      }));
      const map: Record<string, number> = {};
      entries.forEach(([id, rem]) => { map[id] = rem; });
      setQuotaMap(map);
    };
    if (users.length > 0) loadQuotas();
  }, [users]);

  useEffect(() => {
    const channel = supabase
      .channel("admin_quota_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "campaign_logs" }, async (payload: { new: Record<string, unknown> }) => {
        const log = payload.new;
        const event = log?.event_type as string;
        const targetUserId = (log?.metadata as any)?.target_user_id as string | undefined;
        const uid = (log?.user_id as string) || targetUserId;
        if (!uid) return;
        if (["message_sent", "proposal_sent", "quota_granted"].includes(event)) {
          const { data } = await supabase.functions.invoke("evolution-proxy", { body: { action: "getQuota", userId: uid } });
          const remaining = (data as any)?.data?.remaining ?? 0;
          setQuotaMap((prev) => ({ ...prev, [uid]: remaining }));
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, (payload: { new: Record<string, unknown> }) => {
        const prof = payload.new;
        setUsers((prev) => prev.map(u => u.id === (prof?.id as string) ? { ...u, account_status: (prof?.account_status as any) } : u));
      });
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleStatusChange = async (userId: string, newStatus: Profile['account_status']) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ account_status: newStatus })
        .eq("id", userId);

      if (error) throw error;

      setUsers(users.map(user => 
        user.id === userId ? { ...user, account_status: newStatus } : user
      ));

      toast.success("Status atualizado com sucesso");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao atualizar status", {
        description: errorMessage,
      });
    }
  };

  const handleAddTrial = async () => {
    if (!selectedUserId) return;

    try {
      const days = parseInt(trialDays);
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + days);

      const { error } = await supabase
        .from("profiles")
        .update({ 
          trial_ends_at: trialEndsAt.toISOString(),
          account_status: 'active'
        })
        .eq("id", selectedUserId);

      if (error) throw error;

      setUsers(users.map(user => 
        user.id === selectedUserId ? { 
          ...user, 
          trial_ends_at: trialEndsAt.toISOString(),
          account_status: 'active'
        } : user
      ));

      toast.success("Período de teste adicionado com sucesso");
      setIsTrialDialogOpen(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao adicionar período de teste", {
        description: errorMessage,
      });
    }
  };

  const handleAddToCRM = async (profile: Profile) => {
    if (!currentUser) return;

    try {
      const existingCustomers = await getCustomers();
      const exists = existingCustomers.some(c => 
        (profile.phone && c.phone_number === profile.phone) || 
        (profile.email && c.email === profile.email)
      );

      if (exists) {
        toast.info("Este usuário já está no seu CRM.");
        return;
      }

      const newCustomer = await addCustomer(currentUser.id, {
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Sem Nome',
        phone_number: profile.phone || '',
        email: profile.email || '',
        notes: `Adicionado via Admin Users em ${new Date().toLocaleDateString()}`
      });

      if (newCustomer) {
        toast.success("Usuário adicionado ao CRM com sucesso!");
      } else {
        throw new Error("Falha ao adicionar ao CRM");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao adicionar ao CRM", {
        description: errorMessage
      });
    }
  };

  const handleOpenMessageModal = (profile: Profile) => {
    if (!profile.phone) {
      toast.error("Este usuário não possui telefone cadastrado.");
      return;
    }
    setSelectedUserForMessage(profile);
    setIsMessageModalOpen(true);
  };

  const handleOpenInstanceModal = (profile: Profile) => {
    setSelectedUserForInstance(profile);
    setIsInstanceDialogOpen(true);
  };

  const handleSaveInstance = async (instanceData: Instance) => {
    if (!selectedUserForInstance) return;

    try {
      const result = await saveInstance(selectedUserForInstance.id, instanceData);
      if (result) {
        toast.success(`Instância criada com sucesso para ${selectedUserForInstance.first_name}!`);
        setIsInstanceDialogOpen(false);
        // Optionally refresh users to update instance count if we were tracking it live
      } else {
        throw new Error("Falha ao salvar instância.");
      }
    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao criar instância", {
        description: errorMessage,
      });
    }
  };

  const handleOpenQuotaDialog = (profile: Profile) => {
    setSelectedUserForQuota(profile);
    setQuotaAmount("100");
    setIsQuotaDialogOpen(true);
  };

  const handleGrantQuota = async () => {
    if (!selectedUserForQuota || !currentUser) return;
    const amount = parseInt(quotaAmount);
    if (!amount || amount <= 0) {
      toast.error("Quantidade inválida");
      return;
    }
    const ok = await grantUserQuota(currentUser.id, selectedUserForQuota.id, amount);
    if (ok) {
      const { data: prof } = await supabase.from("profiles").select("instance_count").eq("id", selectedUserForQuota.id).single();
      const current = (prof?.instance_count as number | null) ?? 0;
      await supabase.from("profiles").update({ instance_count: current + amount, account_status: "active" }).eq("id", selectedUserForQuota.id);
      toast.success("Pacote de mensagens liberado");
      setIsQuotaDialogOpen(false);
      const q = await getUserQuota(selectedUserForQuota.id);
      setQuotaMap({ ...quotaMap, [selectedUserForQuota.id]: q.remaining });
    } else {
      toast.error("Falha ao liberar pacote");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-100 text-green-800">Ativo</Badge>;
      case "paused": return <Badge className="bg-yellow-100 text-yellow-800">Pausado</Badge>;
      case "blocked": return <Badge className="bg-red-100 text-red-800">Bloqueado</Badge>;
      case "pending": return <Badge className="bg-blue-100 text-blue-800">Pendente</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Gerenciar Usuários</h1>
        <div className="flex items-center gap-2">
          <Button variant={showPausedOnly ? "default" : "outline"} onClick={() => setShowPausedOnly((v) => !v)}>
            {showPausedOnly ? "Mostrando Pausados" : "Mostrar apenas Pausados"}
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Mensagens Disponíveis</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Teste até</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(showPausedOnly ? users.filter(u => u.account_status === "paused") : users).map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.first_name} {user.last_name}
                  {user.is_admin && <Badge variant="secondary" className="ml-2">Admin</Badge>}
                </TableCell>
                <TableCell>{getStatusBadge(user.account_status)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{user.is_admin ? "Ilimitado" : (quotaMap[user.id] ?? 0)}</Badge>
                  {!user.is_admin && (
                    <Button variant="link" size="sm" className="ml-2 p-0 h-auto" onClick={() => handleOpenQuotaDialog(user)}>
                      Liberar Pacote
                    </Button>
                  )}
                </TableCell>
                <TableCell>
                  {user.phone ? (
                    <Button 
                      variant="link" 
                      className="p-0 h-auto" 
                      onClick={() => handleOpenMessageModal(user)}
                    >
                      {user.phone}
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-sm">Não informado</span>
                  )}
                </TableCell>
                <TableCell>
                  {user.trial_ends_at 
                    ? format(new Date(user.trial_ends_at), "dd/MM/yyyy", { locale: ptBR })
                    : "-"
                  }
                </TableCell>
                <TableCell>
                  {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleAddToCRM(user)}>
                        <UserPlus className="mr-2 h-4 w-4" /> Adicionar ao CRM
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenMessageModal(user)}>
                        <MessageSquare className="mr-2 h-4 w-4" /> Enviar Mensagem
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenInstanceModal(user)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Criar Instância
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenQuotaDialog(user)}>
                        <MessageSquare className="mr-2 h-4 w-4" /> Adicionar Pacote de Mensagens
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleStatusChange(user.id, "active")}>
                        Ativar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(user.id, "paused")}>
                        Pausar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(user.id, "blocked")}>
                        Bloquear
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => {
                        setSelectedUserId(user.id);
                        setIsTrialDialogOpen(true);
                      }}>
                        Gerenciar Teste
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isTrialDialogOpen} onOpenChange={setIsTrialDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Período de Teste</DialogTitle>
            <DialogDescription>
              Defina quantos dias de teste este usuário terá. Isso ativará a conta automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="number"
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
              placeholder="Dias de teste"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTrialDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddTrial}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedUserForMessage && (
        <Dialog open={isMessageModalOpen} onOpenChange={setIsMessageModalOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Enviar Mensagem para {selectedUserForMessage.first_name}</DialogTitle>
              <DialogDescription>
                Envie uma mensagem direta via WhatsApp para este usuário.
              </DialogDescription>
            </DialogHeader>
            <SendProposalForm 
              customer={{
                id: 'temp', // Temporary ID
                user_id: currentUser?.id || '',
                name: `${selectedUserForMessage.first_name} ${selectedUserForMessage.last_name}`,
                phone_number: selectedUserForMessage.phone || '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }} 
              onProposalSent={() => setIsMessageModalOpen(false)} 
            />
          </DialogContent>
        </Dialog>
      )}

      {selectedUserForInstance && (
        <Dialog open={isInstanceDialogOpen} onOpenChange={setIsInstanceDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Criar Instância para {selectedUserForInstance.first_name}</DialogTitle>
              <DialogDescription>
                Configure uma nova instância do WhatsApp para este usuário.
              </DialogDescription>
            </DialogHeader>
            <InstanceForm onSave={handleSaveInstance} />
          </DialogContent>
        </Dialog>
      )}

      {selectedUserForQuota && (
        <Dialog open={isQuotaDialogOpen} onOpenChange={setIsQuotaDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Adicionar Pacote de Mensagens</DialogTitle>
              <DialogDescription>Defina a quantidade para {selectedUserForQuota.first_name}.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input type="number" value={quotaAmount} onChange={(e) => setQuotaAmount(e.target.value)} placeholder="Quantidade" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsQuotaDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleGrantQuota}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
