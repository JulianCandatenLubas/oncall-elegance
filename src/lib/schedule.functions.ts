import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateShifts, type ShiftAssignment } from "./schedule.utils";

export const getCollaborators = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).single();
    const isPrivileged = profile?.role === "admin" || profile?.role === "gestor";
    const query = isPrivileged
      ? supabase.from("collaborators").select("*")
      : supabase.from("collaborators").select("id, full_name, team, status, created_at, updated_at");
    const { data, error } = await query.order("full_name");
    if (error) throw error;
    return (data ?? []) as Array<{ id: string; full_name: string; email?: string; team: string; status: string; created_at: string; updated_at: string }>;
  });

export const createCollaborator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { full_name: string; email: string; team: string; status: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: result, error } = await supabase
      .from("collaborators")
      .insert({
        full_name: data.full_name,
        email: data.email,
        team: data.team as "infra" | "sre" | "atendimento",
        status: data.status as "active" | "inactive",
      })
      .select()
      .single();
    if (error) throw error;
    return result;
  });

export const updateCollaborator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; full_name?: string; email?: string; team?: string; status?: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: result, error } = await supabase
      .from("collaborators")
      .update({
        full_name: data.full_name,
        email: data.email,
        team: data.team as "infra" | "sre" | "atendimento",
        status: data.status as "active" | "inactive",
      })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw error;
    return result;
  });

export const deleteCollaborator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("collaborators").delete().eq("id", data.id);
    if (error) throw error;
    return { success: true };
  });

export const getAbsences = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("absences")
    .select("*, collaborators(full_name)")
    .order("start_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
});

export const createAbsence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { collaborator_id: string; type: string; start_date: string; end_date: string; notes?: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: result, error } = await supabase
      .from("absences")
      .insert({
        collaborator_id: data.collaborator_id,
        type: data.type as "ferias" | "atestado_medico" | "licenca_medica" | "licenca_maternidade" | "licenca_paternidade" | "folga_programada" | "outros",
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
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("absences").delete().eq("id", data.id);
    if (error) throw error;
    return { success: true };
  });

export const getSchedules = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("schedules")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
});

export const getScheduleShifts = createServerFn({ method: "GET" })
  .inputValidator((input: { schedule_id: string }) => input)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin
      .from("schedule_shifts")
      .select("*, infra:infra_collaborator_id(full_name), sre:sre_collaborator_id(full_name), atendimento:atendimento_collaborator_id(full_name)")
      .eq("schedule_id", data.schedule_id)
      .order("shift_date");
    if (error) throw error;
    return result ?? [];
  });

export const generateSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { start_date: string; end_date: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: collaborators, error: collabError } = await supabase
      .from("collaborators")
      .select("*")
      .eq("status", "active");
    if (collabError) throw collabError;

    const { data: absences, error: absError } = await supabase
      .from("absences")
      .select("*");
    if (absError) throw absError;

    const start = new Date(data.start_date);
    const end = new Date(data.end_date);

    const { data: schedule, error: schedError } = await supabase
      .from("schedules")
      .insert({
        start_date: data.start_date,
        end_date: data.end_date,
        status: "draft",
        created_by: userId,
      })
      .select()
      .single();
    if (schedError) throw schedError;

    const shifts = generateShifts(start, end, collaborators ?? [], absences ?? []);

    const shiftInserts = shifts.map((s) => ({
      schedule_id: schedule.id,
      shift_date: s.date,
      day_type: s.dayType,
      shift_type: s.shiftType,
      start_time: s.startTime,
      end_time: s.endTime,
      infra_collaborator_id: s.infra,
      sre_collaborator_id: s.sre,
      atendimento_collaborator_id: s.atendimento,
    }));

    const { error: shiftError } = await supabase.from("schedule_shifts").insert(shiftInserts);
    if (shiftError) throw shiftError;

    return schedule;
  });

export const deleteSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prev } = await supabase.from("schedules").select("*").eq("id", data.id).single();
    const { error } = await supabase.from("schedules").delete().eq("id", data.id);
    if (error) throw error;
    await supabase.from("audit_logs").insert({
      table_name: "schedules",
      record_id: data.id,
      action: "delete",
      old_data: prev,
      user_id: userId,
    });
    return { success: true };
  });

export const updateScheduleStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prev } = await supabase.from("schedules").select("*").eq("id", data.id).single();
    const { data: result, error } = await supabase
      .from("schedules")
      .update({ status: data.status as "draft" | "published" })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw error;
    await supabase.from("audit_logs").insert({
      table_name: "schedules",
      record_id: data.id,
      action: "update",
      old_data: prev,
      new_data: result,
      user_id: userId,
    });
    return result;
  });

export const updateScheduleShift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    id: string;
    infra_collaborator_id: string | null;
    sre_collaborator_id: string | null;
    atendimento_collaborator_id: string | null;
    reason?: string;
  }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prev } = await supabase.from("schedule_shifts").select("*").eq("id", data.id).single();
    const { data: result, error } = await supabase
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
    await supabase.from("audit_logs").insert({
      table_name: "schedule_shifts",
      record_id: data.id,
      action: "update",
      old_data: prev,
      new_data: result,
      user_id: userId,
      reason: data.reason,
    });
    return result;
  });

export const getAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
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

export const getDashboardStats = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const today = new Date().toISOString().split("T")[0];

  const { count: totalCollaborators } = await supabaseAdmin
    .from("collaborators")
    .select("*", { count: "exact", head: true });

  const { count: totalInfra } = await supabaseAdmin
    .from("collaborators")
    .select("*", { count: "exact", head: true })
    .eq("team", "infra");

  const { count: totalSre } = await supabaseAdmin
    .from("collaborators")
    .select("*", { count: "exact", head: true })
    .eq("team", "sre");

  const { count: totalAtendimento } = await supabaseAdmin
    .from("collaborators")
    .select("*", { count: "exact", head: true })
    .eq("team", "atendimento");

  const { data: activeAbsences } = await supabaseAdmin
    .from("absences")
    .select("*, collaborators(full_name, team)")
    .lte("start_date", today)
    .gte("end_date", today);

  const onVacation = activeAbsences?.filter((a) => a.type === "ferias").length ?? 0;
  const onLeave = activeAbsences?.filter((a) => a.type !== "ferias").length ?? 0;

  const { data: currentMonthSchedule } = await supabaseAdmin
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
