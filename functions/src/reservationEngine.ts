/**
 * Motor de reservas: horarios, capacidad por mesas QR y asignación automática.
 * ⚠️ Este archivo está duplicado en src/lib/reservationEngine.ts (panel).
 * Si lo cambiás, copialo igual en los dos lados.
 */

export type DaySchedule = { enabled: boolean; start: string; end: string };

export type CapacityMode = "tables" | "covers";

export type ReservationsConfig = {
  /** 0 = domingo ... 6 = sábado */
  schedule: Record<string, DaySchedule>;
  interval_minutes: number;
  duration_minutes: number;
  min_notice_minutes: number;
  days_ahead: number;
  max_people: number;
  capacity_mode: CapacityMode;
  max_covers_per_slot: number;
  allow_combine_tables: boolean;
  auto_confirm: boolean;
  auto_no_show_minutes: number; // 0 = desactivado
  closed_dates: string[]; // YYYY-MM-DD
};

export type ReservableTable = {
  id: string;
  name: string;
  seats: number;
  reservable: boolean;
};

export type BlockingReservation = {
  id: string;
  date: string;
  time: string;
  duration_minutes: number;
  people: number;
  status: string;
  table_ids: string[];
};

export type Assignment =
  | { ok: true; table_ids: string[] }
  | { ok: false; reason: "closed" | "invalid_time" | "too_many_people" | "no_capacity" | "no_tables" };

export const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const isHHMM = (v: unknown): v is string => typeof v === "string" && /^\d{2}:\d{2}$/.test(v);
const num = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const pad = (n: number) => String(n).padStart(2, "0");
const fromMin = (m: number) => {
  const mm = ((m % 1440) + 1440) % 1440;
  return `${pad(Math.floor(mm / 60))}:${pad(mm % 60)}`;
};

export function normalizeReservationsConfig(raw: any): ReservationsConfig {
  const c = raw ?? {};
  // compat: la versión anterior tenía un único horario para todos los días
  const legacyStart = isHHMM(c.start_time) ? c.start_time : "20:00";
  const legacyEnd = isHHMM(c.end_time) ? c.end_time : "23:30";

  const schedule: Record<string, DaySchedule> = {};
  for (let d = 0; d < 7; d++) {
    const s = c.schedule?.[String(d)];
    schedule[String(d)] = {
      enabled: s ? Boolean(s.enabled) : true,
      start: isHHMM(s?.start) ? s.start : legacyStart,
      end: isHHMM(s?.end) ? s.end : legacyEnd,
    };
  }

  return {
    schedule,
    interval_minutes: Math.max(15, num(c.interval_minutes, 30)),
    duration_minutes: Math.max(15, num(c.duration_minutes, 90)),
    min_notice_minutes: Math.max(0, num(c.min_notice_minutes, 60)),
    days_ahead: Math.min(365, Math.max(1, num(c.days_ahead, 30))),
    max_people: Math.max(1, num(c.max_people, 10)),
    capacity_mode: c.capacity_mode === "covers" ? "covers" : "tables",
    max_covers_per_slot: Math.max(1, num(c.max_covers_per_slot, 40)),
    allow_combine_tables: c.allow_combine_tables !== false,
    auto_confirm: Boolean(c.auto_confirm ?? false),
    auto_no_show_minutes: Math.max(0, num(c.auto_no_show_minutes, 0)),
    closed_dates: Array.isArray(c.closed_dates)
      ? c.closed_dates.filter((d: unknown) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d))
      : [],
  };
}

export const weekdayOf = (ymd: string) => new Date(`${ymd}T12:00:00Z`).getUTCDay();

export function dayScheduleFor(cfg: ReservationsConfig, ymd: string): DaySchedule | null {
  if (cfg.closed_dates.includes(ymd)) return null;
  const s = cfg.schedule[String(weekdayOf(ymd))];
  return s?.enabled ? s : null;
}

/**
 * Minutos desde el inicio del día de servicio. Si el turno cruza la medianoche,
 * los horarios menores al inicio corresponden a la madrugada siguiente.
 */
function offsetFor(time: string, schedule: DaySchedule) {
  const start = toMin(schedule.start);
  const end = toMin(schedule.end);
  const m = toMin(time);
  return end <= start && m < start ? m + 1440 : m;
}

/** Minutos desde las 00:00 de `ymd` (puede superar 1440 si el turno cruza la medianoche). */
export function slotOffsetMinutes(cfg: ReservationsConfig, ymd: string, time: string) {
  const s = cfg.schedule[String(weekdayOf(ymd))];
  return s ? offsetFor(time, s) : toMin(time);
}

