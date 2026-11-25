import { z } from "zod";
import { slugify } from "../lib/orderNumber.js";

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

const phoneSchema = z.string().trim().transform((value, ctx) => {
  const digits = value.replace(/[\s-]/g, "").replace(/^\+91/, "").replace(/^91(?=\d{10}$)/, "").replace(/^0/, "");
  if (!/^[6-9]\d{9}$/.test(digits)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid 10-digit Indian mobile number" });
    return z.NEVER;
  }
  return digits;
});

const trimmed = (min, max) => z.string().trim().min(min).max(max);

const optionalAttributionString = z.string().trim().max(200).optional().nullable();

export const attributionSchema = z.object({
  utmSource: optionalAttributionString,
  utmMedium: optionalAttributionString,
  utmCampaign: optionalAttributionString,
  utmContent: optionalAttributionString,
  utmTerm: optionalAttributionString,
  fbclid: optionalAttributionString,
  fbp: optionalAttributionString,
  fbc: optionalAttributionString,
  eventId: z.string().trim().max(80).optional().nullable(),
  landingPath: z.string().trim().max(300).optional().nullable(),
}).optional();

export const orderSchema = z.object({
  body: z.object({
    customer: z.object({
      name: trimmed(2, 80),
      email: z.string().trim().email().max(160).transform((value) => value.toLowerCase()),
      phone: phoneSchema,
    }),
    address: z.object({
      house: trimmed(1, 120),
      street: trimmed(1, 160),
      locality: trimmed(1, 160),
      city: trimmed(2, 80),
      state: z.string().trim().refine((value) => INDIAN_STATES.includes(value), "Choose a valid state"),
      pincode: z.string().trim().regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit PIN code"),
      landmark: z.string().trim().max(160).optional().nullable(),
    }),
    items: z.array(z.object({
      productId: z.string().trim().min(1).max(40),
      quantity: z.coerce.number().int().min(1).max(10),
      size: z.string().trim().min(1).max(40).optional().nullable(),
    })).min(1).max(10),
    attribution: attributionSchema,
  }),
});

export const createPaymentSchema = z.object({
  body: z.object({
    orderNumber: z.string().trim().min(8).max(40),
  }),
});

export const verifyPaymentSchema = z.object({
  body: z.object({
    razorpay_order_id: z.string().trim().min(3).max(80),
    razorpay_payment_id: z.string().trim().min(3).max(80),
    razorpay_signature: z.string().trim().min(10).max(256),
  }),
});

const imageSchema = z.object({
  url: z.string().trim().url().max(2000).refine((url) => url.startsWith("https://") || url.startsWith("http://"), "Use an http(s) image URL"),
  alt: z.string().trim().max(160).optional().nullable(),
});

const meeshoProductIdSchema = z.union([z.string(), z.null()]).optional().transform((value, ctx) => {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^[A-Za-z0-9_-]{2,64}$/.test(trimmed)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter the product ID from the Meesho link" });
    return z.NEVER;
  }
  return trimmed;
});

const pidSchema = z.union([z.string(), z.null()]).optional().transform((value, ctx) => {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4,20}$/.test(trimmed)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "PID is the numeric product ID from the Meesho listing" });
    return z.NEVER;
  }
  return trimmed;
});

const meeshoUrlSchema = z.union([z.string(), z.null()]).optional().transform((value, ctx) => {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  let url;
  try {
    url = new URL(trimmed);
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Paste a meesho.com product link" });
    return z.NEVER;
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || (host !== "meesho.com" && !host.endsWith(".meesho.com"))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Paste a meesho.com product link" });
    return z.NEVER;
  }
  if (trimmed.length > 500) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Meesho link is too long" });
    return z.NEVER;
  }
  return trimmed;
});

const priceSchema = z.union([
  z.number().positive(),
  z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid price"),
]);

export const productWriteSchema = z.object({
  body: z.object({
    name: trimmed(2, 160),
    slug: z.string().trim().max(200).optional().transform((value) => {
      if (!value) return undefined;
      const slug = slugify(value);
      return slug === "product" ? undefined : slug;
    }),
    description: trimmed(1, 5000),
    price: priceSchema,
    salePrice: priceSchema.nullable().optional(),
    stockQuantity: z.coerce.number().int().min(0).max(100000),
    status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
    category: z.string().trim().min(2).max(60).optional().nullable(),
    featured: z.boolean().optional().default(false),
    meeshoProductId: meeshoProductIdSchema,
    pid: pidSchema,
    meeshoUrl: meeshoUrlSchema,
    meeshoPrice: priceSchema.nullable().optional(),
    sizes: z.array(z.string().trim().min(1).max(40)).max(30).optional().default([]),
    specifications: z.array(z.object({
      label: z.string().trim().min(2).max(60),
      value: z.string().trim().min(1).max(200),
    })).max(20).optional().default([]),
    images: z.array(imageSchema).max(8).optional().default([]),
  }).superRefine((value, ctx) => {
    const price = Number(value.price);
    const sale = value.salePrice == null || value.salePrice === "" ? null : Number(value.salePrice);
    if (sale != null && (!(sale > 0) || sale >= price)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["salePrice"],
        message: "Sale price must be lower than the regular price",
      });
    }
    const selling = sale != null && sale > 0 && sale < price ? sale : price;
    const supplier = value.meeshoPrice == null || value.meeshoPrice === "" ? null : Number(value.meeshoPrice);
    if (supplier != null && (!(supplier > 0) || supplier >= selling)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["meeshoPrice"],
        message: "Meesho price must be lower than the price customers pay",
      });
    }
    if (value.status === "ACTIVE" && !value.meeshoProductId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["meeshoProductId"],
        message: "Add the Meesho product ID before this product goes live",
      });
    }
    if (value.status === "ACTIVE" && supplier == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["meeshoPrice"],
        message: "Add the Meesho price before this product goes live",
      });
    }
  }),
});

export const parseListingSchema = z.object({
  body: z.object({
    text: z.string().trim().min(10).max(8000),
  }),
});

export const meeshoFulfillmentSchema = z.object({
  body: z.object({
    meeshoOrderId: z.string().trim().min(4).max(40).regex(/^[A-Za-z0-9_-]+$/, "Enter the Meesho order ID"),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
    password: z.string().min(8).max(200),
  }),
});

export const orderStatusSchema = z.object({
  body: z.object({
    orderStatus: z.enum(["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
  }),
});

export function emptyToNull(value) {
  if (value == null) return null;
  const trimmedValue = String(value).trim();
  return trimmedValue || null;
}
