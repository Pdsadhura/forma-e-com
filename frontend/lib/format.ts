export function formatInr(value: string | number) {
  const amount = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function estimateTotal(
  items: Array<{ price: string; quantity: number; slug?: string }>,
  settings?: { shippingFee: string; freeShippingThreshold: string } | null,
) {
  const subtotal = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const threshold = Number(settings?.freeShippingThreshold ?? 999);
  const fee = Number(settings?.shippingFee ?? 79);
  const testOnly = items.length > 0 && items.every((item) => item.slug === "payment-test-1");
  const shipping = testOnly || subtotal === 0 || subtotal >= threshold ? 0 : fee;
  return { subtotal, shipping, total: subtotal + shipping, threshold, testOnly };
}
