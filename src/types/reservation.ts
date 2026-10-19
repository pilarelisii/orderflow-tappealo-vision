export type ReservationStatus =
  | "pendiente"
  | "confirmada"
  | "completada"
  | "cancelada"
  | "no_show";

export interface Reservation {
  id: string;
  venue_id: string;
  name: string;
  phone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  people: number;
  notes: string | null;
  status: ReservationStatus;
  source: "menu" | "panel";
  duration_minutes: number;
  table_ids: string[];
  table_names: string[];
  created_at: string;
  updated_at: string;
}

export interface ReservationPayload {
  name: string;
  phone: string;
  date: string;
  time: string;
  people: number;
  notes: string | null;
  table_ids: string[];
}

export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  completada: "Llegó",
  cancelada: "Cancelada",
  no_show: "No vino",
};
