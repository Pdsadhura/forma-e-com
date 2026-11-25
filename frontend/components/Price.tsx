import { formatInr } from "@/lib/format";

export function Price({ price, salePrice, stacked = false, className = "" }: { price: string; salePrice?: string | null; stacked?: boolean; className?: string }) {
  if (salePrice && Number(salePrice) < Number(price)) {
    return (
      <p className={`${stacked ? "flex flex-col items-start gap-0.5" : "flex flex-wrap items-baseline gap-x-2"} ${className}`}>
        <span className="font-medium text-emerald-950">{formatInr(salePrice)}</span>
        <span className="text-xs text-stone-400 line-through">{formatInr(price)}</span>
      </p>
    );
  }
  return <p className={`font-medium text-stone-950 ${className}`}>{formatInr(price)}</p>;
}
