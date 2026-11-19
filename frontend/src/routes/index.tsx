import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  HeartHandshake,
  PenLine,
  Sprout,
  Headphones,
  PlayCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PostCard, PostCardSkeleton } from "@/components/jag/PostCard";
import { AudioPlayer } from "@/components/jag/AudioPlayer";
import { YouTubeEmbed } from "@/components/jag/YouTubeEmbed";
import { postsQuery } from "@/lib/posts";
import { POST_CATEGORIES } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";

const hero = "/jag-students-banner.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JAG Students Association — Your Experience Can Guide Someone" },
      {
        name: "description",
        content:
          "Muuxannoo dhugaa, qajeelfama, sagalee fi viidiyoo barattoota Yuunivarsiitii Haramayaa.",
      },
      {
        property: "og:title",
        content: "JAG — Muuxannoon Kee Nama Tokkoof Qajeelfama Ta'a",
      },
      {
        property: "og:description",
        content:
          "Muuxannoo dhugaa barattoota yuunivarsiitii, dhaloota itti aanuuf qoodaman.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Section({
  title,
  link,
  children,
}: {
  title: string;
  link?: boolean;
  children: React.ReactNode;
}) {
  const { t } = useLang();
  return (
    <section className="mx-auto mt-10 max-w-6xl px-4 md:mt-16">
      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 md:mb-6">
        <h2 className="min-w-0 text-xl font-bold md:text-3xl">{title}</h2>
        {link && (
          <Link
            to="/explore"
            search={{ q: "", tab: "all", sort: "latest" }}
            className="flex shrink-0 items-center gap-1 text-sm font-semibold text-brand"
          >
            {t("section.seeAll")} <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Index() {
  const { t } = useLang();
  const { data: posts, isLoading } = useQuery(postsQuery({ limit: 30 }));
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const [p, s] = await Promise.all([
        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("status", "published"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      return { posts: p.count ?? 0, students: s.count ?? 0 };
    },
  });
  const featured = posts?.filter((p) => p.featured) ?? [];
  const latest = posts?.slice(0, 6) ?? [];
  const audio = posts?.filter((p) => p.audio).slice(0, 2) ?? [];
  const videos = posts?.filter((p) => p.youtube_id).slice(0, 2) ?? [];
  const trending = [...(posts ?? [])]
    .sort(
      (a, b) =>
        b.view_count + b.likeCount * 5 - (a.view_count + a.likeCount * 5),
    )
    .slice(0, 5);

  return (
    <div>
      <section className="relative isolate overflow-hidden bg-primary text-banner-foreground">
        <img
          src={hero}
          alt="Haramaya University students together on campus"
          fetchPriority="high"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[center_30%] md:left-auto md:w-3/4"
        />
        <div className="banner-scrim absolute inset-0 -z-10" />
        <div className="mx-auto max-w-6xl px-4 pb-6 pt-36 sm:px-6 md:py-8 lg:py-16">
          <div className="min-w-0 max-w-xl animate-rise">
            <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
              JAG Students Association
            </h1>
            <p className="mt-3 max-w-md font-display text-xl font-semibold leading-snug md:text-2xl">
              {t("hero.tagline")}
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-banner-foreground/85 md:text-base">
              {t("hero.desc")}
            </p>
            <div className="mt-5 grid min-w-0 gap-2 sm:max-w-sm">
              <Button
                variant="hero"
                size="lg"
                className="h-11 rounded-md"
                asChild
              >
                <Link to="/experiences">
                  {t("hero.explore")} <ArrowRight />
                </Link>
              </Button>
              <Button
                variant="brand"
                size="lg"
                className="h-11 rounded-md"
                asChild
              >
                <Link to="/create">{t("hero.share")}</Link>
              </Button>
              <Link
                to="/auth"
                className="justify-self-center py-2 text-sm font-semibold underline underline-offset-4"
              >
                {t("hero.join")}
              </Link>
            </div>
            <div className="mt-4 grid max-w-sm grid-cols-2 gap-4 border-t border-banner-foreground/25 pt-4 text-xs">
              <div className="min-w-0">
                <p className="font-display text-2xl font-bold">
                  {stats?.posts ?? "—"}
                </p>
                <p className="text-banner-foreground/80">{t("stats.posts")}</p>
              </div>
              <div className="min-w-0">
                <p className="font-display text-2xl font-bold">
                  {stats?.students ?? "—"}
                </p>
                <p className="text-banner-foreground/80">
                  {t("stats.students")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <Section title={t("section.featured")} link>
          <div className="grid gap-6 md:grid-cols-2">
            {featured.slice(0, 2).map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        </Section>
      )}

      <Section title={t("section.latest")} link>
        <div className="grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <PostCardSkeleton key={i} />
              ))
            : latest.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
        {!isLoading && !latest.length && (
          <p className="rounded-3xl border border-dashed p-10 text-center text-muted-foreground">
            {t("empty.posts")}
          </p>
        )}
      </Section>

      <section className="mx-auto mt-20 max-w-6xl px-4">
        <div className="rounded-[2rem] bg-secondary p-6 md:p-12">
          <h2 className="text-2xl font-bold md:text-3xl">{t("how.title")}</h2>
          <div className="mt-6 grid grid-cols-2 gap-5 md:mt-8 lg:grid-cols-4">
            {(
              [
                { i: PenLine, tk: "how.step1.t", dk: "how.step1.d" },
                { i: BookOpen, tk: "how.step2.t", dk: "how.step2.d" },
                { i: HeartHandshake, tk: "how.step3.t", dk: "how.step3.d" },
                { i: Sprout, tk: "how.step4.t", dk: "how.step4.d" },
              ] as const
            ).map(({ i: Icon, tk, dk }, n) => (
              <div key={tk}>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-4 text-xs font-bold text-brand">
                  {t("how.step")} {n + 1}
                </p>
                <p className="font-display text-base font-bold leading-snug md:text-lg">
                  {t(tk)}
                </p>
                <p className="mt-1 hidden text-sm text-muted-foreground sm:block">
                  {t(dk)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-10 px-4 lg:grid-cols-2">
        {audio.length > 0 && (
          <div className="mt-16">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold">
              <Headphones className="h-6 w-6 text-brand" />{" "}
              {t("section.listen")}
            </h2>
            <div className="space-y-4">
              {audio.map((p) => (
                <div key={p.id}>
                  <Link
                    to="/posts/$id"
                    params={{ id: p.id }}
                    className="mb-2 block font-semibold hover:text-brand"
                  >
                    {p.title}
                  </Link>
                  {p.audio && (
                    <AudioPlayer
                      src={p.audio.url}
                      title={p.audio_title}
                      cover={p.audioCover?.url}
                      compact
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {videos[0]?.youtube_id && (
          <div className="mt-16">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold">
              <PlayCircle className="h-6 w-6 text-brand" /> {t("section.watch")}
            </h2>
            <YouTubeEmbed id={videos[0].youtube_id} title={videos[0].title} />
            <Link
              to="/posts/$id"
              params={{ id: videos[0].id }}
              className="mt-1 block font-semibold hover:text-brand"
            >
              {videos[0].title}
            </Link>
          </div>
        )}
      </div>

      {trending.length > 0 && (
        <Section title={t("section.trending")}>
          <ol className="divide-y rounded-3xl border bg-card">
            {trending.map((p, i) => (
              <li key={p.id}>
                <Link
                  to="/posts/$id"
                  params={{ id: p.id }}
                  className="flex items-center gap-4 p-4 hover:bg-secondary"
                >
                  <span className="font-display text-2xl font-extrabold text-brand/40">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 font-semibold">{p.title}</span>
                  <span className="hidden text-xs text-muted-foreground sm:block">
                    {p.category}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </Section>
      )}

      <Section title={t("section.categories")}>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
          {POST_CATEGORIES.map((c) => (
            <Link
              key={c}
              to="/experiences"
              search={{ category: c }}
              className="shrink-0 rounded-full border bg-card px-4 py-2.5 text-sm font-medium hover:border-brand hover:text-brand"
            >
              {c}
            </Link>
          ))}
        </div>
      </Section>
    </div>
  );
}
