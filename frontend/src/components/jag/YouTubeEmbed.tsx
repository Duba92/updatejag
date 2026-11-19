import { useState } from "react";
import { ExternalLink, Play } from "lucide-react";
import { youtubeEmbedUrl, youtubeThumb, youtubeWatchUrl } from "@/lib/youtube";

export function YouTubeEmbed({
  id,
  title,
}: {
  id: string;
  title?: string | undefined;
}) {
  const [on, setOn] = useState(false);
  return (
    <div>
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-primary">
        {on ? (
          <iframe
            src={`${youtubeEmbedUrl(id)}&autoplay=1`}
            title={title ?? "YouTube video"}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setOn(true)}
            className="group absolute inset-0"
            aria-label="Play video"
          >
            <img
              src={youtubeThumb(id)}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-0 grid place-items-center bg-primary/30">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-brand text-brand-foreground shadow-lift transition group-hover:scale-110">
                <Play className="ml-1 h-7 w-7" />
              </span>
            </span>
          </button>
        )}
      </div>
      <a
        href={youtubeWatchUrl(id)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-brand"
      >
        Open on YouTube <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
