import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getCurrentAppUser } from "@/lib/auth.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const user = await getCurrentAppUser();
    if (!user) throw redirect({ to: "/auth" });
  },
  component: () => <Outlet />,
});
