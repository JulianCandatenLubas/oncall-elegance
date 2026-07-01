import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertPrivileged(supabase: any, userId: string) {
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  const role = data?.role;
  if (role !== "admin" && role !== "gestor")
    throw new Error("Acesso negado");
}
async function getAdmin() {
  const mod = await import("@/integrations/supabase/client.server");
  return mod.supabaseAdmin;
}

const uuid = z.string().uuid();
const restrictionType = z.enum(["weekdays", "weekends", "holidays"]);
const priorityLevel = z.enum(["alta", "media", "baixa"]);
const weekdays = z.array(z.number().int().min(0).max(6));
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const listRestrictions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await getAdmin();
    const { data, error } = await admin
      .from("collaborator_restrictions")
      .select("*, collaborators(full_name)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createRestriction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      collaborator_id: uuid,
      type: restrictionType,
      weekdays: weekdays.default([]),
      start_date: isoDate.optional().nullable(),
      end_date: isoDate.optional().nullable(),
      notes: z.string().max(1000).optional().nullable(),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertPrivileged(context.supabase, context.userId);
    const admin = await getAdmin();
    const { data: r, error } = await admin
      .from("collaborator_restrictions")
      .insert({
        collaborator_id: data.collaborator_id,
        type: data.type,
        weekdays: data.weekdays,
        start_date: data.start_date ?? null,
        end_date: data.end_date ?? null,
        notes: data.notes ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return r;
  });

export const updateRestriction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: uuid,
      collaborator_id: uuid,
      type: restrictionType,
      weekdays: weekdays.default([]),
      start_date: isoDate.optional().nullable(),
      end_date: isoDate.optional().nullable(),
      notes: z.string().max(1000).optional().nullable(),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertPrivileged(context.supabase, context.userId);
    const admin = await getAdmin();
    const { error } = await admin
      .from("collaborator_restrictions")
      .update({
        collaborator_id: data.collaborator_id,
        type: data.type,
        weekdays: data.weekdays,
        start_date: data.start_date ?? null,
        end_date: data.end_date ?? null,
        notes: data.notes ?? null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteRestriction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: uuid }).parse)
  .handler(async ({ data, context }) => {
    await assertPrivileged(context.supabase, context.userId);
    const admin = await getAdmin();
    const { error } = await admin.from("collaborator_restrictions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listPriorities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await getAdmin();
    const { data, error } = await admin
      .from("collaborator_priorities")
      .select("*, collaborators(full_name)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createPriority = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      collaborator_id: uuid,
      weekdays: weekdays.default([]),
      level: priorityLevel,
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertPrivileged(context.supabase, context.userId);
    const admin = await getAdmin();
    const { data: r, error } = await admin
      .from("collaborator_priorities")
      .insert({
        collaborator_id: data.collaborator_id,
        weekdays: data.weekdays,
        level: data.level,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return r;
  });

export const updatePriority = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: uuid,
      collaborator_id: uuid,
      weekdays: weekdays.default([]),
      level: priorityLevel,
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertPrivileged(context.supabase, context.userId);
    const admin = await getAdmin();
    const { error } = await admin
      .from("collaborator_priorities")
      .update({
        collaborator_id: data.collaborator_id,
        weekdays: data.weekdays,
        level: data.level,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePriority = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: uuid }).parse)
  .handler(async ({ data, context }) => {
    await assertPrivileged(context.supabase, context.userId);
    const admin = await getAdmin();
    const { error } = await admin.from("collaborator_priorities").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
