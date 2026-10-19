import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Reservation, ReservationPayload } from "@/types/reservation";
import { todayYMD } from "@/hooks/useReservations";
import type { Assignment, ReservableTable } from "@/lib/reservationEngine";

type Props = {
  open: boolean;
  onClose: () => void;
  initial?: Reservation | null; // null => crear
  maxPeople: number;
  useTables: boolean;
  tables: ReservableTable[];
  suggest: (date: string, time: string, people: number, ignoreId?: string) => Assignment;
  onSubmit: (payload: ReservationPayload) => Promise<void>;
};

export function ReservationFormModal({
  open,
  onClose,
  initial,
  maxPeople,
  useTables,
  tables,
  suggest,
  onSubmit,
}: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(todayYMD());
  const [time, setTime] = useState("21:00");
  const [people, setPeople] = useState(2);
  const [notes, setNotes] = useState("");
  const [tableIds, setTableIds] = useState<string[]>([]);
  const [manualTables, setManualTables] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setPhone(initial?.phone ?? "");
    setDate(initial?.date ?? todayYMD());
    setTime(initial?.time ?? "21:00");
    setPeople(initial?.people ?? 2);
    setNotes(initial?.notes ?? "");
    setTableIds(initial?.table_ids ?? []);
    setManualTables(Boolean(initial?.table_ids?.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id]);

  const suggestion =
    useTables && date && time && people > 0 ? suggest(date, time, people, initial?.id) : null;
  const suggestedIds = suggestion?.ok ? suggestion.table_ids.join(",") : "";

  // mientras no se elijan mesas a mano, se usa la sugerencia automática
  useEffect(() => {
    if (!manualTables) setTableIds(suggestedIds ? suggestedIds.split(",") : []);
  }, [suggestedIds, manualTables]);

  const selectedSeats = tables.filter((t) => tableIds.includes(t.id)).reduce((s, t) => s + t.seats, 0);

  const toggleTable = (id: string) => {
    setManualTables(true);
    setTableIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  const save = async () => {
    if (!name.trim()) return toast.error("El nombre es requerido");
    if (!date) return toast.error("La fecha es requerida");
    if (!time) return toast.error("El horario es requerido");
    if (people < 1) return toast.error("Tiene que haber al menos 1 persona");

    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        phone: phone.trim(),
        date,
        time,
        people,
        notes: notes.trim() || null,
        table_ids: useTables ? tableIds : [],
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar reserva" : "Nueva reserva"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan Pérez" />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="11 1234-5678"
                inputMode="tel"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Día</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Horario</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Personas</Label>
              <Input
                type="number"
                min={1}
                max={Math.max(maxPeople * 3, people)}
                value={people}
                onChange={(e) => setPeople(Number(e.target.value))}
              />
            </div>
          </div>

          {useTables && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Mesa</Label>
                {manualTables && (
                  <button
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    onClick={() => setManualTables(false)}
                  >
                    <Sparkles className="h-3 w-3" />
                    Asignar automáticamente
                  </button>
                )}
              </div>

              {!manualTables && suggestion && !suggestion.ok && (
                <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  No hay mesas libres para ese horario. Podés elegir una igual (sobreventa) o guardarla sin mesa.
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {tables
                  .filter((t) => t.reservable || tableIds.includes(t.id))
                  .map((t) => {
                    const active = tableIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => toggleTable(t.id)}
                        className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                          active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
                        }`}
                      >
                        {t.name} · {t.seats}
                      </button>
                    );
                  })}
              </div>
              <p className="text-xs text-muted-foreground">
                {tableIds.length === 0
                  ? "Sin mesa asignada"
                  : `${manualTables ? "Elegida a mano" : "Sugerida automáticamente"} · ${selectedSeats} lugares`}
                {tableIds.length > 0 && selectedSeats < people && " · ⚠️ no alcanzan los lugares"}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Cumpleaños, silla de bebé, mesa afuera..."
              maxLength={300}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
