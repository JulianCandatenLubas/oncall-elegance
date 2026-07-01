import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getDashboardStats, getSchedules, getScheduleShifts, getCollaborators } from "@/lib/schedule.functions";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Users,
  Server,
  Headphones,
  Briefcase,
  Umbrella,
  Stethoscope,
  CalendarDays,
  Clock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const fetchStats = useServerFn(getDashboardStats);
  const fetchSchedules = useServerFn(getSchedules);

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => fetchStats(),
  });

  const { data: schedules } = useQuery({
    queryKey: ["schedules"],
    queryFn: () => fetchSchedules(),
  });

  const currentSchedule = schedules?.[0];

  const fetchShifts = useServerFn(getScheduleShifts);
  const { data: shifts } = useQuery({
    queryKey: ["schedule-shifts", currentSchedule?.id],
    queryFn: () => fetchShifts({ data: { schedule_id: currentSchedule?.id ?? "" } }),
    enabled: !!currentSchedule?.id,
  });

  const today = format(new Date(), "yyyy-MM-dd");
  const upcomingShifts = shifts
    ?.filter((s: any) => s.shift_date >= today)
    .slice(0, 5);

  const teamChartData = [
    { name: "Infra", value: stats?.totalInfra ?? 0, fill: "var(--color-chart-1)" },
    { name: "SRE", value: stats?.totalSre ?? 0, fill: "var(--color-chart-2)" },
    { name: "Atendimento", value: stats?.totalAtendimento ?? 0, fill: "var(--color-chart-3)" },
  ];

  const fetchCollabs = useServerFn(getCollaborators);
  const { data: allCollabs = [] } = useQuery({
    queryKey: ["collaborators"],
    queryFn: () => fetchCollabs(),
  });

  const [teamModal, setTeamModal] = useState<null | "infra" | "sre" | "atendimento">(null);
  const teamLabel: Record<string, string> = { infra: "Infra", sre: "SRE", atendimento: "Atendimento" };

  const statCards = [
    {
      title: "Total Colaboradores",
      value: stats?.totalCollaborators ?? 0,
      icon: Users,
      color: "text-primary",
      team: null as null | "infra" | "sre" | "atendimento",
    },
    { title: "Infra", value: stats?.totalInfra ?? 0, icon: Server, color: "text-chart-1", team: "infra" as const },
    { title: "SRE", value: stats?.totalSre ?? 0, icon: Briefcase, color: "text-chart-2", team: "sre" as const },
    { title: "Atendimento", value: stats?.totalAtendimento ?? 0, icon: Headphones, color: "text-chart-3", team: "atendimento" as const },
    { title: "Em Férias", value: stats?.onVacation ?? 0, icon: Umbrella, color: "text-chart-4", team: null },
    { title: "Afastados", value: stats?.onLeave ?? 0, icon: Stethoscope, color: "text-chart-5", team: null },
  ];

  const teamCollabs = teamModal
    ? (allCollabs as any[]).filter((c) => c.team === teamModal)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral do sistema de escalas
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          const clickable = !!card.team;
          const Comp: any = clickable ? "button" : "div";
          return (
            <Comp
              key={card.title}
              type={clickable ? "button" : undefined}
              onClick={clickable ? () => setTeamModal(card.team!) : undefined}
              className={`text-left rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 ${
                clickable ? "cursor-pointer hover:bg-accent/40" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`${card.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                  <p className="text-xl font-bold">{card.value}</p>
                </div>
              </div>
            </Comp>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Team Chart */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold">Distribuição por Time</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming shifts */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold">Próximos Plantões</h3>
          {upcomingShifts && upcomingShifts.length > 0 ? (
            <div className="space-y-3">
              {upcomingShifts.map((shift: any) => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {format(parseISO(shift.shift_date), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {shift.shift_type === "diurno" ? "Diurno" : "Noturno"} ·{" "}
                        {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>I: {shift.infra?.full_name ?? "-"}</p>
                    <p>S: {shift.sre?.full_name ?? "-"}</p>
                    <p>A: {shift.atendimento?.full_name ?? "-"}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Clock className="mb-2 h-8 w-8 opacity-50" />
              <p className="text-sm">Nenhuma escala gerada</p>
              <Link
                to="/escalas"
                className="mt-2 text-sm text-primary hover:underline"
              >
                Gerar escala
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Active absences */}
      {stats?.activeAbsences && stats.activeAbsences.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold">Ausências Ativas</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Colaborador</th>
                  <th className="pb-2 font-medium">Time</th>
                  <th className="pb-2 font-medium">Tipo</th>
                  <th className="pb-2 font-medium">Período</th>
                </tr>
              </thead>
              <tbody>
                {stats.activeAbsences.map((absence: any) => (
                  <tr key={absence.id} className="border-b border-border/50">
                    <td className="py-2 font-medium">{absence.collaborators?.full_name}</td>
                    <td className="py-2 capitalize">{absence.collaborators?.team}</td>
                    <td className="py-2 capitalize">{absence.type.replace(/_/g, " ")}</td>
                    <td className="py-2">
                      {format(parseISO(absence.start_date), "dd/MM/yyyy")} -{" "}
                      {format(parseISO(absence.end_date), "dd/MM/yyyy")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
