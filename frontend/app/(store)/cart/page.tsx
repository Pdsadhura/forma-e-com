"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { Container } from "@/components/Container";
import { apiFetch } from "@/lib/api";
import { cartReturnPath, useCart } from "@/lib/cart";
import { estimateTotal, formatInr } from "@/lib/format";
import { buttonClass, buttonSecondaryClass } from "@/lib/ui";
import type { Settings } from "@/lib/types";

export default function CartPage() {
  const router = useRouter();
  const cart = useCart();
  const [settings, setSettings] = useState<Settings | null>(null);
  const totals = useMemo(
    () => estimateTotal(cart.items.map((item) => ({ price: item.price, quantity: item.quantity, slug: item.slug })), settings),
    [cart.items, settings],
  );

  useEffect(() => {
    apiFetch<{ data: Settings }>("/api/settings").then((result) => setSettings(result.data)).catch(() => setSettings(null));
  }, []);

  function back() {
    const target = cartReturnPath();
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push(target);
  }

  if (!cart.ready) return <Container className="py-16 text-sm text-stone-600">Loading your cart…</Container>;

  return (
    <Container className="py-8">
      <BackButton fallback={cartReturnPath} />
      <h1 className="mt-3 text-3xl font-medium">Your cart</h1>
      {cart.items.length === 0 ? (
        <div className="mt-8 rounded-3xl bg-white p-6">
          <p className="text-sm leading-6 text-stone-600">Your cart is empty. Add a product, or use Buy now on a product page.</p>
          <Link href="/products" className={`${buttonClass} mt-6`}>Browse products</Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <ul className="space-y-4">
            {cart.items.map((item) => (
              <li key={`${item.productId}-${item.size || ""}`} className="flex gap-3 rounded-3xl bg-white p-3 sm:gap-4 sm:p-4">
                <Link href={`/products/${item.slug}`} className="h-24 w-20 shrink-0 overflow-hidden rounded-2xl bg-stone-200">
                  {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : null}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/products/${item.slug}`} className="min-w-0 break-words font-medium">{item.name}</Link>
                    <p className="shrink-0 text-sm font-medium">{formatInr(Number(item.price) * item.quantity)}</p>
                  </div>
                  {item.size ? <p className="mt-1 text-sm text-stone-500">Size {item.size}</p> : null}
                  <p className="mt-1 text-sm">{formatInr(item.price)}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <div className="flex items-center rounded-full border border-stone-300">
                      <button type="button" className="px-3 py-1" aria-label={`Decrease ${item.name}`} onClick={() => cart.updateQuantity(item.productId, item.quantity - 1, item.size)}>−</button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <button type="button" className="px-3 py-1" aria-label={`Increase ${item.name}`} disabled={item.quantity >= 10} onClick={() => cart.updateQuantity(item.productId, item.quantity + 1, item.size)}>+</button>
                    </div>
                    <button type="button" className="text-sm text-rose-800" onClick={() => cart.remove(item.productId, item.size)}>Remove</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <aside className="h-fit rounded-3xl bg-white p-5">
            <h2 className="font-medium">Summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatInr(totals.subtotal)}</dd></div>
              {totals.testOnly ? null : <div className="flex justify-between"><dt>Shipping</dt><dd>{totals.shipping === 0 ? "Free" : formatInr(totals.shipping)}</dd></div>}
              <div className="flex justify-between border-t border-stone-200 pt-2 font-medium"><dt>Total</dt><dd>{formatInr(totals.total)}</dd></div>
            </dl>
            <Link href="/checkout" className={`${buttonClass} mt-6 w-full`}>Continue to delivery</Link>
            <button type="button" className={`${buttonSecondaryClass} mt-3 w-full`} onClick={back}>Back</button>
          </aside>
        </div>
      )}
    </Container>
  );
}
