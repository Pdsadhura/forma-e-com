import { createApp } from "./app.js";
import { assertDatabaseConfigured, env } from "./config/env.js";
import { log } from "./lib/logger.js";
import { disconnectPrisma, getPrisma } from "./lib/prisma.js";
import { releaseExpiredReservations } from "./services/orderService.js";

assertDatabaseConfigured();

const app = createApp();
const server = app.listen(env.PORT, () => {
  log("info", "API listening", { port: env.PORT });
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    log("warn", "Razorpay keys are missing. Checkout can create orders, but payments stay unavailable until RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set.");
  }
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    log("warn", "RAZORPAY_WEBHOOK_SECRET is missing. Webhook confirmation is disabled until it is set.");
  }
});

const timer = setInterval(() => {
  releaseExpiredReservations(getPrisma(), env.RESERVATION_MINUTES)
    .then((released) => {
      if (released > 0) log("info", "released unpaid reservations", { released });
    })
    .catch((error) => log("error", "reservation release failed", { message: error.message }));
}, 5 * 60 * 1000);
if (typeof timer.unref === "function") timer.unref();

function shutdown() {
  clearInterval(timer);
  server.close(async () => {
    await disconnectPrisma();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
