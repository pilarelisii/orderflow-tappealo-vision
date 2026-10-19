import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Users,
  Clock,
  Phone,
  MessageCircle,
  Check,
  X,
  UserCheck,
  UserX,
  Settings2,
  CalendarDays,
  Armchair,
} from "lucide-react";
import { toast } from "sonner";
import { useReservations, todayYMD } from "@/hooks/useReservations";
import { useVenueSettings } from "@/hooks/useVenueSettings";
import {
  Reservation,
  ReservationPayload,
  ReservationStatus,
  RESERVATION_STATUS_LABEL,
} from "@/types/reservation";
import { ReservationFormModal } from "@/components/ReservationFormModal";
import { ReservationsSettingsModal } from "@/components/ReservationsSettingsModal";
import ReservationsOccupancy from "@/components/ReservationsOccupancy";
import { WEEKDAYS } from "@/lib/reservationEngine";

type Filter = "proximas" | "hoy" | "historial" | "ocupacion";

const STATUS_STYLES: Record<ReservationStatus, string> = {
  pendiente: "bg-amber-100 text-amber-800 border-amber-200",
  confirmada: "bg-emerald-100 text-emerald-800 border-emerald-200",
  completada: "bg-sky-100 text-sky-800 border-sky-200",
  cancelada: "bg-muted text-muted-foreground border-border",
  no_show: "bg-red-100 text-red-800 border-red-200",
};

const formatDay = (ymd: string) => {
  const d = new Date(`${ymd}T00:00:00`);
  const today = todayYMD();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const label = d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

  if (ymd === today) return `Hoy · ${label}`;
  if (d.toDateString() === tomorrow.toDateString()) return `Mañana · ${label}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const whatsappLink = (r: Reservation, venueName?: string) => {
  const digits = r.phone.replace(/\D/g, "");
  if (!digits) return null;
  const phone = digits.startsWith("54") ? digits : `549${digits.replace(/^0/, "")}`;
  const day = new Date(`${r.date}T00:00:00`).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const text = `Hola ${r.name}! Te escribimos de ${venueName ?? "nuestro local"} por tu reserva del ${day} a las ${r.time} para ${r.people} ${r.people === 1 ? "persona" : "personas"}.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
};

