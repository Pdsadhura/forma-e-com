"use client";

export function trackMeta(event: string, data?: Record<string, unknown>, eventId?: string) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  if (eventId) window.fbq("track", event, data || {}, { eventID: eventId });
  else window.fbq("track", event, data || {});
}

export function productEvent(product: { id: string; name: string; effectivePrice: string }) {
  return {
    content_ids: [product.id],
    content_name: product.name,
    content_type: "product",
    value: Number(product.effectivePrice),
    currency: "INR",
  };
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
    };
  }
}
