import assert from "node:assert/strict";
import test from "node:test";
import { formatPaise, toPaise } from "../src/lib/money.js";
import { calculateTotals, effectivePricePaise, mergeItems } from "../src/lib/pricing.js";

const shipping = { shippingFeePaise: 7900n, freeShippingThresholdPaise: 99900n };

test("money converts rupees and paise without float drift", () => {
  assert.equal(toPaise("1290.50"), 129050n);
  assert.equal(toPaise("10.5"), 1050n);
  assert.equal(formatPaise(7900n), "79.00");
  assert.equal(formatPaise(0n), "0.00");
});

test("sale price is used only when it is lower than the regular price", () => {
  assert.equal(effectivePricePaise({ price: "1600.00", salePrice: "1290.00" }), 129000n);
  assert.equal(effectivePricePaise({ price: "1850.00", salePrice: null }), 185000n);
  assert.equal(effectivePricePaise({ price: "100.00", salePrice: "100.00" }), 10000n);
});

test("order totals are calculated on the server and shipping is free at the threshold", () => {
  const small = calculateTotals([{ unitPricePaise: 10000n, quantity: 1 }], shipping);
  assert.equal(small.subtotal, "100.00");
  assert.equal(small.shippingAmount, "79.00");
  assert.equal(small.total, "179.00");

  const test = calculateTotals([{ unitPricePaise: 100n, quantity: 1, product: { slug: "payment-test-1" } }], shipping);
  assert.equal(test.shippingAmount, "0.00");
  assert.equal(test.total, "1.00");

  const free = calculateTotals([{ unitPricePaise: 99900n, quantity: 1 }], shipping);
  assert.equal(free.shippingAmount, "0.00");
  assert.equal(free.total, "999.00");

  const merged = mergeItems([
    { productId: "a", quantity: 2 },
    { productId: "a", quantity: 3 },
    { productId: "b", quantity: 1 },
  ]);
  assert.deepEqual(merged, [
    { productId: "a", size: null, quantity: 5 },
    { productId: "b", size: null, quantity: 1 },
  ]);

  const sized = mergeItems([
    { productId: "a", size: "M", quantity: 1 },
    { productId: "a", size: " m ", quantity: 1 },
    { productId: "a", size: "L", quantity: 2 },
  ]);
  assert.deepEqual(sized, [
    { productId: "a", size: "M", quantity: 2 },
    { productId: "a", size: "L", quantity: 2 },
  ]);
});
