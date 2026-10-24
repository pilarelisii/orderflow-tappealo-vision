import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getConsent, setConsent, trackPageView, OPEN_COOKIE_PREFS_EVENT } from "@/lib/analytics";

// El aviso solo aparece en las páginas públicas (no en el panel de los comercios)
const PUBLIC_PATHS = ["/", "/manual", "/privacidad", "/politica-de-privacidad", "/terminos", "/terminos-y-condiciones"];

/** Aviso de cookies + page views de la SPA para el Google tag. */
export default function CookieConsent() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const firstRender = useRef(true);

  const isPublic = PUBLIC_PATHS.includes(location.pathname);

  useEffect(() => {
    if (isPublic && getConsent() === null) setOpen(true);
  }, [isPublic]);

  useEffect(() => {
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_COOKIE_PREFS_EVENT, reopen);
    return () => window.removeEventListener(OPEN_COOKIE_PREFS_EVENT, reopen);
  }, []);

  // la carga inicial ya la mide gtag("config"); acá solo los cambios de ruta
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (isPublic) trackPageView(location.pathname);
  }, [location.pathname, isPublic]);

  if (!open || !isPublic) return null;

  const choose = (choice: "granted" | "denied") => {
    setConsent(choice);
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de cookies"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-3xl rounded-3xl border border-[#d8c2ad] bg-[#fffaf3] p-5 text-[#2b1a10] shadow-xl md:inset-x-6 md:bottom-6 md:p-6"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm leading-6 text-[#5f4a3b]">
          Usamos cookies propias y de Google para medir el uso del sitio y los resultados de nuestras campañas.
          Podés aceptarlas o rechazarlas; el sitio funciona igual.{" "}
          <Link to="/privacidad" className="font-semibold text-[#5a351f] underline underline-offset-2">
            Política de privacidad
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => choose("denied")}
            className="rounded-full border border-[#d8c2ad] px-5 py-2.5 text-sm font-bold text-[#5a351f] transition hover:bg-[#f6eadb]"
          >
            Rechazar
          </button>
          <button
            onClick={() => choose("granted")}
            className="rounded-full bg-[#5a351f] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#2b1a10]"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
