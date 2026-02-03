import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut } from "firebase/auth";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { fbAuth, db } from "@/integrations/firebase/client";

type AuthError = { message: string } | null;

export function useAdminUsers() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(fbAuth, async (u) => {
      setUser(u);

      // auth resolvió
      if (!u) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        // ✅ valida admin en users(auth_id, role)
        const q = query(
          collection(db, "users"),
          where("auth_id", "==", u.uid),
          where("role", "==", "admin"),
          limit(1)
        );

        const snap = await getDocs(q);
        setIsAdmin(!snap.empty);
      } catch (e) {
        console.error("Error checking admin:", e);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);


  const signInAdmin = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(fbAuth, email, password);
      return { error: null as AuthError };
    } catch (e: any) {
      const message =
        e?.code === "auth/invalid-credential" ||
        e?.code === "auth/wrong-password" ||
        e?.code === "auth/user-not-found"
          ? "Email o contraseña incorrectos"
          : e?.message || "Error al iniciar sesión";
      return { error: { message } as AuthError };
    }
  };

  const signOut = async () => {
    try {
      await fbSignOut(fbAuth);
      return { error: null as AuthError };
    } catch (e: any) {
      return { error: { message: e?.message || "Error al cerrar sesión" } as AuthError };
    }
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin,
    signInAdmin,
    signOut,
  };
}