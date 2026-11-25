"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Container } from "./Container";
import { rememberCartReturn, useCart } from "@/lib/cart";
import { STORE_NAME } from "@/lib/types";
import { cn } from "@/lib/ui";

type IconName = "home" | "shop" | "about" | "privacy" | "terms" | "shipping" | "refunds" | "cart" | "menu" | "close";

const links: Array<{ href: string; label: string; icon: IconName; match: "exact" | "shop" }> = [
  { href: "/", label: "Home", icon: "home", match: "exact" },
  { href: "/products", label: "Shop", icon: "shop", match: "shop" },
  { href: "/about", label: "About", icon: "about", match: "exact" },
  { href: "/privacy", label: "Privacy", icon: "privacy", match: "exact" },
  { href: "/terms", label: "Terms", icon: "terms", match: "exact" },
  { href: "/shipping", label: "Shipping", icon: "shipping", match: "exact" },
  { href: "/refunds", label: "Refunds", icon: "refunds", match: "exact" },
];

function NavGlyph({ name }: { name: IconName }) {
  const common = { viewBox: "0 0 24 24", "aria-hidden": true as const, className: "h-4 w-4 shrink-0" };
  if (name === "home") {
    return (
      <svg {...common}>
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "shop") {
    return (
      <svg {...common}>
        <path d="M4 8h16l-1.2 11.2a1 1 0 0 1-1 .8H6.2a1 1 0 0 1-1-.8zM8 8V6.5A4 4 0 0 1 12 2.5 4 4 0 0 1 16 6.5V8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "about") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.75" />
        <path d="M12 11v5M12 8h.01" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "privacy") {
    return (
      <svg {...common}>
        <path d="M12 3 5 6v6c0 4.2 2.8 7.2 7 8.5 4.2-1.3 7-4.3 7-8.5V6z" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "terms") {
    return (
      <svg {...common}>
        <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        <path d="M14 3.5V8h4.5M9 12h6M9 16h6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "shipping") {
    return (
      <svg {...common}>
        <path d="M3 7h11v10H3zM14 10h4l3 3v4h-7z" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        <circle cx="7" cy="18" r="1.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
        <circle cx="17" cy="18" r="1.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      </svg>
    );
  }
  if (name === "refunds") {
    return (
      <svg {...common}>
        <path d="M8 8H5V5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.5 13a7 7 0 1 0 1.2-5.2L5 8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "menu") {
    return (
      <svg {...common}>
        <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "close") {
    return (
      <svg {...common}>
        <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M6 7h12l-1 12H7zM9 7a3 3 0 0 1 6 0" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function isCurrent(pathname: string, href: string, match: "exact" | "shop") {
  if (match === "shop") return pathname === "/products" || pathname.startsWith("/products/");
  return pathname === href;
}

export function SiteHeader() {
  const { count } = useCart();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const cartCurrent = pathname === "/cart";

  function itemClass(current: boolean, block = false) {
    return cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm",
      block && "w-full justify-start px-3 py-2",
      current ? "bg-emerald-950 text-white" : "text-stone-700 hover:bg-stone-200/80 hover:text-stone-950",
    );
  }

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-stone-50/95 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-3">
        <Link href="/" className="shrink-0 text-lg font-semibold tracking-tight text-stone-950">{STORE_NAME}</Link>
        <nav className="hidden min-w-0 items-center gap-0.5 lg:flex" aria-label="Store">
          {links.map((item) => {
            const current = isCurrent(pathname, item.href, item.match);
            return (
              <Link key={item.href} href={item.href} aria-current={current ? "page" : undefined} className={itemClass(current)}>
                <NavGlyph name={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/cart"
            aria-current={cartCurrent ? "page" : undefined}
            className={itemClass(cartCurrent)}
            onClick={rememberCartReturn}
          >
            <NavGlyph name="cart" />
            <span className="hidden sm:inline">Cart</span>
            <span>({count})</span>
          </Link>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 px-3 py-1.5 text-sm font-medium lg:hidden"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <NavGlyph name={open ? "close" : "menu"} />
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </Container>
      {open ? (
        <Container className="pb-4 lg:hidden">
          <nav className="flex flex-col gap-1" aria-label="Store">
            {links.map((item) => {
              const current = isCurrent(pathname, item.href, item.match);
              return (
                <Link key={item.href} href={item.href} aria-current={current ? "page" : undefined} className={itemClass(current, true)} onClick={() => setOpen(false)}>
                  <NavGlyph name={item.icon} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </Container>
      ) : null}
    </header>
  );
}
