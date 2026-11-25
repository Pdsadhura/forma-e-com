import rateLimit from "express-rate-limit";

function limiter(max, windowMs) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: "RATE_LIMITED", message: "Too many requests. Try again shortly." } },
  });
}

export const apiLimiter = limiter(300, 60 * 1000);
export const loginLimiter = limiter(8, 15 * 60 * 1000);
export const orderLimiter = limiter(20, 10 * 60 * 1000);
export const orderReadLimiter = limiter(180, 10 * 60 * 1000);
export const paymentLimiter = limiter(30, 10 * 60 * 1000);
export const uploadLimiter = limiter(20, 10 * 60 * 1000);
