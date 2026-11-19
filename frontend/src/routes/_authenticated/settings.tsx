import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth, useMyProfile } from "@/lib/auth";
import { uploadFile } from "@/lib/media";
import { saveMyProfile } from "@/lib/app.functions";
import { IMAGE_TYPES, validateFile } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/jag/UserAvatar";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Your profile — JAG" },
      { name: "description", content: "Edit your JAG student profile." },
      { property: "og:title", content: "Your profile — JAG" },
      { property: "og:description", content: "Edit your JAG student profile." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Settings,
});

const YEARS = [
  "Pre-university",
  "1st year",
  "2nd year",
  "3rd year",
  "4th year",
  "5th year",
  "Graduate",
  "Alumni",
];

function Settings() {
  const { user } = useAuth();
  const { data: me, isLoading } = useMyProfile();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const saveProfile = useServerFn(saveMyProfile);
  const [f, setF] = useState({
    full_name: "",
    university: "",
    department: "",
    academic_year: "",
    bio: "",
    interests: "",
  });
  const [avatarRef, setAvatarRef] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!me) return;
    setF({
      full_name: me.full_name,
      university: me.university ?? "Haramaya University",
      department: me.department ?? "",
      academic_year: me.academic_year ?? "",
      bio: me.bio ?? "",
      interests: me.interests.join(", "),
    });
    setAvatarRef(me.avatar_url);
    setPreview(me.avatar);
  }, [me]);

  const pick = async (file?: File) => {
    if (!file || !user) return;
    const err = validateFile(file, IMAGE_TYPES, 5);
    if (err) return void toast.error(err);
    setPreview(URL.createObjectURL(file));
    try {
      const r = await uploadFile("avatars", file, file.name);
      setAvatarRef(r.ref);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Photo upload failed. Try again.",
      );
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.full_name.trim().length < 2)
      return void toast.error("Please enter your full name.");
    setBusy(true);
    try {
      await saveProfile({
        data: {
          fullName: f.full_name.trim().slice(0, 80),
          university: f.university.trim(),
          department: f.department.trim(),
          academicYear: f.academic_year,
          bio: f.bio.trim().slice(0, 500),
          avatarRef,
          interests: f.interests
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 12),
        },
      });
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      navigate({ to: "/profile/$id", params: { id: user!.id } });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Profile could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (isLoading)
    return (
      <div className="mx-auto mt-10 h-96 max-w-xl animate-pulse rounded-3xl bg-muted" />
    );
  const set =
    (k: keyof typeof f) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) =>
      setF({ ...f, [k]: e.target.value });

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-3xl font-extrabold">
        {me?.onboarded ? "Edit profile" : "Welcome to JAG!"}
      </h1>
      {!me?.onboarded && (
        <p className="mt-1 text-muted-foreground">
          Tell other students a little about you.
        </p>
      )}
      <form onSubmit={save} className="mt-8 space-y-5">
        <label className="flex cursor-pointer items-center gap-4">
          <span className="relative">
            <UserAvatar
              name={f.full_name || "Me"}
              src={preview}
              className="h-20 w-20 text-lg"
            />
            <span className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-brand text-brand-foreground">
              <Camera className="h-4 w-4" />
            </span>
          </span>
          <span className="text-sm font-semibold text-brand">
            Change profile photo
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </label>
        <div>
          <Label htmlFor="n">Full name *</Label>
          <Input
            id="n"
            required
            value={f.full_name}
            onChange={set("full_name")}
            maxLength={80}
          />
        </div>
        <div>
          <Label htmlFor="u">University or college</Label>
          <Input
            id="u"
            value={f.university}
            onChange={set("university")}
            placeholder="e.g. Haramaya University"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="d">Department</Label>
            <Input id="d" value={f.department} onChange={set("department")} />
          </div>
          <div>
            <Label htmlFor="y">Academic year</Label>
            <select
              id="y"
              value={f.academic_year}
              onChange={set("academic_year")}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Select…</option>
              {YEARS.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="b">Bio</Label>
          <Textarea
            id="b"
            value={f.bio}
            onChange={set("bio")}
            maxLength={500}
            rows={3}
          />
        </div>
        <div>
          <Label htmlFor="i">Skills & interests</Label>
          <Input
            id="i"
            value={f.interests}
            onChange={set("interests")}
            placeholder="Coding, debate, photography"
          />
        </div>
        <Button
          type="submit"
          variant="brand"
          className="w-full"
          disabled={busy}
        >
          {busy ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </div>
  );
}
