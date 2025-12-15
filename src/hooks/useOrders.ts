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
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  getDocs,
  Timestamp,
} from "firebase/firestore";

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
  comentariosGenerales: data.comentariosGenerales ?? null,
  lugarEntrega: data.lugarEntrega ?? "sin-ubicacion",
  telefono: data.telefono ?? null,
  nombre: data.nombre ?? null,
  total: data.total ?? 0,
  status: (data.status ?? "entrante") as OrderStatus,
  createdAt: toIso(data.createdAt),
  updatedAt: toIso(data.updatedAt),
});

const sortByCreatedAtDesc = (list: Order[]) =>
  [...list].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

const isIndexError = (err: any) =>
  err?.code === "failed-precondition" &&
  typeof err?.message === "string" &&
  err.message.toLowerCase().includes("requires an index");

export function useOrders() {
  const { venue } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { playNotificationSound } = useNotificationSound();
  const initialized = useRef(false);

  useEffect(() => {
    // ✅ Si todavía no hay venue, NO te quedes en loading infinito
    if (!venue?.id) {
      setOrders([]);
      setLoading(false);
      initialized.current = false;
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, "orders"),
      where("venueId", "==", venue.id),
      orderBy("createdAt", "desc")
    );

    let unsubscribe = () => {};

    const startSnapshot = () => {
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list = snapshot.docs.map((d) => mapDocToOrder(d.id, d.data()));

          if (initialized.current) {
            snapshot.docChanges().forEach((change) => {
              if (change.type === "added") {
                const newOrder = mapDocToOrder(
                  change.doc.id,
                  change.doc.data()
                );
                playNotificationSound();
                toast({
                  title: "🔔 Nuevo pedido",
                  description: `Pedido recibido: ${newOrder.lugarEntrega}`,
                });
              }
            });
          }

          setOrders(list);
          setLoading(false);
          initialized.current = true;
        },
        async (error) => {
          console.error("Error fetching orders:", error);

          // ✅ Si falta el índice, hacemos fallback sin orderBy (y ordenamos en memoria)
          if (isIndexError(error)) {
            try {
              const fallbackQ = query(
                collection(db, "orders"),
                where("venueId", "==", venue.id)
              );
              const snap = await getDocs(fallbackQ);
              const list = snap.docs.map((d) => mapDocToOrder(d.id, d.data()));
              setOrders(sortByCreatedAtDesc(list));
              setLoading(false);

              toast({
                title: "Falta índice en Firestore",
                description:
                  "Estoy usando un modo compatible (sin índice). Creá el índice para mejor performance.",
                variant: "destructive",
              });
              return;
            } catch (e) {
              console.error("Fallback fetch failed:", e);
            }
          }

          toast({
            title: "Error",
            description: "No se pudieron cargar los pedidos",
            variant: "destructive",
          });
          setLoading(false);
        }
      );
    };

    startSnapshot();

    return () => {
      unsubscribe();
    };
  }, [venue?.id, playNotificationSound, toast]);

  const updateOrderStatus = async (order: Order, newStatus: OrderStatus) => {
    try {
      await updateDoc(doc(db, "orders", order.id), {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });

      toast({
        title: "Pedido actualizado",
        description: `Pedido movido a ${newStatus}`,
      });
    } catch (error) {
      console.error("Error updating order:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el pedido",
        variant: "destructive",
      });
    }
  };

  const isOrderRecent = (order: Order) => {
    const now = new Date();
    const orderDate = new Date(order.createdAt);
    const hoursDiff = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  };

  const getOrdersByStatus = (status: OrderStatus) =>
    orders.filter((o) => o.status === status).filter(isOrderRecent);

  const getOrdersByDate = (date: Date) => {
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    return orders.filter((order) => {
      const d = new Date(order.createdAt);
      d.setHours(0, 0, 0, 0);

      if (d.getTime() !== target.getTime()) return false;

      const now = new Date();
      const hoursDiff =
        (now.getTime() - new Date(order.createdAt).getTime()) /
        (1000 * 60 * 60);
      return hoursDiff > 24;
    });
  };

  const getAvailableDates = () => {
    const dates = new Set<string>();
    const now = new Date();

    orders.forEach((order) => {
      const d = new Date(order.createdAt);
      const hoursDiff = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
      if (hoursDiff > 24) dates.add(d.toISOString().split("T")[0]);
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
    refetch: async () => {
      if (!venue?.id) return;
      setLoading(true);

      // Misma idea: intentamos con orderBy, si falla, fallback sin orderBy
      try {
        const q = query(
          collection(db, "orders"),
          where("venueId", "==", venue.id),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        setOrders(snap.docs.map((d) => mapDocToOrder(d.id, d.data())));
      } catch (error: any) {
        if (isIndexError(error)) {
          const fallbackQ = query(
            collection(db, "orders"),
            where("venueId", "==", venue.id)
          );
          const snap = await getDocs(fallbackQ);
          setOrders(sortByCreatedAtDesc(snap.docs.map((d) => mapDocToOrder(d.id, d.data()))));
        } else {
          throw error;
        }
      } finally {
        setLoading(false);
      }
    },
  };
}