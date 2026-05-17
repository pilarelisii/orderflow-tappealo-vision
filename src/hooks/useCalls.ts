import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/integrations/firebase/client";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import type { QuerySnapshot, DocumentData } from "firebase/firestore";

export type CallStatus = "pending" | "seen" | "resolved";
export type CallTypes = "call" | "bill";

export type CallDoc = {
  id: string;
  venue_id: string;
  qr_location_id: string;
  qr_location_name: string | null;
  status: CallStatus;
  created_at: any; // Timestamp | null
  created_at_ms?: number | null;
  seen_at: any | null;
  resolved_at: any | null;
  type: string;
};

type UseCallsOpts = {
  venueId?: string | null;
  includeResolved?: boolean;
  take?: number;
};

function toMillis(ts: any): number {
  try {
    if (!ts) return 0;
    if (typeof ts === "number") return ts;
    if (ts?.toMillis) return ts.toMillis();
    if (ts?.toDate) return ts.toDate().getTime();
    return 0;
  } catch {
    return 0;
  }
}

export function useCalls(opts: UseCallsOpts) {
  const { venueId, includeResolved = false, take = 50 } = opts;

  const [calls, setCalls] = useState<CallDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const didFallbackRef = useRef(false);

  useEffect(() => {
    if (!venueId) {
      setCalls([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    didFallbackRef.current = false;

    const col = collection(db, "calls");

    const qWithOrder = query(
      col,
      where("venue_id", "==", venueId),
      orderBy("created_at", "desc"),
      limit(take)
    );

    const qFallback = query(
      col,
      where("venue_id", "==", venueId),
      limit(take)
    );

    const applySnap = (snap: QuerySnapshot<DocumentData>) => {
    let list = snap.docs.map((d) => {
      const data = d.data() as any;

      // ✅ normalización fuerte
      const status: CallStatus =
        data.status === "pending" || data.status === "seen" || data.status === "resolved"
          ? data.status
          : "pending";

      const type: CallTypes = data.type === "bill" || data.type === "call" ? data.type : "call";

      return {
        id: d.id,
        venue_id: String(data.venue_id ?? ""),
        qr_location_id: String(data.qr_location_id ?? ""),
        qr_location_name: data.qr_location_name ?? null,
        status,
        type,
        created_at: data.created_at ?? null,
        created_at_ms: typeof data.created_at_ms === "number" ? data.created_at_ms : null,
        seen_at: data.seen_at ?? null,
        resolved_at: data.resolved_at ?? null,
      } as CallDoc;
    });

  if (!includeResolved) list = list.filter((c) => c.status !== "resolved");

  // ordenar siempre en cliente (sirve en fallback)
  list.sort((a, b) => {
    const am = (a.created_at_ms ?? 0) || toMillis(a.created_at);
    const bm = (b.created_at_ms ?? 0) || toMillis(b.created_at);
    return bm - am;
  });

  setCalls(list);
  setLoading(false);
};

    let unsub = onSnapshot(
      qWithOrder,
      applySnap,
      (err: any) => {
        console.error("useCalls snapshot error:", err);

        // ✅ si es falta de índice, caemos a fallback 1 sola vez
        if (!didFallbackRef.current && err?.code === "failed-precondition") {
          didFallbackRef.current = true;
          console.warn("useCalls -> fallback query sin orderBy");
          unsub();
          unsub = onSnapshot(qFallback, applySnap, (err2: any) => {
            console.error("useCalls fallback snapshot error:", err2);
            setLoading(false);
          });
          return;
        }

        setLoading(false);
      }
    );

    return () => unsub();
  }, [venueId, includeResolved, take]);

  const pendingCount = useMemo(
    () => calls.filter((c) => c.status === "pending").length,
    [calls]
  );

  const markSeen = async (callId: string) => {
  try {
    console.log("markSeen -> updateDoc", callId);
    await updateDoc(doc(db, "calls", callId), {
      status: "seen",
      seen_at: serverTimestamp(),
    });
    console.log("markSeen OK", callId);
  } catch (e) {
    console.error("markSeen FAILED", e);
    throw e;
  }
};

  const resolve = async (callId: string) => {
    await updateDoc(doc(db, "calls", callId), {
      status: "resolved",
      resolved_at: serverTimestamp(),
    });
  };

  return { calls, pendingCount, loading, markSeen, resolve };
}