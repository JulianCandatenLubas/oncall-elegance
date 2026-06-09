import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  getCollaborators,
  createCollaborator,
  updateCollaborator,
  deleteCollaborator,
  getCurrentUserProfile,
} from "@/lib/schedule.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

const collaboratorSchema = z.object({
  full_name: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  team: z.enum(["infra", "sre", "atendimento"]),
  status: z.enum(["active", "inactive"]),
});

type CollaboratorForm = z.infer<typeof collaboratorSchema>;

export const Route = createFileRoute("/_authenticated/colaboradores")({
  component: ColaboradoresPage,
});

function ColaboradoresPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchCollaborators = useServerFn(getCollaborators);
  const fetchProfile = useServerFn(getCurrentUserProfile);

  const { data: collaborators } = useQuery({
    queryKey: ["collaborators"],
    queryFn: () => fetchCollaborators(),
  });

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
  });

  const isAdminOrGestor = profile?.role === "admin" || profile?.role === "gestor";

  const form = useForm<CollaboratorForm>({
    resolver: zodResolver(collaboratorSchema),
    defaultValues: {
      status: "active",
    },
  });

  const createFn = useServerFn(createCollaborator);
  const updateFn = useServerFn(updateCollaborator);
  const deleteFn = useServerFn(deleteCollaborator);

  const createMutation = useMutation({
    mutationFn: createFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaborators"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setIsDialogOpen(false);
      form.reset();
      toast.success("Colaborador cadastrado com sucesso");
    },
    onError: (err: any) => toast.error(err.message || "Erro ao cadastrar"),
  });

  const updateMutation = useMutation({
    mutationFn: updateFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaborators"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setEditing(null);
      setIsDialogOpen(false);
      form.reset();
      toast.success("Colaborador atualizado com sucesso");
    },
    onError: (err: any) => toast.error(err.message || "Erro ao atualizar"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaborators"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Colaborador removido com sucesso");
    },
    onError: (err: any) => toast.error(err.message || "Erro ao remover"),
  });

  function onSubmit(data: CollaboratorForm) {
    if (editing) {
      updateMutation.mutate({ data: { id: editing.id, ...data } });
    } else {
      createMutation.mutate({ data });
    }
  }

  function handleEdit(collaborator: any) {
    setEditing(collaborator);
    form.reset({
      full_name: collaborator.full_name,
      email: collaborator.email,
      team: collaborator.team,
      status: collaborator.status,
    });
    setIsDialogOpen(true);
  }

  function handleAdd() {
    setEditing(null);
    form.reset({ full_name: "", email: "", team: "infra", status: "active" });
    setIsDialogOpen(true);
  }

  const filtered = collaborators?.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Colaboradores</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os colaboradores dos times de plantão
          </p>
        </div>
        {isAdminOrGestor && (
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Colaborador
          </Button>
        )}
      </div>

      <div className="relative">
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
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {isAdminOrGestor && <th className="px-4 py-3 font-medium text-right">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {filtered?.map((c) => (
                <tr key={c.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3 font-medium">{c.full_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="capitalize">
                      {c.team}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={c.status === "active" ? "default" : "outline"}
                      className={c.status === "active" ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" : ""}
                    >
                      {c.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  {isAdminOrGestor && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("Deseja remover este colaborador?")) {
                              deleteMutation.mutate({ data: { id: c.id } });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filtered?.length === 0 && (
                <tr>
                  <td colSpan={isAdminOrGestor ? 5 : 4} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum colaborador encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Colaborador" : "Novo Colaborador"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input {...form.register("full_name")} />
              {form.formState.errors.full_name && (
                <p className="text-xs text-destructive">{form.formState.errors.full_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Select
                value={form.watch("team")}
                onValueChange={(v) => form.setValue("team", v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="infra">Infra</SelectItem>
                  <SelectItem value="sre">SRE</SelectItem>
                  <SelectItem value="atendimento">Atendimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(v) => form.setValue("status", v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editing ? "Salvar alterações" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
