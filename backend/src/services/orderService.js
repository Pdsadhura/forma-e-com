import { AppError } from "../lib/errors.js";
import { formatPaise } from "../lib/money.js";
import { generateOrderNumber } from "../lib/orderNumber.js";
import { calculateTotals, effectivePricePaise, mergeItems } from "../lib/pricing.js";
import { emptyToNull } from "../validators/schemas.js";
import { cleanSpecifications, specificationValue } from "../lib/listingParser.js";

const orderInclude = {
  items: true,
  address: true,
  customer: true,
  payments: true,
  attribution: true,
};

export async function decrementStock(tx, productId, quantity, { requireActive = true } = {}) {
  const where = { id: productId, stockQuantity: { gte: quantity } };
  if (requireActive) where.status = "ACTIVE";
  const updated = await tx.product.updateMany({
    where,
    data: { stockQuantity: { decrement: quantity } },
  });
  if (updated.count !== 1) {
    throw new AppError(409, "INSUFFICIENT_STOCK", "One of the products does not have enough stock");
  }
}

export async function restoreStock(tx, items) {
  const sorted = [...items].sort((a, b) => String(a.productId).localeCompare(String(b.productId)));
  for (const item of sorted) {
    if (!item.productId) continue;
    await tx.product.update({
      where: { id: item.productId },
      data: { stockQuantity: { increment: item.quantity } },
    });
  }
}

export async function createOrder(prisma, input, shipping, requestMeta = {}) {
  const items = mergeItems(input.items);
  if (items.some((item) => item.quantity > 10)) {
    throw new AppError(400, "VALIDATION_ERROR", "You can order up to 10 of each product");
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const products = await tx.product.findMany({ where: { id: { in: items.map((item) => item.productId) } } });
        const byId = new Map(products.map((product) => [product.id, product]));
        const lines = items.map((item) => {
          const product = byId.get(item.productId);
          if (!product || product.status !== "ACTIVE") {
            throw new AppError(400, "PRODUCT_UNAVAILABLE", "A selected product is no longer available");
          }
          const unitPricePaise = effectivePricePaise(product);
          return {
            product,
            size: resolveSize(product, item.size),
            quantity: item.quantity,
            unitPricePaise,
            lineTotalPaise: unitPricePaise * BigInt(item.quantity),
          };
        }).sort((a, b) => a.product.id.localeCompare(b.product.id) || String(a.size || "").localeCompare(String(b.size || "")));

        for (const line of lines) {
          await decrementStock(tx, line.product.id, line.quantity);
        }

        const totals = calculateTotals(lines, shipping);
        const customer = await tx.customer.upsert({
          where: { email: input.customer.email },
          update: { name: input.customer.name, phone: input.customer.phone },
          create: {
            name: input.customer.name,
            email: input.customer.email,
            phone: input.customer.phone,
          },
        });
        const address = await tx.address.create({
          data: {
            customerId: customer.id,
            house: input.address.house,
            street: input.address.street,
            locality: input.address.locality,
            city: input.address.city,
            state: input.address.state,
            pincode: input.address.pincode,
            landmark: emptyToNull(input.address.landmark),
            country: "India",
          },
        });
        const attribution = normalizeAttribution(input.attribution, requestMeta);
        return tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            customerId: customer.id,
            addressId: address.id,
            subtotal: totals.subtotal,
            shippingAmount: totals.shippingAmount,
            total: totals.total,
            currency: "INR",
            items: {
              create: lines.map((line) => ({
                productId: line.product.id,
                productName: line.product.name,
                size: line.size || specificationValue(line.product, "Size"),
                meeshoProductId: line.product.meeshoProductId,
                pid: line.product.pid,
                meeshoUrl: line.product.meeshoUrl,
                meeshoPrice: line.product.meeshoPrice,
                specifications: cleanSpecifications(line.product.specifications),
                unitPrice: formatPaise(line.unitPricePaise),
                quantity: line.quantity,
                lineTotal: formatPaise(line.lineTotalPaise),
              })),
            },
            ...(attribution ? { attribution: { create: attribution } } : {}),
          },
          include: orderInclude,
        });
      });
    } catch (error) {
      if (error?.code === "P2002" && attempt < 2) continue;
      throw error;
    }
  }
  throw new AppError(500, "ORDER_NUMBER_CONFLICT", "Could not allocate an order number");
}

export async function getOrderByNumber(prisma, orderNumber) {
  return prisma.order.findUnique({ where: { orderNumber }, include: orderInclude });
}

