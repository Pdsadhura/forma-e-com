import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { createOrder } from "../src/services/orderService.js";

const shipping = { shippingFeePaise: 7900n, freeShippingThresholdPaise: 99900n };
const databaseUrl = process.env.DATABASE_URL;

async function cleanup(prisma, productId, emails) {
  const orders = await prisma.order.findMany({
    where: { customer: { email: { in: emails } } },
    select: { id: true, customerId: true, addressId: true },
  });
  const orderIds = orders.map((order) => order.id);
  if (orderIds.length) await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.address.deleteMany({ where: { customer: { email: { in: emails } } } });
  await prisma.customer.deleteMany({ where: { email: { in: emails } } });
  if (productId) await prisma.product.deleteMany({ where: { id: productId } });
}

test("database order creation snapshots price, charges shipping, and cannot oversell", { skip: !databaseUrl }, async () => {
  const prisma = new PrismaClient();
  const stamp = Date.now();
  const emails = [`a-${stamp}@forma.test`, `b-${stamp}@forma.test`];
  let productId;
  try {
    const product = await prisma.product.create({
      data: {
        name: "Concurrency Lamp",
        slug: `concurrency-lamp-${stamp}`,
        description: "Stock test product",
        price: "500.00",
        salePrice: "450.00",
        stockQuantity: 1,
        status: "ACTIVE",
        category: "Test",
      },
    });
    productId = product.id;
    const input = (email) => ({
      customer: { name: "Test Buyer", email, phone: "9876543210" },
      address: {
        house: "1",
        street: "Test Street",
        locality: "Test Locality",
        city: "Pune",
        state: "Maharashtra",
        pincode: "411001",
      },
      items: [{ productId, quantity: 1 }],
      attribution: { utmSource: "instagram", utmCampaign: "test-campaign", fbclid: "fb-test" },
    });

    const results = await Promise.allSettled([
      createOrder(prisma, input(emails[0]), shipping, { clientIp: "127.0.0.1", userAgent: "test" }),
      createOrder(prisma, input(emails[1]), shipping, { clientIp: "127.0.0.1", userAgent: "test" }),
    ]);
    const fulfilled = results.filter((result) => result.status === "fulfilled");
    assert.equal(fulfilled.length, 1);
    assert.equal(results.filter((result) => result.status === "rejected").length, 1);

    const order = fulfilled[0].value;
    assert.equal(order.items[0].unitPrice.toFixed(2), "450.00");
    assert.equal(order.items[0].productName, "Concurrency Lamp");
    assert.equal(order.subtotal.toFixed(2), "450.00");
    assert.equal(order.shippingAmount.toFixed(2), "79.00");
    assert.equal(order.total.toFixed(2), "529.00");
    assert.equal(order.attribution.utmCampaign, "test-campaign");
    assert.equal(order.attribution.fbclid, "fb-test");

    await prisma.product.update({ where: { id: productId }, data: { price: "999.00", salePrice: "100.00" } });
    const reread = await prisma.orderItem.findFirst({ where: { orderId: order.id } });
    assert.equal(reread.unitPrice.toFixed(2), "450.00");

    const fresh = await prisma.product.findUnique({ where: { id: productId } });
    assert.equal(fresh.stockQuantity, 0);
  } finally {
    await cleanup(prisma, productId, emails);
    await prisma.$disconnect();
  }
});
