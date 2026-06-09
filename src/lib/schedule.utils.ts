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

  let day: number;
  let month: number;

  if (d === 29 && e === 6) {
    day = 19;
    month = 3;
  } else if (d === 28 && e === 6 && a > 10) {
    day = 18;
    month = 3;
  } else {
    const marchDay = 22 + d + e;
    if (marchDay <= 31) {
      day = marchDay;
      month = 2;
    } else {
      day = marchDay - 31;
      month = 3;
    }
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

export function generateShifts(
  start: Date,
  end: Date,
  collaborators: Array<{ id: string; team: string; status: string }>,
  absences: Array<{ collaborator_id: string; start_date: string; end_date: string }>
): ShiftAssignment[] {
  const year = getYear(start);
  const holidays = getBrazilianHolidays(year);
  const holidaySet = new Set(holidays.map((h) => h.date));

  const teamMap: Record<string, string[]> = {
    infra: [],
    sre: [],
    atendimento: [],
  };

  for (const c of collaborators) {
    if (c.status === "active" && teamMap[c.team]) {
      teamMap[c.team].push(c.id);
    }
  }

  const absenceMap = new Map<string, Set<string>>();
  for (const a of absences) {
    const startD = new Date(a.start_date);
    const endD = new Date(a.end_date);
    for (let d = new Date(startD); d <= endD; d = addDays(d, 1)) {
      const key = format(d, "yyyy-MM-dd");
      if (!absenceMap.has(key)) absenceMap.set(key, new Set());
      absenceMap.get(key)!.add(a.collaborator_id);
    }
  }

  const shifts: ShiftAssignment[] = [];
  const shiftCount = new Map<string, number>();
  const lastShift = new Map<string, { date: string; type: "diurno" | "noturno" }>();

  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    const dateStr = format(d, "yyyy-MM-dd");
    const isHol = holidaySet.has(dateStr);
    const isWknd = isWeekend(d);
    const dayType: "dia_util" | "fim_de_semana" | "feriado" = isHol
      ? "feriado"
      : isWknd
        ? "fim_de_semana"
        : "dia_util";

    const dayShifts: Array<{ type: "diurno" | "noturno"; start: string; end: string }> =
      dayType === "dia_util"
        ? [{ type: "noturno" as const, start: "18:00", end: "08:00" }]
        : [
            { type: "diurno" as const, start: "08:00", end: "18:00" },
            { type: "noturno" as const, start: "18:00", end: "08:00" },
          ];

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
          const absent = absenceMap.get(dateStr)?.has(id);
          if (absent) return false;

          const last = lastShift.get(id);
          if (!last) return true;

          if (last.date === dateStr) return false;

          const prevDate = addDays(new Date(dateStr), -1);
          const prevDateStr = format(prevDate, "yyyy-MM-dd");
          if (last.date === prevDateStr && last.type === "noturno") return false;

          return true;
        });

        candidates.sort((a, b) => {
          const countA = shiftCount.get(a) ?? 0;
          const countB = shiftCount.get(b) ?? 0;
          if (countA !== countB) return countA - countB;
          return Math.random() - 0.5;
        });

        if (candidates.length > 0) {
          const chosen = candidates[0];
          assignment[team] = chosen;
          shiftCount.set(chosen, (shiftCount.get(chosen) ?? 0) + 1);
          lastShift.set(chosen, { date: dateStr, type: shift.type });
        }
      }

      shifts.push(assignment);
    }
  }

  return shifts;
}
