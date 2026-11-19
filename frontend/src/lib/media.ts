import { supabase } from "@/integrations/supabase/client";
import { createSignedUpload, getMediaSignedUrl } from "@/lib/app.functions";

/** Uploaded files are stored as "storage:<bucket>/<path>"; external URLs are used as-is. */
export const STORAGE_PREFIX = "storage:";

const cache = new Map<string, { url: string; exp: number }>();

export async function resolveMediaUrl(
  ref: string | null | undefined,
): Promise<string | null> {
  if (!ref) return null;
  if (!ref.startsWith(STORAGE_PREFIX)) return ref;
  const hit = cache.get(ref);
  if (hit && hit.exp > Date.now()) return hit.url;
  const signedUrl = await getMediaSignedUrl({ data: { ref } });
  if (!signedUrl) return null;
  cache.set(ref, { url: signedUrl, exp: Date.now() + 1000 * 60 * 60 * 5 });
  return signedUrl;
}

export async function uploadFile(
  bucket: string,
  file: File | Blob,
  name: string,
) {
  if (
    bucket !== "avatars" &&
    bucket !== "post-images" &&
    bucket !== "post-audio"
  ) {
    throw new Error("Unsupported upload destination.");
  }
  const contentType = file.type || "application/octet-stream";
  const upload = await createSignedUpload({
    data: { bucket, fileName: name, contentType, size: file.size },
  });
  const { error } = await supabase.storage
    .from(upload.bucket)
    .uploadToSignedUrl(upload.path, upload.token, file, {
      contentType: upload.contentType,
    });
  if (error) throw error;
  return {
    ref: `${STORAGE_PREFIX}${upload.bucket}/${upload.path}`,
    bucket: upload.bucket,
    path: upload.path,
  };
}
