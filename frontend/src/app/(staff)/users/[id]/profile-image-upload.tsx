"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ApiError, userProfileApi } from "@/lib/api";
import type { Staff } from "@/types";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

/**
 * Profile avatar with camera-badge upload. Only rendered for the user's own
 * profile — the backend identifies the caller from the JWT.
 */
export function ProfileImageUpload({
  user,
  displayName,
  onUpdated,
  className,
}: {
  user: Staff;
  displayName: string;
  onUpdated: (user: Staff) => void;
  className?: string;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file || uploading) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Invalid file", "Please choose an image file.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("File too large", "Image must be under 3 MB.");
      return;
    }
    setUploading(true);
    try {
      const updated = await userProfileApi.uploadProfileImage(file);
      onUpdated(updated);
      toast.success("Profile photo updated", "Your new photo is now visible.");
    } catch (err) {
      toast.error("Upload failed", err instanceof ApiError ? err.message : "Unexpected error");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={cn("relative shrink-0 self-start sm:self-auto", className)}>
      <Avatar name={displayName} imageUrl={user.profileImageUrl} size="xl" className="size-20 text-2xl" />
      <button
        type="button"
        aria-label={uploading ? "Uploading photo" : "Change profile photo"}
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-white bg-indigo-600 text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60 dark:border-slate-900"
      >
        {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
    </div>
  );
}