import { avatarColor, cn, initialsOf } from "@/lib/utils";

interface AvatarProps {
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Cloudinary profile image URL — shown instead of initials when present */
  imageUrl?: string | null;
}

const SIZE_CLASSES = {
  xs: "size-6 text-[9px]",
  sm: "size-8 text-[11px]",
  md: "size-9 text-xs",
  lg: "size-11 text-sm",
  xl: "size-16 text-xl",
} as const;

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
        "flex shrink-0 select-none items-center justify-center rounded-full font-semibold uppercase text-white",
        avatarColor(name),
        SIZE_CLASSES[size],
        className
      )}
      aria-hidden
    >
      {initialsOf(name)}
    </span>
  );
}
