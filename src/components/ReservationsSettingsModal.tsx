import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { ReservationsConfig } from "@/hooks/useVenueSettings";
import { useReservationTables } from "@/hooks/useReservationTables";
import { WEEKDAYS, type DaySchedule } from "@/lib/reservationEngine";

type Props = {
  open: boolean;
  onClose: () => void;
  initial: ReservationsConfig;
  onSubmit: (config: ReservationsConfig) => Promise<void>;
};

const INTERVALS = [15, 30, 45, 60, 90, 120];
const DURATIONS = [45, 60, 75, 90, 105, 120, 150, 180];
const NOTICES = [0, 30, 60, 120, 180, 360, 720, 1440];
const NO_SHOW = [0, 10, 15, 20, 30, 45, 60];

// Lunes primero, que es como se piensa la semana
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const minutesLabel = (m: number) => {
  if (m === 0) return "Sin mínimo";
  if (m < 60) return `${m} minutos`;
  if (m % 60 === 0) return `${m / 60} ${m === 60 ? "hora" : "horas"}`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
};

export function ReservationsSettingsModal({ open, onClose, initial, onSubmit }: Props) {
  const [config, setConfig] = useState<ReservationsConfig>(initial);
  const [newClosedDate, setNewClosedDate] = useState("");
  const { tables, updateTable } = useReservationTables();

  useEffect(() => {
    if (open) setConfig(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = <K extends keyof ReservationsConfig>(key: K, value: ReservationsConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));

  const setDay = (day: number, patch: Partial<DaySchedule>) =>
    setConfig((c) => ({
      ...c,
      schedule: { ...c.schedule, [String(day)]: { ...c.schedule[String(day)], ...patch } },
    }));

  const copyToAll = (day: number) => {
    const src = config.schedule[String(day)];
    setConfig((c) => ({
      ...c,
      schedule: Object.fromEntries(Object.keys(c.schedule).map((k) => [k, { ...src }])),
    }));
    toast.success(`Horario del ${WEEKDAYS[day].toLowerCase()} copiado a todos los días`);
  };

  const reservableTables = tables.filter((t) => t.reservable);
  const totalSeats = reservableTables.reduce((s, t) => s + t.seats, 0);

  const changeSeats = async (id: string, seats: number) => {
    try {
      await updateTable(id, { seats: Math.max(1, Math.min(50, seats)) });
    } catch (e) {
      console.error(e);
      toast.error("No se pudo actualizar la mesa");
    }
  };

  const save = async () => {
    if (!WEEK_ORDER.some((d) => config.schedule[String(d)].enabled))
      return toast.error("Activá al menos un día para recibir reservas");
    if (config.max_people < 1) return toast.error("El máximo de personas debe ser al menos 1");
    if (config.days_ahead < 1) return toast.error("Los días de anticipación deben ser al menos 1");
    if (config.capacity_mode === "tables" && reservableTables.length === 0)
      return toast.error("No tenés mesas habilitadas para reservar. Activá alguna o usá capacidad por cubiertos.");

    try {
      await onSubmit(config);
      toast.success("Configuración de reservas guardada");
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("No se pudo guardar la configuración");
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar reservas</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="horarios">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="horarios">Horarios</TabsTrigger>
            <TabsTrigger value="capacidad">Mesas y capacidad</TabsTrigger>
            <TabsTrigger value="auto">Automático</TabsTrigger>
          </TabsList>

          {/* ===== Horarios ===== */}
          <TabsContent value="horarios" className="space-y-5 pt-4">
            <div className="space-y-2">
              {WEEK_ORDER.map((d) => {
                const day = config.schedule[String(d)];
                return (
                  <div
                    key={d}
                    className={`flex flex-wrap items-center gap-3 rounded-lg border p-2 ${
                      day.enabled ? "" : "opacity-60"
                    }`}
                  >
                    <Switch checked={day.enabled} onCheckedChange={(v) => setDay(d, { enabled: v })} />
                    <span className="w-24 font-medium">{WEEKDAYS[d]}</span>
                    {day.enabled ? (
                      <>
                        <Input
                          type="time"
                          className="w-28"
                          value={day.start}
                          onChange={(e) => setDay(d, { start: e.target.value })}
                        />
                        <span className="text-sm text-muted-foreground">a</span>
                        <Input
                          type="time"
                          className="w-28"
                          value={day.end}
                          onChange={(e) => setDay(d, { end: e.target.value })}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Copiar a todos los días"
                          onClick={() => copyToAll(d)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Cerrado</span>
                    )}
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground">
                Primer y último horario en que se puede reservar. Si el último es menor al primero (ej. 20:00 a
                01:00), se toma como el día siguiente.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Turnos cada</Label>
                <Select value={String(config.interval_minutes)} onValueChange={(v) => set("interval_minutes", Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVALS.map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {minutesLabel(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Anticipación mínima</Label>
                <Select
                  value={String(config.min_notice_minutes)}
                  onValueChange={(v) => set("min_notice_minutes", Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTICES.map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {minutesLabel(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Se puede reservar hasta (días)</Label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={config.days_ahead}
                  onChange={(e) => set("days_ahead", Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Máx. personas por reserva</Label>
                <Input
                  type="number"
                  min={1}
                  value={config.max_people}
                  onChange={(e) => set("max_people", Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Días cerrados (feriados, eventos privados)</Label>
              <div className="flex gap-2">
                <Input type="date" value={newClosedDate} onChange={(e) => setNewClosedDate(e.target.value)} />
                <Button
                  variant="outline"
                  disabled={!newClosedDate}
                  onClick={() => {
                    if (!config.closed_dates.includes(newClosedDate))
                      set("closed_dates", [...config.closed_dates, newClosedDate].sort());
                    setNewClosedDate("");
                  }}
                >
                  Agregar
                </Button>
              </div>
              {config.closed_dates.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {config.closed_dates.map((d) => (
                    <span key={d} className="inline-flex items-center gap-1 rounded-full border bg-muted px-3 py-1 text-xs">
                      {new Date(`${d}T00:00:00`).toLocaleDateString("es-AR", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                      <button
                        onClick={() => set("closed_dates", config.closed_dates.filter((x) => x !== d))}
                        aria-label="Quitar"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ===== Capacidad ===== */}
          <TabsContent value="capacidad" className="space-y-5 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                [
                  ["tables", "Por mesas QR", "Cada reserva ocupa una mesa real según su capacidad."],
                  ["covers", "Por cubiertos", "Solo se limita la cantidad de personas por turno."],
                ] as const
              ).map(([mode, title, text]) => (
                <button
                  key={mode}
                  onClick={() => set("capacity_mode", mode)}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    config.capacity_mode === mode ? "border-primary bg-primary/5" : "hover:bg-muted"
                  }`}
                >
                  <p className="font-medium">{title}</p>
                  <p className="text-xs text-muted-foreground">{text}</p>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Cuánto dura cada reserva</Label>
              <Select value={String(config.duration_minutes)} onValueChange={(v) => set("duration_minutes", Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {minutesLabel(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Durante ese tiempo la mesa (o los cubiertos) quedan ocupados y no se ofrecen a otros clientes.
              </p>
            </div>

            {config.capacity_mode === "covers" ? (
              <div className="space-y-2">
                <Label>Máximo de personas al mismo tiempo</Label>
                <Input
                  type="number"
                  min={1}
                  value={config.max_covers_per_slot}
                  onChange={(e) => set("max_covers_per_slot", Number(e.target.value))}
                />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">Juntar mesas para grupos grandes</p>
                    <p className="text-xs text-muted-foreground">
                      Si no hay una mesa donde entren todos, se combinan mesas libres.
                    </p>
                  </div>
                  <Switch
                    checked={config.allow_combine_tables}
                    onCheckedChange={(v) => set("allow_combine_tables", v)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Mesas</Label>
                    <span className="text-xs text-muted-foreground">
                      {reservableTables.length} reservables · {totalSeats} lugares
                    </span>
                  </div>

                  {tables.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No tenés QRs de tipo “En el lugar”. Crealos en{" "}
                      <Link to="/panel/qr-settings" className="text-primary hover:underline">
                        QRs
                      </Link>{" "}
                      y van a aparecer acá como mesas.
                    </div>
                  ) : (
                    <div className="divide-y rounded-lg border">
                      {tables.map((t) => (
                        <div key={t.id} className="flex items-center justify-between gap-3 px-3 py-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <Switch
                              checked={t.reservable}
                              onCheckedChange={(v) => updateTable(t.id, { reservable: v })}
                              aria-label="Reservable"
                            />
                            <span className={`truncate font-medium ${t.reservable ? "" : "text-muted-foreground"}`}>
                              {t.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => changeSeats(t.id, t.seats - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-16 text-center text-sm">
                              {t.seats} {t.seats === 1 ? "lugar" : "lugares"}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => changeSeats(t.id, t.seats + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Los cambios en las mesas se guardan al instante. Las mesas apagadas siguen funcionando para
                    pedir con QR, pero no se ofrecen para reservar.
                  </p>
                </div>
              </>
            )}
          </TabsContent>

          {/* ===== Automático ===== */}
          <TabsContent value="auto" className="space-y-4 pt-4">
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div>
                <p className="font-medium">Confirmar automáticamente</p>
                <p className="text-xs text-muted-foreground">
                  Si hay lugar, la reserva queda confirmada y con mesa asignada sin que tengas que hacer nada.
                  Si está apagado, entra como pendiente (pero igual reserva la mesa).
                </p>
              </div>
              <Switch checked={config.auto_confirm} onCheckedChange={(v) => set("auto_confirm", v)} />
            </div>

            <div className="space-y-2 rounded-lg border p-3">
              <p className="font-medium">Marcar “No vino” automáticamente</p>
              <p className="text-xs text-muted-foreground">
                Si una reserva confirmada no se marcó como “Llegó” pasado este tiempo, se libera la mesa.
              </p>
              <Select
                value={String(config.auto_no_show_minutes)}
                onValueChange={(v) => set("auto_no_show_minutes", Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NO_SHOW.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m === 0 ? "Desactivado" : `${m} minutos de tolerancia`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground space-y-1">
              <p>Además, siempre en automático:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>El menú solo muestra los horarios que realmente tienen lugar.</li>
                <li>Cada reserva se asigna a la mesa más chica donde entran todos.</li>
                <li>Dos clientes no pueden quedarse con la misma mesa al mismo tiempo.</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save}>Guardar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
