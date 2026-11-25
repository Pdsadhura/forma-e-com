export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export const buttonClass =
  "inline-flex items-center justify-center rounded-full bg-emerald-950 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50";

export const buttonSecondaryClass =
  "inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-900 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50";

export const inputClass =
  "w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-base text-stone-900 outline-none ring-emerald-800 placeholder:text-stone-400 focus:ring-2";

export const labelClass = "mb-1.5 block text-sm font-medium text-stone-800";

export const cardClass = "rounded-3xl border border-stone-200 bg-white";
