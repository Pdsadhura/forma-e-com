"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/ui";

const links = [
  ["Overview", "/admin"],
  ["Products", "/admin/products"],
  ["Orders", "/admin/orders"],
  ["Customers", "/admin/customers"],
  ["Payments", "/admin/payments"],
  ["Analytics", "/admin/analytics"],
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    apiFetch("/api/admin/dashboard")
      .then(() => setReady(true))
      .catch(() => router.replace("/admin/login"));
  }, [router]);

  async function logout() {
    await apiFetch("/api/admin/auth/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  if (!ready) return <p className="p-8 text-sm text-stone-600">Checking admin session…</p>;

  return (
    <div className="min-h-screen bg-stone-100">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-4 lg:grid-cols-[200px_1fr]">
        <aside className="flex flex-wrap gap-2 lg:flex-col">
          <p className="hidden px-3 text-sm font-semibold text-stone-950 lg:block">Forma admin</p>
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-full px-3 py-2 text-sm",
                (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href))
                  ? "bg-emerald-950 text-white"
                  : "bg-white text-stone-700",
              )}
            >
              {label}
            </Link>
          ))}
          <button type="button" onClick={logout} className="rounded-full px-3 py-2 text-left text-sm text-stone-500">Sign out</button>
        </aside>
        <div>{children}</div>
      </div>
    </div>
  );
}