export async function listOrders(prisma, { skip, pageSize, q, orderStatus, paymentStatus, from, to }) {
  const where = {};
  if (orderStatus) where.orderStatus = orderStatus;
  if (paymentStatus) where.paymentStatus = paymentStatus;
  if (from || to) where.createdAt = { gte: from, lte: to };
  if (q) {
    const phone = q.replace(/\D/g, "");
    where.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { customer: { name: { contains: q, mode: "insensitive" } } },
      { customer: { email: { contains: q, mode: "insensitive" } } },
      ...(phone ? [{ customer: { phone: { contains: phone } } }] : []),
    ];
  }
  const [total, orders] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
  ]);
  return { orders, total };
}

export async function getAdminOrder(prisma, id) {
  return prisma.order.findUnique({ where: { id }, include: orderInclude });
}

export async function recordMeeshoOrder(prisma, id, meeshoOrderId) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw new AppError(404, "NOT_FOUND", "Order not found");
  if (order.paymentStatus !== "CAPTURED") {
    throw new AppError(409, "CONFLICT", "Save the Meesho order after Razorpay payment is captured");
  }
  if (order.orderStatus === "CANCELLED") {
    throw new AppError(409, "CONFLICT", "This order is cancelled");
  }
  try {
    return await prisma.order.update({
      where: { id },
      data: {
        meeshoOrderId,
        meeshoPlacedAt: new Date(),
        ...(order.orderStatus === "PENDING" ? { orderStatus: "PROCESSING" } : {}),
      },
      include: orderInclude,
    });
  } catch (error) {
    if (error?.code === "P2002") {
      throw new AppError(409, "CONFLICT", "That Meesho order ID is already saved on another order");
    }
    throw error;
  }
}

export async function updateFulfillment(prisma, id, orderStatus) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new AppError(404, "NOT_FOUND", "Order not found");
    if (order.orderStatus === orderStatus) return tx.order.findUnique({ where: { id }, include: orderInclude });

    const unpaid = order.paymentStatus !== "CAPTURED";
    if (order.orderStatus === "CANCELLED" && orderStatus !== "CANCELLED" && unpaid) {
      const sorted = [...order.items].sort((a, b) => String(a.productId).localeCompare(String(b.productId)));
      for (const item of sorted) {
        if (!item.productId) throw new AppError(409, "INSUFFICIENT_STOCK", "Stock can no longer be reserved for this order");
        await decrementStock(tx, item.productId, item.quantity);
      }
    }

    const updated = await tx.order.updateMany({
      where: { id, orderStatus: order.orderStatus, paymentStatus: order.paymentStatus },
      data: { orderStatus },
    });
    if (updated.count !== 1) throw new AppError(409, "CONFLICT", "The order changed while it was being updated");

    if (orderStatus === "CANCELLED" && order.orderStatus !== "CANCELLED" && unpaid) {
      await restoreStock(tx, order.items);
    }
    return tx.order.findUnique({ where: { id }, include: orderInclude });
  });
}

export async function releaseExpiredReservations(prisma, minutes) {
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);
  const orders = await prisma.order.findMany({
    where: {
      orderStatus: "PENDING",
      paymentStatus: "PENDING",
      createdAt: { lt: cutoff },
    },
    include: { items: true },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  let released = 0;
  for (const order of orders) {
    const didRelease = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.updateMany({
        where: { id: order.id, orderStatus: "PENDING", paymentStatus: "PENDING" },
        data: { orderStatus: "CANCELLED" },
      });
      if (updated.count !== 1) return false;
      await restoreStock(tx, order.items);
      return true;
    });
    if (didRelease) released += 1;
  }
  return released;
}

function resolveSize(product, requested) {
  const sizes = product.sizes || [];
  const raw = typeof requested === "string" ? requested.trim() : "";
  if (!sizes.length) {
    if (raw) throw new AppError(400, "VALIDATION_ERROR", `${product.name} does not have sizes`);
    return null;
  }
  const match = sizes.find((size) => size.toLowerCase() === raw.toLowerCase());
  if (!match) throw new AppError(400, "VALIDATION_ERROR", `Choose a size for ${product.name}`);
  return match;
}

export function normalizeAttribution(attribution, requestMeta = {}) {
  if (!attribution && !requestMeta.clientIp && !requestMeta.userAgent) return null;
  const clean = (value, max = 200) => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim().slice(0, max);
    return trimmed || null;
  };
  const data = {
    utmSource: clean(attribution?.utmSource),
    utmMedium: clean(attribution?.utmMedium),
    utmCampaign: clean(attribution?.utmCampaign),
    utmContent: clean(attribution?.utmContent),
    utmTerm: clean(attribution?.utmTerm),
    fbclid: clean(attribution?.fbclid),
    fbp: clean(attribution?.fbp),
    fbc: clean(attribution?.fbc),
    eventId: clean(attribution?.eventId, 80),
    landingPath: clean(attribution?.landingPath, 300),
    clientIp: clean(requestMeta.clientIp, 64),
    userAgent: clean(requestMeta.userAgent, 300),
  };
  if (Object.values(data).every((value) => !value)) return null;
  return data;
}
