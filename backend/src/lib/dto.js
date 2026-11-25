import { cleanSpecifications } from "./listingParser.js";
import { formatPaise, toPaise } from "./money.js";
import { effectivePricePaise } from "./pricing.js";

export function marginMoney(unitPrice, supplierPrice) {
  if (supplierPrice == null || supplierPrice === "") return null;
  return formatPaise(toPaise(unitPrice) - toPaise(supplierPrice));
}

export function money(value) {
  return formatPaise(toPaise(value));
}

export function productDto(product, { includeStatus = true, includeSourcing = false } = {}) {
  const price = money(product.price);
  const effective = formatPaise(effectivePricePaise(product));
  const sale = product.salePrice == null ? null : money(product.salePrice);
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price,
    salePrice: sale && sale !== price && toPaise(sale) < toPaise(price) ? sale : null,
    effectivePrice: effective,
    stockQuantity: product.stockQuantity,
    inStock: product.status === "ACTIVE" && product.stockQuantity > 0,
    ...(includeStatus ? { status: product.status, featured: product.featured } : { featured: product.featured }),
    category: product.category,
    sizes: product.sizes || [],
    specifications: cleanSpecifications(product.specifications),
    ...(includeSourcing ? {
      meeshoProductId: product.meeshoProductId || null,
      pid: product.pid || null,
      meeshoUrl: product.meeshoUrl || null,
      meeshoPrice: product.meeshoPrice == null ? null : money(product.meeshoPrice),
    } : {}),
    images: [...(product.images || [])]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((image) => ({
        id: image.id,
        url: image.url,
        alt: image.alt,
        sortOrder: image.sortOrder,
      })),
  };
}

export function publicOrderDto(order) {
  return {
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    currency: order.currency,
    subtotal: money(order.subtotal),
    shippingAmount: money(order.shippingAmount),
    total: money(order.total),
    items: order.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      size: item.size || null,
      specifications: cleanSpecifications(item.specifications),
      quantity: item.quantity,
      unitPrice: money(item.unitPrice),
      lineTotal: money(item.lineTotal),
    })),
    address: {
      house: order.address.house,
      street: order.address.street,
      locality: order.address.locality,
      city: order.address.city,
      state: order.address.state,
      pincode: order.address.pincode,
      landmark: order.address.landmark,
      country: order.address.country,
    },
    createdAt: order.createdAt.toISOString(),
  };
}

export function adminOrderDto(order) {
  return {
    ...publicOrderDto(order),
    id: order.id,
    meeshoOrderId: order.meeshoOrderId || null,
    meeshoPlacedAt: order.meeshoPlacedAt?.toISOString() ?? null,
    items: order.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      size: item.size || null,
      specifications: cleanSpecifications(item.specifications),
      quantity: item.quantity,
      unitPrice: money(item.unitPrice),
      lineTotal: money(item.lineTotal),
      meeshoProductId: item.meeshoProductId || null,
      pid: item.pid || null,
      meeshoUrl: item.meeshoUrl || null,
      meeshoPrice: item.meeshoPrice == null ? null : money(item.meeshoPrice),
      margin: marginMoney(item.unitPrice, item.meeshoPrice),
    })),
    customer: {
      id: order.customer.id,
      name: order.customer.name,
      email: order.customer.email,
      phone: order.customer.phone,
    },
    payments: (order.payments || []).map((payment) => ({
      id: payment.id,
      razorpayOrderId: payment.razorpayOrderId,
      razorpayPaymentId: payment.razorpayPaymentId,
      amount: money(payment.amount),
      currency: payment.currency,
      method: payment.method,
      status: payment.status,
      createdAt: payment.createdAt.toISOString(),
    })),
    attribution: order.attribution
      ? {
          utmSource: order.attribution.utmSource,
          utmMedium: order.attribution.utmMedium,
          utmCampaign: order.attribution.utmCampaign,
          utmContent: order.attribution.utmContent,
          utmTerm: order.attribution.utmTerm,
          fbclid: order.attribution.fbclid,
          eventId: order.attribution.eventId,
          landingPath: order.attribution.landingPath,
          capturedAt: order.attribution.capturedAt.toISOString(),
        }
      : null,
    customerEmailSentAt: order.customerEmailSentAt?.toISOString() ?? null,
    ownerEmailSentAt: order.ownerEmailSentAt?.toISOString() ?? null,
    updatedAt: order.updatedAt.toISOString(),
  };
}
