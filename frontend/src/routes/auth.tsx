import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { phoneCredentials, signupCredentials } from "@/lib/phone-auth";
import { registerAppUser, signInAppUser } from "@/lib/auth.functions";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Join JAG — Sign in with your phone" },
      {
        name: "description",
        content:
          "Sign in or create your JAG account with your phone number and password. For Haramaya University students.",
      },
      { property: "og:title", content: "Join JAG" },
      {
        property: "og:description",
        content: "Share your experience. Guide someone.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, ready, error: authError, refresh } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const register = useServerFn(registerAppUser);
  const signIn = useServerFn(signInAppUser);
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready || !user) return;
    let active = true;
    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("onboarded")
          .eq("id", user.id)
          .maybeSingle();
        if (!active) return;
        if (error) {
          setFormError("We couldn't load your profile. Please try again.");
          return;
        }
        navigate({ to: data?.onboarded ? "/" : "/settings" });
      } catch (error) {
        if (active)
          setFormError(
            error instanceof Error
              ? error.message
              : "We couldn't load your profile. Please try again.",
          );
      }
    };
    void loadProfile();
    return () => {
      active = false;
    };
  }, [ready, user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      if (mode === "signup") {
        const creds = signupCredentials(fullName, phone, password);
        await register({
          data: { fullName: creds.fullName, phone: creds.phone, password },
        });
        toast.success("Welcome to JAG!");
      } else {
        await signIn({ data: phoneCredentials(phone, password) });
      }
      await refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Please try again.";
      setFormError(message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid min-h-[80vh] place-items-center px-4 pb-28 pt-4 md:pb-12 md:pt-12">
      <div className="w-full min-w-0 max-w-sm py-2 sm:py-6">
        <h1 className="text-2xl font-extrabold">
          {mode === "signup" ? t("auth.join") : t("auth.signinTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("auth.subtitle")}
        </p>
        <form onSubmit={submit} className="mt-4 space-y-3">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="full-name">{t("auth.fullName")}</Label>
              <Input
                id="full-name"
                autoComplete="name"
                required
                maxLength={80}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-12"
              />
            </div>
          )}
          <Label htmlFor="phone">{t("auth.phone")}</Label>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            placeholder="09 1234 5678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-12"
          />
          <Label htmlFor="password">{t("auth.password")}</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              required
              minLength={mode === "signup" ? 8 : undefined}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 pr-12"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1.5"
              aria-label={
                showPassword ? t("auth.hidePassword") : t("auth.showPassword")
              }
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </Button>
          </div>
          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}
          {authError && (
            <p role="alert" className="text-sm text-destructive">
              {authError}
            </p>
          )}
          <Button
            type="submit"
            variant="brand"
            className="h-12 w-full rounded-md"
            disabled={busy}
          >
            {busy
              ? t("auth.pleaseWait")
              : mode === "signup"
                ? t("auth.createAccount")
                : t("auth.signin")}
          </Button>
          <Button
            type="button"
            variant="link"
            className="h-auto w-full whitespace-normal py-2"
            disabled={busy}
            onClick={() => {
              setMode(mode === "signup" ? "signin" : "signup");
              setFormError("");
              setPassword("");
            }}
          >
            {mode === "signup" ? t("auth.haveAccount") : t("auth.newToJag")}
          </Button>
        </form>
      </div>
    </div>
  );
}
