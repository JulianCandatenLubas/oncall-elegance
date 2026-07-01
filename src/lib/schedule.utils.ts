import { format, addDays, isWeekend, getYear } from "date-fns";

export function getBrazilianHolidays(year: number): Array<{ name: string; date: string }> {
  const easter = calculateEaster(year);
  const holidays = [
    { name: "Confraternização Universal", date: `${year}-01-01` },
    { name: "Tiradentes", date: `${year}-04-21` },
    { name: "Dia do Trabalho", date: `${year}-05-01` },
    { name: "Independência", date: `${year}-09-07` },
    { name: "Nossa Senhora Aparecida", date: `${year}-10-12` },
    { name: "Finados", date: `${year}-11-02` },
    { name: "Proclamação da República", date: `${year}-11-15` },
    { name: "Natal", date: `${year}-12-25` },
    { name: "Carnaval", date: format(addDays(easter, -47), "yyyy-MM-dd") },
    { name: "Sexta-feira Santa", date: format(addDays(easter, -2), "yyyy-MM-dd") },
    { name: "Corpus Christi", date: format(addDays(easter, 60), "yyyy-MM-dd") },
  ];
  return holidays;
}

function calculateEaster(year: number): Date {
  const a = year % 19;
  const b = year % 4;
  const c = year % 7;
  const k = Math.floor(year / 100);
  const p = Math.floor((13 + 8 * k) / 25);
  const q = Math.floor(k / 4);
  const M = (15 - p + k - q) % 30;
  const N = (4 + k - q) % 7;
  const d = (19 * a + M) % 30;
  const e = (2 * b + 4 * c + 6 * d + N) % 7;
  let day: number, month: number;
  if (d === 29 && e === 6) { day = 19; month = 3; }
  else if (d === 28 && e === 6 && a > 10) { day = 18; month = 3; }
  else {
    const marchDay = 22 + d + e;
    if (marchDay <= 31) { day = marchDay; month = 2; } else { day = marchDay - 31; month = 3; }
  }
  return new Date(year, month, day);
}

export function isHoliday(date: Date, holidays: Array<{ date: string }>): boolean {
  const dateStr = format(date, "yyyy-MM-dd");
  return holidays.some((h) => h.date === dateStr);
}

export interface ShiftAssignment {
  date: string;
  dayType: "dia_util" | "fim_de_semana" | "feriado";
  shiftType: "diurno" | "noturno";
  startTime: string;
  endTime: string;
  infra: string | null;
  sre: string | null;
  atendimento: string | null;
}

export interface RestrictionInput {
  collaborator_id: string;
  type: "weekdays" | "weekends" | "holidays";
  weekdays: number[] | null;
  start_date: string | null;
  end_date: string | null;
}
export interface PriorityInput {
  collaborator_id: string;
  weekdays: number[] | null;
  level: "alta" | "media" | "baixa";
}

export interface GenerateResult {
  shifts: ShiftAssignment[];
  hasConsecutiveConflict: boolean;
}

export function generateShifts(
  start: Date,
  end: Date,
  collaborators: Array<{ id: string; team: string; status: string }>,
  absences: Array<{ collaborator_id: string; start_date: string; end_date: string }>,
  restrictions: RestrictionInput[] = [],
  priorities: PriorityInput[] = [],
): ShiftAssignment[] {
  return generateShiftsDetailed(start, end, collaborators, absences, restrictions, priorities).shifts;
}

