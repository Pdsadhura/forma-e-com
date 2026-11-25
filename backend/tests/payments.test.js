import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import {
  signPayment,
  signWebhook,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "../src/lib/razorpayCrypto.js";
import { claimWebhookEvent } from "../src/services/paymentService.js";

const secret = "rzp_test_secret";

test("payment signature matches Razorpay order and payment ids", () => {
  const signature = signPayment("order_123", "pay_123", secret);
  assert.equal(verifyPaymentSignature({
    razorpayOrderId: "order_123",
    razorpayPaymentId: "pay_123",
    razorpaySignature: signature,
    secret,
  }), true);
  assert.equal(verifyPaymentSignature({
    razorpayOrderId: "order_123",
    razorpayPaymentId: "pay_456",
    razorpaySignature: signature,
    secret,
  }), false);
  assert.equal(verifyPaymentSignature({
    razorpayOrderId: "order_123",
    razorpayPaymentId: "pay_123",
    razorpaySignature: "short",
    secret,
  }), false);
});

test("webhook signature uses the raw body", () => {
  const rawBody = Buffer.from(JSON.stringify({ event: "payment.captured", amount: 136900 }));
  const signature = signWebhook(rawBody, secret);
  assert.equal(verifyWebhookSignature({ rawBody, signature, secret }), true);
  const tampered = Buffer.from(JSON.stringify({ event: "payment.captured", amount: 1 }));
  assert.equal(verifyWebhookSignature({ rawBody: tampered, signature, secret }), false);
  assert.equal(verifyWebhookSignature({ rawBody, signature: "", secret }), false);
});

test("duplicate webhook event ids are rejected", async () => {
  const seen = new Set();
  const prisma = {
    processedWebhookEvent: {
      create: async ({ data }) => {
        if (seen.has(data.eventId)) {
          const error = new Error("Unique constraint");
          error.code = "P2002";
          throw error;
        }
        seen.add(data.eventId);
      },
    },
  };
  assert.equal(await claimWebhookEvent(prisma, "evt_1", "payment.captured"), true);
  assert.equal(await claimWebhookEvent(prisma, "evt_1", "payment.captured"), false);
  assert.equal(crypto.createHash("sha256").update("evt_1").digest("hex").length, 64);
});
