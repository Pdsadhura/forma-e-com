import Link from "next/link";
import { Price } from "./Price";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const image = product.images[0];
  return (
    <Link href={`/products/${product.slug}`} className="group block w-full min-w-0 overflow-hidden">
      <div className="aspect-square overflow-hidden rounded-2xl bg-stone-200 sm:aspect-[4/5] sm:rounded-3xl">
        {image ? (
          <img
            src={image.url}
            alt={image.alt || product.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-stone-500">No image</div>
        )}
      </div>
      <div className="mt-2 min-w-0 sm:mt-3">
        <h2 className="line-clamp-2 break-words text-sm font-medium leading-5 text-stone-950">{product.name}</h2>
        <p className="mt-1 text-xs text-stone-500">{product.inStock ? "In stock" : "Out of stock"}</p>
        <Price price={product.price} salePrice={product.salePrice} stacked className="mt-1 text-sm" />
      </div>
    </Link>
  );
}
