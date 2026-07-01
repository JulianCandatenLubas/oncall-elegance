import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated/alterar-senha")({
  component: AlterarSenhaPage,
});

function AlterarSenhaPage() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 6) return toast.error("A nova senha deve ter no mínimo 6 caracteres");
    if (next !== confirm) return toast.error("Nova senha e confirmação não coincidem");
    setLoading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const email = userRes.user?.email;
      if (!email) throw new Error("Sessão inválida");

      // Detect Google-only users: try reauth with current password first.
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email,
        password: current,
      });
      if (signErr) {
        const msg = signErr.message?.toLowerCase() ?? "";
        if (msg.includes("invalid")) {
          toast.error(
            "Senha atual incorreta. Se sua conta utiliza login pelo Google, para definir uma senha utilize a opção 'Esqueci minha senha' na tela de login.",
          );
        } else {
          toast.error(signErr.message);
        }
        return;
      }
      const { error: upErr } = await supabase.auth.updateUser({ password: next });
      if (upErr) throw upErr;
      toast.success("Senha alterada com sucesso");
      setCurrent(""); setNext(""); setConfirm("");
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao alterar senha");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alterar senha</h1>
          <p className="text-sm text-muted-foreground">Atualize a senha da sua conta.</p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6">
        <div className="space-y-2">
          <Label>Senha atual</Label>
          <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Nova senha</Label>
          <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={6} />
        </div>
        <div className="space-y-2">
          <Label>Confirmar nova senha</Label>
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Salvando..." : "Salvar nova senha"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Contas cadastradas via Google devem definir uma senha usando a opção
          <strong> "Esqueci minha senha" </strong>na tela de login.
        </p>
      </form>
    </div>
  );
}
