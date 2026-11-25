import crypto from "node:crypto";
import { Router } from "express";
import { env } from "../config/env.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { AppError } from "../lib/errors.js";
import { log } from "../lib/logger.js";
import { getRazorpay } from "../lib/razorpayClient.js";
import { verifyWebhookSignature } from "../lib/razorpayCrypto.js";
import { requireBrowserOrigin } from "../middleware/auth.js";
import { validate } from "../middleware/errorHandler.js";
import { paymentLimiter } from "../middleware/rateLimit.js";
import { sendFailedPaymentEmail, sendPaidOrderEmails } from "../services/emailService.js";
import { sendPurchaseEvent } from "../services/metaService.js";
import {
  capturePayment,
  claimWebhookEvent,
  createGatewayOrder,
  loadOrder,
  markPaymentFailed,
  paymentDetailsFromEvent,
  releaseWebhookEvent,
} from "../services/paymentService.js";
import { verifyPaymentSignature } from "../lib/razorpayCrypto.js";
import { createPaymentSchema, verifyPaymentSchema } from "../validators/schemas.js";

const router = Router();

router.post("/create-order", paymentLimiter, requireBrowserOrigin, validate(createPaymentSchema), asyncHandler(async (req, res) => {
  const razorpay = getRazorpay();
  const data = await createGatewayOrder(req.prisma, razorpay, {
    orderNumber: req.valid.body.orderNumber,
    keyId: env.RAZORPAY_KEY_ID,
  });
  res.status(201).json({ data });
}));

router.post("/verify", paymentLimiter, requireBrowserOrigin, validate(verifyPaymentSchema), asyncHandler(async (req, res) => {
  const body = req.valid.body;
  const valid = verifyPaymentSignature({
    razorpayOrderId: body.razorpay_order_id,
    razorpayPaymentId: body.razorpay_payment_id,
    razorpaySignature: body.razorpay_signature,
    secret: env.RAZORPAY_KEY_SECRET,
  });
  if (!valid) throw new AppError(400, "INVALID_SIGNATURE", "Payment verification failed");

  const razorpay = getRazorpay();
  if (!razorpay) {
    throw new AppError(503, "PAYMENT_NOT_CONFIGURED", "Razorpay is not configured.");
  }

  let remote;
  try {
    remote = await razorpay.payments.fetch(body.razorpay_payment_id);
  } catch (error) {
    log("warn", "Razorpay payment fetch failed; waiting for webhook", { message: error.message });
    return res.status(202).json({
      data: { confirmed: false, paymentStatus: "PENDING", message: "Payment is still being confirmed." },
    });
  }

  if (remote.order_id !== body.razorpay_order_id) {
    throw new AppError(400, "INVALID_PAYMENT", "Payment does not match the Razorpay order");
  }
  if (remote.status !== "captured") {
    return res.status(202).json({
      data: { confirmed: false, paymentStatus: "PENDING", message: "Payment is not captured yet." },
    });
  }

  const result = await capturePayment(req.prisma, {
    razorpayOrderId: body.razorpay_order_id,
    razorpayPaymentId: body.razorpay_payment_id,
    method: remote.method,
    amountPaise: remote.amount,
  });
  if (result.mismatch) throw new AppError(400, "AMOUNT_MISMATCH", "Payment amount did not match the order");
  if (result.ignored) throw new AppError(404, "NOT_FOUND", "Payment order not found");
  if (result.orderId) await notifyPaid(req.prisma, result.orderId);
  const order = await loadOrder(req.prisma, result.orderId);
  res.json({
    data: {
      confirmed: order?.paymentStatus === "CAPTURED",
      orderNumber: order?.orderNumber,
      paymentStatus: order?.paymentStatus,
      orderStatus: order?.orderStatus,
    },
  });
}));

export function webhookHandler(req, res, next) {
  handleWebhook(req, res).catch(next);
}

async function handleWebhook(req, res) {
  const prisma = req.prisma;
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    throw new AppError(
      503,
      "WEBHOOK_NOT_CONFIGURED",
      "Set RAZORPAY_WEBHOOK_SECRET from Razorpay Dashboard → Settings → Webhooks.",
    );
  }
  const rawBody = req.body;
  const signature = req.get("x-razorpay-signature") || "";
  if (!verifyWebhookSignature({ rawBody, signature, secret: env.RAZORPAY_WEBHOOK_SECRET })) {
    throw new AppError(400, "INVALID_SIGNATURE", "Invalid webhook signature");
  }

  let event;
  try {
    event = JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody));
  } catch {
    throw new AppError(400, "INVALID_PAYLOAD", "Webhook body was not valid JSON");
  }

  const eventId = req.get("x-razorpay-event-id")
    || crypto.createHash("sha256").update(Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody))).digest("hex");
  const claimed = await claimWebhookEvent(prisma, eventId, event.event || "unknown");
  if (!claimed) {
    await replayIfPaid(prisma, event);
    return res.json({ received: true, duplicate: true });
  }

  try {
    await dispatchWebhook(prisma, event);
    return res.json({ received: true });
  } catch (error) {
    await releaseWebhookEvent(prisma, eventId);
    throw error;
  }
}

async function dispatchWebhook(prisma, event) {
  const details = paymentDetailsFromEvent(event);
  if (!details.razorpayOrderId) return;
  if (event.event === "payment.captured" || event.event === "order.paid") {
    const result = await capturePayment(prisma, details);
    if (result.orderId && !result.mismatch) await notifyPaid(prisma, result.orderId);
    return;
  }
  if (event.event === "payment.failed") {
    const result = await markPaymentFailed(prisma, details);
    if (result.failed) await sendFailedPaymentEmail(prisma, result.payment);
  }
}

async function replayIfPaid(prisma, event) {
  if (event.event !== "payment.captured" && event.event !== "order.paid") return;
  const details = paymentDetailsFromEvent(event);
  if (!details.razorpayOrderId) return;
  const payment = await prisma.payment.findUnique({
    where: { razorpayOrderId: details.razorpayOrderId },
    select: { orderId: true },
  });
  if (payment) await notifyPaid(prisma, payment.orderId);
}

async function notifyPaid(prisma, orderId) {
  const order = await loadOrder(prisma, orderId);
  if (!order || order.paymentStatus !== "CAPTURED") return;
  await sendPaidOrderEmails(prisma, order);
  await sendPurchaseEvent(prisma, order);
}

export default router;
