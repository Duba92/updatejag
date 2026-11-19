import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  CheckCircle2,
  ImagePlus,
  Loader2,
  Mic,
  Music,
  Square,
  X,
  Youtube,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { uploadFile } from "@/lib/media";
import { hydratePost, type Media } from "@/lib/posts";
import {
  addPostMedia,
  getOwnedPost,
  removePostMedia,
  savePostText,
  updatePostMedia,
} from "@/lib/app.functions";
import {
  AUDIO_TYPES,
  IMAGE_TYPES,
  MAX_AUDIO_MB,
  MAX_IMAGE_MB,
  MAX_IMAGES,
  POST_CATEGORIES,
  validateFile,
} from "@/lib/constants";
import { extractYouTubeId } from "@/lib/youtube";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichEditor } from "@/components/jag/RichEditor";
import { YouTubeEmbed } from "@/components/jag/YouTubeEmbed";
import { AudioPlayer } from "@/components/jag/AudioPlayer";

export const Route = createFileRoute("/_authenticated/create")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { edit?: string | undefined } => ({
    edit: typeof s["edit"] === "string" ? (s["edit"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Share your experience — JAG" },
      {
        name: "description",
        content:
          "Write, add photos, audio and YouTube videos to share your experience.",
      },
      { property: "og:title", content: "Share your experience — JAG" },
      {
        property: "og:description",
        content: "Your experience can guide someone.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Create,
});

type Img = {
  key: string;
  preview: string;
  caption: string;
  file?: File;
  existing?: Media;
  status?: "uploading" | "done" | "error";
};
type Aud = { preview: string; file?: Blob; name: string; existing?: Media };

function Create() {
  const { edit } = Route.useSearch();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const loadOwnedPost = useServerFn(getOwnedPost);
  const saveText = useServerFn(savePostText);
  const addMedia = useServerFn(addPostMedia);
  const updateMedia = useServerFn(updatePostMedia);
  const removeMedia = useServerFn(removePostMedia);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<string>(POST_CATEGORIES[0]);
  const [tags, setTags] = useState("");
  const [images, setImages] = useState<Img[]>([]);
  const [removed, setRemoved] = useState<Media[]>([]);
  const [audio, setAudio] = useState<Aud | null>(null);
  const [audioTitle, setAudioTitle] = useState("");
  const [yt, setYt] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    if (!edit) return;
    loadOwnedPost({ data: { postId: edit } })
      .then(async (row) => {
        if (!row) return void toast.error("You can only edit your own posts.");
        const p = await hydratePost(row);
        setTitle(p.title);
        setBody(p.body);
        setCategory(p.category);
        setTags(p.tags.join(", "));
        setYt(p.youtube_url ?? "");
        setAudioTitle(p.audio_title ?? "");
        setImages(
          p.images.map((m) => ({
            key: m.id,
            preview: m.url,
            caption: m.caption ?? "",
            existing: m,
            status: "done",
          })),
        );
        if (p.audio)
          setAudio({
            preview: p.audio.url,
            name: "Current audio",
            existing: p.audio,
          });
      })
      .catch((error: unknown) =>
        toast.error(
          error instanceof Error
            ? error.message
            : "The post could not be loaded.",
        ),
      );
  }, [edit, loadOwnedPost]);

  const ytId = yt.trim() ? extractYouTubeId(yt) : null;
  const ytInvalid = !!yt.trim() && !ytId;

  const addImages = (files: FileList | null) => {
    if (!files) return;
    const next: Img[] = [];
    for (const f of Array.from(files)) {
      const err = validateFile(f, IMAGE_TYPES, MAX_IMAGE_MB);
      if (err) {
        toast.error(err);
        continue;
      }
      next.push({
        key: crypto.randomUUID(),
        preview: URL.createObjectURL(f),
        caption: "",
        file: f,
      });
    }
    setImages((cur) => {
      const all = [...cur, ...next];
      if (all.length > MAX_IMAGES)
        toast.error(`Up to ${MAX_IMAGES} photos per post.`);
      return all.slice(0, MAX_IMAGES);
    });
  };
  const removeImage = (img: Img) => {
    if (img.existing) setRemoved((r) => [...r, img.existing!]);
    setImages((cur) => cur.filter((i) => i.key !== img.key));
  };
  const pickAudio = (f?: File) => {
    if (!f) return;
    const err = validateFile(f, AUDIO_TYPES, MAX_AUDIO_MB);
    if (err) return void toast.error(err);
    if (audio?.existing) setRemoved((r) => [...r, audio.existing!]);
    setAudio({ preview: URL.createObjectURL(f), file: f, name: f.name });
  };
  const toggleRecord = async () => {
    if (recording) {
      rec.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
        const ext = (mr.mimeType || "audio/webm").includes("mp4")
          ? "m4a"
          : (mr.mimeType || "").includes("ogg")
            ? "ogg"
            : "webm";
        if (audio?.existing) setRemoved((r) => [...r, audio.existing!]);
        setAudio({
          preview: URL.createObjectURL(blob),
          file: blob,
          name: `recording.${ext}`,
        });
        setRecording(false);
      };
      mr.start();
      rec.current = mr;
      setRecording(true);
    } catch {
      toast.error(
        "Microphone access was blocked. Allow it in your browser to record.",
      );
    }
  };

  const save = async (status: "draft" | "published") => {
    if (!user) return;
    if (title.trim().length < 4)
      return void toast.error(
        "Give your post a title (at least 4 characters).",
      );
    if (
      status === "published" &&
      body.replace(/<[^>]+>/g, "").trim().length < 10 &&
      !images.length &&
      !audio &&
      !ytId
    )
      return void toast.error(
        "Add some writing, a photo, audio or a video before publishing.",
      );
    if (ytInvalid) return void toast.error("That YouTube link isn't valid.");
    setBusy(status);
    try {
      const postId = await saveText({
        data: {
          postId: edit,
          title: title.trim().slice(0, 200),
          body,
          category,
          status,
          tags: tags
            .split(",")
            .map((t) => t.trim().replace(/^#/, "").toLowerCase())
            .filter(Boolean)
            .slice(0, 10),
          youtubeUrl: ytId ? yt.trim() : null,
          youtubeId: ytId,
          audioTitle: audio ? audioTitle.trim() || null : null,
        },
      });

      for (const m of removed) {
        await removeMedia({ data: { mediaId: m.id } });
      }
      setRemoved([]);

      const failures: string[] = [];
      for (const [i, img] of images.entries()) {
        if (img.existing) {
          await updateMedia({
            data: {
              mediaId: img.existing.id,
              caption: img.caption || null,
              position: i,
            },
          });
          continue;
        }
        setImages((cur) =>
          cur.map((c) =>
            c.key === img.key ? { ...c, status: "uploading" } : c,
          ),
        );
        try {
          const up = await uploadFile("post-images", img.file!, img.file!.name);
          await addMedia({
            data: {
              postId,
              kind: "image",
              bucket: up.bucket as "post-images",
              path: `${up.bucket}/${up.path}`,
              ref: up.ref,
              caption: img.caption || null,
              position: i,
            },
          });
          setImages((cur) =>
            cur.map((c) => (c.key === img.key ? { ...c, status: "done" } : c)),
          );
        } catch {
          failures.push(img.file!.name);
          setImages((cur) =>
            cur.map((c) => (c.key === img.key ? { ...c, status: "error" } : c)),
          );
        }
      }
      if (audio?.file) {
        try {
          const up = await uploadFile("post-audio", audio.file, audio.name);
          await addMedia({
            data: {
              postId,
              kind: "audio",
              bucket: up.bucket as "post-audio",
              path: `${up.bucket}/${up.path}`,
              ref: up.ref,
              caption: null,
              position: 0,
            },
          });
        } catch {
          failures.push(audio.name);
        }
      }
      qc.invalidateQueries({ queryKey: ["posts"] });
      qc.invalidateQueries({ queryKey: ["post", postId] });
      qc.invalidateQueries({ queryKey: ["drafts"] });
      if (failures.length) {
        toast.error(
          `Saved, but these files didn't upload: ${failures.join(", ")}. Open the post to edit and try again.`,
        );
      } else
        toast.success(
          status === "draft"
            ? "Draft saved"
            : "Published! Thanks for guiding someone.",
        );
      navigate({ to: "/posts/$id", params: { id: postId } });
    } catch (e) {
      toast.error(
        (e as Error).message || "Something went wrong saving your post.",
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-extrabold">
        {edit ? "Edit post" : "Share your experience"}
      </h1>
      <p className="mt-1 text-muted-foreground">
        Combine writing, photos, audio and a YouTube video — whatever helps tell
        your story.
      </p>

      <div className="mt-8 space-y-6">
        <div>
          <Label htmlFor="t">Title</Label>
          <Input
            id="t"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="e.g. How I survived my first exams"
            className="mt-1 h-12 text-lg font-semibold"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="c">Category</Label>
            <select
              id="c"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              {POST_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="tg">Tags</Label>
            <Input
              id="tg"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="gpa, freshman, tips"
              className="mt-1 h-10"
            />
          </div>
        </div>
        <div>
          <Label>Your story</Label>
          <div className="mt-1">
            <RichEditor value={body} onChange={setBody} />
          </div>
        </div>

        <fieldset className="rounded-2xl border p-4">
          <legend className="px-2 text-sm font-semibold">Photos</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((img) => (
              <div key={img.key} className="space-y-1">
                <div className="relative overflow-hidden rounded-xl">
                  <img
                    src={img.preview}
                    alt=""
                    className="aspect-square w-full object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => removeImage(img)}
                    className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-background/90"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {img.status === "uploading" && (
                    <span className="absolute inset-0 grid place-items-center bg-background/60">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </span>
                  )}
                  {img.status === "error" && (
                    <span className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-destructive px-1.5 text-xs text-destructive-foreground">
                      <AlertCircle className="h-3 w-3" />
                      Failed
                    </span>
                  )}
                  {img.status === "done" && !img.existing && (
                    <CheckCircle2 className="absolute bottom-1 left-1 h-5 w-5 text-brand" />
                  )}
                </div>
                <Input
                  value={img.caption}
                  onChange={(e) =>
                    setImages((cur) =>
                      cur.map((c) =>
                        c.key === img.key
                          ? { ...c, caption: e.target.value }
                          : c,
                      ),
                    )
                  }
                  placeholder="Caption"
                  className="h-8 text-xs"
                  maxLength={200}
                />
              </div>
            ))}
            {images.length < MAX_IMAGES && (
              <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed text-muted-foreground hover:border-brand hover:text-brand">
                <span className="flex flex-col items-center gap-1 text-xs font-semibold">
                  <ImagePlus className="h-6 w-6" />
                  Add photos
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    addImages(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            JPEG, PNG or WebP · up to {MAX_IMAGE_MB} MB each · max {MAX_IMAGES}
          </p>
        </fieldset>

        <fieldset className="rounded-2xl border p-4">
          <legend className="px-2 text-sm font-semibold">Audio</legend>
          {audio ? (
            <div className="space-y-3">
              <AudioPlayer
                src={audio.preview}
                title={audioTitle || audio.name}
              />
              <Input
                value={audioTitle}
                onChange={(e) => setAudioTitle(e.target.value)}
                placeholder="Audio title"
                maxLength={150}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (audio.existing)
                    setRemoved((r) => [...r, audio.existing!]);
                  setAudio(null);
                }}
              >
                <X /> Remove audio
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-semibold hover:border-brand hover:text-brand">
                <Music className="h-4 w-4" /> Upload audio
                <input
                  type="file"
                  accept=".mp3,.wav,.m4a,.ogg,audio/*"
                  className="sr-only"
                  onChange={(e) => {
                    pickAudio(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              <Button
                type="button"
                variant={recording ? "destructive" : "outline"}
                className="rounded-full"
                onClick={toggleRecord}
              >
                {recording ? (
                  <>
                    <Square /> Stop recording
                  </>
                ) : (
                  <>
                    <Mic /> Record
                  </>
                )}
              </Button>
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            MP3, WAV, M4A or OGG · up to {MAX_AUDIO_MB} MB
          </p>
        </fieldset>

        <fieldset className="rounded-2xl border p-4">
          <legend className="px-2 text-sm font-semibold">YouTube video</legend>
          <div className="relative">
            <Youtube className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={yt}
              onChange={(e) => setYt(e.target.value)}
              placeholder="https://youtube.com/watch?v=… or youtu.be/…"
              className="pl-9"
              aria-invalid={ytInvalid}
            />
          </div>
          {ytInvalid && (
            <p className="mt-2 text-xs text-destructive">
              That doesn't look like a YouTube video link.
            </p>
          )}
          {ytId && (
            <div className="mt-3">
              <YouTubeEmbed id={ytId} />
            </div>
          )}
        </fieldset>

        <div className="sticky bottom-20 flex gap-3 rounded-2xl border bg-background/95 p-3 shadow-card backdrop-blur md:bottom-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={!!busy}
            onClick={() => save("draft")}
          >
            {busy === "draft" ? <Loader2 className="animate-spin" /> : null}Save
            draft
          </Button>
          <Button
            type="button"
            variant="brand"
            className="flex-1"
            disabled={!!busy}
            onClick={() => save("published")}
          >
            {busy === "published" ? <Loader2 className="animate-spin" /> : null}
            Publish
          </Button>
        </div>
      </div>
    </div>
  );
}
