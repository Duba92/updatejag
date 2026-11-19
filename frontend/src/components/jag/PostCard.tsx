import { Link } from "@tanstack/react-router";
import {
  Eye,
  Heart,
  Headphones,
  Image as ImageIcon,
  MessageCircle,
  PlayCircle,
} from "lucide-react";
import { authorName, authorSchool, plainText, type Post } from "@/lib/posts";
import { youtubeThumb } from "@/lib/youtube";
import { UserAvatar } from "./UserAvatar";

export function PostCard({ post }: { post: Post }) {
  const cover =
    post.images[0]?.url ??
    (post.youtube_id ? youtubeThumb(post.youtube_id) : post.audioCover?.url);
  return (
    <Link
      to="/posts/$id"
      params={{ id: post.id }}
      className="group flex flex-col overflow-hidden rounded-3xl border bg-card shadow-card transition hover:-translate-y-1 hover:shadow-lift"
    >
      {cover && (
        <div className="relative aspect-[16/9] overflow-hidden bg-muted md:aspect-[16/10]">
          <img
            src={cover}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          {post.youtube_id && !post.images.length && (
            <PlayCircle className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 text-primary-foreground drop-shadow" />
          )}
        </div>
      )}
      <div className="flex flex-1 flex-col p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-accent px-2.5 py-1 font-semibold text-accent-foreground">
            {post.category}
          </span>
          <span className="ml-auto flex gap-1.5 text-muted-foreground">
            {post.images.length > 0 && (
              <ImageIcon className="h-3.5 w-3.5" aria-label="Photos" />
            )}
            {post.audio && (
              <Headphones className="h-3.5 w-3.5" aria-label="Audio" />
            )}
            {post.youtube_id && (
              <PlayCircle className="h-3.5 w-3.5" aria-label="Video" />
            )}
          </span>
        </div>
        <h3 className="mt-2.5 line-clamp-2 text-[1.05rem] md:text-lg font-bold leading-snug group-hover:text-brand">
          {post.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {plainText(post.body)}
        </p>
        <div className="mt-auto flex min-w-0 items-center gap-2 pt-3 md:pt-4">
          <UserAvatar
            name={authorName(post)}
            src={post.author?.avatar}
            className="h-7 w-7"
          />
          <div className="min-w-0 flex-1 text-xs">
            <p className="truncate font-semibold">{authorName(post)}</p>
            <p className="truncate text-muted-foreground">
              {authorSchool(post)}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" />
              {post.likeCount}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              {post.commentCount}
            </span>
            <span className="hidden items-center gap-1 sm:flex">
              <Eye className="h-3.5 w-3.5" />
              {post.view_count}
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}

export function PostCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border bg-card">
      <div className="aspect-[16/10] animate-pulse bg-muted" />
      <div className="space-y-3 p-5">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-5 w-4/5 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
