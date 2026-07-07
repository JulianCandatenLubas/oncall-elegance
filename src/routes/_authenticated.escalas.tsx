import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getSchedules,
  getScheduleShifts,
  generateSchedule,
  deleteSchedule,
  updateScheduleStatus,
  updateScheduleShift,
  getCollaborators,
  getCurrentUserProfile,
} from "@/lib/schedule.functions";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarPlus,
  Trash2,
  Download,
  Pencil,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/_authenticated/escalas")({
  component: EscalasPage,
});

function EscalasPage() {
  const queryClient = useQueryClient();
  const fetchSchedules = useServerFn(getSchedules);
  const fetchCollaborators = useServerFn(getCollaborators);
  const fetchProfile = useServerFn(getCurrentUserProfile);
  const fetchShifts = useServerFn(getScheduleShifts);
  const generateFn = useServerFn(generateSchedule);
  const deleteFn = useServerFn(deleteSchedule);
  const statusFn = useServerFn(updateScheduleStatus);
  const updateShiftFn = useServerFn(updateScheduleShift);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<any>(null);
  const [start, setStart] = useState(format(new Date(), "yyyy-MM-01"));
  const [end, setEnd] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return format(d, "yyyy-MM-dd");
  });
  const [scope, setScope] = useState<"all" | "team">("all");
  const [scopeTeam, setScopeTeam] = useState<"infra" | "sre" | "atendimento">("infra");

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
  });
  const canManage = profile?.role === "admin" || profile?.role === "gestor";

  const { data: schedules } = useQuery({
    queryKey: ["schedules"],
    queryFn: () => fetchSchedules(),
  });

  const { data: collaborators } = useQuery({
    queryKey: ["collaborators"],
    queryFn: () => fetchCollaborators(),
  });

  const currentId = selectedId ?? schedules?.[0]?.id ?? null;
  const currentSchedule = schedules?.find((s: any) => s.id === currentId);

  const { data: shifts } = useQuery({
    queryKey: ["schedule-shifts", currentId],
    queryFn: () => fetchShifts({ data: { schedule_id: currentId! } }),
    enabled: !!currentId,
  });

  const generateMut = useMutation({
    mutationFn: (vars: { start_date: string; end_date: string; team: "all" | "infra" | "sre" | "atendimento" }) =>
      generateFn({ data: vars }),
    onSuccess: (res: any) => {
      const count = res?.teamsGenerated?.length ?? 3;
      if (res?.hasConsecutiveConflict) {
        toast.warning(
          "Não foi possível escalar todos os dias sem conflito de dias consecutivos. Revise as condições especiais ou o quadro de colaboradores.",
        );
      } else {
        toast.success(`Escala gerada com sucesso para ${count} time(s).`);
      }
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setGenerateOpen(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao gerar escala"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Escala removida");
      setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao remover"),
  });

  const statusMut = useMutation({
    mutationFn: (vars: { id: string; status: string }) => statusFn({ data: vars }),
    onSuccess: () => {
      toast.success("Status atualizado");
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
    },
  });

  const updateShiftMut = useMutation({
    mutationFn: (vars: any) => updateShiftFn({ data: vars }),
    onSuccess: () => {
      toast.success("Plantão atualizado");
      queryClient.invalidateQueries({ queryKey: ["schedule-shifts", currentId] });
      setEditingShift(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao atualizar"),
  });

  const collabName = (id: string | null) =>
    collaborators?.find((c: any) => c.id === id)?.full_name ?? "—";

  const handleExport = () => {
    if (!shifts || !currentSchedule) return;
    const rows = shifts.map((s: any) => ({
      Data: format(parseISO(s.shift_date), "dd/MM/yyyy"),
      "Dia da Semana": format(parseISO(s.shift_date), "EEEE", { locale: ptBR }),
      Tipo: s.day_type === "feriado" ? "Feriado" : s.day_type === "fim_de_semana" ? "Fim de semana" : "Dia útil",
      Turno: s.shift_type === "diurno" ? "Diurno" : "Noturno",
      Início: s.start_time?.slice(0, 5),
      Fim: s.end_time?.slice(0, 5),
      Infra: s.infra?.full_name ?? "",
      SRE: s.sre?.full_name ?? "",
      Atendimento: s.atendimento?.full_name ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 10 },
      { wch: 8 }, { wch: 8 }, { wch: 24 }, { wch: 24 }, { wch: 24 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Escala");
    const fname = `escala_${currentSchedule.start_date}_${currentSchedule.end_date}.xlsx`;
    XLSX.writeFile(wb, fname);
  };

  const stats = useMemo(() => {
    if (!shifts) return null;
    return {
      total: shifts.length,
      gaps: shifts.filter((s: any) =>
        !s.infra_collaborator_id || !s.sre_collaborator_id || !s.atendimento_collaborator_id
      ).length,
    };
  }, [shifts]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Escalas</h1>
          <p className="text-sm text-muted-foreground">
            Gere, visualize, edite e exporte escalas de plantão
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {currentId && (
            <Button variant="outline" onClick={handleExport}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
          )}
          {canManage && (
            <Button onClick={() => setGenerateOpen(true)}>
              <CalendarPlus className="mr-2 h-4 w-4" />
              Gerar Escala
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Schedule list */}
        <div className="space-y-2">
          <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Escalas Geradas
          </h3>
          {schedules && schedules.length > 0 ? (
            schedules.map((s: any) => {
              const active = s.id === currentId;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {format(parseISO(s.start_date), "dd/MM/yyyy")} →{" "}
                        {format(parseISO(s.end_date), "dd/MM/yyyy")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Criada em {format(parseISO(s.created_at), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <Badge
                      variant={s.status === "published" ? "default" : "secondary"}
                      className="shrink-0 capitalize"
                    >
                      {s.status === "draft" ? "rascunho" : "publicada"}
                    </Badge>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nenhuma escala gerada
            </div>
          )}
        </div>

        {/* Shifts table */}
        <div className="rounded-xl border border-border bg-card">
          {currentSchedule ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
                <div>
                  <p className="text-sm font-semibold">
                    {format(parseISO(currentSchedule.start_date), "dd 'de' MMMM", { locale: ptBR })}{" "}
                    →{" "}
                    {format(parseISO(currentSchedule.end_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                  {stats && (
                    <p className="text-xs text-muted-foreground">
                      {stats.total} plantões · {stats.gaps > 0 ? `${stats.gaps} com lacunas` : "sem lacunas"}
                    </p>
                  )}
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    {currentSchedule.status === "draft" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => statusMut.mutate({ id: currentSchedule.id, status: "published" })}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Publicar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm("Remover esta escala?")) deleteMut.mutate(currentSchedule.id);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remover
                    </Button>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-2 font-medium">Data</th>
                      <th className="px-4 py-2 font-medium">Turno</th>
                      <th className="px-4 py-2 font-medium">Horário</th>
                      <th className="px-4 py-2 font-medium">Infra</th>
                      <th className="px-4 py-2 font-medium">SRE</th>
                      <th className="px-4 py-2 font-medium">Atendimento</th>
                      {canManage && <th className="px-4 py-2" />}
                    </tr>
                  </thead>
                  <tbody>
                    {shifts?.map((s: any) => (
                      <tr key={s.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="px-4 py-2 font-medium">
                          {format(parseISO(s.shift_date), "dd/MM EEE", { locale: ptBR })}
                          {s.day_type === "feriado" && (
                            <Badge variant="outline" className="ml-2 text-[10px]">
                              feriado
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-2 capitalize">{s.shift_type}</td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}
                        </td>
                        <td className="px-4 py-2">{s.infra?.full_name ?? <span className="text-destructive">—</span>}</td>
                        <td className="px-4 py-2">{s.sre?.full_name ?? <span className="text-destructive">—</span>}</td>
                        <td className="px-4 py-2">{s.atendimento?.full_name ?? <span className="text-destructive">—</span>}</td>
                        {canManage && (
                          <td className="px-4 py-2 text-right">
                            <Button size="icon" variant="ghost" onClick={() => setEditingShift(s)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <CalendarPlus className="mb-3 h-10 w-10 opacity-50" />
              <p className="text-sm">Selecione ou gere uma escala</p>
            </div>
          )}
        </div>
      </div>

      {/* Generate dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar nova escala</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Data inicial</Label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data final</Label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Escopo da geração</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as "all" | "team")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os times</SelectItem>
                  <SelectItem value="team">Time específico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {scope === "team" && (
              <div className="space-y-2">
                <Label>Time</Label>
                <Select value={scopeTeam} onValueChange={(v) => setScopeTeam(v as any)}>
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
            )}
            <p className="text-xs text-muted-foreground">
              O sistema distribui plantões considerando ausências, feriados nacionais, restrições, prioridades e dias consecutivos.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                generateMut.mutate({
                  start_date: start,
                  end_date: end,
                  team: scope === "all" ? "all" : scopeTeam,
                })
              }
              disabled={generateMut.isPending}
            >
              {generateMut.isPending
                ? scope === "all"
                  ? "Gerando para todos os times..."
                  : "Gerando..."
                : "Gerar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit shift dialog */}
      <Dialog open={!!editingShift} onOpenChange={(o) => !o && setEditingShift(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Editar plantão —{" "}
              {editingShift && format(parseISO(editingShift.shift_date), "dd/MM/yyyy")}
            </DialogTitle>
          </DialogHeader>
          {editingShift && (
            <EditShiftForm
              shift={editingShift}
              collaborators={collaborators ?? []}
              onSubmit={(vals) => updateShiftMut.mutate({ id: editingShift.id, ...vals })}
              pending={updateShiftMut.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditShiftForm({
  shift,
  collaborators,
  onSubmit,
  pending,
}: {
  shift: any;
  collaborators: any[];
  onSubmit: (vals: {
    infra_collaborator_id: string | null;
    sre_collaborator_id: string | null;
    atendimento_collaborator_id: string | null;
    reason?: string;
  }) => void;
  pending: boolean;
}) {
  const [infra, setInfra] = useState<string>(shift.infra_collaborator_id ?? "none");
  const [sre, setSre] = useState<string>(shift.sre_collaborator_id ?? "none");
  const [atendimento, setAtendimento] = useState<string>(shift.atendimento_collaborator_id ?? "none");
  const [reason, setReason] = useState("");

  const teamOptions = (team: string) =>
    collaborators.filter((c) => c.team === team && c.status === "active");

  return (
    <div className="space-y-4">
      {(["infra", "sre", "atendimento"] as const).map((team) => {
        const value = team === "infra" ? infra : team === "sre" ? sre : atendimento;
        const setter = team === "infra" ? setInfra : team === "sre" ? setSre : setAtendimento;
        return (
          <div key={team} className="space-y-2">
            <Label className="capitalize">{team}</Label>
            <Select value={value} onValueChange={setter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Sem alocação —</SelectItem>
                {teamOptions(team).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}
      <div className="space-y-2">
        <Label>Motivo da alteração</Label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex.: troca solicitada pelo colaborador"
          rows={2}
        />
      </div>
      <DialogFooter>
        <Button
          onClick={() =>
            onSubmit({
              infra_collaborator_id: infra === "none" ? null : infra,
              sre_collaborator_id: sre === "none" ? null : sre,
              atendimento_collaborator_id: atendimento === "none" ? null : atendimento,
              reason: reason || undefined,
            })
          }
          disabled={pending}
        >
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </div>
  );
}