export function generateShiftsDetailed(
  start: Date,
  end: Date,
  collaborators: Array<{ id: string; team: string; status: string }>,
  absences: Array<{ collaborator_id: string; start_date: string; end_date: string }>,
  restrictions: RestrictionInput[] = [],
  priorities: PriorityInput[] = [],
): GenerateResult {
  const year = getYear(start);
  const holidays = getBrazilianHolidays(year);
  const holidaySet = new Set(holidays.map((h) => h.date));

  const teamMap: Record<string, string[]> = { infra: [], sre: [], atendimento: [] };
  for (const c of collaborators) {
    if (c.status === "active" && teamMap[c.team]) teamMap[c.team].push(c.id);
  }

  const absenceMap = new Map<string, Set<string>>();
  for (const a of absences) {
    const s = new Date(a.start_date + "T00:00:00");
    const e = new Date(a.end_date + "T00:00:00");
    for (let d = new Date(s); d <= e; d = addDays(d, 1)) {
      const key = format(d, "yyyy-MM-dd");
      if (!absenceMap.has(key)) absenceMap.set(key, new Set());
      absenceMap.get(key)!.add(a.collaborator_id);
    }
  }

  function isRestricted(collabId: string, date: Date, dateStr: string, isWknd: boolean, isHol: boolean): boolean {
    const dow = date.getDay(); // 0=Sun..6=Sat
    for (const r of restrictions) {
      if (r.collaborator_id !== collabId) continue;
      if (r.start_date && dateStr < r.start_date) continue;
      if (r.end_date && dateStr > r.end_date) continue;
      if (r.type === "holidays" && isHol) return true;
      if (r.type === "weekends" && isWknd) return true;
      if (r.type === "weekdays" && Array.isArray(r.weekdays) && r.weekdays.includes(dow)) return true;
    }
    return false;
  }

  function priorityScore(collabId: string, date: Date): number {
    const dow = date.getDay();
    let best = 0;
    for (const p of priorities) {
      if (p.collaborator_id !== collabId) continue;
      if (!Array.isArray(p.weekdays) || !p.weekdays.includes(dow)) continue;
      const s = p.level === "alta" ? 3 : p.level === "media" ? 2 : 1;
      if (s > best) best = s;
    }
    return best;
  }

  const shifts: ShiftAssignment[] = [];
  const shiftCount = new Map<string, number>();
  const lastAssignedDate = new Map<string, string>();
  let hasConsecutiveConflict = false;

  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    const dateStr = format(d, "yyyy-MM-dd");
    const isHol = holidaySet.has(dateStr);
    const isWknd = isWeekend(d);
    const dayType: "dia_util" | "fim_de_semana" | "feriado" =
      isHol ? "feriado" : isWknd ? "fim_de_semana" : "dia_util";

    const dayShifts =
      dayType === "dia_util"
        ? [{ type: "noturno" as const, start: "18:00", end: "08:00" }]
        : [
            { type: "diurno" as const, start: "08:00", end: "18:00" },
            { type: "noturno" as const, start: "18:00", end: "08:00" },
          ];

    const yesterdayStr = format(addDays(d, -1), "yyyy-MM-dd");
    const usedToday = new Set<string>();

    for (const shift of dayShifts) {
      const assignment: ShiftAssignment = {
        date: dateStr,
        dayType,
        shiftType: shift.type,
        startTime: shift.start,
        endTime: shift.end,
        infra: null,
        sre: null,
        atendimento: null,
      };

      for (const team of ["infra", "sre", "atendimento"] as const) {
        const candidates = teamMap[team].filter((id) => {
          if (usedToday.has(id)) return false;
          if (absenceMap.get(dateStr)?.has(id)) return false;
          if (isRestricted(id, d, dateStr, isWknd, isHol)) return false;
          const last = lastAssignedDate.get(id);
          if (last === yesterdayStr) return false; // no consecutive days
          return true;
        });

        candidates.sort((a, b) => {
          const pa = priorityScore(a, d);
          const pb = priorityScore(b, d);
          if (pa !== pb) return pb - pa;
          const ca = shiftCount.get(a) ?? 0;
          const cb = shiftCount.get(b) ?? 0;
          if (ca !== cb) return ca - cb;
          return Math.random() - 0.5;
        });

        if (candidates.length > 0) {
          const chosen = candidates[0];
          assignment[team] = chosen;
          shiftCount.set(chosen, (shiftCount.get(chosen) ?? 0) + 1);
          lastAssignedDate.set(chosen, dateStr);
          usedToday.add(chosen);
        } else {
          if (teamMap[team].length > 0) hasConsecutiveConflict = true;
        }
      }

      shifts.push(assignment);
    }
  }

  return { shifts, hasConsecutiveConflict };
}