export default function ReservationsManagement({ venueName }: { venueName?: string }) {
  const {
    reservations,
    loading,
    tables,
    config,
    suggestTables,
    createReservation,
    updateReservation,
    setStatus,
    removeReservation,
  } = useReservations();
  const { settings, loading: settingsLoading, updateSettings } = useVenueSettings();

  const [filter, setFilter] = useState<Filter>("proximas");
  const [formOpen, setFormOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editing, setEditing] = useState<Reservation | null>(null);

  const today = todayYMD();
  const reservableTables = tables.filter((t) => t.reservable);
  const reservableSeats = reservableTables.reduce((s, t) => s + t.seats, 0);
  const openDays = [1, 2, 3, 4, 5, 6, 0].filter((d) => config.schedule[String(d)].enabled);
  const openDaysLabel =
    openDays.length === 7
      ? "Todos los días"
      : openDays.length === 0
        ? "Sin días habilitados"
        : openDays.map((d) => WEEKDAYS[d].slice(0, 3)).join(", ");

  const visible = useMemo(() => {
    if (filter === "hoy") return reservations.filter((r) => r.date === today);
    if (filter === "proximas") return reservations.filter((r) => r.date >= today);
    return [...reservations].filter((r) => r.date < today).reverse();
  }, [reservations, filter, today]);

  const grouped = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    visible.forEach((r) => {
      if (!map.has(r.date)) map.set(r.date, []);
      map.get(r.date)!.push(r);
    });
    return Array.from(map.entries());
  }, [visible]);

  const todayStats = useMemo(() => {
    const list = reservations.filter(
      (r) => r.date === today && !["cancelada", "no_show"].includes(r.status)
    );
    return {
      count: list.length,
      people: list.reduce((s, r) => s + r.people, 0),
      pending: reservations.filter((r) => r.status === "pendiente" && r.date >= today).length,
    };
  }, [reservations, today]);

  const toggleReservations = async (enabled: boolean) => {
    try {
      await updateSettings({ reservations_enabled: enabled });
      toast.success(enabled ? "Reservas habilitadas en el menú" : "Reservas ocultas en el menú");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo actualizar la configuración");
    }
  };

  const changeStatus = async (r: Reservation, status: ReservationStatus) => {
    try {
      await setStatus(r.id, status);
      toast.success(`Reserva de ${r.name}: ${RESERVATION_STATUS_LABEL[status].toLowerCase()}`);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo actualizar la reserva");
    }
  };

  const onDelete = async (r: Reservation) => {
    if (!window.confirm(`¿Eliminar la reserva de ${r.name}?`)) return;
    try {
      await removeReservation(r.id);
      toast.success("Reserva eliminada");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo eliminar la reserva");
    }
  };

  const onSubmit = async (payload: ReservationPayload) => {
    try {
      if (editing) await updateReservation(editing.id, payload);
      else await createReservation(payload);
      toast.success(editing ? "Reserva actualizada" : "Reserva creada");
    } catch (e) {
      console.error(e);
      toast.error("Error al guardar la reserva");
      throw e;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuración */}
      <div className="bg-card border border-border rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-medium text-foreground">Recibir reservas desde el menú público</p>
          <p className="text-xs text-muted-foreground">
            {openDaysLabel} · turnos cada {config.interval_minutes} min de {config.duration_minutes} min ·{" "}
            {config.capacity_mode === "tables"
              ? `${reservableTables.length} mesas (${reservableSeats} lugares)`
              : `hasta ${config.max_covers_per_slot} cubiertos por turno`}{" "}
            · {config.auto_confirm ? "confirmación automática" : "confirmación manual"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings2 className="h-4 w-4 mr-1" />
            Horarios y mesas
          </Button>
          <Switch
            checked={settings.reservations_enabled}
            disabled={settingsLoading}
            onCheckedChange={toggleReservations}
          />
        </div>
      </div>

      {settings.reservations_enabled && config.capacity_mode === "tables" && reservableTables.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          No tenés mesas habilitadas para reservar, así que el menú no va a ofrecer horarios. Configuralas en
          “Horarios y mesas”.
        </div>
      )}

      {/* Resumen del día */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Reservas de hoy</p>
          <p className="text-2xl font-bold text-foreground">{todayStats.count}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Cubiertos de hoy</p>
          <p className="text-2xl font-bold text-foreground">{todayStats.people}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Pendientes de confirmar</p>
          <p className="text-2xl font-bold text-primary">{todayStats.pending}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="proximas">Próximas</TabsTrigger>
            <TabsTrigger value="hoy">Hoy</TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
            <TabsTrigger value="ocupacion">Ocupación</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Nueva reserva
        </Button>
      </div>

      {filter === "ocupacion" ? (
        <ReservationsOccupancy reservations={reservations} tables={tables} config={config} />
      ) : grouped.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-10 text-center">
          <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No hay reservas para mostrar</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([date, list]) => (
            <section key={date} className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground capitalize">
                {formatDay(date)} ·{" "}
                {list.filter((r) => !["cancelada", "no_show"].includes(r.status)).reduce((s, r) => s + r.people, 0)}{" "}
                cubiertos
              </h3>

              {list.map((r) => {
                const wa = whatsappLink(r, venueName);
                const closed = ["cancelada", "no_show", "completada"].includes(r.status);
                return (
                  <div
                    key={r.id}
                    className={`border rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card ${
                      r.status === "cancelada" ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="grid h-12 w-14 shrink-0 place-items-center rounded-lg bg-muted">
                        <span className="font-bold text-foreground">{r.time}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold truncate">{r.name}</p>
                          <span
                            className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[r.status]}`}
                          >
                            {RESERVATION_STATUS_LABEL[r.status]}
                          </span>
                          {r.source === "panel" && (
                            <span className="text-[11px] text-muted-foreground">Cargada en el panel</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-3 mt-1 flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {r.people} {r.people === 1 ? "persona" : "personas"}
                          </span>
                          {r.phone && (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" />
                              {r.phone}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {r.time} hs
                          </span>
                          {r.table_names.length > 0 ? (
                            <span className="inline-flex items-center gap-1 font-medium text-foreground">
                              <Armchair className="h-3.5 w-3.5" />
                              {r.table_names.join(" + ")}
                            </span>
                          ) : (
                            config.capacity_mode === "tables" &&
                            !["cancelada", "no_show"].includes(r.status) && (
                              <span className="text-amber-700">Sin mesa asignada</span>
                            )
                          )}
                        </p>
                        {r.notes && <p className="text-sm text-foreground mt-1">“{r.notes}”</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      {r.status === "pendiente" && (
                        <>
                          <Button size="sm" onClick={() => changeStatus(r, "confirmada")}>
                            <Check className="h-4 w-4 mr-1" />
                            Confirmar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => changeStatus(r, "cancelada")}>
                            <X className="h-4 w-4 mr-1" />
                            Rechazar
                          </Button>
                        </>
                      )}
                      {r.status === "confirmada" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => changeStatus(r, "completada")}>
                            <UserCheck className="h-4 w-4 mr-1" />
                            Llegó
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => changeStatus(r, "no_show")}>
                            <UserX className="h-4 w-4 mr-1" />
                            No vino
                          </Button>
                        </>
                      )}
                      {closed && (
                        <Button size="sm" variant="ghost" onClick={() => changeStatus(r, "confirmada")}>
                          Reabrir
                        </Button>
                      )}
                      {wa && (
                        <Button variant="outline" size="icon" asChild title="Escribir por WhatsApp">
                          <a href={wa} target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setEditing(r);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => onDelete(r)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      )}

      <ReservationFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editing}
        maxPeople={config.max_people}
        useTables={config.capacity_mode === "tables"}
        tables={tables}
        suggest={suggestTables}
        onSubmit={onSubmit}
      />

      <ReservationsSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        initial={settings.reservations_config}
        onSubmit={(config) => updateSettings({ reservations_config: config })}
      />
    </div>
  );
}
