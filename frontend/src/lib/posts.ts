import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveMediaUrl } from "@/lib/media";
import { getMyBookmarks, getMyDrafts } from "@/lib/app.functions";

const SELECT =
  "*, author:profiles!posts_author_id_fkey(id, full_name, avatar_url, university), post_media(*), likes(count), comments(count)";

export type Media = {
  id: string;
  kind: string;
  url: string;
  caption: string | null;
  position: number;
  path: string | null;
};
export type Post = {
  id: string;
  title: string;
  body: string;
  category: string;
  tags: string[];
  status: string;
  youtube_id: string | null;
  youtube_url: string | null;
  audio_title: string | null;
  featured: boolean;
  view_count: number;
  created_at: string;
  author_id: string | null;
  author: {
    id: string;
    full_name: string;
    avatar: string | null;
    university: string | null;
  } | null;
  images: Media[];
  audio: Media | null;
  audioCover: Media | null;
  likeCount: number;
  commentCount: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function hydratePost(row: any): Promise<Post> {
  const media: Media[] = await Promise.all(
    (row.post_media ?? [])
      .sort((a: Media, b: Media) => a.position - b.position)
      .map(async (m: Media) => ({
        ...m,
        url: (await resolveMediaUrl(m.url)) ?? "",
      })),
  );
  return {
    ...row,
    author: row.author
      ? { ...row.author, avatar: await resolveMediaUrl(row.author.avatar_url) }
      : null,
    images: media.filter((m) => m.kind === "image"),
    audio: media.find((m) => m.kind === "audio") ?? null,
    audioCover: media.find((m) => m.kind === "audio_cover") ?? null,
    likeCount: row.likes?.[0]?.count ?? 0,
    commentCount: row.comments?.[0]?.count ?? 0,
  };
}

export const authorName = (p: Post) => p.author?.full_name || "JAG student";
export const authorSchool = (p: Post) => p.author?.university || "";
export const plainText = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const postsQuery = (
  opts: {
    search?: string | undefined;
    category?: string | undefined;
    authorId?: string | undefined;
    limit?: number | undefined;
  } = {},
) =>
  queryOptions({
    queryKey: ["posts", opts],
    queryFn: async () => {
      let q = supabase
        .from("posts")
        .select(SELECT)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(opts.limit ?? 60);
      if (opts.search)
        q = q.or(
          `title.ilike.%${opts.search.replace(/[%,()]/g, "")}%,body.ilike.%${opts.search.replace(/[%,()]/g, "")}%`,
        );
      if (opts.category) q = q.eq("category", opts.category);
      if (opts.authorId) q = q.eq("author_id", opts.authorId);
      const { data, error } = await q;
      if (error) throw error;
      return Promise.all((data ?? []).map(hydratePost));
    },
  });

export const myDraftsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["drafts", userId],
    queryFn: async () => {
      return Promise.all((await getMyDrafts()).map(hydratePost));
    },
  });

export const postQuery = (id: string) =>
  queryOptions({
    queryKey: ["post", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? hydratePost(data) : null;
    },
  });

export const bookmarksQuery = (userId: string) =>
  queryOptions({
    queryKey: ["bookmarks", userId],
    queryFn: async () => {
      return Promise.all((await getMyBookmarks()).map(hydratePost));
    },
  });
