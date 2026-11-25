import type { Metadata } from "next";
import "./globals.css";
import { sans } from "@/lib/fonts";
import { SITE_URL, STORE_NAME } from "@/lib/types";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${STORE_NAME} · Home objects`, template: `%s · ${STORE_NAME}` },
  description: "Shop lamps, linen, and tableware. Pay in INR with Razorpay and get delivery across India.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.className} bg-stone-50 text-stone-900 antialiased`}>{children}</body>
    </html>
  );
}
