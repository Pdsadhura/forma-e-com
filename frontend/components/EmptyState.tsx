export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
      <h2 className="text-lg font-medium text-stone-950">{title}</h2>
      <p className="mt-2 text-sm text-stone-600">{body}</p>
    </div>
  );
}
