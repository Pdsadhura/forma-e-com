export function StatusBadge({ value }: { value: string }) {
  const tone = value === "CAPTURED" || value === "DELIVERED"
    ? "bg-emerald-100 text-emerald-950"
    : value === "FAILED" || value === "CANCELLED"
      ? "bg-rose-100 text-rose-900"
      : value === "SHIPPED" || value === "PROCESSING"
        ? "bg-sky-100 text-sky-950"
        : "bg-amber-100 text-amber-950";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{value}</span>;
}
