import assert from "node:assert/strict";
import test from "node:test";
import { decrementStock } from "../src/services/orderService.js";
import { capturePayment } from "../src/services/paymentService.js";

test("only one concurrent reservation can take the last unit", async () => {
  const state = { stock: 1 };
  const tx = {
    product: {
      updateMany: async ({ where, data }) => {
        if (state.stock < where.stockQuantity.gte) return { count: 0 };
        state.stock -= data.stockQuantity.decrement;
        return { count: 1 };
      },
    },
  };
  const results = await Promise.allSettled([
    decrementStock(tx, "lamp", 1),
    decrementStock(tx, "lamp", 1),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  assert.equal(state.stock, 0);
});

test("a captured payment is recorded once and a mismatched amount is refused", async () => {
  const state = {
    payment: { id: "payrow", status: "PENDING", razorpayPaymentId: null, method: null, amount: "1369.00" },
    order: { id: "order-1", paymentStatus: "PENDING", orderStatus: "PENDING", orderNumber: "FRM1", items: [] },
  };
  const db = {
    payment: {
      findUnique: async () => ({ ...state.payment, order: state.order }),
      update: async ({ data }) => Object.assign(state.payment, data),
    },
    order: {
      updateMany: async () => {
        if (state.order.paymentStatus === "CAPTURED") return { count: 0 };
        state.order.paymentStatus = "CAPTURED";
        state.order.orderStatus = "PROCESSING";
        return { count: 1 };
      },
    },
    $transaction: async (fn) => fn(db),
  };

  const mismatch = await capturePayment(db, {
    razorpayOrderId: "order_123",
    razorpayPaymentId: "pay_123",
    amountPaise: 100,
  });
  assert.equal(mismatch.mismatch, true);
  assert.equal(state.order.paymentStatus, "PENDING");

  const paid = await capturePayment(db, {
    razorpayOrderId: "order_123",
    razorpayPaymentId: "pay_123",
    amountPaise: 136900,
    method: "upi",
  });
  assert.equal(paid.captured, true);
  const duplicate = await capturePayment(db, {
    razorpayOrderId: "order_123",
    razorpayPaymentId: "pay_123",
    amountPaise: 136900,
    method: "upi",
  });
  assert.equal(duplicate.duplicate, true);
  assert.equal(state.payment.status, "CAPTURED");
  assert.equal(state.order.orderStatus, "PROCESSING");
});
