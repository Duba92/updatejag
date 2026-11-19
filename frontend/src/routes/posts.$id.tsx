import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { Bookmark, Eye, Heart, Pencil, Share2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  deletePost,
  getMyInteractions,
  togglePostInteraction,
} from "@/lib/app.functions";
import { authorName, authorSchool, postQuery } from "@/lib/posts";
import { cleanHtml } from "@/lib/sanitize";
import { Button } from "@/components/ui/button";
import { AudioPlayer } from "@/components/jag/AudioPlayer";
import { Gallery } from "@/components/jag/Gallery";
import { YouTubeEmbed } from "@/components/jag/YouTubeEmbed";
import { Comments } from "@/components/jag/Comments";
import { UserAvatar } from "@/components/jag/UserAvatar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/posts/$id")({
  head: () => ({
    meta: [
      { title: "Student experience — JAG" },
      {
        name: "description",
        content: "Read this student's experience on JAG.",
      },
      { property: "og:title", content: "A student experience on JAG" },
      {
        property: "og:description",
        content: "Your Experience Can Guide Someone.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PostPage,
});

function PostPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: post, isLoading } = useQuery(postQuery(id));

  useEffect(() => {
    supabase.rpc("increment_view", { _post_id: id });
  }, [id]);
  useEffect(() => {
    if (post) document.title = `${post.title} — JAG`;
  }, [post]);

  const { data: mine } = useQuery({
    queryKey: ["my-interactions", id, user?.id],
    enabled: !!user,
    queryFn: () => getMyInteractions({ data: { postId: id } }),
  });

  const toggle = useMutation({
    mutationFn: async (kind: "likes" | "bookmarks") => {
      if (!user) {
        navigate({ to: "/auth" });
        return;
      }
      const result = await togglePostInteraction({
        data: { postId: id, kind: kind === "likes" ? "like" : "bookmark" },
      });
      if (kind === "bookmarks")
        toast.success(result.active ? "Saved" : "Removed from saved");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-interactions", id] });
      qc.invalidateQueries({ queryKey: ["post", id] });
      qc.invalidateQueries({ queryKey: ["bookmarks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = async () => {
    if (!confirm("Delete this post? This can't be undone.")) return;
    try {
      await deletePost({ data: { postId: id } });
    } catch (error) {
      return void toast.error(
        error instanceof Error ? error.message : "Post could not be deleted.",
      );
    }
    toast.success("Post deleted");
    qc.invalidateQueries({ queryKey: ["posts"] });
    navigate({ to: "/" });
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: post?.title ?? "JAG", url });
      } catch {
        /* cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    }
  };

  if (isLoading)
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-14">
        <div className="h-10 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-3xl bg-muted" />
      </div>
    );
  if (!post)
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">This post isn't available</h1>
        <p className="mt-2 text-muted-foreground">
          It may have been removed or is still a draft.
        </p>
        <Link
          to="/explore"
          search={{ q: "", tab: "all", sort: "latest" }}
          className="mt-4 inline-block font-semibold text-brand"
        >
          Explore other posts
        </Link>
      </div>
    );
  const isOwner = user?.id === post.author_id;

  return (
    <article className="mx-auto max-w-3xl px-4 py-6 md:py-14">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Link
          to="/experiences"
          search={{ category: post.category }}
          className="rounded-full bg-accent px-3 py-1 font-semibold text-accent-foreground"
        >
          {post.category}
        </Link>
        {post.status === "draft" && (
          <span className="rounded-full bg-muted px-3 py-1 font-semibold">
            Draft
          </span>
        )}
      </div>
      <h1 className="mt-3 text-[1.75rem] font-extrabold leading-tight md:mt-4 md:text-5xl">
        {post.title}
      </h1>
      <div className="mt-6 flex items-center gap-3">
        <UserAvatar
          name={authorName(post)}
          src={post.author?.avatar}
          className="h-11 w-11"
        />
        <div className="flex-1 text-sm">
          {post.author ? (
            <Link
              to="/profile/$id"
              params={{ id: post.author.id }}
              className="font-semibold hover:text-brand"
            >
              {authorName(post)}
            </Link>
          ) : (
            <span className="font-semibold">{authorName(post)}</span>
          )}
          <p className="text-muted-foreground">
            {authorSchool(post)} ·{" "}
            {new Date(post.created_at).toLocaleDateString(undefined, {
              dateStyle: "medium",
            })}
          </p>
        </div>
        {isOwner && (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" aria-label="Edit" asChild>
              <Link to="/create" search={{ edit: post.id }}>
                <Pencil />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete"
              onClick={remove}
            >
              <Trash2 />
            </Button>
          </div>
        )}
      </div>

      {post.images.length > 0 && (
        <div className="mt-8">
          <Gallery images={post.images} />
        </div>
      )}
      <div
        className="prose-jag mt-8 text-[1.05rem]"
        dangerouslySetInnerHTML={{ __html: cleanHtml(post.body) }}
      />
      {post.audio && (
        <div className="mt-8">
          <AudioPlayer
            src={post.audio.url}
            title={post.audio_title || "Audio experience"}
            cover={post.audioCover?.url}
          />
        </div>
      )}
      {post.youtube_id && (
        <div className="mt-8">
          <YouTubeEmbed id={post.youtube_id} title={post.title} />
        </div>
      )}
      {post.tags.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {post.tags.map((t) => (
            <Link
              key={t}
              to="/explore"
              search={{ q: t, tab: "all", sort: "latest" }}
              className="text-sm text-brand"
            >
              #{t}
            </Link>
          ))}
        </div>
      )}

      <div className="sticky bottom-16 z-30 -mx-4 mt-8 flex items-center gap-1 border-y bg-background/95 px-2 py-2 backdrop-blur md:static md:mx-0 md:gap-2 md:bg-transparent md:px-0 md:py-3">
        <Button
          variant="ghost"
          onClick={() => toggle.mutate("likes")}
          className={cn(mine?.liked && "text-destructive")}
          aria-pressed={!!mine?.liked}
        >
          <Heart className={cn(mine?.liked && "fill-current")} />{" "}
          {post.likeCount}
        </Button>
        <Button
          variant="ghost"
          onClick={() => toggle.mutate("bookmarks")}
          className={cn(mine?.saved && "text-brand")}
          aria-pressed={!!mine?.saved}
        >
          <Bookmark className={cn(mine?.saved && "fill-current")} />{" "}
          {mine?.saved ? "Saved" : "Save"}
        </Button>
        <Button variant="ghost" onClick={share}>
          <Share2 /> Share
        </Button>
        <span className="ml-auto flex items-center gap-1 text-sm text-muted-foreground">
          <Eye className="h-4 w-4" /> {post.view_count}
        </span>
      </div>
      {post.status === "published" && <Comments postId={post.id} />}
    </article>
  );
}
