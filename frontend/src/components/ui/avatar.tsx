import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Cloudinary profile image URL — shown instead of the default SVG when present */
  imageUrl?: string | null;
}

const SIZE_CLASSES = {
  xs: "size-6",
  sm: "size-8",
  md: "size-9",
  lg: "size-11",
  xl: "size-16",
} as const;

const ICON_SIZES = {
  xs: "size-3.5",
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
  xl: "size-8",
} as const;

/**
 * Distinct gradient tiles — 8 different color families picked
 * deterministically from the name, so every user keeps their own
 * recognizable tile (light mode) with a matching dark variant.
 */
const GRADIENTS = [
  "from-indigo-500 via-blue-500 to-cyan-400 dark:from-indigo-500/80 dark:via-blue-500/70 dark:to-cyan-400/70",
  "from-fuchsia-500 via-pink-500 to-rose-400 dark:from-fuchsia-500/80 dark:via-pink-500/70 dark:to-rose-400/70",
  "from-amber-400 via-orange-500 to-red-500 dark:from-amber-400/80 dark:via-orange-500/70 dark:to-red-500/70",
  "from-emerald-400 via-teal-500 to-green-600 dark:from-emerald-400/80 dark:via-teal-500/70 dark:to-green-600/70",
  "from-violet-500 via-purple-500 to-indigo-500 dark:from-violet-500/80 dark:via-purple-500/70 dark:to-indigo-500/70",
  "from-sky-400 via-cyan-500 to-blue-600 dark:from-sky-400/80 dark:via-cyan-500/70 dark:to-blue-600/70",
  "from-lime-400 via-green-500 to-emerald-600 dark:from-lime-400/80 dark:via-green-500/70 dark:to-emerald-600/70",
  "from-orange-400 via-amber-500 to-yellow-400 dark:from-orange-400/80 dark:via-amber-500/70 dark:to-yellow-400/70",
] as const;

/** Deterministic gradient tile for a given seed string */
export function avatarGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

export function Avatar({ name, size = "md", className, imageUrl }: AvatarProps) {
  if (imageUrl) {
    return (
      <span
        className={cn(
          "block shrink-0 select-none overflow-hidden rounded-full",
          SIZE_CLASSES[size],
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={name} className="size-full object-cover" />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-gradient-to-br ring-1 ring-black/[0.04] dark:ring-white/10",
        avatarGradient(name),
        SIZE_CLASSES[size],
        className
      )}
      role="img"
      aria-label={name}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/user-image.svg"
        alt=""
        aria-hidden
        draggable={false}
        className={cn("pointer-events-none select-none brightness-0 invert", ICON_SIZES[size])}
      />
    </span>
  );
}
