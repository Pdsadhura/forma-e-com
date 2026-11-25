import { Router } from "express";
import { shippingConfig } from "../config/env.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { publicOrderDto } from "../lib/dto.js";
import { AppError } from "../lib/errors.js";
import { orderLimiter, orderReadLimiter } from "../middleware/rateLimit.js";
import { requireBrowserOrigin } from "../middleware/auth.js";
import { validate } from "../middleware/errorHandler.js";
import { createOrder, getOrderByNumber } from "../services/orderService.js";
import { orderSchema } from "../validators/schemas.js";

const router = Router();

router.post("/", orderLimiter, requireBrowserOrigin, validate(orderSchema), asyncHandler(async (req, res) => {
  const order = await createOrder(req.prisma, req.valid.body, shippingConfig(), {
    clientIp: req.ip,
    userAgent: req.get("user-agent"),
  });
  res.status(201).json({ data: publicOrderDto(order) });
}));

router.get("/:orderNumber", orderReadLimiter, asyncHandler(async (req, res) => {
  const order = await getOrderByNumber(req.prisma, req.params.orderNumber);
  if (!order) throw new AppError(404, "NOT_FOUND", "Order not found");
  res.json({ data: publicOrderDto(order) });
}));

export default router;
