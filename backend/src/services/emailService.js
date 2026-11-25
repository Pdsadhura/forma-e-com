import { env } from "../config/env.js";
import { escapeHtml } from "../lib/html.js";
import { log } from "../lib/logger.js";
import { marginMoney, money } from "../lib/dto.js";

export async function sendPaidOrderEmails(prisma, order, { send = sendWithResend, enabled } = {}) {
  if (!order || order.paymentStatus !== "CAPTURED") return { skipped: true, reason: "not_captured" };
  const ready = enabled ?? canSend();
  const customer = await claimAndSend(prisma, order, "customerEmailSentAt", ready, () => send({
    to: order.customer.email,
    subject: `${env.STORE_NAME} order ${order.orderNumber}`,
    html: customerHtml(order),
    text: customerText(order),
  }));
  const owner = env.OWNER_EMAIL || enabled
    ? await claimAndSend(prisma, order, "ownerEmailSentAt", ready, () => send({
        to: env.OWNER_EMAIL || "owner@example.com",
        subject: `Place on Meesho ${order.orderNumber}`,
        html: ownerHtml(order),
        text: ownerText(order),
      }))
    : { skipped: true, reason: "owner_email_missing" };
  return { customer, owner };
}

export async function sendFailedPaymentEmail(prisma, payment, { send = sendWithResend, enabled } = {}) {
  const order = payment.order;
  if (!order || order.paymentStatus === "CAPTURED") return { skipped: true };
  const ready = enabled ?? canSend();
  const claim = await prisma.payment.updateMany({
    where: { id: payment.id, status: "FAILED", failureNotifiedAt: null },
    data: { failureNotifiedAt: new Date() },
  });
  if (claim.count !== 1) return { duplicate: true };
  if (!ready) {
    await prisma.payment.update({ where: { id: payment.id }, data: { failureNotifiedAt: null } });
    log("warn", "Failed-payment email skipped. Set RESEND_API_KEY and EMAIL_FROM. Verify the sender domain in Resend.");
    return { skipped: true };
  }
  try {
    await send({
      to: order.customer.email,
      subject: `${env.STORE_NAME} payment was not completed`,
      html: failureHtml(order),
      text: `Payment for order ${order.orderNumber} was not completed. The order is not marked paid. You can try again from the pending page.`,
    });
    return { sent: true };
  } catch (error) {
    await prisma.payment.update({ where: { id: payment.id }, data: { failureNotifiedAt: null } });
    log("error", "failed-payment email failed", { orderNumber: order.orderNumber, message: error.message });
    return { error: true };
  }
}

async function claimAndSend(prisma, order, field, ready, send) {
  const claim = await prisma.order.updateMany({
    where: { id: order.id, paymentStatus: "CAPTURED", [field]: null },
    data: { [field]: new Date() },
  });
  if (claim.count !== 1) return { duplicate: true };
  if (!ready) {
    await prisma.order.update({ where: { id: order.id }, data: { [field]: null } });
    log("warn", "Order email skipped. Set RESEND_API_KEY and EMAIL_FROM. Verify a sender domain in the Resend dashboard before production delivery.", {
      orderNumber: order.orderNumber,
    });
    return { skipped: true };
  }
  try {
    await send();
    return { sent: true };
  } catch (error) {
    await prisma.order.update({ where: { id: order.id }, data: { [field]: null } });
    log("error", "order email failed", { orderNumber: order.orderNumber, message: error.message });
    return { error: true };
  }
}

function canSend() {
  return Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
}

export async function sendWithResend({ to, subject, html, text }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [to],
      subject,
      html,
      text,
      reply_to: env.SUPPORT_EMAIL || undefined,
    }),
  });
  if (!response.ok) {
    throw new Error(`Resend responded with ${response.status}`);
  }
}

function addressBlock(address) {
  return [
    address.house,
    address.street,
    address.locality,
    `${address.city}, ${address.state} ${address.pincode}`,
    address.landmark,
    address.country,
  ].filter(Boolean).map((line) => escapeHtml(line)).join("<br>");
}

function itemLabel(item) {
  return item.size ? `${item.productName} — ${item.size}` : item.productName;
}

