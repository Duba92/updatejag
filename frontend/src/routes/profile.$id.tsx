import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";
import { getMyFollowStatus, toggleFollow } from "@/lib/app.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { resolveMediaUrl } from "@/lib/media";
import { bookmarksQuery, myDraftsQuery, postsQuery } from "@/lib/posts";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/jag/PostCard";
import { UserAvatar } from "@/components/jag/UserAvatar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile/$id")({
  head: () => ({
    meta: [
      { title: "Student profile — JAG" },
      {
        name: "description",
        content: "See this student's experiences on JAG.",
      },
      { property: "og:title", content: "Student profile — JAG" },
      { property: "og:description", content: "Experiences shared on JAG." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const isMe = user?.id === id;
  const [tab, setTab] = useState<
    "posts" | "photos" | "audio" | "saved" | "drafts"
  >("posts");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      return data
        ? { ...data, avatar: await resolveMediaUrl(data.avatar_url) }
        : null;
    },
  });
  const { data: counts } = useQuery({
    queryKey: ["follow-counts", id, user?.id],
    queryFn: async () => {
      const [a, b, me] = await Promise.all([
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", id),
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", id),
        user
          ? getMyFollowStatus({ data: { profileId: id } })
          : Promise.resolve(false),
      ]);
      return { followers: a.count ?? 0, following: b.count ?? 0, iFollow: me };
    },
  });
  const { data: posts = [] } = useQuery(
    postsQuery({ authorId: id, limit: 100 }),
  );
  const { data: saved = [] } = useQuery({
    ...bookmarksQuery(id),
    enabled: isMe,
  });
  const { data: drafts = [] } = useQuery({
    ...myDraftsQuery(id),
    enabled: isMe,
  });

  const follow = useMutation({
    mutationFn: async () => {
      if (!user) return navigate({ to: "/auth" });
      await toggleFollow({ data: { profileId: id } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["follow-counts", id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading)
    return (
      <div className="mx-auto mt-10 h-60 max-w-4xl animate-pulse rounded-3xl bg-muted" />
    );
  if (!profile)
    return (
      <p className="py-24 text-center text-muted-foreground">
        This student doesn't exist.
      </p>
    );

  const list =
    tab === "photos"
      ? posts.filter((p) => p.images.length)
      : tab === "audio"
        ? posts.filter((p) => p.audio)
        : tab === "saved"
          ? saved
          : tab === "drafts"
            ? drafts
            : posts;
  const tabs = [
    "posts",
    "photos",
    "audio",
    ...(isMe ? ["saved", "drafts"] : []),
  ] as const;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-6 rounded-[2rem] bg-secondary p-6 md:flex-row md:items-center md:p-10">
        <UserAvatar
          name={profile.full_name || "Student"}
          src={profile.avatar}
          className="h-24 w-24 text-2xl"
        />
        <div className="flex-1">
          <h1 className="text-3xl font-extrabold">
            {profile.full_name || "JAG student"}
          </h1>
          {(profile.university || profile.department) && (
            <p className="mt-1 flex items-center gap-2 text-muted-foreground">
              <GraduationCap className="h-4 w-4" />
              {[profile.department, profile.university, profile.academic_year]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          {profile.bio && <p className="mt-3 max-w-2xl">{profile.bio}</p>}
          {profile.interests.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.interests.map((i) => (
                <span
                  key={i}
                  className="rounded-full bg-background px-3 py-1 text-xs font-medium"
                >
                  {i}
                </span>
              ))}
            </div>
          )}
          <div className="mt-4 flex gap-6 text-sm">
            <span>
              <b>{posts.length}</b> posts
            </span>
            <span>
              <b>{counts?.followers ?? 0}</b> followers
            </span>
            <span>
              <b>{counts?.following ?? 0}</b> following
            </span>
          </div>
        </div>
        {isMe ? (
          <Button variant="outline" asChild>
            <Link to="/settings">Edit profile</Link>
          </Button>
        ) : (
          <Button
            variant={counts?.iFollow ? "outline" : "brand"}
            onClick={() => follow.mutate()}
          >
            {counts?.iFollow ? "Following" : "Follow"}
          </Button>
        )}
      </div>
      <div className="mt-8 flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as typeof tab)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold capitalize",
              tab === t
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </div>
      {!list.length && (
        <p className="mt-6 rounded-3xl border border-dashed p-12 text-center text-muted-foreground">
          Nothing here yet.
        </p>
      )}
    </div>
  );
}
