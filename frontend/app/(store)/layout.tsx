import { AttributionCapture } from "@/components/AttributionCapture";
import { CartProvider } from "@/lib/cart";
import { ConsentBanner } from "@/components/ConsentBanner";
import { MetaPixel } from "@/components/MetaPixel";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <AttributionCapture />
      <MetaPixel />
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      <ConsentBanner />
    </CartProvider>
  );
}
