import { AppError } from "../lib/errors.js";
import { cleanSpecifications } from "../lib/listingParser.js";
import { formatPaise, toPaise } from "../lib/money.js";
import { slugify } from "../lib/orderNumber.js";

const orderInclude = { images: { orderBy: { sortOrder: "asc" } } };

export async function listProducts(prisma, { page, pageSize, skip, q, category, featured, includeInactive, sort }) {
  const where = {};
  if (!includeInactive) where.status = "ACTIVE";
  if (category) where.category = category;
  if (featured === true) where.featured = true;
  if (featured === false) where.featured = false;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      ...(includeInactive ? [
        { meeshoProductId: { contains: q, mode: "insensitive" } },
        { pid: { contains: q, mode: "insensitive" } },
      ] : []),
    ];
  }
  const orderBy = sort === "price_asc"
    ? { price: "asc" }
    : sort === "price_desc"
      ? { price: "desc" }
      : { createdAt: "desc" };

  const [total, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: orderInclude,
      orderBy,
      skip,
      take: pageSize,
    }),
  ]);
  return { products, total, page, pageSize };
}

export async function listCategories(prisma) {
  const rows = await prisma.product.groupBy({
    by: ["category"],
    where: { status: "ACTIVE", category: { not: null } },
    _count: { _all: true },
  });
  return rows
    .filter((row) => row.category)
    .map((row) => ({ name: row.category, count: row._count._all }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getPublicBySlug(prisma, slug) {
  const product = await prisma.product.findUnique({ where: { slug }, include: orderInclude });
  if (!product || product.status !== "ACTIVE") return null;
  return product;
}

export async function getById(prisma, id) {
  return prisma.product.findUnique({ where: { id }, include: orderInclude });
}

export async function createProduct(prisma, input) {
  const price = formatPaise(toPaise(input.price));
  const salePrice = input.salePrice == null || input.salePrice === "" ? null : formatPaise(toPaise(input.salePrice));
  const slug = await uniqueSlug(prisma, input.slug || slugify(input.name));
  return prisma.product.create({
    data: {
      name: input.name,
      slug,
      description: input.description,
      price,
      salePrice,
      stockQuantity: input.stockQuantity,
      status: input.status,
      category: input.category || null,
      featured: Boolean(input.featured),
      ...sourcingFields(input),
      images: {
        create: (input.images || []).map((image, index) => ({
          url: image.url,
          alt: image.alt || input.name,
          sortOrder: index,
        })),
      },
    },
    include: orderInclude,
  });
}

export async function updateProduct(prisma, id, input) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Product not found");
  const price = formatPaise(toPaise(input.price));
  const salePrice = input.salePrice == null || input.salePrice === "" ? null : formatPaise(toPaise(input.salePrice));
  const slug = await uniqueSlug(prisma, input.slug || existing.slug, id);
  return prisma.$transaction(async (tx) => {
    await tx.productImage.deleteMany({ where: { productId: id } });
    return tx.product.update({
      where: { id },
      data: {
        name: input.name,
        slug,
        description: input.description,
        price,
        salePrice,
        stockQuantity: input.stockQuantity,
        status: input.status,
        category: input.category || null,
        featured: Boolean(input.featured),
        ...sourcingFields(input),
        images: {
          create: (input.images || []).map((image, index) => ({
            url: image.url,
            alt: image.alt || input.name,
            sortOrder: index,
          })),
        },
      },
      include: orderInclude,
    });
  });
}

export async function deleteProduct(prisma, id) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Product not found");
  const references = await prisma.orderItem.count({ where: { productId: id } });
  if (references > 0) {
    const product = await prisma.product.update({
      where: { id },
      data: { status: "INACTIVE" },
      include: orderInclude,
    });
    return { product, deactivated: true };
  }
  await prisma.product.delete({ where: { id } });
  return { deleted: true };
}

function sourcingFields(input) {
  const meeshoPrice = input.meeshoPrice == null || input.meeshoPrice === ""
    ? null
    : formatPaise(toPaise(input.meeshoPrice));
  return {
    meeshoProductId: input.meeshoProductId || null,
    pid: input.pid || null,
    meeshoUrl: input.meeshoUrl || null,
    meeshoPrice,
    sizes: cleanSizes(input.sizes),
    specifications: cleanSpecifications(input.specifications),
  };
}

function cleanSizes(sizes) {
  const seen = new Set();
  const result = [];
  for (const size of sizes || []) {
    const value = String(size).trim().replace(/\s+/g, " ").slice(0, 40);
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

async function uniqueSlug(prisma, base, ignoreId) {
  let slug = base;
  let suffix = 2;
  while (slug.length > 80) slug = slug.slice(0, 80).replace(/-+$/g, "");
  while (true) {
    const found = await prisma.product.findUnique({ where: { slug } });
    if (!found || found.id === ignoreId) return slug;
    const next = `${base}-${suffix++}`;
    slug = next.slice(0, 80).replace(/-+$/g, "");
  }
}
