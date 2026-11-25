"use client";

import { useState } from "react";
import { cn } from "@/lib/ui";
import type { ProductImage } from "@/lib/types";

export function Gallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [active, setActive] = useState(0);
  const image = images[active] || images[0];
  if (!image) {
    return <div className="flex aspect-square items-center justify-center rounded-3xl bg-stone-200 text-sm text-stone-500">No image yet</div>;
  }
  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-3xl bg-stone-200">
        <img src={image.url} alt={image.alt || name} className="h-full w-full object-cover" />
      </div>
      {images.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {images.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Show image ${index + 1} of ${name}`}
              onClick={() => setActive(index)}
              className={cn("h-16 w-16 overflow-hidden rounded-xl border", index === active ? "border-emerald-950" : "border-stone-200")}
            >
              <img src={item.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
