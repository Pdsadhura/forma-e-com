import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const products = [
  {
    name: "Arc Ceramic Table Lamp",
    slug: "arc-ceramic-table-lamp",
    description: "A low, wide ceramic lamp with a linen shade. It throws a warm pool of light for side tables and late reading.",
    price: "4200.00",
    salePrice: "3590.00",
    stockQuantity: 12,
    category: "Lighting",
    featured: true,
    images: [
      ["https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1400&q=80", "Ceramic table lamp with a linen shade"],
      ["https://images.unsplash.com/photo-1540932239986-30128078f3c5?auto=format&fit=crop&w=1400&q=80", "Warm lamp light on a side table"],
    ],
  },
  {
    name: "Stonewashed Linen Throw",
    slug: "stonewashed-linen-throw",
    description: "A heavy stonewashed linen throw in oat. It softens with every wash and works on a bed or the back of a sofa.",
    price: "2800.00",
    salePrice: "2490.00",
    stockQuantity: 20,
    category: "Textiles",
    featured: true,
    images: [
      ["https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1400&q=80", "Linen throw in a quiet living room"],
    ],
  },
  {
    name: "River Clay Pour-Over Set",
    slug: "river-clay-pour-over-set",
    description: "A hand-thrown pour-over dripper and cup in speckled clay. Each piece is slightly different, finished for everyday coffee.",
    price: "1850.00",
    salePrice: null,
    stockQuantity: 15,
    category: "Tableware",
    featured: true,
    images: [
      ["https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1400&q=80", "Pour-over coffee on a wooden table"],
      ["https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1400&q=80", "Coffee cup beside a window"],
    ],
  },
  {
    name: "Brass Incense Boat",
    slug: "brass-incense-boat",
    description: "A small cast-brass holder for sticks and cones. The patina deepens with use and the base catches ash.",
    price: "890.00",
    salePrice: "740.00",
    stockQuantity: 30,
    category: "Fragrance",
    featured: false,
    images: [
      ["https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=1400&q=80", "Brass object in warm light"],
    ],
  },
  {
    name: "Oak Serving Board",
    slug: "oak-serving-board",
    description: "A long oak board with a shallow juice groove. Use it for bread, fruit, or cheese, then oil it once a season.",
    price: "2200.00",
    salePrice: null,
    stockQuantity: 10,
    category: "Tableware",
    featured: false,
    images: [
      ["https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=1400&q=80", "Wooden serving board with bread"],
    ],
  },
  {
    name: "Wool Cushion Cover",
    slug: "wool-cushion-cover",
    description: "A 50 centimetre wool cover in moss green with a hidden zip. The weave is tight enough for daily use.",
    price: "1600.00",
    salePrice: "1290.00",
    stockQuantity: 18,
    category: "Textiles",
    featured: false,
    images: [
      ["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1400&q=80", "Cushion on a low sofa"],
    ],
  },
];

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@forma.local").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "";
  const name = process.env.SEED_ADMIN_NAME || "Store Admin";
  if (password.length < 10) {
    throw new Error("Set SEED_ADMIN_PASSWORD to at least 10 characters before seeding.");
  }
  if (process.env.NODE_ENV === "production" && password === "ChangeMe-Admin-123") {
    throw new Error("Replace SEED_ADMIN_PASSWORD before seeding production.");
  }

  const existingAdmin = await prisma.user.findUnique({ where: { email } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email,
        name,
        role: "ADMIN",
        passwordHash: await bcrypt.hash(password, 12),
      },
    });
    console.log(`Created admin ${email}`);
  } else {
    console.log(`Admin ${email} already exists; password was left unchanged`);
  }

  for (const product of products) {
    const found = await prisma.product.findUnique({ where: { slug: product.slug } });
    if (found) {
      console.log(`Product ${product.slug} already exists`);
      continue;
    }
    await prisma.product.create({
      data: {
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        salePrice: product.salePrice,
        stockQuantity: product.stockQuantity,
        status: "ACTIVE",
        category: product.category,
        featured: product.featured,
        images: {
          create: product.images.map(([url, alt], index) => ({ url, alt, sortOrder: index })),
        },
      },
    });
    console.log(`Created product ${product.slug}`);
  }
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
