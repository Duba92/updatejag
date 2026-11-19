import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PostCard, PostCardSkeleton } from "@/components/jag/PostCard";
import { postsQuery } from "@/lib/posts";
import { POST_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "all", label: "All" },
  { id: "experiences", label: "Experiences" },
  { id: "photos", label: "Photos" },
  { id: "audio", label: "Audio" },
  { id: "videos", label: "Videos" },
] as const;
const SORTS = [
  { id: "latest", label: "Latest" },
  { id: "popular", label: "Most popular" },
  { id: "liked", label: "Most liked" },
  { id: "viewed", label: "Most viewed" },
] as const;

type Search = {
  q: string;
  tab: string;
  sort: string;
  category?: string | undefined;
};

export const Route = createFileRoute("/explore")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s["q"] === "string" ? s["q"] : "",
    tab: typeof s["tab"] === "string" ? s["tab"] : "all",
    sort: typeof s["sort"] === "string" ? s["sort"] : "latest",
    category: typeof s["category"] === "string" ? s["category"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Explore — JAG" },
      {
        name: "description",
        content:
          "Search and discover student experiences, photos, audio stories and videos on JAG.",
      },
      { property: "og:title", content: "Explore — JAG" },
      {
        property: "og:description",
        content: "Discover what students are sharing on JAG.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Explore,
});

function Explore() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/explore" });
  const [text, setText] = useState(s.q);
  useEffect(() => {
    const t = setTimeout(() => {
      if (text !== s.q)
        navigate({ search: (p) => ({ ...p, q: text }), replace: true });
    }, 350);
    return () => clearTimeout(t);
  }, [text, s.q, navigate]);
  const { data, isLoading } = useQuery(
    postsQuery({ search: s.q || undefined, category: s.category, limit: 100 }),
  );

  let list = data ?? [];
  if (s.tab === "photos") list = list.filter((p) => p.images.length);
  if (s.tab === "audio") list = list.filter((p) => p.audio);
  if (s.tab === "videos") list = list.filter((p) => p.youtube_id);
  if (s.sort === "liked")
    list = [...list].sort((a, b) => b.likeCount - a.likeCount);
  if (s.sort === "viewed")
    list = [...list].sort((a, b) => b.view_count - a.view_count);
  if (s.sort === "popular")
    list = [...list].sort(
      (a, b) =>
        b.view_count +
        b.likeCount * 5 +
        b.commentCount * 3 -
        (a.view_count + a.likeCount * 5 + a.commentCount * 3),
    );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      <h1 className="text-2xl font-extrabold md:text-4xl">Explore</h1>
      <div className="relative mt-4 md:mt-6">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search experiences, topics, universities…"
          type="search"
          enterKeyHint="search"
          className="h-12 rounded-2xl pl-12 text-base md:h-14"
        />
      </div>
      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:mt-6 md:px-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => navigate({ search: (p) => ({ ...p, tab: t.id }) })}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold",
              s.tab === t.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <select
          aria-label="Sort"
          value={s.sort}
          onChange={(e) =>
            navigate({ search: (p) => ({ ...p, sort: e.target.value }) })
          }
          className="h-9 rounded-full border bg-background px-3"
        >
          {SORTS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Category"
          value={s.category ?? ""}
          onChange={(e) =>
            navigate({
              search: (p) => ({ ...p, category: e.target.value || undefined }),
            })
          }
          className="h-9 rounded-full border bg-background px-3"
        >
          <option value="">All categories</option>
          {POST_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <span className="text-muted-foreground">{list.length} results</span>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 md:mt-8 md:gap-6 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <PostCardSkeleton key={i} />
            ))
          : list.map((p) => <PostCard key={p.id} post={p} />)}
      </div>
      {!isLoading && !list.length && (
        <div className="mt-8 rounded-3xl border border-dashed p-14 text-center">
          <p className="font-display text-xl font-bold">Nothing found</p>
          <p className="mt-1 text-muted-foreground">
            Try a different word or category.
          </p>
        </div>
      )}
    </div>
  );
}
