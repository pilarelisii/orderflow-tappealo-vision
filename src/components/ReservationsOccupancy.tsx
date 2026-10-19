import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Reservation } from "@/types/reservation";
import {
  slotOffsetMinutes,
  slotsForDate,
  type ReservableTable,
  type ReservationsConfig,
} from "@/lib/reservationEngine";
import { todayYMD } from "@/hooks/useReservations";

type Props = {
  reservations: Reservation[];
  tables: ReservableTable[];
  config: ReservationsConfig;
};

const ACTIVE = new Set(["pendiente", "confirmada", "completada"]);

const CELL_STYLE: Record<string, string> = {
  pendiente: "bg-amber-200 text-amber-900",
  confirmada: "bg-emerald-200 text-emerald-900",
  completada: "bg-sky-200 text-sky-900",
};

/** Grilla mesa × horario para ver de un vistazo qué está ocupado. */
export default function ReservationsOccupancy({ reservations, tables, config }: Props) {
  const [date, setDate] = useState(todayYMD());
  const slots = slotsForDate(config, date);

  const dayReservations = useMemo(
    () => reservations.filter((r) => r.date === date && ACTIVE.has(r.status)),
    [reservations, date]
  );

  const covers = dayReservations.reduce((s, r) => s + r.people, 0);
  const seats = tables.filter((t) => t.reservable).reduce((s, t) => s + t.seats, 0);

  // reserva que ocupa la mesa en ese horario
  const occupant = (tableId: string | null, slot: string) => {
    const at = slotOffsetMinutes(config, date, slot);
    return dayReservations.find((r) => {
      const matches = tableId ? r.table_ids.includes(tableId) : r.table_ids.length === 0;
      if (!matches) return false;
      const start = slotOffsetMinutes(config, date, r.time);
      const dur = r.duration_minutes || config.duration_minutes;
      return start <= at && at < start + dur;
    });
  };

  const unassigned = dayReservations.filter((r) => r.table_ids.length === 0);
  const rows: { id: string | null; name: string; seats?: number }[] = [
    ...tables.filter((t) => t.reservable || dayReservations.some((r) => r.table_ids.includes(t.id))),
    ...(unassigned.length ? [{ id: null, name: "Sin mesa" }] : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Día</p>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
        </div>
        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-muted-foreground">Reservas</p>
            <p className="text-lg font-bold">{dayReservations.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Cubiertos</p>
            <p className="text-lg font-bold">{covers}</p>
          </div>
          {config.capacity_mode === "tables" && (
            <div>
              <p className="text-muted-foreground">Lugares en mesas</p>
              <p className="text-lg font-bold">{seats}</p>
            </div>
          )}
        </div>
      </div>

      {slots.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Ese día no se toman reservas (cerrado o día sin horario configurado).
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No hay mesas habilitadas para reservar. Configuralas en “Horarios y mesas”.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-medium">Mesa</th>
                {slots.map((s) => (
                  <th key={s} className="px-1 py-2 text-center text-xs font-medium text-muted-foreground">
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id ?? "none"} className="border-t">
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-card px-3 py-2 font-medium">
                    {row.name}
                    {row.seats ? <span className="ml-1 text-xs text-muted-foreground">({row.seats})</span> : null}
                  </td>
                  {slots.map((s, i) => {
                    const r = occupant(row.id, s);
                    const startsHere = r && (r.time === s || (i === 0 && r));
                    return (
                      <td key={s} className="p-0.5">
                        <div
                          title={r ? `${r.name} · ${r.people} personas · ${r.time}` : "Libre"}
                          className={`h-9 min-w-[3.5rem] rounded px-1 text-[11px] leading-9 truncate ${
                            r ? CELL_STYLE[r.status] : "bg-muted/50"
                          }`}
                        >
                          {startsHere ? `${r!.name.split(" ")[0]} · ${r!.people}` : ""}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-amber-200" /> Pendiente
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-emerald-200" /> Confirmada
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-sky-200" /> Llegó
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-muted" /> Libre
        </span>
      </div>
    </div>
  );
}
