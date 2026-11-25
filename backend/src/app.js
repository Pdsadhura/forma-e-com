import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { formatPaise } from "./lib/money.js";
import { log } from "./lib/logger.js";
import { getPrisma } from "./lib/prisma.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import adminRoutes from "./routes/admin.js";
import orderRoutes from "./routes/orders.js";
import paymentRoutes, { webhookHandler } from "./routes/payments.js";
import productRoutes, { settingsPayload } from "./routes/products.js";
import { shippingConfig } from "./config/env.js";

export function createApp({ prisma } = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || env.allowedOrigins.includes(origin)) callback(null, true);
      else callback(null, false);
    },
    credentials: true,
  }));
  app.use((req, res, next) => {
    req.prisma = prisma || getPrisma();
    next();
  });

  app.post("/api/payments/webhook", express.raw({ type: "application/json", limit: "1mb" }), webhookHandler);

  app.use(express.json({ limit: "200kb" }));
  app.use(cookieParser());
  app.use((req, res, next) => {
    const started = Date.now();
    const requestPath = req.originalUrl.split("?")[0];
    res.on("finish", () => {
      log("info", "request", {
        method: req.method,
        path: requestPath,
        status: res.statusCode,
        ms: Date.now() - started,
      });
    });
    next();
  });
  app.use("/api", apiLimiter);

  app.get("/api/health", (req, res) => {
    res.json({ data: { ok: true, service: "forma-api" } });
  });
  app.get("/api/settings", (req, res) => {
    res.json({ data: { ...settingsPayload(), shippingFee: formatPaise(shippingConfig().shippingFeePaise) } });
  });
  app.use("/api/products", productRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/admin", adminRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
