import type { Metadata } from "next";
import Link from "next/link";
import { BackButton } from "@/components/BackButton";
import { Container } from "@/components/Container";
import { serif } from "@/lib/fonts";
import { STORE_NAME, SUPPORT_EMAIL } from "@/lib/types";

export const metadata: Metadata = { title: "About" };

const policies = [
  { href: "/privacy", label: "Privacy policy" },
  { href: "/terms", label: "Terms and conditions" },
  { href: "/shipping", label: "Shipping policy" },
  { href: "/refunds", label: "Cancellation and refunds" },
];

export default function AboutPage() {
  return (
    <Container className="py-10 sm:py-14">
      <BackButton />
      <h1 className={`${serif.className} mt-3 text-4xl text-stone-950`}>About {STORE_NAME}</h1>
      <div className="mt-8 max-w-3xl space-y-4 text-base leading-7 text-stone-700">
        <p>{STORE_NAME} is a small shop for the home. The catalogue covers linen, lighting, tableware, and bedsheets, packed and sent to addresses across India.</p>
        <p>The price on a product page is the price charged at checkout. Razorpay handles UPI, cards, and netbanking, so card numbers and UPI PINs never reach the store.</p>
        <p>Shipping is ₹79, and orders of ₹999 or more ship free. A paid order is prepared for the courier within 1–2 business days. Delivery then depends on the PIN code.</p>
        <p>Questions about an order can go to <a className="text-stone-950 underline-offset-4 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Include the order number from the confirmation page.</p>
      </div>
      <div className="mt-10">
        <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-stone-500">Policies</h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {policies.map((policy) => (
            <li key={policy.href}>
              <Link href={policy.href} className="text-stone-800 underline-offset-4 hover:underline">{policy.label}</Link>
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
}
