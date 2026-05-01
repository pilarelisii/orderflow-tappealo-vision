import { useEffect, useState, useRef } from "react";
import { Order, OrderStatus } from "@/types/order";
import { useToast } from "@/hooks/use-toast";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { useAuth } from "@/hooks/useAuth";

import { db } from "@/integrations/firebase/client";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { useQrLocationsMap } from "./useQrLocationsMap";

const toIso = (v: any) => {
  if (!v) return new Date().toISOString();
  if (typeof v === "string") return new Date(v).toISOString();
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (v?.toDate) return v.toDate().toISOString();
  return new Date().toISOString();
};

const mapDocToOrder = (id: string, data: any): Order => ({
  id,
  items: data.items ?? [],
  additional_comments: data.additional_comments ?? null,
  qr_location_id: data.qr_location_id ?? "sin-ubicacion",
  phone: data.phone ?? null,
  name: data.name ?? null, // ✅ FIX (antes decía data.nombre)
  total: Number(data.total ?? 0),
  status: (data.status ?? "entrante") as OrderStatus,
  created_at: toIso(data.created_at),
  updated_at: toIso(data.updated_at),
  ref_order_id: data.ref_order_id ?? null,
  payment_method: data.payment_method ?? null,
  venue_id: data.venue_id ?? null,
});

export function useOrders() {
  const { venue } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const { toast } = useToast();
  const { playNotificationSound } = useNotificationSound();

  // ✅ qrMap sin romper deps
  const qrMap = useQrLocationsMap(venue?.id);
  const qrMapRef = useRef<Record<string, string>>({});

  useEffect(() => {
    qrMapRef.current = qrMap || {};
  }, [qrMap]);

  // ✅ refs estables
  const toastRef = useRef(toast);
  const playNotificationSoundRef = useRef(playNotificationSound);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    playNotificationSoundRef.current = playNotificationSound;
  }, [playNotificationSound]);

  const initialized = useRef(false);
  const seenOrderIdsRef = useRef<Set<string>>(new Set());
  const firstSnapshotRef = useRef(true);

  useEffect(() => {
    if (!venue?.id) {
      setOrders([]);
      setLoading(false);
      initialized.current = false;
      return;
    }
    
    // ✅ NO orderBy: evita depender de índices y evita problemas de timestamp/campos
    const q = query(
      collection(db, "orders"),
      where("venue_id", "==", venue.id)
    );

    const unsubscribe = onSnapshot(
  q,
  (snapshot) => {
    const list = snapshot.docs
      .map((d) => mapDocToOrder(d.id, d.data()))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

    // Primer snapshot real: cargamos órdenes existentes, pero NO notificamos.
    if (firstSnapshotRef.current) {
      seenOrderIdsRef.current = new Set(snapshot.docs.map((d) => d.id));
      firstSnapshotRef.current = false;

      setOrders(list);
      setLoading(false);
      return;
    }

    snapshot.docChanges().forEach((change) => {
      if (change.type !== "added") return;

      const orderId = change.doc.id;

      // Si ya lo vimos, no notificar.
      if (seenOrderIdsRef.current.has(orderId)) return;

      seenOrderIdsRef.current.add(orderId);

      const o = mapDocToOrder(orderId, change.doc.data());

      playNotificationSoundRef.current();

      toastRef.current?.({
        title: "🔔 Nuevo pedido",
        description: `Pedido recibido: ${
          qrMapRef.current[o.qr_location_id] ?? o.qr_location_id
        }`,
      });
    });

    setOrders(list);
    setLoading(false);
  },
  (error) => {
    console.error("🔥 onSnapshot error:", error);
    setLoading(false);
    toastRef.current?.({
      title: "Error",
      description: "No se pudieron cargar los pedidos en tiempo real",
      variant: "destructive",
    });
  }
);
  
    return () => unsubscribe();
  }, [venue?.id]);

  const updateOrderStatus = async (order: Order, newStatus: OrderStatus) => {
    await updateDoc(doc(db, "orders", order.id), {
      status: newStatus,
      updated_at: Timestamp.now(),
    });
  };

  const isOrderRecent = (order: Order) => {
    const now = Date.now();
    const created = new Date(order.created_at).getTime();
    return now - created <= 24 * 60 * 60 * 1000;
  };

  const getOrdersByStatus = (status: OrderStatus) =>
    orders.filter((o) => o.status === status).filter(isOrderRecent);

  const getOrdersByDate = (date: Date) => {
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    return orders.filter((order) => {
      const d = new Date(order.created_at);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === target.getTime();
    });
  };

  const getAvailableDates = () => {
    const dates = new Set<string>();
    orders.forEach((order) => {
      dates.add(new Date(order.created_at).toISOString().split("T")[0]);
    });
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  };

  return {
    orders,
    loading,
    getOrdersByStatus,
    getOrdersByDate,
    getAvailableDates,
    updateOrderStatus,
  };
}