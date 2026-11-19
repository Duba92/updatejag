import { createHash } from "node:crypto";
import { supabaseAdmin } from "@backend/integrations/supabase/client.server";
import { getAppSessionUser, requireAppSessionUser } from "@backend/app-auth.server";

const POST_SELECT =
  "*, author:profiles!posts_author_id_fkey(id, full_name, avatar_url, university), post_media(*), likes(count), comments(count)";
const ALLOWED_BUCKETS = ["avatars", "post-images", "post-audio"] as const;
type AllowedBucket = (typeof ALLOWED_BUCKETS)[number];

function throwOnError(
  error: { message: string } | null,
  message = "That action couldn't be completed. Please try again.",
) {
  if (error) {
    console.error(message, error.message);
    throw new Error(message);
  }
}

export async function getAppDrafts() {
  const user = await requireAppSessionUser();
  const { data, error } = await supabaseAdmin
    .from("posts")
    .select(POST_SELECT)
    .eq("author_id", user.id)
    .eq("status", "draft")
    .order("updated_at", { ascending: false });
  throwOnError(error);
  return data ?? [];
}

export async function getAppBookmarks() {
  const user = await requireAppSessionUser();
  const { data, error } = await supabaseAdmin
    .from("bookmarks")
    .select(`post:posts(${POST_SELECT})`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  throwOnError(error);
  return (data ?? []).flatMap((row) => (row.post ? [row.post] : []));
}

export async function getOwnedAppPost(postId: string) {
  const user = await requireAppSessionUser();
  const { data, error } = await supabaseAdmin
    .from("posts")
    .select(POST_SELECT)
    .eq("id", postId)
    .eq("author_id", user.id)
    .maybeSingle();
  throwOnError(error);
  return data;
}

export async function getAppInteractions(postId: string) {
  const user = await requireAppSessionUser();
  const [like, bookmark] = await Promise.all([
    supabaseAdmin
      .from("likes")
      .select("post_id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabaseAdmin
      .from("bookmarks")
      .select("post_id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  throwOnError(like.error);
  throwOnError(bookmark.error);
  return { liked: !!like.data, saved: !!bookmark.data };
}

export async function toggleAppInteraction(postId: string, kind: "like" | "bookmark") {
  const user = await requireAppSessionUser();
  const { data: post, error: postError } = await supabaseAdmin
    .from("posts")
    .select("id, status")
    .eq("id", postId)
    .maybeSingle();
  throwOnError(postError);
  if (!post || post.status !== "published") throw new Error("This post isn't available.");

  if (kind === "like") {
    const { data: existing, error } = await supabaseAdmin
      .from("likes")
      .select("post_id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();
    throwOnError(error);
    if (existing) {
      const { error: deleteError } = await supabaseAdmin
        .from("likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);
      throwOnError(deleteError);
      return { active: false };
    }
    const { error: insertError } = await supabaseAdmin
      .from("likes")
      .insert({ post_id: postId, user_id: user.id });
    throwOnError(insertError);
    return { active: true };
  }

  const { data: existing, error } = await supabaseAdmin
    .from("bookmarks")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();
  throwOnError(error);
  if (existing) {
    const { error: deleteError } = await supabaseAdmin
      .from("bookmarks")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
    throwOnError(deleteError);
    return { active: false };
  }
  const { error: insertError } = await supabaseAdmin
    .from("bookmarks")
    .insert({ post_id: postId, user_id: user.id });
  throwOnError(insertError);
  return { active: true };
}

export async function getAppFollowStatus(profileId: string) {
  const user = await requireAppSessionUser();
  const { data, error } = await supabaseAdmin
    .from("follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("following_id", profileId)
    .maybeSingle();
  throwOnError(error);
  return !!data;
}

export async function toggleAppFollow(profileId: string) {
  const user = await requireAppSessionUser();
  if (profileId === user.id) throw new Error("You can't follow your own profile.");
  const { data: target, error: targetError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .maybeSingle();
  throwOnError(targetError);
  if (!target) throw new Error("This profile doesn't exist.");
  const { data: existing, error } = await supabaseAdmin
    .from("follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("following_id", profileId)
    .maybeSingle();
  throwOnError(error);
  if (existing) {
    const { error: deleteError } = await supabaseAdmin
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", profileId);
    throwOnError(deleteError);
    return { following: false };
  }
  const { error: insertError } = await supabaseAdmin
    .from("follows")
    .insert({ follower_id: user.id, following_id: profileId });
  throwOnError(insertError);
  return { following: true };
}

export async function getAppNotifications() {
  const user = await requireAppSessionUser();
  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select(
      "*, actor:profiles!notifications_actor_id_fkey(id, full_name, avatar_url), post:posts(id, title)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  throwOnError(error);
  return data ?? [];
}

export async function markAppNotificationsRead() {
  const user = await requireAppSessionUser();
  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);
  throwOnError(error);
}

export async function getAppUnreadCount() {
  const user = await requireAppSessionUser();
  const { count, error } = await supabaseAdmin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("read", false);
  throwOnError(error);
  return count ?? 0;
}

export async function addAppComment(input: {
  postId: string;
  body: string;
  parentId: string | null;
}) {
  const user = await requireAppSessionUser();
  const body = input.body.trim();
  if (!body) throw new Error("Write a comment before posting.");
  const { data: post, error: postError } = await supabaseAdmin
    .from("posts")
    .select("id, status")
    .eq("id", input.postId)
    .maybeSingle();
  throwOnError(postError);
  if (!post || post.status !== "published") throw new Error("This post isn't available.");
  if (input.parentId) {
    const { data: parent, error: parentError } = await supabaseAdmin
      .from("comments")
      .select("id")
      .eq("id", input.parentId)
      .eq("post_id", input.postId)
      .maybeSingle();
    throwOnError(parentError);
    if (!parent) throw new Error("That comment is no longer available.");
  }
  const { error } = await supabaseAdmin.from("comments").insert({
    post_id: input.postId,
    author_id: user.id,
    body,
    parent_id: input.parentId,
  });
  throwOnError(error);
}

export async function deleteAppComment(commentId: string) {
  const user = await requireAppSessionUser();
  const { data: comment, error: commentError } = await supabaseAdmin
    .from("comments")
    .select("author_id")
    .eq("id", commentId)
    .maybeSingle();
  throwOnError(commentError);
  if (!comment) return;
  const { data: role, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  throwOnError(roleError);
  if (comment.author_id !== user.id && !role)
    throw new Error("You can only delete your own comments.");
  const { error } = await supabaseAdmin.from("comments").delete().eq("id", commentId);
  throwOnError(error);
}

export async function saveAppProfile(input: {
  fullName: string;
  university: string;
  department: string;
  academicYear: string;
  bio: string;
  interests: string[];
  avatarRef: string | null;
}) {
  const user = await requireAppSessionUser();
  if (input.avatarRef?.startsWith("storage:")) {
    const prefix = `storage:avatars/${user.id}/`;
    if (!input.avatarRef.startsWith(prefix))
      throw new Error("You can only use your own profile photo.");
  } else if (input.avatarRef) {
    let url: URL;
    try {
      url = new URL(input.avatarRef);
    } catch {
      throw new Error("That profile photo URL isn't valid.");
    }
    if (url.protocol !== "https:") throw new Error("Profile photos must use HTTPS.");
  }
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      full_name: input.fullName.trim(),
      university: input.university.trim() || null,
      department: input.department.trim() || null,
      academic_year: input.academicYear.trim() || null,
      bio: input.bio.trim() || null,
      interests: input.interests
        .map((interest) => interest.trim())
        .filter(Boolean)
        .slice(0, 12),
      avatar_url: input.avatarRef,
      onboarded: true,
    })
    .eq("id", user.id);
  throwOnError(error);
}

export async function createAppSignedUpload(input: {
  bucket: AllowedBucket;
  fileName: string;
  contentType: string;
  size: number;
}) {
  const user = await requireAppSessionUser();
  const constraints: Record<AllowedBucket, { maxSize: number; types: string[] }> = {
    avatars: { maxSize: 5 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp"] },
    "post-images": { maxSize: 8 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp"] },
    "post-audio": {
      maxSize: 10 * 1024 * 1024,
      types: ["audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg", "audio/webm", "audio/x-m4a"],
    },
  };
  const contentType = input.contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  const constraint = constraints[input.bucket];
  if (input.size > constraint.maxSize || !constraint.types.includes(contentType)) {
    throw new Error("That file type or size isn't supported.");
  }
  const uploadLimit = await supabaseAdmin.rpc("consume_app_auth_attempt", {
    _key_hash: createHash("sha256")
      .update(`upload:${user.id}:${new Date().toISOString().slice(0, 10)}`)
      .digest("base64"),
    _limit: 100,
    _window_seconds: 24 * 60 * 60,
  });
  if (uploadLimit.error) throw new Error("Uploads are temporarily unavailable. Please try again.");
  if (!uploadLimit.data)
    throw new Error("You have reached today's upload limit. Try again tomorrow.");
  const suffix = input.fileName.split(".").pop() ?? "bin";
  const extension = /^[a-zA-Z0-9]{1,10}$/.test(suffix) ? suffix.toLowerCase() : "bin";
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const { data, error } = await supabaseAdmin.storage
    .from(input.bucket)
    .createSignedUploadUrl(path, { upsert: false });
  if (error) {
    console.error("createAppSignedUpload failed", error.message);
    throw new Error("We couldn't prepare that upload. Please try again.");
  }
  if (!data) throw new Error("We couldn't prepare that upload. Please try again.");
  return { bucket: input.bucket, path: data.path, token: data.token, contentType };
}

export async function getAppMediaSignedUrl(ref: string) {
  if (!ref.startsWith("storage:")) return ref;
  const [, bucket, ...segments] = ref.split(/[/:]/);
  const path = segments.join("/");
  if (
    !ALLOWED_BUCKETS.includes(bucket as AllowedBucket) ||
    !path ||
    segments.some((part) => !part || part === "." || part === "..")
  ) {
    return null;
  }
  let allowed = false;
  const user = await getAppSessionUser();
  if (bucket === "avatars") {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("avatar_url", ref)
      .maybeSingle();
    throwOnError(error);
    allowed = !!data && path.startsWith(`${data.id}/`);
  } else {
    const { data, error } = await supabaseAdmin
      .from("post_media")
      .select("path, owner_id, post:posts!inner(author_id, status)")
      .eq("url", ref)
      .maybeSingle();
    throwOnError(error);
    const post = data?.post;
    allowed =
      !!data &&
      data.path === `${bucket}/${path}` &&
      data.owner_id === post?.author_id &&
      path.startsWith(`${post?.author_id}/`) &&
      !!post &&
      (post.status === "published" || post.author_id === user?.id);
  }
  if (!allowed) return null;
  const { data, error } = await supabaseAdmin.storage
    .from(bucket as AllowedBucket)
    .createSignedUrl(path, 6 * 60 * 60);
  if (error) {
    console.error("getAppMediaSignedUrl failed", error.message);
    throw new Error("We couldn't load this media. Please try again.");
  }
  return data.signedUrl;
}

export async function saveAppPostText(input: {
  postId?: string | undefined;
  title: string;
  body: string;
  category: string;
  tags: string[];
  status: "draft" | "published";
  youtubeUrl: string | null;
  youtubeId: string | null;
  audioTitle: string | null;
}) {
  const user = await requireAppSessionUser();
  const row = {
    title: input.title.trim(),
    body: input.body,
    category: input.category,
    tags: input.tags
      .map((tag) => tag.trim().replace(/^#/, "").toLowerCase())
      .filter(Boolean)
      .slice(0, 10),
    status: input.status,
    youtube_url: input.youtubeUrl,
    youtube_id: input.youtubeId,
    audio_title: input.audioTitle?.trim() || null,
    updated_at: new Date().toISOString(),
  };
  if (input.postId) {
    const { data, error } = await supabaseAdmin
      .from("posts")
      .update(row)
      .eq("id", input.postId)
      .eq("author_id", user.id)
      .select("id")
      .maybeSingle();
    throwOnError(error);
    if (!data) throw new Error("You can only edit your own posts.");
    return data.id;
  }
  const { data, error } = await supabaseAdmin
    .from("posts")
    .insert({ ...row, author_id: user.id, is_sample: false, featured: false })
    .select("id")
    .single();
  throwOnError(error);
  if (!data) throw new Error("The post could not be saved.");
  return data.id;
}

export async function addAppPostMedia(input: {
  postId: string;
  kind: "image" | "audio";
  bucket: "post-images" | "post-audio";
  path: string;
  ref: string;
  caption: string | null;
  position: number;
}) {
  const user = await requireAppSessionUser();
  const expectedBucket = input.kind === "image" ? "post-images" : "post-audio";
  if (
    input.bucket !== expectedBucket ||
    !input.path.startsWith(`${input.bucket}/${user.id}/`) ||
    input.ref !== `storage:${input.path}`
  ) {
    throw new Error("That media upload isn't valid.");
  }
  const { data: post, error: postError } = await supabaseAdmin
    .from("posts")
    .select("id")
    .eq("id", input.postId)
    .eq("author_id", user.id)
    .maybeSingle();
  throwOnError(postError);
  if (!post) throw new Error("You can only add media to your own posts.");
  const { error } = await supabaseAdmin.from("post_media").insert({
    post_id: input.postId,
    owner_id: user.id,
    kind: input.kind,
    url: input.ref,
    path: input.path,
    caption: input.caption,
    position: input.position,
  });
  if (error) {
    try {
      await removeStoredMedia(input.path, user.id);
    } catch (cleanupError) {
      console.error("Failed to clean up an unreferenced upload", cleanupError);
    }
    throwOnError(error);
  }
}

export async function updateAppPostMedia(input: {
  mediaId: string;
  caption: string | null;
  position: number;
}) {
  const user = await requireAppSessionUser();
  const { data: media, error: mediaError } = await supabaseAdmin
    .from("post_media")
    .select("id, post_id")
    .eq("id", input.mediaId)
    .maybeSingle();
  throwOnError(mediaError);
  if (!media) throw new Error("That media item isn't available.");
  const { data: post, error: postError } = await supabaseAdmin
    .from("posts")
    .select("id")
    .eq("id", media.post_id)
    .eq("author_id", user.id)
    .maybeSingle();
  throwOnError(postError);
  if (!post) throw new Error("You can only edit media on your own posts.");
  const { error } = await supabaseAdmin
    .from("post_media")
    .update({ caption: input.caption, position: input.position })
    .eq("id", input.mediaId);
  throwOnError(error);
}

async function removeStoredMedia(path: string | null, ownerId: string) {
  if (!path) return;
  const [bucket, ...pathParts] = path.split("/");
  if (
    !ALLOWED_BUCKETS.includes(bucket as AllowedBucket) ||
    pathParts.length < 2 ||
    pathParts[0] !== ownerId ||
    pathParts.some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error("Stored media path does not belong to this account.");
  }
  const { error } = await supabaseAdmin.storage
    .from(bucket as AllowedBucket)
    .remove([pathParts.join("/")]);
  if (error) {
    console.error("removeStoredMedia failed", error.message);
    throw new Error("We couldn't remove an uploaded file. Please try again.");
  }
}

export async function removeAppPostMedia(mediaId: string) {
  const user = await requireAppSessionUser();
  const { data: media, error: mediaError } = await supabaseAdmin
    .from("post_media")
    .select("id, owner_id, post_id, path")
    .eq("id", mediaId)
    .maybeSingle();
  throwOnError(mediaError);
  if (!media || media.owner_id !== user.id)
    throw new Error("You can only remove media from your own posts.");
  const { data: post, error: postError } = await supabaseAdmin
    .from("posts")
    .select("id")
    .eq("id", media.post_id)
    .eq("author_id", user.id)
    .maybeSingle();
  throwOnError(postError);
  if (!post) throw new Error("You can only remove media from your own posts.");
  await removeStoredMedia(media.path, user.id);
  const { error } = await supabaseAdmin.from("post_media").delete().eq("id", mediaId);
  throwOnError(error);
}

export async function deleteAppPost(postId: string) {
  const user = await requireAppSessionUser();
  const { data: post, error: postError } = await supabaseAdmin
    .from("posts")
    .select("id")
    .eq("id", postId)
    .eq("author_id", user.id)
    .maybeSingle();
  throwOnError(postError);
  if (!post) throw new Error("You can only delete your own posts.");
  const { data: media, error: mediaError } = await supabaseAdmin
    .from("post_media")
    .select("path, owner_id")
    .eq("post_id", postId);
  throwOnError(mediaError);
  const { error } = await supabaseAdmin
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", user.id);
  throwOnError(error);
  let cleanupFailed = false;
  for (const item of media ?? []) {
    if (!item.path) continue;
    try {
      if (item.owner_id !== user.id) throw new Error("Post media ownership does not match.");
      await removeStoredMedia(item.path, user.id);
    } catch (cleanupError) {
      console.error("Post media cleanup failed after post deletion", cleanupError);
      cleanupFailed = true;
    }
  }
  if (cleanupFailed)
    throw new Error("The post was deleted, but some media files could not be removed.");
}
