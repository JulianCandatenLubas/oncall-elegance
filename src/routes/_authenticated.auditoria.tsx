import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAuditLogs } from "@/lib/schedule.functions";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/auditoria")({
  component: AuditoriaPage,
});

function AuditoriaPage() {
  const fetchLogs = useServerFn(getAuditLogs);
  const [query, setQuery] = useState("");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => fetchLogs(),
  });

  const filtered = logs?.filter((l: any) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      l.table_name?.toLowerCase().includes(q) ||
      l.action?.toLowerCase().includes(q) ||
      l.reason?.toLowerCase().includes(q) ||
      l.record_id?.toLowerCase().includes(q)
    );
  });

  const actionColor = (a: string) =>
    a === "create" ? "default" : a === "update" ? "secondary" : "destructive";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Auditoria</h1>
        <p className="text-sm text-muted-foreground">
          Histórico de alterações em escalas e plantões
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por tabela, ação, motivo..."
          className="pl-9"
        />
      </div>

      <div className="rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : filtered && filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Data</th>
                  <th className="px-4 py-2 font-medium">Tabela</th>
                  <th className="px-4 py-2 font-medium">Ação</th>
                  <th className="px-4 py-2 font-medium">Registro</th>
                  <th className="px-4 py-2 font-medium">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l: any) => (
                  <tr key={l.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-4 py-2 text-muted-foreground">
                      {format(parseISO(l.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </td>
                    <td className="px-4 py-2 font-medium">{l.table_name}</td>
                    <td className="px-4 py-2">
                      <Badge variant={actionColor(l.action) as any} className="capitalize">
                        {l.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                      {l.record_id?.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{l.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
            <FileText className="mb-3 h-10 w-10 opacity-50" />
            <p className="text-sm">Nenhum registro de auditoria</p>
          </div>
        )}
      </div>
    </div>
  );
}
