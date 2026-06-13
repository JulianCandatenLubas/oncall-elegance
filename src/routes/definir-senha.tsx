import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

export const Route = createFileRoute("/definir-senha")({
  component: DefinirSenhaPage,
});

function DefinirSenhaPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // supabase-js auto-processes the hash tokens from invite/recovery link
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      setReady(!!data.session);
    }, 400);
    return () => clearTimeout(t);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) return toast.error("Senha deve ter ao menos 6 caracteres");
    if (password !== confirm) return toast.error("As senhas não coincidem");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Senha definida com sucesso");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Defina sua senha</h1>
          <p className="text-sm text-muted-foreground">
            Crie uma senha para concluir o acesso à plataforma.
          </p>
        </div>
        {!ready ? (
          <p className="text-center text-sm text-muted-foreground">
            Validando convite... Se este link já foi usado ou expirou, solicite um novo
            convite ao administrador.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 rounded-xl border bg-card p-6">
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmar senha</Label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Salvando..." : "Definir senha e entrar"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
