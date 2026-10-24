/** Google tag (Google Ads AW-18488140651), instalado en index.html. */

export const GOOGLE_ADS_ID = "AW-18488140651";
const CONSENT_KEY = "tappealo_cookie_consent";

export type ConsentChoice = "granted" | "denied";

type Gtag = (...args: unknown[]) => void;

const gtag: Gtag = (...args) => {
  const w = window as unknown as { gtag?: Gtag };
  w.gtag?.(...args);
};

export function getConsent(): ConsentChoice | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(choice: ConsentChoice) {
  try {
    localStorage.setItem(CONSENT_KEY, choice);
  } catch {
    // modo privado: igual se aplica para esta visita
  }
  gtag("consent", "update", {
    ad_storage: choice,
    ad_user_data: choice,
    ad_personalization: choice,
    analytics_storage: choice,
  });
}

/** Page view para la navegación interna de la SPA (la primera la manda gtag config). */
export function trackPageView(path: string) {
  gtag("event", "page_view", {
    send_to: GOOGLE_ADS_ID,
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

/**
 * Conversión de Google Ads. `label` es la parte después de la barra en el
 * snippet de evento que da Google Ads (ej. "AW-18488140651/AbC123" -> "AbC123").
 */
export function trackConversion(label: string, params: Record<string, unknown> = {}) {
  gtag("event", "conversion", { send_to: `${GOOGLE_ADS_ID}/${label}`, ...params });
}

/** Evento para reabrir el aviso de cookies desde el footer. */
export const OPEN_COOKIE_PREFS_EVENT = "tappealo:open-cookie-preferences";
