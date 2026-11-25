import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

loadEnvFile();

function loadEnvFile() {
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../.env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().optional().default(""),
  DIRECT_URL: z.string().optional().default(""),
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
  STORE_URL: z.string().default("http://localhost:3000"),
  STORE_NAME: z.string().default("Forma"),
  SUPPORT_EMAIL: z.string().default("hello@forma.local"),
  ADMIN_JWT_SECRET: z.string().optional().default(""),
  ADMIN_JWT_EXPIRES_IN: z.string().default("8h"),
  COOKIE_SAMESITE: z.enum(["lax", "none"]).default("lax"),
  COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  RAZORPAY_KEY_ID: z.string().optional().default(""),
  RAZORPAY_KEY_SECRET: z.string().optional().default(""),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(""),
  RESEND_API_KEY: z.string().optional().default(""),
  EMAIL_FROM: z.string().optional().default(""),
  OWNER_EMAIL: z.string().optional().default(""),
  SUPABASE_URL: z.string().optional().default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(""),
  SUPABASE_STORAGE_BUCKET: z.string().default("product-images"),
  META_PIXEL_ID: z.string().optional().default(""),
  META_CAPI_ACCESS_TOKEN: z.string().optional().default(""),
  META_GRAPH_VERSION: z.string().default("v23.0"),
  META_TEST_EVENT_CODE: z.string().optional().default(""),
  SHIPPING_FEE_PAISE: z.coerce.number().int().nonnegative().default(7900),
  FREE_SHIPPING_THRESHOLD_PAISE: z.coerce.number().int().nonnegative().default(99900),
  RESERVATION_MINUTES: z.coerce.number().int().positive().default(30),
  SEED_ADMIN_EMAIL: z.string().default("admin@forma.local"),
  SEED_ADMIN_PASSWORD: z.string().optional().default(""),
  SEED_ADMIN_NAME: z.string().default("Store Admin"),
});

const parsed = schema.parse(process.env);

const cookieSecure = parsed.COOKIE_SAMESITE === "none"
  ? true
  : parsed.COOKIE_SECURE
    ? parsed.COOKIE_SECURE === "true"
    : parsed.NODE_ENV === "production";

export const env = {
  ...parsed,
  allowedOrigins: parsed.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean),
  cookieSecure,
  shippingFeePaise: BigInt(parsed.SHIPPING_FEE_PAISE),
  freeShippingThresholdPaise: BigInt(parsed.FREE_SHIPPING_THRESHOLD_PAISE),
};

export function assertDatabaseConfigured() {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing. Set it to your PostgreSQL connection string.");
  }
}

export function shippingConfig() {
  return {
    shippingFeePaise: env.shippingFeePaise,
    freeShippingThresholdPaise: env.freeShippingThresholdPaise,
  };
}
