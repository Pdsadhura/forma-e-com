"use client";

import { useEffect, useState } from "react";

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("forma_consent");
    if (!stored) setVisible(true);
  }, []);

  function choose(value: "granted" | "denied") {
    window.localStorage.setItem("forma_consent", value);
    setVisible(false);
    if (value === "granted") window.dispatchEvent(new Event("forma:consent"));
  }

  if (!visible) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white p-4 shadow-lg">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm leading-6 text-stone-700">
          We use a Meta pixel to measure visits from Facebook and Instagram ads. Checkout works if you decline. See the privacy policy for what is stored with an order.
        </p>
        <div className="flex gap-2">
          <button type="button" className="rounded-full border border-stone-300 px-4 py-2 text-sm" onClick={() => choose("denied")}>Decline</button>
          <button type="button" className="rounded-full bg-emerald-950 px-4 py-2 text-sm text-white" onClick={() => choose("granted")}>Accept</button>
        </div>
      </div>
    </div>
  );
}
