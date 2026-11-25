"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

const pixelId = (process.env.NEXT_PUBLIC_META_PIXEL_ID || "").replace(/\D/g, "");

export function MetaPixel() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem("forma_consent") === "granted") setEnabled(true);
    const onConsent = () => setEnabled(true);
    window.addEventListener("forma:consent", onConsent);
    return () => window.removeEventListener("forma:consent", onConsent);
  }, []);

  if (!pixelId || !enabled) return null;
  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`}
    </Script>
  );
}
