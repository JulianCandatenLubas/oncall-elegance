import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateShifts } from "./schedule.utils";

type AppRole = "admin" | "gestor" | "visualizador";

async function getRole(supabase: any, userId: string): Promise<AppRole | null> {
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return (data?.role as AppRole) ?? null;
}

async function assertPrivileged(supabase: any, userId: string): Promise<AppRole> {
  const role = await getRole(supabase, userId);
  if (role !== "admin" && role !== "gestor") {
    throw new Error("Forbidden: requires admin or gestor role");
  }
  return role;
}

async function getAdmin() {
  const mod = await import("@/integrations/supabase/client.server");
  return mod.supabaseAdmin;
}

const collaboratorTeam = z.enum(["infra", "sre", "atendimento"]);
const collaboratorStatus = z.enum(["active", "inactive"]);
const absenceType = z.enum([
  "ferias",
  "atestado_medico",
  "licenca_medica",
  "licenca_maternidade",
  "licenca_paternidade",
  "folga_programada",
  "outros",
]);
const scheduleStatus = z.enum(["draft", "published"]);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");
const uuid = z.string().uuid();

export const getCollaborators = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const role = await getRole(supabase, userId);
    const isPrivileged = role === "admin" || role === "gestor";
    if (isPrivileged) {
      const admin = await getAdmin();
      const { data, error } = await admin.from("collaborators").select("*").order("full_name");
      if (error) throw error;
      return data ?? [];
    }
    const { data, error } = await supabase
      .from("collaborators")
      .select("id, full_name, team, status, created_at, updated_at")
      .order("full_name");
    if (error) throw error;
    return data ?? [];
  });

export const createCollaborator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      full_name: z.string().min(2).max(200),
      email: z.string().email().max(200).optional().nullable(),
      team: collaboratorTeam,
      status: collaboratorStatus,
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertPrivileged(context.supabase, context.userId);
    const admin = await getAdmin();
    const { data: result, error } = await admin
      .from("collaborators")
      .insert({ full_name: data.full_name, email: data.email ?? null, team: data.team, status: data.status })
      .select()
      .single();
    if (error) throw error;
    return result;
  });

export const updateCollaborator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: uuid,
      full_name: z.string().min(2).max(200).optional(),
      email: z.string().email().max(200).optional().nullable(),
      team: collaboratorTeam.optional(),
      status: collaboratorStatus.optional(),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertPrivileged(context.supabase, context.userId);
    const admin = await getAdmin();
    const { data: result, error } = await admin
      .from("collaborators")
      .update({
        full_name: data.full_name,
        email: data.email,
        team: data.team,
        status: data.status,
      })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw error;
    return result;
  });

export const deleteCollaborator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: uuid }).parse)
  .handler(async ({ data, context }) => {
    await assertPrivileged(context.supabase, context.userId);
    const admin = await getAdmin();
    const { error } = await admin.from("collaborators").delete().eq("id", data.id);
    if (error) throw error;
    return { success: true };
  });

export const getAbsences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("absences")
      .select("*, collaborators(full_name)")
      .order("start_date", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const createAbsence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      collaborator_id: uuid,
      type: absenceType,
      start_date: isoDate,
      end_date: isoDate,
      notes: z.string().max(1000).optional(),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertPrivileged(context.supabase, context.userId);
    const admin = await getAdmin();
    const { data: result, error } = await admin
      .from("absences")
      .insert({
        collaborator_id: data.collaborator_id,
        type: data.type,
        start_date: data.start_date,
        end_date: data.end_date,
        notes: data.notes,
      })
      .select()
      .single();
    if (error) throw error;
    return result;
  });

export const deleteAbsence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: uuid }).parse)
  .handler(async ({ data, context }) => {
    await assertPrivileged(context.supabase, context.userId);
    const admin = await getAdmin();
    const { error } = await admin.from("absences").delete().eq("id", data.id);
    if (error) throw error;
    return { success: true };
  });

export const getSchedules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("schedules")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const getScheduleShifts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ schedule_id: uuid }).parse)
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase
      .from("schedule_shifts")
      .select("*, infra:infra_collaborator_id(full_name), sre:sre_collaborator_id(full_name), atendimento:atendimento_collaborator_id(full_name)")
      .eq("schedule_id", data.schedule_id)
      .order("shift_date");
    if (error) throw error;
    return result ?? [];
  });

