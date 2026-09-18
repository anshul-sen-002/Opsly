"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  Bot,
  FileText,
  Loader2,
  Mic,
  Plus,
  Send,
  Sparkles,
  Video,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useVoiceInput, speak, stopSpeaking } from "@/lib/voice";
import { aiApi, ApiError } from "@/lib/api";
import { useToast } from "@/components/providers/toast-provider";
import { cn } from "@/lib/utils";

type AttachmentKind = "image" | "video" | "audio" | "file";

interface Attachment {
  id: string;
  file: File;
  url: string;
  kind: AttachmentKind;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: number;
  attachments?: Attachment[];
}

const VOICE_LANG_OPTIONS = [
  { code: "en-IN", label: "English (India)" },
  { code: "en-US", label: "English (US)" },
  { code: "hi-IN", label: "Hindi" },
  { code: "mr-IN", label: "Marathi" },
  { code: "ta-IN", label: "Tamil" },
];

const MAX_ATTACHMENTS = 5;

/**
 * Welcome-screen prompt chips. These are deliberately role-common:
 * ADMIN, MANAGER aur TECHNICIAN sabko yehi list dikhti hai.
 * - "Show my jobs" har role me kaam karta hai: technician ko my_jobs,
 *   admin/manager ko list_jobs — LLM system prompt me role dekh kar sahi tool chunta hai.
 * - Baaki do sirf guidance hain, kisi tool/permission ki zaroorat nahi.
 */
const SUGGESTIONS = [
  "What can you help me with?",
  "Show my jobs",
  "How do I use the AI assistant?",
];

function kindOf(file: File): AttachmentKind {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function clockTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AttachmentView({ attachment }: { attachment: Attachment }) {
  if (attachment.kind === "image") {
    return (
      <img
        src={attachment.url}
        alt={attachment.file.name}
        className="max-h-44 rounded-lg border border-black/5 object-cover"
      />
    );
  }
  if (attachment.kind === "video") {
    return (
      <video
        src={attachment.url}
        controls
        className="max-h-44 rounded-lg border border-black/5"
      />
    );
  }
  if (attachment.kind === "audio") {
    return <audio src={attachment.url} controls className="h-9 w-full" />;
  }
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-900/5 px-2.5 py-2 dark:bg-white/10">
      <FileText className="size-4 shrink-0 text-indigo-500" />
      <div className="min-w-0">
        <p className="max-w-[12rem] truncate text-xs font-medium leading-tight">
          {attachment.file.name}
        </p>
        <p className="text-[10px] opacity-70">
          {formatFileSize(attachment.file.size)}
        </p>
      </div>
    </div>
  );
}

