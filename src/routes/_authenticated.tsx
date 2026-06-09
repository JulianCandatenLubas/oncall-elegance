import { createFileRoute, Outlet, Link, useRouter, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentUserProfile } from "@/lib/schedule.functions";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutDashboard,
  Users,
  CalendarOff,
  CalendarDays,
  Shield,
  LogOut,
  Menu,
  X,
  FileText,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Colaboradores", to: "/colaboradores", icon: Users },
  { label: "Ausências", to: "/ausencias", icon: CalendarOff },
  { label: "Escalas", to: "/escalas", icon: CalendarDays },
  { label: "Auditoria", to: "/auditoria", icon: FileText },
];

function AuthenticatedLayout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const fetchProfile = useServerFn(getCurrentUserProfile);
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
  });

  async function handleLogout() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  const isAdminOrGestor = profile?.role === "admin" || profile?.role === "gestor";

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-card transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b border-border px-6 py-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">EscalaPlantão</h1>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Gestão Corporativa
              </p>
            </div>
            <button
              className="ml-auto lg:hidden"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => {
              const isRestricted = item.to === "/auditoria" && !isAdminOrGestor;
              if (isRestricted) return null;
              const Icon = item.icon;
              const active = router.state.location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-border p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-xs font-bold">
                {profile?.full_name?.charAt(0) ?? "U"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{profile?.full_name ?? "Usuário"}</p>
                <p className="text-xs text-muted-foreground capitalize">{profile?.role ?? "visualizador"}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center gap-4 border-b border-border bg-card px-4 py-3 lg:px-8">
          <button
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-auto text-xs text-muted-foreground">
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
