"use client";

import { useEffect, useState } from "react";
import { serif } from "@/lib/fonts";

type Tone = "success" | "pending" | "failure";

const disc = {
  success: "bg-emerald-950",
  pending: "bg-amber-600",
  failure: "bg-rose-800",
};

const halo = {
  success: "bg-emerald-200",
  pending: "bg-amber-200",
  failure: "bg-rose-200",
};

export function PaymentStage({
  tone,
  eyebrow,
  title,
  children,
}: {
  tone: Tone;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <section className="mx-auto max-w-xl py-8 text-center sm:py-14">
      <div className="relative mx-auto h-28 w-28">
        <span className={`absolute inset-0 rounded-full ${halo[tone]} ${tone === "pending" ? "animate-ping" : ready ? "scale-100 opacity-100" : "scale-75 opacity-0"} transition duration-700`} />
        <span className={`absolute inset-3 flex items-center justify-center rounded-full text-white shadow-lg transition duration-700 ease-out ${disc[tone]} ${ready ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}>
          {tone === "pending" ? <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : null}
          {tone === "success" ? (
            <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
          {tone === "failure" ? (
            <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M7 7l10 10M17 7L7 17" strokeLinecap="round" />
            </svg>
          ) : null}
        </span>
      </div>
      <p className={`mt-8 text-xs font-medium uppercase tracking-[0.22em] text-emerald-900 transition duration-700 delay-150 ${ready ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>{eyebrow}</p>
      <h1 className={`${serif.className} mt-3 text-4xl text-stone-950 transition duration-700 delay-200 sm:text-5xl ${ready ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}>{title}</h1>
      <div className={`mt-6 transition duration-700 delay-300 ${ready ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}>
        {children}
      </div>
    </section>
  );
}
