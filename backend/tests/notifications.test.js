import assert from "node:assert/strict";
import test from "node:test";
import { sendFailedPaymentEmail, sendPaidOrderEmails } from "../src/services/emailService.js";
import { sendPurchaseEvent } from "../src/services/metaService.js";

function paidOrder() {
  return {
    id: "order-1",
    orderNumber: "FRM241124ABCDEF",
    paymentStatus: "CAPTURED",
    total: "1369.00",
    customer: { name: "Asha Menon", email: "asha@example.com", phone: "9876543210" },
    address: {
      house: "12",
      street: "Palm Road",
      locality: "Indiranagar",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560038",
      landmark: null,
      country: "India",
    },
    items: [{ productId: "prod-1", productName: "Arc Lamp", quantity: 1, unitPrice: "1290.00", lineTotal: "1290.00" }],
    payments: [{ status: "CAPTURED", razorpayPaymentId: "pay_123" }],
    attribution: { eventId: "event-123", landingPath: "/products/arc-ceramic-table-lamp?utm_campaign=spring" },
  };
}

function emailPrisma() {
  const flags = { customerEmailSentAt: null, ownerEmailSentAt: null };
  return {
    flags,
    order: {
      updateMany: async ({ where, data }) => {
        const field = Object.keys(data)[0];
        if (where.paymentStatus !== "CAPTURED" || flags[field]) return { count: 0 };
        flags[field] = data[field];
        return { count: 1 };
      },
      update: async ({ data }) => Object.assign(flags, data),
    },
  };
}

test("paid order emails are sent once when webhooks are retried", async () => {
  const prisma = emailPrisma();
  const sent = [];
  const first = await sendPaidOrderEmails(prisma, paidOrder(), {
    enabled: true,
    send: async (message) => sent.push(message.subject),
  });
  const second = await sendPaidOrderEmails(prisma, paidOrder(), {
    enabled: true,
    send: async (message) => sent.push(message.subject),
  });
  assert.equal(first.customer.sent, true);
  assert.equal(first.owner.sent, true);
  assert.equal(second.customer.duplicate, true);
  assert.equal(second.owner.duplicate, true);
  assert.equal(sent.length, 2);
  assert.match(sent[0], /FRM241124ABCDEF/);
});

test("the owner email is a Meesho placement sheet", async () => {
  const order = paidOrder();
  order.items[0].size = "M";
  order.items[0].meeshoProductId = "2k9abc";
  order.items[0].meeshoUrl = "https://www.meesho.com/cotton-kurti/p/2k9abc";
  order.items[0].meeshoPrice = "250.00";
  order.items[0].unitPrice = "350.00";
  const sent = [];
  await sendPaidOrderEmails(emailPrisma(), order, {
    enabled: true,
    send: async (message) => sent.push(message),
  });
  const owner = sent.find((message) => String(message.subject).startsWith("Place on Meesho"));
  assert.ok(owner);
  assert.match(owner.subject, /Place on Meesho/);
  assert.match(owner.text, /2k9abc/);
  assert.match(owner.text, /PIN 560038/);
  assert.match(owner.text, /Arc Lamp — M/);
  assert.match(owner.text, /Your margin ₹100.00/);
  assert.match(owner.text, /Do not use cash on delivery/);
});

test("pending and failed orders do not send a purchase email", async () => {
  const pending = paidOrder();
  pending.paymentStatus = "PENDING";
  const result = await sendPaidOrderEmails(emailPrisma(), pending, {
    enabled: true,
    send: async () => {
      throw new Error("should not send");
    },
  });
  assert.equal(result.skipped, true);
});

test("a failed payment notification is claimed once", async () => {
  const state = { failureNotifiedAt: null };
  const prisma = {
    payment: {
      updateMany: async ({ where, data }) => {
        if (where.status !== "FAILED" || state.failureNotifiedAt) return { count: 0 };
        state.failureNotifiedAt = data.failureNotifiedAt;
        return { count: 1 };
      },
      update: async ({ data }) => Object.assign(state, data),
    },
  };
  const payment = {
    id: "payment-1",
    status: "FAILED",
    order: { ...paidOrder(), paymentStatus: "PENDING" },
  };
  const sends = [];
  const first = await sendFailedPaymentEmail(prisma, payment, {
    enabled: true,
    send: async () => sends.push("failed"),
  });
  const second = await sendFailedPaymentEmail(prisma, payment, {
    enabled: true,
    send: async () => sends.push("failed"),
  });
  assert.equal(first.sent, true);
  assert.equal(second.duplicate, true);
  assert.equal(sends.length, 1);
});

test("Meta Purchase is sent once and never for an unpaid order", async () => {
  const calls = [];
  const flags = { metaPurchaseSentAt: null };
  const prisma = {
    order: {
      updateMany: async ({ where, data }) => {
        if (where.paymentStatus !== "CAPTURED" || flags.metaPurchaseSentAt) return { count: 0 };
        flags.metaPurchaseSentAt = data.metaPurchaseSentAt;
        return { count: 1 };
      },
      update: async ({ data }) => Object.assign(flags, data),
    },
  };
  const unpaid = await sendPurchaseEvent(prisma, { ...paidOrder(), paymentStatus: "FAILED" }, {
    enabled: true,
    fetchImpl: async () => {
      throw new Error("should not report a failed order");
    },
  });
  assert.equal(unpaid.reason, "not_captured");

  const fetchImpl = async (url, options) => {
    calls.push(JSON.parse(options.body));
    return { ok: true };
  };
  const first = await sendPurchaseEvent(prisma, paidOrder(), { enabled: true, fetchImpl });
  const second = await sendPurchaseEvent(prisma, paidOrder(), { enabled: true, fetchImpl });
  assert.equal(first.sent, true);
  assert.equal(second.duplicate, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].data[0].event_name, "Purchase");
  assert.equal(calls[0].data[0].event_id, "event-123");
  assert.equal(calls[0].data[0].custom_data.currency, "INR");
  assert.equal(calls[0].data[0].custom_data.value, 1369);
});
