import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Bell } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  getMyNotifications,
  markMyNotificationsRead,
} from "@/lib/app.functions";
import { resolveMediaUrl } from "@/lib/media";
import { UserAvatar } from "@/components/jag/UserAvatar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — JAG" },
      { name: "description", content: "Your JAG notifications." },
      { property: "og:title", content: "Notifications — JAG" },
      { property: "og:description", content: "Your JAG notifications." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Notifications,
});

const TEXT: Record<string, string> = {
  like: "liked your post",
  comment: "commented on your post",
  reply: "replied to your comment",
  follow: "started following you",
};

function Notifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const loadNotifications = useServerFn(getMyNotifications);
  const markRead = useServerFn(markMyNotificationsRead);
  const { data, isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const notifications = await loadNotifications();
      return Promise.all(
        notifications.map(async (n) => ({
          ...n,
          avatar: await resolveMediaUrl(n.actor?.avatar_url),
        })),
      );
    },
  });
  useEffect(() => {
    if (!data?.some((n) => !n.read)) return;
    const t = setTimeout(async () => {
      try {
        await markRead();
        qc.invalidateQueries({ queryKey: ["unread"] });
        qc.invalidateQueries({ queryKey: ["notifications"] });
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Notifications could not be marked as read.",
        );
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [data, user, qc, markRead]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-extrabold">Notifications</h1>
      {isLoading ? (
        <div className="mt-6 h-40 animate-pulse rounded-3xl bg-muted" />
      ) : !data?.length ? (
        <div className="mt-8 rounded-3xl border border-dashed p-14 text-center">
          <Bell className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-display text-lg font-bold">
            You're all caught up
          </p>
          <p className="text-sm text-muted-foreground">
            Likes, comments and new followers show up here.
          </p>
        </div>
      ) : (
        <ul className="mt-6 divide-y rounded-3xl border bg-card">
          {data.map((n) => (
            <li
              key={n.id}
              className={cn(
                "flex items-center gap-3 p-4",
                !n.read && "bg-accent/50",
              )}
            >
              <UserAvatar
                name={n.actor?.full_name || "Student"}
                src={n.avatar}
              />
              <p className="flex-1 text-sm">
                <Link
                  to="/profile/$id"
                  params={{ id: n.actor_id! }}
                  className="font-semibold"
                >
                  {n.actor?.full_name || "A student"}
                </Link>{" "}
                {TEXT[n.type] ?? n.type}
                {n.post && (
                  <>
                    {" "}
                    ·{" "}
                    <Link
                      to="/posts/$id"
                      params={{ id: n.post.id }}
                      className="text-brand"
                    >
                      {n.post.title}
                    </Link>
                  </>
                )}
              </p>
              <span className="text-xs text-muted-foreground">
                {new Date(n.created_at).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
