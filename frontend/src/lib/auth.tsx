import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentAppUser, type AppUser } from "@/lib/auth.functions";
import { resolveMediaUrl } from "@/lib/media";

type AuthCtx = {
  user: AppUser | null;
  ready: boolean;
  error: string | null;
  refresh: () => Promise<AppUser | null>;
};
const Ctx = createContext<AuthCtx>({
  user: null,
  ready: false,
  error: null,
  refresh: async () => null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    user: AppUser | null;
    ready: boolean;
    error: string | null;
  }>({
    user: null,
    ready: false,
    error: null,
  });
  const qc = useQueryClient();
  const loadUser = useServerFn(getCurrentAppUser);
  const refresh = useCallback(async () => {
    const user = await loadUser();
    setState({ user, ready: true, error: null });
    qc.invalidateQueries();
    return user;
  }, [loadUser, qc]);

  useEffect(() => {
    let active = true;
    loadUser()
      .then((user) => {
        if (active) setState({ user, ready: true, error: null });
      })
      .catch((error: unknown) => {
        console.error("Could not verify the app session", error);
        if (active) {
          setState({
            user: null,
            ready: true,
            error:
              error instanceof Error
                ? error.message
                : "Could not verify the app session.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [loadUser]);

  return <Ctx.Provider value={{ ...state, refresh }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

export function useMyProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { ...data, avatar: await resolveMediaUrl(data.avatar_url) };
    },
  });
}
