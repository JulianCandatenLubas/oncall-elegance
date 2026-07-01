import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, ShieldCheck, Lock, Check, Minus } from "lucide-react";
import {
  listAccessUsers,
  inviteAccessUser,
  updateAccessUser,
  deleteAccessUser,
} from "@/lib/access.functions";

export const Route = createFileRoute("/_authenticated/acessos")({
  component: AcessosPage,
});

type Perfil = "admin" | "editor" | "visualizador";
type AccessUser = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  whatsapp: string | null;
  is_collaborator: boolean;
  active: boolean;
};

const ADMIN_ID = "d81cd53e-f6c7-4f5d-9bbc-285cf23fcd88";
const perfilLabel: Record<string, string> = {
  admin: "Admin",
  editor: "Editor",
  gestor: "Editor",
  visualizador: "Visualizador",
};

function maskPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function AcessosPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAccessUsers);
  const inviteFn = useServerFn(inviteAccessUser);
  const updateFn = useServerFn(updateAccessUser);
  const deleteFn = useServerFn(deleteAccessUser);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["access-users"],
    queryFn: () => listFn(),
  });

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AccessUser | null>(null);
  const [toDelete, setToDelete] = useState<AccessUser | null>(null);
  const [form, setForm] = useState<{
    full_name: string;
    email: string;
    role: Perfil;
    whatsapp: string;
    is_collaborator: "yes" | "no" | "";
  }>({ full_name: "", email: "", role: "visualizador", whatsapp: "", is_collaborator: "" });

  const refresh = () => qc.invalidateQueries({ queryKey: ["access-users"] });

  const inviteMut = useMutation({
    mutationFn: (data: any) => inviteFn({ data }),
    onSuccess: (_res, vars: any) => {
      toast.success(`Convite criado para ${vars.email}. Senha inicial: 123456`);
      setDialogOpen(false);
      refresh();
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao enviar convite"),
  });
  const updateMut = useMutation({
    mutationFn: (data: any) => updateFn({ data }),
    onSuccess: () => {
      refresh();
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao atualizar"),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Cadastro excluído com sucesso");
      setToDelete(null);
      refresh();
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao excluir"),
  });

  const sortedUsers = useMemo<AccessUser[]>(() => {
    const list = [...(users as AccessUser[])];
    list.sort((a, b) => {
      if (a.id === ADMIN_ID) return -1;
      if (b.id === ADMIN_ID) return 1;
      return a.full_name.localeCompare(b.full_name);
    });
    return list;
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return sortedUsers.filter((u) => {
      if (u.id === ADMIN_ID) return true;
      if (!q) return true;
      return (
        u.full_name.toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [sortedUsers, search]);

  function openCreate() {
    setEditing(null);
    setForm({
      full_name: "",
      email: "",
      role: "visualizador",
      whatsapp: "",
      is_collaborator: "",
    });
    setDialogOpen(true);
  }

  function openEdit(user: AccessUser) {
    if (user.id === ADMIN_ID) return;
    setEditing(user);
    setForm({
      full_name: user.full_name,
      email: user.email ?? "",
      role: (user.role as Perfil) || "visualizador",
      whatsapp: user.whatsapp ?? "",
      is_collaborator: user.is_collaborator ? "yes" : "no",
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) return toast.error("Informe o nome");
    if (!form.email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email))
      return toast.error("E-mail inválido");
    if (form.is_collaborator === "") return toast.error('Selecione "É colaborador?"');

    const whatsapp = form.whatsapp.trim() || null;
    const is_collaborator = form.is_collaborator === "yes";

    if (editing) {
      updateMut.mutate({
        id: editing.id,
        full_name: form.full_name,
        role: form.role,
        whatsapp,
        is_collaborator,
      });
      toast.success("Alterações salvas");
      setDialogOpen(false);
    } else {
      inviteMut.mutate({
        full_name: form.full_name,
        email: form.email,
        role: form.role,
        whatsapp,
        is_collaborator,
      });
    }
  }

  function toggleActive(user: AccessUser, next: boolean) {
    if (user.id === ADMIN_ID) return;
    updateMut.mutate({ id: user.id, active: next });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão de Acessos</h1>
          <p className="text-sm text-muted-foreground">
            Controle quem pode visualizar ou editar as escalas da plataforma
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Convidar usuário
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Nome completo</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">WhatsApp</th>
                <th className="px-4 py-3 font-medium">Perfil</th>
                <th className="px-4 py-3 font-medium">Colaborador</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Carregando...
                  </td>
                </tr>
              )}
              {!isLoading &&
                filtered.map((u) => {
                  const isAdmin = u.id === ADMIN_ID;
                  return (
                    <tr
                      key={u.id}
                      className={`border-b border-border/50 last:border-0 ${
                        isAdmin ? "bg-primary/5" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          {isAdmin && <ShieldCheck className="h-4 w-4 text-primary" />}
                          {u.full_name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {u.whatsapp || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {isAdmin ? (
                          <Badge className="gap-1 bg-primary text-primary-foreground hover:bg-primary">
                            <Lock className="h-3 w-3" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            {perfilLabel[u.role] ?? u.role}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.is_collaborator ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Minus className="h-4 w-4 text-muted-foreground" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isAdmin ? (
                          <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/30">
                            Ativo
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={u.active}
                              onCheckedChange={(v) => toggleActive(u, v)}
                              aria-label="Ativar ou desativar usuário"
                            />
                            <span className="text-xs text-muted-foreground">
                              {u.active ? "Ativo" : "Inativo"}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isAdmin ? (
                          <span className="text-xs text-muted-foreground">
                            Conta protegida
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(u)}
                              aria-label="Editar usuário"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setToDelete(u)}
                              aria-label="Excluir usuário"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum usuário encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar usuário" : "Convidar novo usuário"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize as informações do usuário."
                : "A senha inicial será 123456. Oriente o usuário a alterá-la no primeiro acesso pela tela Alterar Senha."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                placeholder="Ex.: Ana Pereira"
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={form.email}
                disabled={!!editing}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="usuario@empresa.com"
              />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp (opcional)</Label>
              <Input
                value={form.whatsapp}
                onChange={(e) =>
                  setForm((f) => ({ ...f, whatsapp: maskPhone(e.target.value) }))
                }
                placeholder="(11) 91234-5678"
              />
            </div>
            <div className="space-y-2">
              <Label>Perfil de acesso</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm((f) => ({ ...f, role: v as Perfil }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visualizador">
                    Visualizador — apenas leitura
                  </SelectItem>
                  <SelectItem value="editor">
                    Editor — pode criar e editar escalas
                  </SelectItem>
                  <SelectItem value="admin">
                    Admin — acesso total à plataforma
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>É colaborador?</Label>
              <RadioGroup
                value={form.is_collaborator}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, is_collaborator: v as "yes" | "no" }))
                }
                className="flex gap-6"
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="yes" id="col-yes" />
                  <span>Sim</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="no" id="col-no" />
                  <span>Não</span>
                </label>
              </RadioGroup>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={inviteMut.isPending || updateMut.isPending}>
                {editing
                  ? "Salvar alterações"
                  : inviteMut.isPending
                  ? "Enviando..."
                  : "Enviar convite"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.{" "}
              <strong>{toDelete?.full_name}</strong> perderá imediatamente o acesso
              à plataforma.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && deleteMut.mutate(toDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
