import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const uuid = z.string().uuid();
const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  university: z.string().trim().max(120),
  department: z.string().trim().max(120),
  academicYear: z.string().trim().max(80),
  bio: z.string().trim().max(500),
  interests: z.array(z.string().trim().min(1).max(60)).max(12),
  avatarRef: z.string().max(2048).nullable(),
});

export const getMyDrafts = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getAppDrafts } = await import("@backend/app-data.server");
    return getAppDrafts();
  },
);

export const getMyBookmarks = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getAppBookmarks } = await import("@backend/app-data.server");
    return getAppBookmarks();
  },
);

export const getOwnedPost = createServerFn({ method: "GET" })
  .validator((input) => z.object({ postId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { getOwnedAppPost } = await import("@backend/app-data.server");
    return getOwnedAppPost(data.postId);
  });

export const getMyInteractions = createServerFn({ method: "GET" })
  .validator((input) => z.object({ postId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { getAppInteractions } = await import("@backend/app-data.server");
    return getAppInteractions(data.postId);
  });

export const togglePostInteraction = createServerFn({ method: "POST" })
  .validator((input) =>
    z.object({ postId: uuid, kind: z.enum(["like", "bookmark"]) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { toggleAppInteraction } = await import("@backend/app-data.server");
    return toggleAppInteraction(data.postId, data.kind);
  });

export const getMyFollowStatus = createServerFn({ method: "GET" })
  .validator((input) => z.object({ profileId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { getAppFollowStatus } = await import("@backend/app-data.server");
    return getAppFollowStatus(data.profileId);
  });

export const toggleFollow = createServerFn({ method: "POST" })
  .validator((input) => z.object({ profileId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { toggleAppFollow } = await import("@backend/app-data.server");
    return toggleAppFollow(data.profileId);
  });

export const getMyNotifications = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getAppNotifications } = await import("@backend/app-data.server");
    return getAppNotifications();
  },
);

export const markMyNotificationsRead = createServerFn({
  method: "POST",
}).handler(async () => {
  const { markAppNotificationsRead } = await import("@backend/app-data.server");
  return markAppNotificationsRead();
});

export const getMyUnreadCount = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getAppUnreadCount } = await import("@backend/app-data.server");
    return getAppUnreadCount();
  },
);

export const addComment = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        postId: uuid,
        body: z.string().trim().min(1).max(4000),
        parentId: uuid.nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { addAppComment } = await import("@backend/app-data.server");
    return addAppComment(data);
  });

export const deleteComment = createServerFn({ method: "POST" })
  .validator((input) => z.object({ commentId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { deleteAppComment } = await import("@backend/app-data.server");
    return deleteAppComment(data.commentId);
  });

export const saveMyProfile = createServerFn({ method: "POST" })
  .validator((input) => profileSchema.parse(input))
  .handler(async ({ data }) => {
    const { saveAppProfile } = await import("@backend/app-data.server");
    return saveAppProfile(data);
  });

export const createSignedUpload = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        bucket: z.enum(["avatars", "post-images", "post-audio"]),
        fileName: z.string().min(1).max(255),
        contentType: z.string().min(1).max(120),
        size: z.number().int().positive(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { createAppSignedUpload } = await import("@backend/app-data.server");
    return createAppSignedUpload(data);
  });

export const getMediaSignedUrl = createServerFn({ method: "GET" })
  .validator((input) =>
    z.object({ ref: z.string().min(1).max(2048) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { getAppMediaSignedUrl } = await import("@backend/app-data.server");
    return getAppMediaSignedUrl(data.ref);
  });

export const savePostText = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        postId: uuid.optional(),
        title: z.string().trim().min(4).max(200),
        body: z.string().max(60_000),
        category: z.string().trim().min(1).max(100),
        tags: z.array(z.string().trim().min(1).max(40)).max(10),
        status: z.enum(["draft", "published"]),
        youtubeUrl: z.string().url().max(2048).nullable(),
        youtubeId: z
          .string()
          .regex(/^[A-Za-z0-9_-]{11}$/)
          .nullable(),
        audioTitle: z.string().trim().max(150).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { saveAppPostText } = await import("@backend/app-data.server");
    return saveAppPostText(data);
  });

export const addPostMedia = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        postId: uuid,
        kind: z.enum(["image", "audio"]),
        bucket: z.enum(["post-images", "post-audio"]),
        path: z.string().min(1).max(1024),
        ref: z.string().min(1).max(2048),
        caption: z.string().trim().max(200).nullable(),
        position: z.number().int().min(0).max(10),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { addAppPostMedia } = await import("@backend/app-data.server");
    return addAppPostMedia(data);
  });

export const updatePostMedia = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        mediaId: uuid,
        caption: z.string().trim().max(200).nullable(),
        position: z.number().int().min(0).max(10),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { updateAppPostMedia } = await import("@backend/app-data.server");
    return updateAppPostMedia(data);
  });

export const removePostMedia = createServerFn({ method: "POST" })
  .validator((input) => z.object({ mediaId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { removeAppPostMedia } = await import("@backend/app-data.server");
    return removeAppPostMedia(data.mediaId);
  });

export const deletePost = createServerFn({ method: "POST" })
  .validator((input) => z.object({ postId: uuid }).parse(input))
  .handler(async ({ data }) => {
    const { deleteAppPost } = await import("@backend/app-data.server");
    return deleteAppPost(data.postId);
  });
