"use client";

import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, children, className }: ModalProps) {
  if (!open) return null;
  // Portal to <body>: overlay topbar/sidebar ko bhi blur/dim kare (paint-order safe)
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-pop-in dark:bg-slate-900",
          className
        )}
      >
        {onClose && (
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="size-5" />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}
