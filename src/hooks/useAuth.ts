import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { fbAuth, db } from "@/integrations/firebase/client";
import { Venue } from "@/types/venue";


type AuthError = { message: string } | null;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null); // compat
  const [venue, setVenue] = useState<Venue | null>(null);

  // ESTE loading SOLO DEPENDE DE AUTH, NO DEL VENUE
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(fbAuth, async (u) => {
      setUser(u);
      setSession(null);

      // 🔑 Auth ya resolvió -> loader OFF SIEMPRE
      setLoading(false);

      if (!u) {
        setVenue(null);
        return;
      }

      // cargar venue sin bloquear UI
      try {
        const q = query(
          collection(db, "venues"),
          where("auth_id", "==", u.uid),
          limit(1)
        );
        const snap = await getDocs(q);

        if (snap.empty) {
          console.warn("No venue for uid:", u.uid);
          setVenue(null);
          return;
        }

        const d = snap.docs[0];
        const data = d.data() as any;

        setVenue({
          id: d.id,
          name: data.name,
          slug: data.slug,
          auth_id: data.auth_id,
          logo_url: data.logoUrl ?? data.logo_url ?? null,
          enabled: data.enabled,
          service_active: data.service_active ?? false,
          updated_at: data.updatedAt,
          location_link: data.locationLink ?? null,
          phone: data.phone ?? null,
          adress_1: data.adress_1 ?? null,
          adress_2: data.adress_2 ?? null,
          social_link: data.socialLink ?? null,
          created_at: data.createdAt,
          plan: data.plan, 
        });
      } catch (err) {
        console.error("Error fetching venue:", err);
        setVenue(null);
      }
    });

    return () => unsub();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(fbAuth, email, password);
      return { error: null as AuthError };
    } catch (e: any) {
      const message =
        e?.code === "auth/invalid-credential" ||
        e?.code === "auth/wrong-password" ||
        e?.code === "auth/user-not-found"
          ? "Invalid login credentials"
          : e?.message || "Error al iniciar sesión";
      return { error: { message } as AuthError };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(fbAuth, email, password);
      return { error: null as AuthError };
    } catch (e: any) {
      return { error: { message: e?.message || "Error al registrarse" } as AuthError };
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(fbAuth);
      setUser(null);
      setSession(null);
      setVenue(null);
      return { error: null as AuthError };
    } catch (e: any) {
      return { error: { message: e?.message || "Error al cerrar sesión" } as AuthError };
    }
  };

  return {
    user,
    session,
    venue,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
  };
}