function itemRows(order) {
  return order.items.map((item) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #e7e5e4">${escapeHtml(itemLabel(item))}</td>
      <td style="padding:8px 0;border-bottom:1px solid #e7e5e4;text-align:center">${item.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #e7e5e4;text-align:right">₹${escapeHtml(money(item.lineTotal))}</td>
    </tr>`).join("");
}

function fulfillmentRows(order) {
  return order.items.map((item) => {
    const margin = marginMoney(item.unitPrice, item.meeshoPrice);
    const link = item.meeshoUrl
      ? `<a href="${escapeHtml(item.meeshoUrl)}">Open on Meesho</a>`
      : "No Meesho link saved";
    const details = (Array.isArray(item.specifications) ? item.specifications : [])
      .map((spec) => `${escapeHtml(spec.label)}: ${escapeHtml(spec.value)}`)
      .join("<br>");
    return `<p style="margin:0 0 12px"><strong>${escapeHtml(itemLabel(item))}</strong> × ${item.quantity}<br>
      Meesho product ID ${escapeHtml(item.meeshoProductId || "not saved")}<br>
      PID ${escapeHtml(item.pid || "not saved")}<br>
      ${link}<br>
      ${details ? `${details}<br>` : ""}
      Your price ₹${escapeHtml(money(item.unitPrice))}${item.meeshoPrice == null ? "" : ` · Meesho price ₹${escapeHtml(money(item.meeshoPrice))}`}${margin ? ` · Margin ₹${escapeHtml(margin)} each` : ""}</p>`;
  }).join("");
}

function shell(title, body) {
  return `<!doctype html><html><body style="margin:0;background:#f6f3ee;font-family:Georgia,serif;color:#1c1917">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <p style="letter-spacing:.18em;text-transform:uppercase;font-size:12px;font-family:Arial,sans-serif">${escapeHtml(env.STORE_NAME)}</p>
    <h1 style="font-size:28px;font-weight:500;margin:8px 0 20px">${escapeHtml(title)}</h1>
    <div style="background:#fff;border-radius:16px;padding:20px;font-family:Arial,sans-serif;font-size:14px;line-height:1.5">${body}</div>
  </div></body></html>`;
}

function customerHtml(order) {
  const payment = order.payments?.find((entry) => entry.status === "CAPTURED");
  return shell("Your order is confirmed", `
    <p>Thank you. We received your payment and will prepare the order.</p>
    <p><strong>Order</strong> ${escapeHtml(order.orderNumber)}<br>
    <strong>Payment</strong> ${escapeHtml(order.paymentStatus)}${payment?.razorpayPaymentId ? ` · ${escapeHtml(payment.razorpayPaymentId)}` : ""}</p>
    <table style="width:100%;border-collapse:collapse">${itemRows(order)}</table>
    <p style="text-align:right"><strong>Amount paid ₹${escapeHtml(money(order.total))}</strong></p>
    <p><strong>Delivery address</strong><br>${addressBlock(order.address)}</p>
  `);
}

function customerText(order) {
  const lines = order.items.map((item) => `${itemLabel(item)} x ${item.quantity} — ₹${money(item.lineTotal)}`);
  return [
    `${env.STORE_NAME} order ${order.orderNumber} is confirmed.`,
    `Payment status: ${order.paymentStatus}`,
    ...lines,
    `Amount paid: ₹${money(order.total)}`,
    `Deliver to: ${order.address.house}, ${order.address.street}, ${order.address.locality}, ${order.address.city}, ${order.address.state} ${order.address.pincode}`,
  ].join("\n");
}

function ownerHtml(order) {
  const payment = order.payments?.find((entry) => entry.status === "CAPTURED");
  const link = `${env.STORE_URL}/admin/orders/${order.id}`;
  return shell("Place this order on Meesho", `
    <p>The customer already paid <strong>₹${escapeHtml(money(order.total))}</strong> on Razorpay. Open each product on Meesho, choose the size, enter this address, and pay Meesho yourself. Do not use cash on delivery, or the customer will be charged again.</p>
    <p><strong>${escapeHtml(order.customer.name)}</strong><br>
    ${escapeHtml(order.customer.phone)}<br>${escapeHtml(order.customer.email)}</p>
    <p><strong>Address to enter on Meesho</strong><br>${addressBlock(order.address)}<br><strong>PIN ${escapeHtml(order.address.pincode)}</strong></p>
    ${fulfillmentRows(order)}
    <p>Razorpay payment ${escapeHtml(payment?.razorpayPaymentId || "recorded")}<br>
    Order ${escapeHtml(order.orderNumber)}</p>
    <p><a href="${escapeHtml(link)}">Open this order and save the Meesho order ID</a></p>
  `);
}

function ownerText(order) {
  const payment = order.payments?.find((entry) => entry.status === "CAPTURED");
  const address = order.address;
  return [
    `Place this paid order on Meesho: ${order.orderNumber}`,
    `The customer already paid ₹${money(order.total)} on Razorpay. Pay Meesho yourself and ship to this address. Do not use cash on delivery.`,
    "",
    order.customer.name,
    order.customer.phone,
    order.customer.email,
    address.house,
    address.street,
    address.locality,
    `${address.city}, ${address.state}`,
    `PIN ${address.pincode}`,
    address.landmark || "",
    address.country,
    "",
    ...order.items.flatMap((item) => {
      const margin = marginMoney(item.unitPrice, item.meeshoPrice);
      return [
        `${itemLabel(item)} x ${item.quantity}`,
        ...(Array.isArray(item.specifications) ? item.specifications.map((spec) => `${spec.label}: ${spec.value}`) : []),
        `Meesho product ID: ${item.meeshoProductId || "not saved"}`,
        `PID: ${item.pid || "not saved"}`,
        item.meeshoUrl || "",
        `Your price ₹${money(item.unitPrice)}`,
        item.meeshoPrice == null ? "" : `Meesho price ₹${money(item.meeshoPrice)}`,
        margin ? `Your margin ₹${margin} each` : "",
        "",
      ].filter((line) => line !== "");
    }),
    `Razorpay ${payment?.razorpayPaymentId || ""}`,
    `${env.STORE_URL}/admin/orders/${order.id}`,
  ].join("\n");
}

function failureHtml(order) {
  return shell("Payment was not completed", `
    <p>Razorpay reported the payment for order ${escapeHtml(order.orderNumber)} as failed. The order is not marked paid.</p>
    <p>If a bank debit is still pending, it is usually reversed by the bank. You can try the payment again from the order page.</p>
  `);
}
