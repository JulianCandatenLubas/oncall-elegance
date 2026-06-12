import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, ShieldCheck, Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/acessos")({
  component: AcessosPage,
});

type Perfil = "editor" | "visualizador";
type AccessUser = {
  id: string;
  full_name: string;
  email: string;
  role: Perfil | "admin";
  active: boolean;
  locked?: boolean;
};

const ADMIN_USER: AccessUser = {
  id: "admin-fixed",
  full_name: "Julian Candaten Lubas",
  email: "juliancandatenlubas@gmail.com",
  role: "admin",
  active: true,
  locked: true,
};

const INITIAL_USERS: AccessUser[] = [
  {
    id: "u-1",
    full_name: "Mariana Silva",
    email: "mariana.silva@empresa.com",
    role: "editor",
    active: true,
  },
  {
    id: "u-2",
    full_name: "Rafael Costa",
    email: "rafael.costa@empresa.com",
    role: "visualizador",
    active: true,
  },
  {
    id: "u-3",
    full_name: "Beatriz Almeida",
    email: "beatriz.almeida@empresa.com",
    role: "visualizador",
    active: false,
  },
];

const perfilLabel: Record<Perfil | "admin", string> = {
  admin: "Admin",
  editor: "Editor",
  visualizador: "Visualizador",
};

function AcessosPage() {
  const [users, setUsers] = useState<AccessUser[]>(INITIAL_USERS);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AccessUser | null>(null);
  const [toDelete, setToDelete] = useState<AccessUser | null>(null);
  const [form, setForm] = useState<{ full_name: string; email: string; role: Perfil }>({
    full_name: "",
    email: "",
    role: "visualizador",
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [users, search]);

  function openCreate() {
    setEditing(null);
    setForm({ full_name: "", email: "", role: "visualizador" });
    setDialogOpen(true);
  }

  function openEdit(user: AccessUser) {
    if (user.locked) return;
    setEditing(user);
    setForm({
      full_name: user.full_name,
      email: user.email,
      role: user.role === "admin" ? "editor" : user.role,
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim()) {
      toast.error("Preencha nome e e-mail");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      toast.error("E-mail inválido");
      return;
    }
    if (form.email.toLowerCase() === ADMIN_USER.email.toLowerCase()) {
      toast.error("Este e-mail é reservado ao administrador");
      return;
    }

    if (editing) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editing.id
            ? { ...u, full_name: form.full_name, email: form.email, role: form.role }
            : u,
        ),
      );
      toast.success("Usuário atualizado");
    } else {
      const exists = users.some(
        (u) => u.email.toLowerCase() === form.email.toLowerCase(),
      );
      if (exists) {
        toast.error("Já existe um usuário com este e-mail");
        return;
      }
      setUsers((prev) => [
        ...prev,
        {
          id: `u-${Date.now()}`,
          full_name: form.full_name,
          email: form.email,
          role: form.role,
          active: true,
        },
      ]);
      toast.success("Usuário convidado");
    }
    setDialogOpen(false);
  }

  function toggleActive(user: AccessUser) {
    if (user.locked) return;
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, active: !u.active } : u)),
    );
    toast.success(user.active ? "Usuário desativado" : "Usuário ativado");
  }

  function confirmDelete() {
    if (!toDelete || toDelete.locked) return;
    setUsers((prev) => prev.filter((u) => u.id !== toDelete.id));
    toast.success("Usuário excluído");
    setToDelete(null);
  }

  const rows: AccessUser[] = [ADMIN_USER, ...filtered];

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
                <th className="px-4 py-3 font-medium">Perfil</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr
                  key={u.id}
                  className={`border-b border-border/50 last:border-0 ${
                    u.locked ? "bg-primary/5" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      {u.locked && <ShieldCheck className="h-4 w-4 text-primary" />}
                      {u.full_name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    {u.role === "admin" ? (
                      <Badge className="gap-1 bg-primary text-primary-foreground hover:bg-primary">
                        <Lock className="h-3 w-3" />
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{perfilLabel[u.role]}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.locked ? (
                      <Badge
                        variant="default"
                        className="bg-green-500/20 text-green-400 hover:bg-green-500/30"
                      >
                        Ativo
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={u.active}
                          onCheckedChange={() => toggleActive(u)}
                          aria-label="Ativar ou desativar usuário"
                        />
                        <span className="text-xs text-muted-foreground">
                          {u.active ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.locked ? (
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
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum usuário encontrado para a busca
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
              Defina nome, e-mail e perfil de acesso. O perfil Admin é exclusivo da
              conta principal.
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
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="usuario@empresa.com"
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
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editing ? "Salvar alterações" : "Enviar convite"}
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
              onClick={confirmDelete}
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
