import { Router } from "express";
import { env, shippingConfig } from "../config/env.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { productDto } from "../lib/dto.js";
import { formatPaise } from "../lib/money.js";
import { pageMeta, pageParams } from "../lib/pagination.js";
import { AppError } from "../lib/errors.js";
import { getPublicBySlug, listCategories, listProducts } from "../services/productService.js";
import { INDIAN_STATES } from "../validators/schemas.js";

const router = Router();

router.get("/categories", asyncHandler(async (req, res) => {
  const categories = await listCategories(req.prisma);
  res.json({ data: categories });
}));

router.get("/", asyncHandler(async (req, res) => {
  const page = pageParams(req.query, 12);
  const sort = ["price_asc", "price_desc", "newest"].includes(req.query.sort) ? req.query.sort : "newest";
  const result = await listProducts(req.prisma, {
    ...page,
    q: cleanQuery(req.query.q),
    category: cleanQuery(req.query.category),
    featured: req.query.featured === "true" ? true : undefined,
    includeInactive: false,
    sort,
  });
  res.json({
    data: result.products.map((product) => productDto(product)),
    pagination: pageMeta(result.page, result.pageSize, result.total),
  });
}));

router.get("/:slug", asyncHandler(async (req, res) => {
  const product = await getPublicBySlug(req.prisma, req.params.slug);
  if (!product) throw new AppError(404, "NOT_FOUND", "Product not found");
  res.json({ data: productDto(product) });
}));

export function settingsPayload() {
  return {
    storeName: env.STORE_NAME,
    supportEmail: env.SUPPORT_EMAIL,
    currency: "INR",
    shippingFee: formatPaise(shippingConfig().shippingFeePaise),
    freeShippingThreshold: formatPaise(shippingConfig().freeShippingThresholdPaise),
    states: INDIAN_STATES,
  };
}

function cleanQuery(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 80) : undefined;
}

export default router;
