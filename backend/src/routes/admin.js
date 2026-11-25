import { Router } from "express";
import multer from "multer";
import { asyncHandler } from "../lib/asyncHandler.js";
import { adminOrderDto, productDto } from "../lib/dto.js";
import { AppError } from "../lib/errors.js";
import { pageMeta, pageParams, parseDateRange } from "../lib/pagination.js";
import { clearAuthCookie, requireAdmin, requireBrowserOrigin, setAuthCookie, signAdminToken } from "../middleware/auth.js";
import { validate } from "../middleware/errorHandler.js";
import { loginLimiter, uploadLimiter } from "../middleware/rateLimit.js";
import { dashboardSummary, getCustomer, listCustomers, listPayments, salesAnalytics } from "../services/analyticsService.js";
import { authenticateAdmin } from "../services/authService.js";
import { getAdminOrder, listOrders, recordMeeshoOrder, updateFulfillment } from "../services/orderService.js";
import { createProduct, deleteProduct, getById, listProducts, updateProduct } from "../services/productService.js";
import { uploadProductImage } from "../services/storageService.js";
import { parseListing } from "../lib/listingParser.js";
import { loginSchema, meeshoFulfillmentSchema, orderStatusSchema, parseListingSchema, productWriteSchema } from "../validators/schemas.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

router.use((req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
  return requireBrowserOrigin(req, res, next);
});

router.post("/auth/login", loginLimiter, validate(loginSchema), asyncHandler(async (req, res) => {
  const admin = await authenticateAdmin(req.prisma, req.valid.body);
  setAuthCookie(res, signAdminToken(admin));
  res.json({ data: { email: admin.email, name: admin.name, role: admin.role } });
}));

router.post("/auth/logout", (req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

router.use(requireAdmin);

router.get("/dashboard", asyncHandler(async (req, res) => {
  res.json({ data: await dashboardSummary(req.prisma) });
}));

router.get("/products", asyncHandler(async (req, res) => {
  const page = pageParams(req.query, 20);
  const result = await listProducts(req.prisma, {
    ...page,
    q: text(req.query.q),
    category: text(req.query.category),
    includeInactive: true,
    sort: "newest",
  });
  res.json({
    data: result.products.map((product) => productDto(product, { includeSourcing: true })),
    pagination: pageMeta(result.page, result.pageSize, result.total),
  });
}));

router.get("/products/:id", asyncHandler(async (req, res) => {
  const product = await getById(req.prisma, req.params.id);
  if (!product) throw new AppError(404, "NOT_FOUND", "Product not found");
  res.json({ data: productDto(product, { includeSourcing: true }) });
}));

router.post("/products/parse", validate(parseListingSchema), asyncHandler(async (req, res) => {
  res.json({ data: parseListing(req.valid.body.text) });
}));

router.post("/products", validate(productWriteSchema), asyncHandler(async (req, res) => {
  const product = await createProduct(req.prisma, req.valid.body);
  res.status(201).json({ data: productDto(product, { includeSourcing: true }) });
}));

router.put("/products/:id", validate(productWriteSchema), asyncHandler(async (req, res) => {
  const product = await updateProduct(req.prisma, req.params.id, req.valid.body);
  res.json({ data: productDto(product, { includeSourcing: true }) });
}));

router.delete("/products/:id", asyncHandler(async (req, res) => {
  const result = await deleteProduct(req.prisma, req.params.id);
  res.json({ data: result.deleted ? { deleted: true } : { deactivated: true, product: productDto(result.product, { includeSourcing: true }) } });
}));

router.post("/uploads", uploadLimiter, (req, res, next) => {
  upload.single("file")(req, res, (error) => (error ? next(error) : next()));
}, asyncHandler(async (req, res) => {
  const image = await uploadProductImage(req.file);
  res.status(201).json({ data: image });
}));

router.get("/orders", asyncHandler(async (req, res) => {
  const page = pageParams(req.query, 20);
  const range = req.query.from || req.query.to ? parseDateRange(req.query) : {};
  const result = await listOrders(req.prisma, {
    ...page,
    ...range,
    q: text(req.query.q),
    orderStatus: enumValue(req.query.orderStatus, ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
    paymentStatus: enumValue(req.query.paymentStatus, ["PENDING", "AUTHORIZED", "CAPTURED", "FAILED", "REFUNDED"]),
  });
  res.json({
    data: result.orders.map(adminOrderDto),
    pagination: pageMeta(page.page, page.pageSize, result.total),
  });
}));

router.get("/orders/:id", asyncHandler(async (req, res) => {
  const order = await getAdminOrder(req.prisma, req.params.id);
  if (!order) throw new AppError(404, "NOT_FOUND", "Order not found");
  res.json({ data: adminOrderDto(order) });
}));

router.patch("/orders/:id/status", validate(orderStatusSchema), asyncHandler(async (req, res) => {
  const order = await updateFulfillment(req.prisma, req.params.id, req.valid.body.orderStatus);
  res.json({ data: adminOrderDto(order) });
}));

router.patch("/orders/:id/meesho", validate(meeshoFulfillmentSchema), asyncHandler(async (req, res) => {
  const order = await recordMeeshoOrder(req.prisma, req.params.id, req.valid.body.meeshoOrderId);
  res.json({ data: adminOrderDto(order) });
}));

router.get("/customers", asyncHandler(async (req, res) => {
  const page = pageParams(req.query, 20);
  const result = await listCustomers(req.prisma, { ...page, q: text(req.query.q) });
  res.json({ data: result.customers, pagination: pageMeta(page.page, page.pageSize, result.total) });
}));

router.get("/customers/:id", asyncHandler(async (req, res) => {
  const customer = await getCustomer(req.prisma, req.params.id);
  if (!customer) throw new AppError(404, "NOT_FOUND", "Customer not found");
  res.json({ data: customer });
}));

router.get("/payments", asyncHandler(async (req, res) => {
  const page = pageParams(req.query, 20);
  const result = await listPayments(req.prisma, {
    ...page,
    status: enumValue(req.query.status, ["PENDING", "AUTHORIZED", "CAPTURED", "FAILED", "REFUNDED"]),
  });
  res.json({
    data: result.payments,
    pagination: pageMeta(page.page, page.pageSize, result.total),
  });
}));

router.get("/analytics", asyncHandler(async (req, res) => {
  const range = parseDateRange(req.query);
  res.json({ data: await salesAnalytics(req.prisma, range) });
}));

function text(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 80) : undefined;
}

function enumValue(value, allowed) {
  return allowed.includes(value) ? value : undefined;
}

export default router;
