export function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      <button type="button" className="rounded-full border border-stone-300 px-4 py-2 text-sm disabled:opacity-40" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
      <p className="text-sm text-stone-600">Page {page} of {totalPages}</p>
      <button type="button" className="rounded-full border border-stone-300 px-4 py-2 text-sm disabled:opacity-40" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</button>
    </div>
  );
}
