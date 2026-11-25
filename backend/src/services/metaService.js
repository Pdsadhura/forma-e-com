import crypto from "node:crypto";
import { env } from "../config/env.js";
import { log } from "../lib/logger.js";
import { money } from "../lib/dto.js";

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function sendPurchaseEvent(prisma, order, { fetchImpl = fetch, enabled } = {}) {
  if (!order || order.paymentStatus !== "CAPTURED") return { skipped: true, reason: "not_captured" };
  const ready = enabled ?? Boolean(env.META_PIXEL_ID && env.META_CAPI_ACCESS_TOKEN);
  if (!ready) {
    log("warn", "Meta Conversions API skipped. Set META_PIXEL_ID and META_CAPI_ACCESS_TOKEN from Events Manager. Purchase events are sent only after a captured payment.");
    return { skipped: true, reason: "not_configured" };
  }

  const claim = await prisma.order.updateMany({
    where: { id: order.id, paymentStatus: "CAPTURED", metaPurchaseSentAt: null },
    data: { metaPurchaseSentAt: new Date() },
  });
  if (claim.count !== 1) return { duplicate: true };

  const attribution = order.attribution;
  const eventId = attribution?.eventId || order.orderNumber;
  const email = order.customer.email.trim().toLowerCase();
  const phone = `91${order.customer.phone.replace(/\D/g, "").slice(-10)}`;
  const firstName = order.customer.name.trim().toLowerCase().split(/\s+/)[0];
  let sourceUrl = env.STORE_URL;
  try {
    sourceUrl = new URL(attribution?.landingPath || "/", env.STORE_URL).toString();
  } catch {
    sourceUrl = env.STORE_URL;
  }

  const payload = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: "website",
        event_source_url: sourceUrl,
        user_data: {
          em: [sha256(email)],
          ph: [sha256(phone)],
          fn: [sha256(firstName)],
          ...(attribution?.clientIp ? { client_ip_address: attribution.clientIp } : {}),
          ...(attribution?.userAgent ? { client_user_agent: attribution.userAgent } : {}),
          ...(attribution?.fbp ? { fbp: attribution.fbp } : {}),
          ...(attribution?.fbc ? { fbc: attribution.fbc } : {}),
        },
        custom_data: {
          currency: "INR",
          value: Number(money(order.total)),
          order_id: order.orderNumber,
          content_type: "product",
          content_ids: order.items.map((item) => item.productId).filter(Boolean),
          contents: order.items.map((item) => ({
            id: item.productId,
            quantity: item.quantity,
            item_price: Number(money(item.unitPrice)),
          })),
        },
      },
    ],
  };
  if (env.META_TEST_EVENT_CODE) payload.test_event_code = env.META_TEST_EVENT_CODE;

  try {
    const response = await fetchImpl(
      `https://graph.facebook.com/${env.META_GRAPH_VERSION}/${env.META_PIXEL_ID}/events?access_token=${encodeURIComponent(env.META_CAPI_ACCESS_TOKEN)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) throw new Error(`Meta responded with ${response.status}`);
    return { sent: true, eventId };
  } catch (error) {
    await prisma.order.update({ where: { id: order.id }, data: { metaPurchaseSentAt: null } });
    log("error", "Meta Purchase event failed", { orderNumber: order.orderNumber, message: error.message });
    return { error: true };
  }
}
