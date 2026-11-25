import { formatPaise, toPaise } from "./money.js";

export function effectivePricePaise(product) {
  const price = toPaise(product.price);
  if (product.salePrice != null && product.salePrice !== "") {
    const sale = toPaise(product.salePrice);
    if (sale > 0n && sale < price) return sale;
  }
  return price;
}

export function calculateTotals(lines, config) {
  let subtotal = 0n;
  for (const line of lines) {
    subtotal += line.unitPricePaise * BigInt(line.quantity);
  }
  const testOnly = lines.length > 0 && lines.every((line) => line.product?.slug === "payment-test-1");
  const shipping = testOnly || subtotal === 0n || subtotal >= config.freeShippingThresholdPaise
    ? 0n
    : config.shippingFeePaise;
  return {
    subtotalPaise: subtotal,
    shippingPaise: shipping,
    totalPaise: subtotal + shipping,
    subtotal: formatPaise(subtotal),
    shippingAmount: formatPaise(shipping),
    total: formatPaise(subtotal + shipping),
  };
}

export function mergeItems(items) {
  const quantities = new Map();
  for (const item of items) {
    const size = typeof item.size === "string" ? item.size.trim() : "";
    const key = `${item.productId}\u0000${size.toLowerCase()}`;
    const current = quantities.get(key) || { productId: item.productId, size: size || null, quantity: 0 };
    current.quantity += item.quantity;
    quantities.set(key, current);
  }
  return [...quantities.values()];
}
