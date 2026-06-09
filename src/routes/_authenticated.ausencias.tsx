import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  getAbsences,
  getCollaborators,
  createAbsence,
  deleteAbsence,
  getCurrentUserProfile,
} from "@/lib/schedule.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const absenceSchema = z.object({
  collaborator_id: z.string().min(1, "Colaborador obrigatório"),
  type: z.enum(["ferias", "atestado_medico", "licenca_medica", "licenca_maternidade", "licenca_paternidade", "folga_programada", "outros"]),
  start_date: z.string().min(1, "Data inicial obrigatória"),
  end_date: z.string().min(1, "Data final obrigatória"),
  notes: z.string().optional(),
});

type AbsenceForm = z.infer<typeof absenceSchema>;

const absenceLabels: Record<string, string> = {
  ferias: "Férias",
  atestado_medico: "Atestado Médico",
  licenca_medica: "Licença Médica",
  licenca_maternidade: "Licença Maternidade",
  licenca_paternidade: "Licença Paternidade",
  folga_programada: "Folga Programada",
  outros: "Outros",
};

export const Route = createFileRoute("/_authenticated/ausencias")({
  component: AusenciasPage,
});

function AusenciasPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchAbsences = useServerFn(getAbsences);
  const fetchCollaborators = useServerFn(getCollaborators);
  const fetchProfile = useServerFn(getCurrentUserProfile);

  const { data: absences } = useQuery({
    queryKey: ["absences"],
    queryFn: () => fetchAbsences(),
  });

  const { data: collaborators } = useQuery({
    queryKey: ["collaborators"],
    queryFn: () => fetchCollaborators(),
  });

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
  });

  const isAdminOrGestor = profile?.role === "admin" || profile?.role === "gestor";

  const form = useForm<AbsenceForm>({
    resolver: zodResolver(absenceSchema),
  });

  const createFn = useServerFn(createAbsence);
  const deleteFn = useServerFn(deleteAbsence);

  const createMutation = useMutation({
    mutationFn: createFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absences"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setIsDialogOpen(false);
      form.reset();
      toast.success("Ausência cadastrada com sucesso");
    },
    onError: (err: any) => toast.error(err.message || "Erro ao cadastrar"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absences"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Ausência removida com sucesso");
    },
    onError: (err: any) => toast.error(err.message || "Erro ao remover"),
  });

  function onSubmit(data: AbsenceForm) {
    createMutation.mutate({ data });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ausências</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie férias, licenças e afastamentos
          </p>
        </div>
        {isAdminOrGestor && (
          <Button onClick={() => { form.reset(); setIsDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Ausência
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Colaborador</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Início</th>
                <th className="px-4 py-3 font-medium">Fim</th>
                <th className="px-4 py-3 font-medium">Observação</th>
                {isAdminOrGestor && <th className="px-4 py-3 font-medium text-right">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {absences?.map((a: any) => (
                <tr key={a.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3 font-medium">{a.collaborators?.full_name}</td>
                  <td className="px-4 py-3">{absenceLabels[a.type] ?? a.type}</td>
                  <td className="px-4 py-3">
                    {format(parseISO(a.start_date), "dd/MM/yyyy", { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3">
                    {format(parseISO(a.end_date), "dd/MM/yyyy", { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3 max-w-[200px] truncate text-muted-foreground">
                    {a.notes || "-"}
                  </td>
                  {isAdminOrGestor && (
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("Deseja remover esta ausência?")) {
                            deleteMutation.mutate({ data: { id: a.id } });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              {(!absences || absences.length === 0) && (
                <tr>
                  <td colSpan={isAdminOrGestor ? 6 : 5} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhuma ausência registrada
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
            <DialogTitle>Nova Ausência</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Colaborador</Label>
              <Select
                value={form.watch("collaborator_id")}
                onValueChange={(v) => form.setValue("collaborator_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {collaborators?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name} ({c.team})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.collaborator_id && (
                <p className="text-xs text-destructive">{form.formState.errors.collaborator_id.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.watch("type")}
                onValueChange={(v) => form.setValue("type", v as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(absenceLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.type && (
                <p className="text-xs text-destructive">{form.formState.errors.type.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data inicial</Label>
                <Input type="date" {...form.register("start_date")} />
                {form.formState.errors.start_date && (
                  <p className="text-xs text-destructive">{form.formState.errors.start_date.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Data final</Label>
                <Input type="date" {...form.register("end_date")} />
                {form.formState.errors.end_date && (
                  <p className="text-xs text-destructive">{form.formState.errors.end_date.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea {...form.register("notes")} placeholder="Opcional..." />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending}>
                Cadastrar Ausência
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
