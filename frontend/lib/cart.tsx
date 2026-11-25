"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  price: string;
  image?: string;
  size?: string;
  quantity: number;
};

function lineKey(item: { productId: string; size?: string | null }) {
  return `${item.productId}::${item.size || ""}`;
}

type CartContextValue = {
  items: CartItem[];
  count: number;
  ready: boolean;
  addItem: (item: CartItem, mode?: "add" | "buy") => void;
  updateQuantity: (productId: string, quantity: number, size?: string) => void;
  remove: (productId: string, size?: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const KEY = "forma_cart";
const RETURN_KEY = "forma_cart_return";

export function rememberCartReturn() {
  const path = `${window.location.pathname}${window.location.search}`;
  if (path.startsWith("/cart") || path.startsWith("/checkout")) return;
  window.sessionStorage.setItem(RETURN_KEY, path);
}

export function cartReturnPath() {
  const stored = window.sessionStorage.getItem(RETURN_KEY);
  if (stored && !stored.startsWith("/cart") && !stored.startsWith("/checkout")) return stored;
  return "/products";
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as CartItem[];
        if (Array.isArray(parsed)) setItems(parsed);
      } catch {
        window.localStorage.removeItem(KEY);
      }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, ready]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    ready,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    addItem(item, mode = "add") {
      setItems((current) => {
        if (mode === "buy") return [{ ...item, quantity: Math.min(10, item.quantity) }];
        const existing = current.find((entry) => lineKey(entry) === lineKey(item));
        if (!existing) return [...current, item];
        return current.map((entry) => (
          lineKey(entry) === lineKey(item)
            ? { ...entry, quantity: Math.min(10, entry.quantity + item.quantity), price: item.price }
            : entry
        ));
      });
    },
    updateQuantity(productId, quantity, size) {
      setItems((current) => current.map((item) => (
        lineKey(item) === lineKey({ productId, size })
          ? { ...item, quantity: Math.max(1, Math.min(10, quantity)) }
          : item
      )));
    },
    remove(productId, size) {
      setItems((current) => current.filter((item) => lineKey(item) !== lineKey({ productId, size })));
    },
    clear() {
      setItems([]);
    },
  }), [items, ready]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
