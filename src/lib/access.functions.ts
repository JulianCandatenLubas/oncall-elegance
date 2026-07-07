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

async function assertAdminOrEditor(ctx: { supabase: any; userId: string }) {
  const { data: prof, error } = await ctx.supabase
    .from("profiles")
    .select("role")
    .eq("id", ctx.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const role = prof?.role;
  if (role !== "admin" && role !== "editor" && role !== "gestor") {
    throw new Error("Acesso negado");
  }
}

async function syncCollaboratorFromAccess(
  admin: any,
  payload: { full_name: string; email: string },
) {
  const email = payload.email.trim().toLowerCase();
  if (!email) return;
  const { data: existing } = await admin
    .from("collaborators")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existing) return;
  await admin.from("collaborators").insert({
    full_name: payload.full_name,
    email,
    team: "atendimento",
    status: "active",
  });
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
  role: "admin" | "editor" | "visualizador";
  whatsapp?: string | null;
  is_collaborator: boolean;
  redirect_to?: string;
};

const DEFAULT_PASSWORD = "123456";

export const inviteAccessUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: InviteInput) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const email = data.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("E-mail inválido");
    if (email === "juliancandatenlubas@gmail.com") throw new Error("E-mail reservado");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name,
        role: data.role,
        whatsapp: data.whatsapp ?? null,
        is_collaborator: data.is_collaborator,
      },
    });
    if (cErr || !created?.user) throw new Error(cErr?.message ?? "Falha ao criar usuário");

    const { error: upErr } = await supabaseAdmin.from("profiles").upsert(
      {
        id: created.user.id,
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

    if (data.is_collaborator) {
      await syncCollaboratorFromAccess(supabaseAdmin, {
        full_name: data.full_name,
        email,
      });
    }

    // Best-effort transactional email informing default password.
    try {
      const site = process.env.SITE_URL ?? "";
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          data: {
            welcome_message:
              "Sua senha inicial é 123456. Altere-a no primeiro acesso pela tela Alterar Senha.",
          },
          redirectTo: site,
        },
      });
    } catch {
      // ignore
    }

    return { ok: true, default_password: DEFAULT_PASSWORD };
  });

type UpdateInput = {
  id: string;
  full_name?: string;
  role?: "admin" | "editor" | "visualizador";
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
    const { error } = await supabaseAdmin.from("profiles").update(patch as any).eq("id", data.id);
    if (error) throw new Error(error.message);

    if (data.is_collaborator === true) {
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("full_name, email")
        .eq("id", data.id)
        .maybeSingle();
      if (prof?.email) {
        await syncCollaboratorFromAccess(supabaseAdmin, {
          full_name: prof.full_name ?? "",
          email: prof.email,
        });
      }
    }
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
