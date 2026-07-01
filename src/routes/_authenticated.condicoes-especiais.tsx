import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listRestrictions,
  createRestriction,
  updateRestriction,
  deleteRestriction,
  listPriorities,
  createPriority,
  updatePriority,
  deletePriority,
} from "@/lib/special.functions";
import { getCollaborators, getCurrentUserProfile } from "@/lib/schedule.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/condicoes-especiais")({
  component: CondicoesPage,
});

const DAYS = [
  { v: 1, l: "Seg" }, { v: 2, l: "Ter" }, { v: 3, l: "Qua" },
  { v: 4, l: "Qui" }, { v: 5, l: "Sex" }, { v: 6, l: "Sáb" }, { v: 0, l: "Dom" },
];
const WEEKEND_DAYS = [0, 6];

function daysLabel(days: number[]) {
  if (!days?.length) return "—";
  return days
    .slice()
    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
    .map((d) => DAYS.find((x) => x.v === d)?.l ?? d)
    .join(", ");
}

function CondicoesPage() {
  const qc = useQueryClient();
  const fetchRestrictions = useServerFn(listRestrictions);
  const fetchPriorities = useServerFn(listPriorities);
  const fetchCollabs = useServerFn(getCollaborators);
  const fetchProfile = useServerFn(getCurrentUserProfile);

  const createRestFn = useServerFn(createRestriction);
  const updateRestFn = useServerFn(updateRestriction);
  const deleteRestFn = useServerFn(deleteRestriction);
  const createPrioFn = useServerFn(createPriority);
  const updatePrioFn = useServerFn(updatePriority);
  const deletePrioFn = useServerFn(deletePriority);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const isAdmin = profile?.role === "admin" || profile?.role === "gestor";
  const { data: restrictions = [] } = useQuery({ queryKey: ["restrictions"], queryFn: () => fetchRestrictions() });
  const { data: priorities = [] } = useQuery({ queryKey: ["priorities"], queryFn: () => fetchPriorities() });
  const { data: collabs = [] } = useQuery({ queryKey: ["collaborators"], queryFn: () => fetchCollabs() });

  const refreshR = () => qc.invalidateQueries({ queryKey: ["restrictions"] });
  const refreshP = () => qc.invalidateQueries({ queryKey: ["priorities"] });

  // Restriction dialog
  const [rOpen, setROpen] = useState(false);
  const [rEditing, setREditing] = useState<any>(null);
  const [rForm, setRForm] = useState<{
    collaborator_id: string; type: "weekdays" | "weekends" | "holidays";
    weekdays: number[]; start_date: string; end_date: string; notes: string;
  }>({ collaborator_id: "", type: "weekdays", weekdays: [], start_date: "", end_date: "", notes: "" });

  function openR(item?: any) {
    if (item) {
      setREditing(item);
      setRForm({
        collaborator_id: item.collaborator_id,
        type: item.type,
        weekdays: item.weekdays ?? [],
        start_date: item.start_date ?? "",
        end_date: item.end_date ?? "",
        notes: item.notes ?? "",
      });
    } else {
      setREditing(null);
      setRForm({ collaborator_id: "", type: "weekdays", weekdays: [], start_date: "", end_date: "", notes: "" });
    }
    setROpen(true);
  }

  const saveR = useMutation({
    mutationFn: async () => {
      if (!rForm.collaborator_id) throw new Error("Selecione o colaborador");
      const payload: any = {
        collaborator_id: rForm.collaborator_id,
        type: rForm.type,
        weekdays:
          rForm.type === "weekdays"
            ? rForm.weekdays
            : rForm.type === "weekends"
            ? WEEKEND_DAYS
            : [],
        start_date: rForm.start_date || null,
        end_date: rForm.end_date || null,
        notes: rForm.notes || null,
      };
      if (rEditing) await updateRestFn({ data: { id: rEditing.id, ...payload } });
      else await createRestFn({ data: payload });
    },
    onSuccess: () => { toast.success(rEditing ? "Restrição atualizada" : "Restrição cadastrada"); setROpen(false); refreshR(); },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });

  const delR = useMutation({
    mutationFn: (id: string) => deleteRestFn({ data: { id } }),
    onSuccess: () => { toast.success("Cadastro excluído com sucesso"); refreshR(); },
    onError: (e: any) => toast.error(e.message ?? "Erro ao excluir"),
  });

  // Priority dialog
  const [pOpen, setPOpen] = useState(false);
  const [pEditing, setPEditing] = useState<any>(null);
  const [pForm, setPForm] = useState<{ collaborator_id: string; weekdays: number[]; level: "alta" | "media" | "baixa" }>({
    collaborator_id: "", weekdays: [], level: "media",
  });

  function openP(item?: any) {
    if (item) {
      setPEditing(item);
      setPForm({ collaborator_id: item.collaborator_id, weekdays: item.weekdays ?? [], level: item.level });
    } else {
      setPEditing(null);
      setPForm({ collaborator_id: "", weekdays: [], level: "media" });
    }
    setPOpen(true);
  }

  const saveP = useMutation({
    mutationFn: async () => {
      if (!pForm.collaborator_id) throw new Error("Selecione o colaborador");
      if (!pForm.weekdays.length) throw new Error("Selecione ao menos um dia");
      const payload = {
        collaborator_id: pForm.collaborator_id,
        weekdays: pForm.weekdays,
        level: pForm.level,
      };
      if (pEditing) await updatePrioFn({ data: { id: pEditing.id, ...payload } });
      else await createPrioFn({ data: payload });
    },
    onSuccess: () => { toast.success(pEditing ? "Prioridade atualizada" : "Prioridade cadastrada"); setPOpen(false); refreshP(); },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });

  const delP = useMutation({
    mutationFn: (id: string) => deletePrioFn({ data: { id } }),
    onSuccess: () => { toast.success("Cadastro excluído com sucesso"); refreshP(); },
    onError: (e: any) => toast.error(e.message ?? "Erro ao excluir"),
  });

  const toggleDay = (arr: number[], v: number) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Condições Especiais</h1>
        <p className="text-sm text-muted-foreground">
          Configure restrições e prioridades por colaborador. Regras são respeitadas na geração de escalas.
        </p>
      </div>

      {/* Restrições */}
      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Restrições de escalonamento</h2>
            <p className="text-xs text-muted-foreground">Impede que o colaborador seja escalado nos períodos selecionados.</p>
          </div>
          {isAdmin && (
            <Button onClick={() => openR()}><Plus className="mr-2 h-4 w-4" />Nova restrição</Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Colaborador</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Período</th>
                <th className="px-4 py-3 font-medium">Observação</th>
                {isAdmin && <th className="px-4 py-3 font-medium text-right">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {restrictions.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Nenhuma restrição cadastrada</td></tr>
              )}
              {restrictions.map((r: any) => (
                <tr key={r.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3 font-medium">{r.collaborators?.full_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    {r.type === "weekdays" && <Badge variant="secondary">Dias: {daysLabel(r.weekdays)}</Badge>}
                    {r.type === "weekends" && <Badge variant="secondary">Finais de semana</Badge>}
                    {r.type === "holidays" && <Badge variant="secondary">Feriados</Badge>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.start_date || r.end_date
                      ? `${r.start_date ?? "…"} a ${r.end_date ?? "…"}`
                      : "Permanente"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.notes ?? "—"}</td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => openR(r)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => delR.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Prioridades */}
      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Prioridades</h2>
            <p className="text-xs text-muted-foreground">Preferência de escalonamento por dia da semana.</p>
          </div>
          {isAdmin && (
            <Button onClick={() => openP()}><Plus className="mr-2 h-4 w-4" />Nova prioridade</Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Colaborador</th>
                <th className="px-4 py-3 font-medium">Dias</th>
                <th className="px-4 py-3 font-medium">Nível</th>
                {isAdmin && <th className="px-4 py-3 font-medium text-right">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {priorities.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Nenhuma prioridade cadastrada</td></tr>
              )}
              {priorities.map((p: any) => (
                <tr key={p.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3 font-medium">{p.collaborators?.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{daysLabel(p.weekdays)}</td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        p.level === "alta"
                          ? "bg-primary text-primary-foreground"
                          : p.level === "media"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {p.level === "alta" ? "Alta" : p.level === "media" ? "Média" : "Baixa"}
                    </Badge>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => openP(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => delP.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Restriction Dialog */}
      <Dialog open={rOpen} onOpenChange={setROpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{rEditing ? "Editar restrição" : "Nova restrição"}</DialogTitle>
            <DialogDescription>Impede o colaborador de ser escalado nas condições selecionadas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Colaborador</Label>
              <Select value={rForm.collaborator_id} onValueChange={(v) => setRForm((f) => ({ ...f, collaborator_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {collabs.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de restrição</Label>
              <Select value={rForm.type} onValueChange={(v: any) => setRForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekdays">Dia(s) da semana</SelectItem>
                  <SelectItem value="weekends">Finais de semana</SelectItem>
                  <SelectItem value="holidays">Feriados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {rForm.type === "weekdays" && (
              <div className="space-y-2">
                <Label>Dias</Label>
                <div className="flex flex-wrap gap-3">
                  {DAYS.map((d) => (
                    <label key={d.v} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={rForm.weekdays.includes(d.v)}
                        onCheckedChange={() => setRForm((f) => ({ ...f, weekdays: toggleDay(f.weekdays, d.v) }))}
                      />
                      {d.l}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Início (opcional)</Label>
                <Input type="date" value={rForm.start_date} onChange={(e) => setRForm((f) => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Fim (opcional)</Label>
                <Input type="date" value={rForm.end_date} onChange={(e) => setRForm((f) => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea value={rForm.notes} onChange={(e) => setRForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setROpen(false)}>Cancelar</Button>
            <Button onClick={() => saveR.mutate()} disabled={saveR.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Priority Dialog */}
      <Dialog open={pOpen} onOpenChange={setPOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pEditing ? "Editar prioridade" : "Nova prioridade"}</DialogTitle>
            <DialogDescription>Preferência de escalonamento para os dias selecionados.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Colaborador</Label>
              <Select value={pForm.collaborator_id} onValueChange={(v) => setPForm((f) => ({ ...f, collaborator_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {collabs.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Preferência de dias</Label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setPForm((f) => ({ ...f, weekdays: WEEKEND_DAYS }))}
                >
                  Finais de semana
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {DAYS.map((d) => (
                  <label key={d.v} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={pForm.weekdays.includes(d.v)}
                      onCheckedChange={() => setPForm((f) => ({ ...f, weekdays: toggleDay(f.weekdays, d.v) }))}
                    />
                    {d.l}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nível</Label>
              <Select value={pForm.level} onValueChange={(v: any) => setPForm((f) => ({ ...f, level: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveP.mutate()} disabled={saveP.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
