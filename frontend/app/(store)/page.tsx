import Link from "next/link";
import { Container } from "@/components/Container";
import { ProductCard } from "@/components/ProductCard";
import { serif } from "@/lib/fonts";
import { serverGet } from "@/lib/api";
import { buttonClass, buttonSecondaryClass } from "@/lib/ui";
import type { Category, Product } from "@/lib/types";

export default async function HomePage() {
  const [featured, categories] = await Promise.all([
    serverGet<{ data: Product[] }>("/api/products?featured=true&pageSize=8"),
    serverGet<{ data: Category[] }>("/api/products/categories"),
  ]);
  const products = featured?.data || [];
  const lead = products[0];

  return (
    <>
      <p className="bg-emerald-950 px-4 py-2 text-center text-xs text-emerald-50">Free shipping on orders over ₹999</p>
      <Container className="grid gap-8 py-8 sm:gap-10 sm:py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-16">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-900 sm:tracking-[0.22em]">Made for daily use</p>
          <h1 className={`${serif.className} mt-3 max-w-xl text-4xl leading-tight text-stone-950 sm:text-6xl`}>Objects for a quieter home.</h1>
          <p className="mt-4 max-w-md text-base leading-7 text-stone-600 sm:mt-5">
            Lamps, linen, and tableware chosen for the rooms you actually live in. Pay securely with Razorpay. We deliver across India.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center">
            <Link href="/products" className={`${buttonClass} w-full sm:w-auto`}>Shop the collection</Link>
            {lead ? (
              <Link href={`/products/${lead.slug}`} className={`${buttonSecondaryClass} w-full sm:w-auto`}>
                View featured
              </Link>
            ) : null}
          </div>
          {lead ? (
            <Link href={`/products/${lead.slug}`} className="mt-4 block max-w-md text-sm leading-6 text-stone-500 underline-offset-4 hover:text-stone-950 hover:underline">
              {lead.name}
            </Link>
          ) : null}
        </div>
        {lead?.images[0] ? (
          <Link href={`/products/${lead.slug}`} className="block min-w-0 overflow-hidden rounded-3xl bg-stone-200 lg:rounded-[2rem]">
            <img src={lead.images[0].url} alt={lead.images[0].alt || lead.name} className="aspect-[5/4] w-full object-cover sm:aspect-square" />
          </Link>
        ) : (
          <div className="flex aspect-square items-center justify-center rounded-[2rem] bg-stone-200 text-sm text-stone-600">
            Products appear here once the API is running.
          </div>
        )}
      </Container>
      <Container className="pb-4">
        <div className="flex w-full gap-2 overflow-x-auto pb-2">
          {(categories?.data || []).map((category) => (
            <Link key={category.name} href={`/products?category=${encodeURIComponent(category.name)}`} className="shrink-0 rounded-full border border-stone-300 px-4 py-2 text-sm">
              {category.name}
            </Link>
          ))}
        </div>
      </Container>
      <Container className="py-8">
        <div className="mb-6 flex items-end justify-between">
          <h2 className={`${serif.className} text-3xl`}>Featured</h2>
          <Link href="/products" className="text-sm text-stone-600">All products</Link>
        </div>
        {products.length ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-6 lg:grid-cols-3">
            {products.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <p className="rounded-3xl border border-dashed border-stone-300 px-6 py-10 text-sm text-stone-600">
            The catalogue could not be loaded. Start the API and confirm NEXT_PUBLIC_API_URL points at it.
          </p>
        )}
      </Container>
      <Container className="grid gap-4 py-8 sm:grid-cols-3">
        {[
          {
            title: "Choose",
            body: "Open a product, set a quantity, and buy it now or add it to the cart.",
            icon: (
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.75" />
                <path d="m8.5 12.2 2.4 2.4 4.6-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ),
          },
          {
            title: "Pay",
            body: "Razorpay Checkout handles UPI, cards, and netbanking. We never see your card.",
            icon: (
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                <rect x="3" y="6" width="18" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.75" />
                <path d="M3 10h18M7 15h4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            ),
          },
          {
            title: "Deliver",
            body: "We ship across India. Orders over ₹999 ship free.",
            icon: (
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                <path d="M3 7h11v10H3zM14 10h4l3 3v4h-7z" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
                <circle cx="7" cy="18.5" r="1.4" fill="none" stroke="currentColor" strokeWidth="1.75" />
                <circle cx="17" cy="18.5" r="1.4" fill="none" stroke="currentColor" strokeWidth="1.75" />
              </svg>
            ),
          },
        ].map((step) => (
          <div key={step.title} className="rounded-3xl bg-white p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-950">
              {step.icon}
            </div>
            <h3 className="mt-4 font-medium">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">{step.body}</p>
          </div>
        ))}
      </Container>
    </>
  );
}