export const generateSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      start_date: isoDate,
      end_date: isoDate,
      team: z.enum(["all", "infra", "sre", "atendimento"]).optional().default("all"),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertPrivileged(context.supabase, context.userId);
    const admin = await getAdmin();

    const { data: collaborators, error: collabError } = await admin
      .from("collaborators")
      .select("*")
      .eq("status", "active");
    if (collabError) throw collabError;

    const { data: absences, error: absError } = await admin.from("absences").select("*");
    if (absError) throw absError;

    const { data: restrictions, error: restError } = await admin
      .from("collaborator_restrictions")
      .select("collaborator_id, type, weekdays, start_date, end_date");
    if (restError) throw restError;

    const { data: priorities, error: prioError } = await admin
      .from("collaborator_priorities")
      .select("collaborator_id, weekdays, level");
    if (prioError) throw prioError;

    const start = new Date(data.start_date);
    const end = new Date(data.end_date);

    const { generateShiftsDetailed } = await import("./schedule.utils");
    const result = generateShiftsDetailed(
      start,
      end,
      collaborators ?? [],
      absences ?? [],
      (restrictions ?? []) as any,
      (priorities ?? []) as any,
    );

    const teamScope = data.team ?? "all";
    const teamsGenerated =
      teamScope === "all" ? ["infra", "sre", "atendimento"] : [teamScope];

    const { data: schedule, error: schedError } = await admin
      .from("schedules")
      .insert({
        start_date: data.start_date,
        end_date: data.end_date,
        status: "draft",
        created_by: context.userId,
      })
      .select()
      .single();
    if (schedError) throw schedError;

    const shiftInserts = result.shifts.map((s: any) => ({
      schedule_id: schedule.id,
      shift_date: s.date,
      day_type: s.dayType,
      shift_type: s.shiftType,
      start_time: s.startTime,
      end_time: s.endTime,
      infra_collaborator_id: teamsGenerated.includes("infra") ? s.infra : null,
      sre_collaborator_id: teamsGenerated.includes("sre") ? s.sre : null,
      atendimento_collaborator_id: teamsGenerated.includes("atendimento") ? s.atendimento : null,
    }));

    const { error: shiftError } = await admin.from("schedule_shifts").insert(shiftInserts);
    if (shiftError) throw shiftError;

    return {
      ...schedule,
      hasConsecutiveConflict: result.hasConsecutiveConflict,
      teamsGenerated,
    };
  });

export const deleteSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: uuid }).parse)
  .handler(async ({ data, context }) => {
    await assertPrivileged(context.supabase, context.userId);
    const admin = await getAdmin();
    const { data: prev } = await admin.from("schedules").select("*").eq("id", data.id).single();
    const { error } = await admin.from("schedules").delete().eq("id", data.id);
    if (error) throw error;
    await admin.from("audit_logs").insert({
      table_name: "schedules",
      record_id: data.id,
      action: "delete",
      old_data: prev,
      user_id: context.userId,
    });
    return { success: true };
  });

export const updateScheduleStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: uuid, status: scheduleStatus }).parse)
  .handler(async ({ data, context }) => {
    await assertPrivileged(context.supabase, context.userId);
    const admin = await getAdmin();
    const { data: prev } = await admin.from("schedules").select("*").eq("id", data.id).single();
    const { data: result, error } = await admin
      .from("schedules")
      .update({ status: data.status })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw error;
    await admin.from("audit_logs").insert({
      table_name: "schedules",
      record_id: data.id,
      action: "update",
      old_data: prev,
      new_data: result,
      user_id: context.userId,
    });
    return result;
  });

export const updateScheduleShift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: uuid,
      infra_collaborator_id: uuid.nullable(),
      sre_collaborator_id: uuid.nullable(),
      atendimento_collaborator_id: uuid.nullable(),
      reason: z.string().max(500).optional(),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertPrivileged(context.supabase, context.userId);
    const admin = await getAdmin();
    const { data: prev } = await admin.from("schedule_shifts").select("*").eq("id", data.id).single();
    const { data: result, error } = await admin
      .from("schedule_shifts")
      .update({
        infra_collaborator_id: data.infra_collaborator_id,
        sre_collaborator_id: data.sre_collaborator_id,
        atendimento_collaborator_id: data.atendimento_collaborator_id,
      })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw error;
    await admin.from("audit_logs").insert({
      table_name: "schedule_shifts",
      record_id: data.id,
      action: "update",
      old_data: prev,
      new_data: result,
      user_id: context.userId,
      reason: data.reason,
    });
    return result;
  });

export const getAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPrivileged(context.supabase, context.userId);
    const admin = await getAdmin();
    const { data, error } = await admin
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data ?? [];
  });

export const getCurrentUserProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) throw error;
    return profile;
  });

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPrivileged(context.supabase, context.userId);
    const admin = await getAdmin();
    const today = new Date().toISOString().split("T")[0];

    const { count: totalCollaborators } = await admin
      .from("collaborators")
      .select("*", { count: "exact", head: true });
    const { count: totalInfra } = await admin
      .from("collaborators")
      .select("*", { count: "exact", head: true })
      .eq("team", "infra");
    const { count: totalSre } = await admin
      .from("collaborators")
      .select("*", { count: "exact", head: true })
      .eq("team", "sre");
    const { count: totalAtendimento } = await admin
      .from("collaborators")
      .select("*", { count: "exact", head: true })
      .eq("team", "atendimento");

    const { data: activeAbsences } = await admin
      .from("absences")
      .select("*, collaborators(full_name, team)")
      .lte("start_date", today)
      .gte("end_date", today);

    const onVacation = activeAbsences?.filter((a: any) => a.type === "ferias").length ?? 0;
    const onLeave = activeAbsences?.filter((a: any) => a.type !== "ferias").length ?? 0;

    const { data: currentMonthSchedule } = await admin
      .from("schedules")
      .select("*")
      .lte("start_date", today)
      .gte("end_date", today)
      .maybeSingle();

    return {
      totalCollaborators: totalCollaborators ?? 0,
      totalInfra: totalInfra ?? 0,
      totalSre: totalSre ?? 0,
      totalAtendimento: totalAtendimento ?? 0,
      onVacation,
      onLeave,
      activeAbsences: activeAbsences ?? [],
      currentMonthSchedule,
    };
  });
