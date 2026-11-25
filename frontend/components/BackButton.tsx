"use client";

import { useRouter } from "next/navigation";

export function BackButton({ fallback = "/" }: { fallback?: string | (() => string) }) {
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push(typeof fallback === "function" ? fallback() : fallback);
  }

  return (
    <button type="button" onClick={goBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-950">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
        <path d="M15 6 9 12l6 6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Back
    </button>
  );
}
