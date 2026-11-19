import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PostCard, PostCardSkeleton } from "@/components/jag/PostCard";
import { postsQuery } from "@/lib/posts";
import { POST_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/experiences")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { category?: string | undefined } => ({
    category: typeof s["category"] === "string" ? s["category"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Student Experiences — JAG" },
      {
        name: "description",
        content:
          "Real stories from university students: first year, GPA, departments, dorm life, internships and more.",
      },
      { property: "og:title", content: "Student Experiences — JAG" },
      {
        property: "og:description",
        content: "Real stories from university students.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Experiences,
});

function Experiences() {
  const { category } = Route.useSearch();
  const { data, isLoading } = useQuery(postsQuery({ category, limit: 60 }));
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      <h1 className="text-2xl font-extrabold md:text-4xl">
        {category ?? "Student experiences"}
      </h1>
      <p className="mt-2 text-muted-foreground">
        Honest stories from students who've been where you are.
      </p>
      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:mt-6 md:px-0">
        <Link
          to="/experiences"
          search={{}}
          className={cn(
            "shrink-0 rounded-full px-4 py-2 text-sm font-semibold",
            !category ? "bg-primary text-primary-foreground" : "bg-secondary",
          )}
        >
          All
        </Link>
        {POST_CATEGORIES.map((c) => (
          <Link
            key={c}
            to="/experiences"
            search={{ category: c }}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold",
              category === c
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground",
            )}
          >
            {c}
          </Link>
        ))}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 md:mt-8 md:gap-6 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <PostCardSkeleton key={i} />
            ))
          : data?.map((p) => <PostCard key={p.id} post={p} />)}
      </div>
      {!isLoading && !data?.length && (
        <div className="mt-8 rounded-3xl border border-dashed p-14 text-center">
          <p className="font-display text-xl font-bold">
            No experiences here yet
          </p>
          <Link
            to="/create"
            className="mt-2 inline-block font-semibold text-brand"
          >
            Share the first one →
          </Link>
        </div>
      )}
    </div>
  );
}
