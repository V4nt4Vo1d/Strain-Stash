import type { FriendColor } from "./types"

// Full class strings so Tailwind can detect them at build time.
export const FRIEND_COLOR_STYLES: Record<
  FriendColor,
  { dot: string; soft: string; ring: string; text: string }
> = {
  emerald: {
    dot: "bg-emerald-500",
    soft: "bg-emerald-100 text-emerald-800 border-emerald-200",
    ring: "ring-emerald-400",
    text: "text-emerald-700",
  },
  amber: {
    dot: "bg-amber-500",
    soft: "bg-amber-100 text-amber-800 border-amber-200",
    ring: "ring-amber-400",
    text: "text-amber-700",
  },
  sky: {
    dot: "bg-sky-500",
    soft: "bg-sky-100 text-sky-800 border-sky-200",
    ring: "ring-sky-400",
    text: "text-sky-700",
  },
  rose: {
    dot: "bg-rose-500",
    soft: "bg-rose-100 text-rose-800 border-rose-200",
    ring: "ring-rose-400",
    text: "text-rose-700",
  },
  violet: {
    dot: "bg-violet-500",
    soft: "bg-violet-100 text-violet-800 border-violet-200",
    ring: "ring-violet-400",
    text: "text-violet-700",
  },
  orange: {
    dot: "bg-orange-500",
    soft: "bg-orange-100 text-orange-800 border-orange-200",
    ring: "ring-orange-400",
    text: "text-orange-700",
  },
  teal: {
    dot: "bg-teal-500",
    soft: "bg-teal-100 text-teal-800 border-teal-200",
    ring: "ring-teal-400",
    text: "text-teal-700",
  },
  lime: {
    dot: "bg-lime-500",
    soft: "bg-lime-100 text-lime-800 border-lime-200",
    ring: "ring-lime-400",
    text: "text-lime-700",
  },
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
}
