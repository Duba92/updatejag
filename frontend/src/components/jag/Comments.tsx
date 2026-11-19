import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { addComment, deleteComment } from "@/lib/app.functions";
import { useAuth } from "@/lib/auth";
import { resolveMediaUrl } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "./UserAvatar";

type C = {
  id: string;
  body: string;
  parent_id: string | null;
  created_at: string;
  author_id: string;
  author: { id: string; full_name: string; avatar: string | null } | null;
};

export function Comments({ postId }: { postId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["comments", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select(
          "*, author:profiles!comments_author_id_fkey(id, full_name, avatar_url)",
        )
        .eq("post_id", postId)
        .order("created_at");
      if (error) throw error;
      return Promise.all(
        data.map(async (c) => ({
          ...c,
          author: c.author
            ? {
                ...c.author,
                avatar: await resolveMediaUrl(c.author.avatar_url),
              }
            : null,
        })),
      ) as Promise<C[]>;
    },
  });
  const add = useMutation({
    mutationFn: async ({ body, parent }: { body: string; parent?: string }) => {
      await addComment({ data: { postId, body, parentId: parent ?? null } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", postId] });
      qc.invalidateQueries({ queryKey: ["post", postId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      await deleteComment({ data: { commentId: id } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", postId] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const roots = data.filter((c) => !c.parent_id);
  const replies = (id: string) => data.filter((c) => c.parent_id === id);

  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold">Comments ({data.length})</h2>
      {user ? (
        <Composer onSubmit={(body) => add.mutateAsync({ body })} />
      ) : (
        <p className="mt-4 rounded-2xl bg-secondary p-4 text-sm">
          <Link to="/auth" className="font-semibold text-brand">
            Sign in
          </Link>{" "}
          to join the conversation.
        </p>
      )}
      <ul className="mt-6 space-y-6">
        {roots.map((c) => (
          <li key={c.id}>
            <CommentItem
              c={c}
              canDelete={c.author_id === user?.id}
              onDelete={() => del.mutate(c.id)}
              onReply={
                user
                  ? (body) => add.mutateAsync({ body, parent: c.id })
                  : undefined
              }
            />
            <ul className="ml-11 mt-4 space-y-4 border-l pl-4">
              {replies(c.id).map((r) => (
                <li key={r.id}>
                  <CommentItem
                    c={r}
                    canDelete={r.author_id === user?.id}
                    onDelete={() => del.mutate(r.id)}
                  />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CommentItem({
  c,
  canDelete,
  onDelete,
  onReply,
}: {
  c: C;
  canDelete: boolean;
  onDelete: () => void;
  onReply?: ((b: string) => Promise<void>) | undefined;
}) {
  const [replying, setReplying] = useState(false);
  const name = c.author?.full_name || "JAG student";
  return (
    <div className="flex gap-3">
      <UserAvatar name={name} src={c.author?.avatar} className="h-8 w-8" />
      <div className="flex-1">
        <p className="text-sm">
          <Link
            to="/profile/$id"
            params={{ id: c.author_id }}
            className="font-semibold hover:text-brand"
          >
            {name}
          </Link>{" "}
          <span className="text-xs text-muted-foreground">
            {new Date(c.created_at).toLocaleDateString()}
          </span>
        </p>
        <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
        <div className="mt-1 flex gap-3 text-xs font-semibold text-muted-foreground">
          {onReply && (
            <button
              onClick={() => setReplying((v) => !v)}
              className="hover:text-brand"
            >
              Reply
            </button>
          )}
          {canDelete && (
            <button onClick={onDelete} className="hover:text-destructive">
              Delete
            </button>
          )}
        </div>
        {replying && onReply && (
          <Composer
            small
            onSubmit={async (b) => {
              await onReply(b);
              setReplying(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

function Composer({
  onSubmit,
  small,
}: {
  onSubmit: (b: string) => Promise<void>;
  small?: boolean;
}) {
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!v.trim()) return;
        setBusy(true);
        try {
          await onSubmit(v.trim());
          setV("");
        } finally {
          setBusy(false);
        }
      }}
    >
      <Textarea
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder={
          small ? "Write a reply…" : "Share a thought or encouragement…"
        }
        rows={small ? 2 : 3}
        maxLength={4000}
      />
      <Button
        type="submit"
        size="sm"
        variant="brand"
        disabled={busy || !v.trim()}
      >
        {small ? "Reply" : "Comment"}
      </Button>
    </form>
  );
}
