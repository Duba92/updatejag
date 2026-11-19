import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Media } from "@/lib/posts";
import { cn } from "@/lib/utils";

export function Gallery({ images }: { images: Media[] }) {
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    if (open === null) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i! + 1) % images.length);
      if (e.key === "ArrowLeft")
        setOpen((i) => (i! - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, images.length]);
  if (!images.length) return null;
  const cur = open !== null ? images[open] : undefined;
  return (
    <>
      <div
        className={cn(
          "grid gap-2",
          images.length === 1 ? "grid-cols-1" : "grid-cols-2",
        )}
      >
        {images.map((m, i) => (
          <figure
            key={m.id}
            className={cn(images.length === 3 && i === 0 && "col-span-2")}
          >
            <button
              type="button"
              onClick={() => setOpen(i)}
              className="block w-full overflow-hidden rounded-2xl"
            >
              <img
                src={m.url}
                alt={m.caption ?? ""}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover transition hover:scale-[1.02]"
              />
            </button>
            {m.caption && (
              <figcaption className="mt-1 text-xs text-muted-foreground">
                {m.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
      {open !== null && (
        <div
          role="dialog"
          aria-modal
          className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/90 p-4"
          onClick={() => setOpen(null)}
        >
          <button
            className="absolute right-4 top-4 text-background"
            aria-label="Close"
          >
            <X className="h-7 w-7" />
          </button>
          {images.length > 1 && (
            <>
              <button
                className="absolute left-3 text-background"
                aria-label="Previous"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((open - 1 + images.length) % images.length);
                }}
              >
                <ChevronLeft className="h-9 w-9" />
              </button>
              <button
                className="absolute right-3 text-background"
                aria-label="Next"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((open + 1) % images.length);
                }}
              >
                <ChevronRight className="h-9 w-9" />
              </button>
            </>
          )}
          <figure onClick={(e) => e.stopPropagation()} className="max-w-5xl">
            <img
              src={cur?.url}
              alt={cur?.caption ?? ""}
              className="max-h-[80vh] rounded-xl object-contain"
            />
            {cur?.caption && (
              <figcaption className="mt-3 text-center text-sm text-background">
                {cur.caption}
              </figcaption>
            )}
          </figure>
        </div>
      )}
    </>
  );
}