export function slotsForDate(cfg: ReservationsConfig, ymd: string): string[] {
  const s = dayScheduleFor(cfg, ymd);
  if (!s) return [];
  const start = toMin(s.start);
  let end = toMin(s.end);
  if (end <= start) end += 1440;
  const slots: string[] = [];
  for (let m = start; m <= end; m += cfg.interval_minutes) slots.push(fromMin(m));
  return slots;
}

const BLOCKING = new Set(["pendiente", "confirmada"]);

function overlapping(
  cfg: ReservationsConfig,
  date: string,
  time: string,
  reservations: BlockingReservation[]
) {
  const schedule = dayScheduleFor(cfg, date) ?? { enabled: true, start: "00:00", end: "23:59" };
  const a0 = offsetFor(time, schedule);
  const a1 = a0 + cfg.duration_minutes;
  return reservations.filter((r) => {
    if (r.date !== date || !BLOCKING.has(r.status)) return false;
    const b0 = offsetFor(r.time, schedule);
    const b1 = b0 + (r.duration_minutes || cfg.duration_minutes);
    return a0 < b1 && b0 < a1;
  });
}

/** Busca lugar para una reserva. No valida anticipación mínima (ver isBookableNow). */
export function findAssignment(
  cfg: ReservationsConfig,
  tables: ReservableTable[],
  reservations: BlockingReservation[],
  date: string,
  time: string,
  people: number,
  opts: { ignoreReservationId?: string; ignoreLimits?: boolean } = {}
): Assignment {
  if (!opts.ignoreLimits) {
    if (!dayScheduleFor(cfg, date)) return { ok: false, reason: "closed" };
    if (!slotsForDate(cfg, date).includes(time)) return { ok: false, reason: "invalid_time" };
    if (people > cfg.max_people) return { ok: false, reason: "too_many_people" };
  }

  const others = reservations.filter((r) => r.id !== opts.ignoreReservationId);
  const busy = overlapping(cfg, date, time, others);

  if (cfg.capacity_mode === "covers") {
    const used = busy.reduce((s, r) => s + r.people, 0);
    return used + people <= cfg.max_covers_per_slot
      ? { ok: true, table_ids: [] }
      : { ok: false, reason: "no_capacity" };
  }

  const candidates = tables.filter((t) => t.reservable && t.seats > 0);
  if (candidates.length === 0) return { ok: false, reason: "no_tables" };

  const busyIds = new Set(busy.flatMap((r) => r.table_ids ?? []));
  const free = candidates.filter((t) => !busyIds.has(t.id));

  // 1) la mesa más chica donde entren todos
  const single = free
    .filter((t) => t.seats >= people)
    .sort((a, b) => a.seats - b.seats || a.name.localeCompare(b.name, "es", { numeric: true }))[0];
  if (single) return { ok: true, table_ids: [single.id] };

  // 2) juntar mesas libres (de mayor a menor) hasta cubrir
  if (cfg.allow_combine_tables) {
    const sorted = [...free].sort((a, b) => b.seats - a.seats);
    const picked: ReservableTable[] = [];
    let seats = 0;
    for (const t of sorted) {
      if (seats >= people) break;
      picked.push(t);
      seats += t.seats;
    }
    if (seats >= people) return { ok: true, table_ids: picked.map((t) => t.id) };
  }

  return { ok: false, reason: "no_capacity" };
}

/** `nowYMD` y `nowMinutes` en la hora local del comercio. */
export function isBookableNow(
  cfg: ReservationsConfig,
  date: string,
  time: string,
  nowYMD: string,
  nowMinutes: number
) {
  if (date < nowYMD) return false;
  const maxDate = addDays(nowYMD, cfg.days_ahead);
  if (date > maxDate) return false;

  const schedule = dayScheduleFor(cfg, date);
  if (!schedule) return false;

  const dayDiff = Math.round(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${nowYMD}T00:00:00Z`)) / 86400000
  );
  const slotAbs = dayDiff * 1440 + offsetFor(time, schedule);
  return slotAbs - nowMinutes >= cfg.min_notice_minutes;
}

export function addDays(ymd: string, days: number) {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function availability(
  cfg: ReservationsConfig,
  tables: ReservableTable[],
  reservations: BlockingReservation[],
  date: string,
  people: number,
  nowYMD: string,
  nowMinutes: number
) {
  return slotsForDate(cfg, date).map((time) => ({
    time,
    available:
      isBookableNow(cfg, date, time, nowYMD, nowMinutes) &&
      findAssignment(cfg, tables, reservations, date, time, people).ok,
  }));
}

export const ASSIGNMENT_ERROR: Record<Exclude<Assignment, { ok: true }>["reason"], string> = {
  closed: "Ese día el comercio no toma reservas",
  invalid_time: "Horario inválido",
  too_many_people: "Superaste la cantidad máxima de personas por reserva",
  no_capacity: "No hay lugar disponible para ese horario",
  no_tables: "El comercio todavía no configuró mesas para reservar",
};
