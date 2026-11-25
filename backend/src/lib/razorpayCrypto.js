import crypto from "node:crypto";

export function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) {
    crypto.timingSafeEqual(leftBuffer, leftBuffer);
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function signPayment(razorpayOrderId, razorpayPaymentId, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
}

export function verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature, secret }) {
  if (!secret || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) return false;
  const expected = signPayment(razorpayOrderId, razorpayPaymentId, secret);
  return safeEqual(expected, razorpaySignature);
}

export function signWebhook(rawBody, secret) {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function verifyWebhookSignature({ rawBody, signature, secret }) {
  if (!secret || !signature || !rawBody) return false;
  const expected = signWebhook(rawBody, secret);
  return safeEqual(expected, signature);
}
