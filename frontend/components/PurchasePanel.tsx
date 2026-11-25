"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Price } from "./Price";
import { rememberCartReturn, useCart } from "@/lib/cart";
import { productEvent, trackMeta } from "@/lib/meta";
import { buttonClass, buttonSecondaryClass } from "@/lib/ui";
import type { Product } from "@/lib/types";

export function PurchasePanel({ product }: { product: Product }) {
  const router = useRouter();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState("");
  const [message, setMessage] = useState("");
  const sizes = product.sizes || [];
  const needsSize = sizes.length > 0;
  const max = Math.min(10, product.stockQuantity);

  useEffect(() => {
    trackMeta("ViewContent", productEvent(product));
  }, [product]);

  function item() {
    return {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.effectivePrice,
      image: product.images[0]?.url,
      size: needsSize ? size : undefined,
      quantity,
    };
  }

  function openCart() {
    rememberCartReturn();
    router.push("/cart");
  }

  function add() {
    if (needsSize && !size) {
      setMessage("Choose a size");
      return;
    }
    addItem(item(), "add");
    trackMeta("AddToCart", { ...productEvent(product), quantity });
    openCart();
  }

  function buy() {
    if (needsSize && !size) {
      setMessage("Choose a size");
      return;
    }
    addItem(item(), "buy");
    trackMeta("AddToCart", { ...productEvent(product), quantity });
    openCart();
  }

  return (
    <div className="pb-24 sm:pb-0">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-900">{product.category}</p>
      <h1 className="mt-2 break-words text-3xl font-medium tracking-tight text-stone-950 sm:text-4xl">{product.name}</h1>
      <Price price={product.price} salePrice={product.salePrice} className="mt-4 text-lg" />
      <p className="mt-3 text-sm text-stone-600">
        {product.inStock ? `${product.stockQuantity} in stock` : "Out of stock"}
      </p>
      <p className="mt-6 max-w-prose leading-7 text-stone-700">{product.description}</p>
      {product.specifications?.length ? (
        <dl className="mt-6 divide-y divide-stone-200 border-y border-stone-200 text-sm">
          {product.specifications.map((spec) => (
            <div key={spec.label} className="flex items-start justify-between gap-4 py-2">
              <dt className="min-w-0 text-stone-500">{spec.label}</dt>
              <dd className="min-w-0 max-w-[60%] break-words text-right font-medium text-stone-950">{spec.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {needsSize ? (
        <div className="mt-6">
          <p className="text-sm font-medium">Size</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {sizes.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => { setSize(option); setMessage(""); }}
                className={size === option
                  ? "rounded-full bg-emerald-950 px-4 py-2 text-sm text-white"
                  : "rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-900"}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="mt-6 flex items-center gap-3">
        <label htmlFor="quantity" className="text-sm font-medium">Quantity</label>
        <div className="flex items-center rounded-full border border-stone-300">
          <button type="button" className="px-3 py-2" onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={!product.inStock} aria-label="Decrease quantity">−</button>
          <input
            id="quantity"
            value={quantity}
            onChange={(event) => setQuantity(Math.max(1, Math.min(max || 1, Number(event.target.value) || 1)))}
            className="w-12 bg-transparent text-center text-base outline-none"
            inputMode="numeric"
          />
          <button type="button" className="px-3 py-2" onClick={() => setQuantity((value) => Math.min(max, value + 1))} disabled={!product.inStock || quantity >= max} aria-label="Increase quantity">+</button>
        </div>
      </div>
      <div className="mt-6 hidden gap-3 sm:flex">
        <button type="button" className={buttonClass} onClick={buy} disabled={!product.inStock || (needsSize && !size)}>Buy now</button>
        <button type="button" className={buttonSecondaryClass} onClick={add} disabled={!product.inStock || (needsSize && !size)}>Add to cart</button>
      </div>
      {message ? <p className="mt-3 text-sm text-emerald-900">{message}</p> : null}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white p-3 sm:hidden">
        <div className="mx-auto flex max-w-6xl gap-2">
          <button type="button" className={`${buttonSecondaryClass} px-4`} onClick={add} disabled={!product.inStock || (needsSize && !size)}>Add</button>
          <button type="button" className={`${buttonClass} flex-1`} onClick={buy} disabled={!product.inStock || (needsSize && !size)}>Buy now</button>
        </div>
      </div>
    </div>
  );
}
