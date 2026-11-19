import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";

const fmt = (s: number) =>
  isFinite(s)
    ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`
    : "0:00";
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export function AudioPlayer({
  src,
  title,
  cover,
  compact,
}: {
  src: string;
  title?: string | null | undefined;
  cover?: string | null | undefined;
  compact?: boolean | undefined;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [vol, setVol] = useState(1);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    const on = () => setPlaying(!a.paused);
    const t = () => setTime(a.currentTime);
    const d = () => setDur(a.duration);
    a.addEventListener("play", on);
    a.addEventListener("pause", on);
    a.addEventListener("timeupdate", t);
    a.addEventListener("loadedmetadata", d);
    a.addEventListener("durationchange", d);
    return () => {
      a.removeEventListener("play", on);
      a.removeEventListener("pause", on);
      a.removeEventListener("timeupdate", t);
      a.removeEventListener("loadedmetadata", d);
      a.removeEventListener("durationchange", d);
    };
  }, []);

  const toggle = () =>
    ref.current?.paused ? ref.current.play() : ref.current?.pause();

  return (
    <div
      className="flex items-center gap-3 rounded-2xl border bg-secondary p-3"
      onClick={(e) => e.preventDefault()}
    >
      <audio ref={ref} src={src} preload="metadata" />
      {cover ? (
        <img
          src={cover}
          alt=""
          className="h-14 w-14 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Headphones className="h-6 w-6" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        {title && <p className="truncate text-sm font-semibold">{title}</p>}
        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pause" : "Play"}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-brand-foreground transition hover:scale-105"
          >
            {playing ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="ml-0.5 h-4 w-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={dur || 0}
            step={0.1}
            value={time}
            aria-label="Seek"
            onChange={(e) => {
              if (ref.current) ref.current.currentTime = Number(e.target.value);
            }}
            className="h-1 min-w-0 flex-1 cursor-pointer accent-brand"
          />
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {fmt(time)} / {fmt(dur)}
          </span>
        </div>
        {!compact && (
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <button
              type="button"
              aria-label={vol ? "Mute" : "Unmute"}
              onClick={() => {
                const v = vol ? 0 : 1;
                setVol(v);
                if (ref.current) ref.current.volume = v;
              }}
            >
              {vol ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={vol}
              aria-label="Volume"
              className="w-20 accent-brand"
              onChange={(e) => {
                const v = Number(e.target.value);
                setVol(v);
                if (ref.current) ref.current.volume = v;
              }}
            />
            <div className="ml-auto flex gap-1">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSpeed(s);
                    if (ref.current) ref.current.playbackRate = s;
                  }}
                  className={cn(
                    "rounded-full px-2 py-0.5",
                    speed === s
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent",
                  )}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