export function AskOpslyAI() {
  const [input, setInput] = useState("");
  const [lang, setLang] = useState("en-IN");
  const [muted, setMuted] = useState(false);
  const [open, setOpen] = useState(false);
  const [inputStatus, setInputStatus] = useState<"idle" | "sending" | "error">(
    "idle"
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [compose, setCompose] = useState<Attachment[]>([]);

  const langRef = useRef(lang);
  langRef.current = lang;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const toast = useToast();

  const voice = useVoiceInput(lang, (text) =>
    setInput((prev) => (prev ? `${prev} ${text}` : text))
  );

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, compose, inputStatus, scrollToBottom]);

  // Revoke object URLs on unmount to avoid memory leaks.
  useEffect(() => {
    const urls = [
      ...messages.flatMap((m) => m.attachments ?? []),
      ...compose,
    ].map((a) => a.url);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const addFiles = useCallback((list: FileList | null) => {
    if (!list || list.length === 0) return;
    const files = Array.from(list).slice(0, MAX_ATTACHMENTS);
    const next: Attachment[] = files.map((file) => ({
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      url: URL.createObjectURL(file),
      kind: kindOf(file),
    }));
    setCompose((prev) => [...prev, ...next]);
  }, []);

  const removeCompose = useCallback((id: string) => {
    setCompose((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const handleFilesSelected = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      addFiles(e.target.files);
      e.target.value = "";
    },
    [addFiles]
  );

  const handleSend = useCallback(async (overrideText?: string) => {
    const trimmed = (overrideText ?? input).trim();
    const hasAttachments = compose.length > 0;
    if ((!trimmed && !hasAttachments) || inputStatus === "sending") return;

    const attachments = [...compose];
    // Backend chat is text-only, so when the user shares only attachments we
    // send a short note summarising them so the conversation has context.
    const textContent =
      trimmed ||
      `I've shared ${attachments.length} attachment${attachments.length === 1 ? "" : "s"}: ${attachments
        .map((a) => a.file.name)
        .join(", ")}.`;

    appendMessage({
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed,
      attachments,
      createdAt: Date.now(),
    });
    setInput("");
    setCompose([]);
    setInputStatus("sending");

    try {
      const response = await aiApi.chat(textContent);
      appendMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: response.message,
        createdAt: Date.now(),
      });
      if (!mutedRef.current) speak(response.message, langRef.current);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.";
      toast.error("Ask Opsly AI", message);
      setInputStatus("error");
    } finally {
      setInputStatus("idle");
    }
  }, [input, compose, inputStatus, appendMessage, toast]);

  const handleVoiceToggle = useCallback(() => {
    if (voice.state === "listening") {
      voice.stop();
    } else if (voice.state === "idle" || voice.state === "unsupported") {
      stopSpeaking();
      voice.start();
    }
  }, [voice]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      if (next) stopSpeaking();
      return next;
    });
  }, []);

  const handleLangChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => setLang(e.target.value),
    []
  );

  if (!open) {
    return (
      <button
        onClick={() => {
          stopSpeaking();
          setOpen(true);
        }}
        className="group fixed bottom-5 right-5 z-40 flex size-12 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-600/30 transition hover:scale-105 hover:shadow-indigo-600/50 sm:bottom-6 sm:right-6 sm:size-14"
        aria-label="Open Ask Opsly AI"
      >
        <span className="absolute -right-0.5 -top-0.5 flex size-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
        </span>
        <Bot className="size-5 sm:size-6" />
        <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100 dark:bg-white dark:text-slate-900 sm:block">
          Ask Opsly AI
        </span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex animate-pop-in flex-col overflow-hidden bg-white dark:bg-slate-900 sm:inset-auto sm:bottom-4 sm:right-4 sm:h-[min(560px,80vh)] sm:w-[calc(100vw-2rem)] sm:max-w-[24rem] sm:rounded-2xl sm:shadow-2xl sm:ring-1 sm:ring-black/5 sm:dark:ring-white/10">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-white">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/20">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">
              Ask Opsly AI
            </p>
            <p className="flex items-center gap-1.5 text-[11px] text-indigo-100">
              <span className="size-1.5 rounded-full bg-emerald-300" />
              Online · replies instantly
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <select
              value={lang}
              onChange={handleLangChange}
              className="max-w-[7rem] rounded-md bg-white/20 px-1.5 py-0.5 text-xs outline-none"
            >
              {VOICE_LANG_OPTIONS.map((option) => (
                <option key={option.code} value={option.code} className="text-slate-900">
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={toggleMute}
              className="rounded-md p-1 transition hover:bg-white/20"
              aria-label={muted ? "Unmute speech" : "Mute speech"}
            >
              {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
            <button
              onClick={() => {
                stopSpeaking();
                setOpen(false);
              }}
              className="rounded-md p-1 transition hover:bg-white/20"
              aria-label="Close chat"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto scrollbar-hide px-3 py-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center px-2 py-6 text-center">
              <div className="relative mb-3">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30">
                  <Bot className="size-7" />
                </div>
                <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-white text-indigo-600 shadow ring-1 ring-black/5 dark:bg-slate-900 dark:text-indigo-400 dark:ring-white/10">
                  <Sparkles className="size-3" />
                </span>
              </div>
              <p className="text-base font-semibold text-slate-900 dark:text-white">
                Hi, I&apos;m Opsly AI 👋
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Your assistant for jobs, customers, invoices and payments.
              </p>
              <div className="mt-4 w-full space-y-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => void handleSend(s)}
                    disabled={inputStatus === "sending"}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-[13px] font-medium text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-500/60 dark:hover:bg-slate-700/60"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex",
                m.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[82%] overflow-hidden rounded-2xl px-3 py-2 shadow-sm",
                  m.role === "user"
                    ? "rounded-br-sm bg-indigo-600 text-white"
                    : "rounded-bl-sm bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                )}
              >
                {m.attachments && m.attachments.length > 0 && (
                  <div className="mb-1.5 space-y-1.5">
                    {m.attachments.map((a) => (
                      <AttachmentView key={a.id} attachment={a} />
                    ))}
                  </div>
                )}
                {m.text && (
                  <p className="whitespace-pre-wrap overflow-wrap break-word text-[13px] leading-relaxed sm:text-sm">
                    {m.text}
                  </p>
                )}
                <p
                  className={cn(
                    "mt-1 text-right text-[10px]",
                    m.role === "user" ? "text-indigo-200" : "text-slate-400 dark:text-slate-500"
                  )}
                >
                  {clockTime(m.createdAt)}
                </p>
              </div>
            </div>
          ))}

          {inputStatus === "sending" && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-3 dark:bg-slate-800">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="size-1.5 animate-bounce rounded-full bg-slate-400"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Compose attachments strip */}
        {compose.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-slate-200 px-3 py-2 dark:border-slate-700">
            {compose.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-1.5 rounded-lg bg-slate-100 py-1 pl-1.5 pr-1 dark:bg-slate-800"
              >
                {a.kind === "image" ? (
                  <img
                    src={a.url}
                    alt=""
                    className="size-8 rounded object-cover"
                  />
                ) : a.kind === "video" ? (
                  <Video className="size-5 text-indigo-500" />
                ) : a.kind === "audio" ? (
                  <Volume2 className="size-5 text-indigo-500" />
                ) : (
                  <FileText className="size-5 text-indigo-500" />
                )}
                <span className="max-w-[7rem] truncate text-xs">{a.file.name}</span>
                <button
                  onClick={() => removeCompose(a.id)}
                  className="rounded p-0.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700"
                  aria-label="Remove attachment"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input row: compact composer, light + dark compatible */}
        <div className="border-t border-slate-200 bg-white p-2 dark:border-white/10 dark:bg-[#080f2e]">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-1.5 shadow-sm dark:border-white/10 dark:bg-[#0b1438] dark:shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={inputStatus === "sending" || compose.length >= MAX_ATTACHMENTS}
              className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-indigo-300/70 bg-white text-indigo-600 shadow-sm transition hover:bg-indigo-50 disabled:opacity-50 dark:border-transparent dark:bg-[#131c4e] dark:text-white dark:hover:bg-[#1a245c]"
              style={{
                boxShadow: "0 0 10px rgba(109,124,255,0.25)",
              }}
              aria-label="Attach files, images or videos"
            >
              <Plus className="size-5" strokeWidth={2.2} />
            </button>

            <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full border border-indigo-200 bg-white py-1 pl-3 pr-1 shadow-sm dark:border-[rgba(96,125,255,0.55)] dark:bg-[linear-gradient(90deg,#161d55_0%,#1b1650_55%,#1a1445_100%)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(20,30,80,0.6),0_4px_18px_rgba(40,60,180,0.25)]">
              <Sparkles className="size-4 shrink-0 text-indigo-500 dark:text-[#6d8bff]" fill="currentColor" />
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Type a message..."
                rows={1}
                disabled={inputStatus === "sending"}
                className="scrollbar-hide max-h-20 min-w-0 flex-1 resize-none border-0 bg-transparent py-1.5 text-[13px] font-medium text-slate-800 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-[#8b93b8]"
              />
              <button
                onClick={handleVoiceToggle}
                disabled={voice.state === "unsupported" || inputStatus === "sending"}
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full transition",
                  voice.state === "listening"
                    ? // Listening: violet circle breathing dim ↔ dark while the user speaks
                      "animate-pulse bg-violet-500/70 text-violet-50 shadow-sm shadow-violet-500/30"
                    : "text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:text-[#c2c8e4] dark:hover:bg-white/10 dark:hover:text-white"
                )}
                aria-label={
                  voice.state === "listening" ? "Stop listening" : "Start voice input"
                }
              >
                <Mic className="size-4" />
              </button>
              <span className="h-5 w-px shrink-0 bg-slate-200 dark:bg-white/15" />
              <button
                onClick={() => void handleSend()}
                disabled={
                  (!input.trim() && compose.length === 0) || inputStatus === "sending"
                }
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-white transition hover:brightness-110 disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, #6d7cff 0%, #5b5bf0 45%, #6d3df5 100%)",
                  boxShadow:
                    "0 0 16px rgba(109,92,246,0.65), 0 4px 12px rgba(80,80,250,0.5), inset 0 1px 1px rgba(255,255,255,0.35)",
                }}
                aria-label="Send"
              >
                {inputStatus === "sending" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input triggered by the + button */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*,application/pdf,text/plain"
        className="hidden"
        onChange={handleFilesSelected}
      />
    </div>
  );
}
