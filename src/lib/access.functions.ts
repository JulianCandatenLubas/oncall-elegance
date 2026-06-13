import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN_ID = "d81cd53e-f6c7-4f5d-9bbc-285cf23fcd88";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_app_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso negado");
}

export const listAccessUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, full_name, email, role, whatsapp, is_collaborator, active, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

type InviteInput = {
  full_name: string;
  email: string;
  role: "editor" | "visualizador";
  whatsapp?: string | null;
  is_collaborator: boolean;
  redirect_to: string;
};

export const inviteAccessUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: InviteInput) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const email = data.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("E-mail inválido");
    if (email === "juliancandatenlubas@gmail.com") throw new Error("E-mail reservado");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: invited, error: invErr } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name: data.full_name,
          role: data.role,
          whatsapp: data.whatsapp ?? null,
          is_collaborator: data.is_collaborator,
        },
        redirectTo: data.redirect_to,
      });
    if (invErr || !invited?.user) throw new Error(invErr?.message ?? "Falha ao enviar convite");

    const { error: upErr } = await supabaseAdmin.from("profiles").upsert(
      {
        id: invited.user.id,
        full_name: data.full_name,
        email,
        role: data.role,
        whatsapp: data.whatsapp ?? null,
        is_collaborator: data.is_collaborator,
        active: true,
      },
      { onConflict: "id" },
    );
    if (upErr) throw new Error(upErr.message);
    return { ok: true };
  });

type UpdateInput = {
  id: string;
  full_name?: string;
  role?: "editor" | "visualizador";
  whatsapp?: string | null;
  is_collaborator?: boolean;
  active?: boolean;
};

export const updateAccessUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: UpdateInput) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id === ADMIN_ID) throw new Error("Conta protegida");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = {};
    for (const k of ["full_name", "role", "whatsapp", "is_collaborator", "active"] as const) {
      if (data[k] !== undefined) patch[k] = data[k];
    }
    const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAccessUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id === ADMIN_ID) throw new Error("Conta protegida");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const ensureProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", context.userId)
      .maybeSingle();
    if (existing) return { created: false };

    const { data: userRes, error: uErr } = await supabaseAdmin.auth.admin.getUserById(
      context.userId,
    );
    if (uErr || !userRes?.user) throw new Error(uErr?.message ?? "Usuário não encontrado");
    const u = userRes.user;
    const meta = (u.user_metadata ?? {}) as Record<string, any>;
    const full_name =
      meta.full_name || meta.name || (u.email ? u.email.split("@")[0] : "Usuário");
    const role = (meta.role as "editor" | "visualizador") ?? "visualizador";

    const { error } = await supabaseAdmin.from("profiles").upsert(
      {
        id: u.id,
        full_name,
        email: u.email,
        role,
        whatsapp: meta.whatsapp ?? null,
        is_collaborator: Boolean(meta.is_collaborator ?? false),
        active: true,
      },
      { onConflict: "id" },
    );
    if (error) throw new Error(error.message);
    return { created: true };
  });
