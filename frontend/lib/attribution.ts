export type StoredAttribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  landing_path?: string;
};

const KEY = "forma_attribution";
const FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"] as const;

export function captureAttribution() {
  const params = new URLSearchParams(window.location.search);
  const incoming: StoredAttribution = {};
  for (const field of FIELDS) {
    const value = params.get(field);
    if (value) incoming[field] = value.trim().slice(0, 200);
  }
  if (!Object.keys(incoming).length) return;
  const current = readAttribution();
  const merged = { ...current, ...incoming, landing_path: `${window.location.pathname}${window.location.search}`.slice(0, 300) };
  window.localStorage.setItem(KEY, JSON.stringify(merged));
}

export function readAttribution(): StoredAttribution {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) as StoredAttribution : {};
  } catch {
    return {};
  }
}

export function checkoutAttribution(eventId: string) {
  const stored = readAttribution();
  return {
    utmSource: stored.utm_source,
    utmMedium: stored.utm_medium,
    utmCampaign: stored.utm_campaign,
    utmContent: stored.utm_content,
    utmTerm: stored.utm_term,
    fbclid: stored.fbclid,
    fbp: readCookie("_fbp"),
    fbc: readCookie("_fbc"),
    eventId,
    landingPath: stored.landing_path || window.location.pathname,
  };
}

export function rememberEvent(orderNumber: string, eventId: string) {
  window.sessionStorage.setItem(`forma_event_${orderNumber}`, eventId);
}

export function rememberedEvent(orderNumber: string) {
  return window.sessionStorage.getItem(`forma_event_${orderNumber}`) || undefined;
}

function readCookie(name: string) {
  const match = document.cookie.split("; ").find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : undefined;
}
