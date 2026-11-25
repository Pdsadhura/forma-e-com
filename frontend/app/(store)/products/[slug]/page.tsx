import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { Container } from "@/components/Container";
import { Gallery } from "@/components/Gallery";
import { PurchasePanel } from "@/components/PurchasePanel";
import { serverGet } from "@/lib/api";
import type { Product } from "@/lib/types";

async function loadProduct(slug: string) {
  return serverGet<{ data: Product }>(`/api/products/${encodeURIComponent(slug)}`);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadProduct(slug);
  if (!result?.data) return { title: "Product" };
  return {
    title: result.data.name,
    description: result.data.description.slice(0, 160),
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await loadProduct(slug);
  if (!result?.data) notFound();
  const product = result.data;
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.id,
    image: product.images.map((image) => image.url),
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: product.effectivePrice,
      availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  }).replace(/</g, "\\u003c");

  const backTo = product.category ? `/products?category=${encodeURIComponent(product.category)}` : "/products";

  return (
    <Container className="py-8 lg:py-12">
      <BackButton fallback={backTo} />
      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
        <Gallery images={product.images} name={product.name} />
        <PurchasePanel product={product} />
      </div>
    </Container>
  );
}
