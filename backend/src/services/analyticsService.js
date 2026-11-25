import { money } from "../lib/dto.js";
import { istDay } from "../lib/pagination.js";

export async function dashboardSummary(prisma) {
  const [totalOrders, paidOrders, pendingOrders, products, revenue] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { paymentStatus: "CAPTURED" } }),
    prisma.order.count({ where: { paymentStatus: "PENDING", orderStatus: "PENDING" } }),
    prisma.product.count(),
    prisma.order.aggregate({
      where: { paymentStatus: "CAPTURED" },
      _sum: { total: true },
    }),
  ]);
  return {
    totalOrders,
    paidOrders,
    pendingOrders,
    products,
    revenue: revenue._sum.total ? money(revenue._sum.total) : "0.00",
  };
}

export async function salesAnalytics(prisma, { from, to }) {
  const orders = await prisma.order.findMany({
    where: { paymentStatus: "CAPTURED", createdAt: { gte: from, lte: to } },
    select: {
      total: true,
      createdAt: true,
      attribution: { select: { utmSource: true, utmMedium: true, utmCampaign: true } },
      items: { select: { productName: true, quantity: true, lineTotal: true, productId: true } },
    },
  });

  const byDay = new Map();
  const campaigns = new Map();
  const products = new Map();
  let revenuePaise = 0n;

  for (const order of orders) {
    const total = money(order.total);
    revenuePaise += BigInt(total.replace(".", ""));
    const day = istDay(order.createdAt);
    const dayRow = byDay.get(day) || { date: day, orders: 0, revenuePaise: 0n };
    dayRow.orders += 1;
    dayRow.revenuePaise += BigInt(total.replace(".", ""));
    byDay.set(day, dayRow);

    const campaignName = order.attribution?.utmCampaign || "(direct)";
    const source = order.attribution?.utmSource || "(direct)";
    const key = `${source}::${campaignName}`;
    const campaign = campaigns.get(key) || {
      source,
      medium: order.attribution?.utmMedium || null,
      campaign: campaignName,
      orders: 0,
      revenuePaise: 0n,
    };
    campaign.orders += 1;
    campaign.revenuePaise += BigInt(total.replace(".", ""));
    campaigns.set(key, campaign);

    for (const item of order.items) {
      const product = products.get(item.productName) || { name: item.productName, quantity: 0, revenuePaise: 0n };
      product.quantity += item.quantity;
      product.revenuePaise += BigInt(money(item.lineTotal).replace(".", ""));
      products.set(item.productName, product);
    }
  }

  const statusGroups = await prisma.order.groupBy({
    by: ["orderStatus"],
    where: { createdAt: { gte: from, lte: to } },
    _count: { _all: true },
  });

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    paidOrders: orders.length,
    revenue: formatPaiseDigits(revenuePaise),
    revenueByDay: [...byDay.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((row) => ({ date: row.date, orders: row.orders, revenue: formatPaiseDigits(row.revenuePaise) })),
    campaigns: [...campaigns.values()]
      .map((row) => ({
        source: row.source,
        medium: row.medium,
        campaign: row.campaign,
        orders: row.orders,
        revenue: formatPaiseDigits(row.revenuePaise),
      }))
      .sort((a, b) => Number(b.revenue) - Number(a.revenue)),
    topProducts: [...products.values()]
      .map((row) => ({ name: row.name, quantity: row.quantity, revenue: formatPaiseDigits(row.revenuePaise) }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8),
    ordersByStatus: statusGroups.map((row) => ({ status: row.orderStatus, count: row._count._all })),
  };
}

function formatPaiseDigits(digits) {
  const whole = digits / 100n;
  const fraction = (digits % 100n).toString().padStart(2, "0");
  return `${whole.toString()}.${fraction}`;
}

export async function listCustomers(prisma, { skip, pageSize, q }) {
  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q.replace(/\D/g, "") || q } },
        ],
      }
    : {};
  const [total, customers] = await prisma.$transaction([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      include: { _count: { select: { orders: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
  ]);
  return {
    total,
    customers: customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      orders: customer._count.orders,
      createdAt: customer.createdAt.toISOString(),
    })),
  };
}

export async function getCustomer(prisma, id) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        include: { items: true },
      },
    },
  });
  if (!customer) return null;
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    createdAt: customer.createdAt.toISOString(),
    orders: customer.orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      total: money(order.total),
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        productName: item.productName,
        size: item.size || null,
        quantity: item.quantity,
        lineTotal: money(item.lineTotal),
      })),
    })),
  };
}

export async function listPayments(prisma, { skip, pageSize, status }) {
  const where = status ? { status } : {};
  const [total, payments] = await prisma.$transaction([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      include: { order: { select: { orderNumber: true, id: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
  ]);
  return {
    total,
    payments: payments.map((payment) => ({
      id: payment.id,
      orderId: payment.order.id,
      orderNumber: payment.order.orderNumber,
      razorpayOrderId: payment.razorpayOrderId,
      razorpayPaymentId: payment.razorpayPaymentId,
      amount: money(payment.amount),
      currency: payment.currency,
      method: payment.method,
      status: payment.status,
      createdAt: payment.createdAt.toISOString(),
    })),
  };
}
