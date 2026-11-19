import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Bell,
  Compass,
  Home,
  LogOut,
  PenSquare,
  Search,
  Settings,
  User,
} from "lucide-react";
import { useAuth, useMyProfile } from "@/lib/auth";
import { getMyUnreadCount } from "@/lib/app.functions";
import { signOutAppUser } from "@/lib/auth.functions";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo } from "./Logo";
import { UserAvatar } from "./UserAvatar";

function useUnread() {
  const { user } = useAuth();
  const loadUnread = useServerFn(getMyUnreadCount);
  const q = useQuery({
    queryKey: ["unread", user?.id],
    enabled: !!user,
    queryFn: loadUnread,
    refetchInterval: 30_000,
  });
  return q.data ?? 0;
}

const NAV = [
  { to: "/", key: "nav.home" },
  { to: "/explore", key: "nav.explore" },
  { to: "/experiences", key: "nav.experiences" },
] as const;

export function LangToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <button
      onClick={() => setLang(lang === "om" ? "en" : "om")}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[11px] font-bold text-muted-foreground hover:text-foreground",
        className,
      )}
      aria-label="Switch language / Jijjiiri afaan"
    >
      {lang === "om" ? "EN" : "OM"}
    </button>
  );
}

export function SiteHeader() {
  const { user, ready, refresh } = useAuth();
  const { data: me } = useMyProfile();
  const { t } = useLang();
  const unread = useUnread();
  const navigate = useNavigate();
  const signOut = useServerFn(signOutAppUser);
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto grid h-14 max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 md:h-16 lg:flex lg:gap-6">
        <Logo />
        <nav className="hidden shrink-0 items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: true }}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
              activeProps={{ className: "bg-accent text-accent-foreground" }}
            >
              {t(n.key)}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <LangToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("nav.search")}
            onClick={() =>
              navigate({
                to: "/explore",
                search: { q: "", tab: "all", sort: "latest" },
              })
            }
          >
            <Search />
          </Button>
          {ready && user ? (
            <>
              <Link
                to="/notifications"
                aria-label={t("nav.notifications")}
                className="relative hidden h-9 w-9 place-items-center rounded-md hover:bg-accent md:grid"
              >
                <Bell className="h-4 w-4" />
                {unread > 0 && (
                  <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground">
                    {unread}
                  </span>
                )}
              </Link>
              <Button
                variant="brand"
                size="sm"
                asChild
                className="hidden md:inline-flex"
              >
                <Link to="/create">
                  <PenSquare /> {t("nav.createPost")}
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={t("nav.account")}
                  className="rounded-full"
                >
                  <UserAvatar name={me?.full_name || "Me"} src={me?.avatar} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() =>
                      navigate({ to: "/profile/$id", params: { id: user.id } })
                    }
                  >
                    <User /> {t("nav.myProfile")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate({ to: "/settings" })}
                  >
                    <Settings /> {t("nav.editProfile")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      try {
                        await signOut();
                        await refresh();
                        navigate({ to: "/" });
                      } catch (error) {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "Sign-out failed.",
                        );
                      }
                    }}
                  >
                    <LogOut /> {t("nav.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : ready ? (
            <Button
              variant="brand"
              size="sm"
              asChild
              className="hidden md:inline-flex"
            >
              <Link to="/auth">{t("nav.loginSignup")}</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const { user } = useAuth();
  const { t } = useLang();
  const unread = useUnread();
  const item =
    "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-semibold text-muted-foreground active:scale-95 transition";
  const active = { className: "text-brand" };
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <Link
        to="/"
        activeOptions={{ exact: true }}
        className={item}
        activeProps={active}
      >
        <Home className="h-5 w-5" />
        {t("nav.home")}
      </Link>
      <Link
        to="/explore"
        search={{ q: "", tab: "all", sort: "latest" }}
        className={item}
        activeProps={active}
      >
        <Compass className="h-5 w-5" />
        {t("nav.explore")}
      </Link>
      <Link to="/create" className={item}>
        <span className="-mt-5 grid h-12 w-12 place-items-center rounded-full bg-brand text-brand-foreground shadow-lift">
          <PenSquare className="h-5 w-5" />
        </span>
        {t("nav.create")}
      </Link>
      <Link
        to="/notifications"
        className={`${item} relative`}
        activeProps={active}
      >
        <Bell className="h-5 w-5" />
        {t("nav.alerts")}
        {unread > 0 && (
          <span className="absolute right-[30%] top-1 h-2 w-2 rounded-full bg-brand" />
        )}
      </Link>
      {user ? (
        <Link
          to="/profile/$id"
          params={{ id: user.id }}
          className={item}
          activeProps={active}
        >
          <User className="h-5 w-5" />
          {t("nav.profile")}
        </Link>
      ) : (
        <Link to="/auth" className={item} activeProps={active}>
          <User className="h-5 w-5" />
          {t("nav.login")}
        </Link>
      )}
    </nav>
  );
}

export function SiteFooter() {
  const { t } = useLang();
  return (
    <footer className="mt-24 bg-primary pb-24 text-primary-foreground md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-3">
        <div>
          <Logo inverted />
          <p className="mt-4 max-w-xs text-sm text-primary-foreground/75">
            {t("footer.desc")}
          </p>
        </div>
        <div className="text-sm">
          <p className="font-semibold">JAG</p>
          <ul className="mt-3 space-y-2 text-primary-foreground/75">
            <li>
              <Link to="/about" className="hover:text-primary-foreground">
                {t("footer.about")}
              </Link>
            </li>
            <li>
              <Link
                to="/about"
                hash="guidelines"
                className="hover:text-primary-foreground"
              >
                {t("footer.guidelines")}
              </Link>
            </li>
            <li>
              <Link
                to="/about"
                hash="privacy"
                className="hover:text-primary-foreground"
              >
                {t("footer.privacy")}
              </Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold">{t("footer.contact")}</p>
          <p className="mt-3 text-primary-foreground/75">hello@jag.community</p>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10 py-5 text-center text-xs text-primary-foreground/60">
        © {new Date().getFullYear()} Jatani Ali Generation (JAG) Students
        Association. "Ilmaan teessani barsiifadhaa!"
      </div>
    </footer>
  );
}
