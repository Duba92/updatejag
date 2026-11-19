import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import logoUrl from "@/assets/jag-logo.jpg";
export const ORG_NAME = "Jatani Ali Generation (JAG) Students Association";

export function Logo({
  className,
  inverted,
}: {
  className?: string;
  inverted?: boolean;
}) {
  return (
    <Link
      to="/"
      className={cn("inline-flex min-w-0 items-center gap-2.5", className)}
      aria-label="JAG home"
    >
      <img
        src={logoUrl}
        alt="JAG Students Association logo"
        width={40}
        height={40}
        className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-background"
      />
      <span className="min-w-0 leading-tight">
        <span
          className={cn(
            "block font-display text-xl font-extrabold",
            inverted ? "text-primary-foreground" : "text-primary",
          )}
        >
          JAG
        </span>
        <span
          className={cn(
            "hidden truncate text-[10px] font-medium sm:block",
            inverted ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          Jatani Ali Generation Students Association
        </span>
      </span>
    </Link>
  );
}
