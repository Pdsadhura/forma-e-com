import { AppError } from "../lib/errors.js";
import { log } from "../lib/logger.js";
import { toPaise } from "../lib/money.js";
import { decrementStock } from "./orderService.js";

const orderInclude = {
  items: true,
  address: true,
  customer: true,
  payments: true,
  attribution: true,
};

export async function createGatewayOrder(prisma, razorpay, { orderNumber, keyId }) {
  if (!razorpay || !keyId) {
    throw new AppError(
      503,
      "PAYMENT_NOT_CONFIGURED",
      "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET from the Razorpay Dashboard → Settings → API Keys (Test Mode).",
    );
  }
  const order = await prisma.order.findUnique({ where: { orderNumber } });
  if (!order) throw new AppError(404, "NOT_FOUND", "Order not found");
  if (order.paymentStatus === "CAPTURED") throw new AppError(409, "ALREADY_PAID", "This order is already paid");
  if (order.orderStatus === "CANCELLED") {
    throw new AppError(409, "ORDER_CANCELLED", "This order expired before payment. Place it again.");
  }

  const amountPaise = toPaise(order.total);
  const gatewayOrder = await razorpay.orders.create({
    amount: Number(amountPaise),
    currency: "INR",
    receipt: order.orderNumber,
    notes: { orderNumber: order.orderNumber },
  });

  await prisma.payment.create({
    data: {
      orderId: order.id,
      razorpayOrderId: gatewayOrder.id,
      amount: order.total,
      currency: "INR",
      status: "PENDING",
    },
  });

  return {
    keyId,
    razorpayOrderId: gatewayOrder.id,
    amount: Number(amountPaise),
    currency: "INR",
    orderNumber: order.orderNumber,
  };
}

export async function capturePayment(prisma, input) {
  const preliminary = await prisma.payment.findUnique({
    where: { razorpayOrderId: input.razorpayOrderId },
    include: { order: { include: { items: true } } },
  });
  if (!preliminary) return { ignored: true };
  if (input.amountPaise != null && toPaise(preliminary.amount) !== BigInt(input.amountPaise)) {
    log("error", "payment amount mismatch", {
      orderNumber: preliminary.order.orderNumber,
      expected: String(toPaise(preliminary.amount)),
    });
    return { mismatch: true, orderId: preliminary.order.id };
  }
  if (preliminary.order.paymentStatus === "CAPTURED" || preliminary.status === "CAPTURED") {
    return { duplicate: true, orderId: preliminary.order.id };
  }

  if (preliminary.order.orderStatus === "CANCELLED") {
    try {
      await prisma.$transaction(async (tx) => {
        const sorted = [...preliminary.order.items].sort((a, b) => String(a.productId).localeCompare(String(b.productId)));
        for (const item of sorted) {
          if (!item.productId) throw new AppError(409, "INSUFFICIENT_STOCK", "Stock conflict");
          await decrementStock(tx, item.productId, item.quantity, { requireActive: false });
        }
      });
    } catch (error) {
      if (error instanceof AppError && error.code === "INSUFFICIENT_STOCK") {
        log("error", "paid order could not re-reserve stock", { orderId: preliminary.order.id });
      } else {
        throw error;
      }
    }
  }

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { razorpayOrderId: input.razorpayOrderId },
      include: { order: true },
    });
    if (!payment) return { ignored: true };
    if (payment.order.paymentStatus === "CAPTURED" || payment.status === "CAPTURED") {
      return { duplicate: true, orderId: payment.order.id };
    }
    const updated = await tx.order.updateMany({
      where: { id: payment.order.id, paymentStatus: { not: "CAPTURED" } },
      data: { paymentStatus: "CAPTURED", orderStatus: "PROCESSING" },
    });
    if (updated.count !== 1) return { duplicate: true, orderId: payment.order.id };
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "CAPTURED",
        razorpayPaymentId: input.razorpayPaymentId || payment.razorpayPaymentId,
        method: input.method || payment.method,
      },
    });
    return { captured: true, orderId: payment.order.id };
  });
}

export async function markPaymentFailed(prisma, input) {
  const payment = await prisma.payment.findUnique({
    where: { razorpayOrderId: input.razorpayOrderId },
    include: { order: { include: orderInclude } },
  });
  if (!payment) return { ignored: true };
  if (payment.status === "CAPTURED" || payment.order.paymentStatus === "CAPTURED") return { ignored: true };
  const updated = await prisma.payment.updateMany({
    where: { id: payment.id, status: "PENDING" },
    data: {
      status: "FAILED",
      razorpayPaymentId: input.razorpayPaymentId || payment.razorpayPaymentId,
      method: input.method || payment.method,
    },
  });
  if (updated.count !== 1) return { duplicate: true, payment };
  return { failed: true, payment };
}

export async function loadOrder(prisma, orderId) {
  return prisma.order.findUnique({ where: { id: orderId }, include: orderInclude });
}

export async function claimWebhookEvent(prisma, eventId, eventType) {
  try {
    await prisma.processedWebhookEvent.create({ data: { eventId, eventType } });
    return true;
  } catch (error) {
    if (error?.code === "P2002") return false;
    throw error;
  }
}

export async function releaseWebhookEvent(prisma, eventId) {
  await prisma.processedWebhookEvent.delete({ where: { eventId } }).catch(() => {});
}

export function paymentDetailsFromEvent(event) {
  const payment = event?.payload?.payment?.entity;
  const gatewayOrder = event?.payload?.order?.entity;
  return {
    razorpayOrderId: payment?.order_id || gatewayOrder?.id || null,
    razorpayPaymentId: payment?.id || null,
    method: payment?.method || null,
    amountPaise: payment?.amount ?? gatewayOrder?.amount_paid ?? null,
    status: payment?.status || null,
  };
}
