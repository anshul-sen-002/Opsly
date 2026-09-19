# FRONTEND.md — Opsly frontend

**What this document is:** a map of the Next.js app — which screens exist, how a user stays logged in,
how the browser talks to the backend, how the AI chat is wired, and which UI pieces you can reuse.
It assumes you have read [`../AGENTS.md`](../AGENTS.md) first.

**Golden rule of this app:** the frontend is only a *view*. It never decides who may do what — it
hides things for convenience, but the backend re-checks everything. It also never holds secrets: the
AI provider key lives on the server.

---

## How to use this document

| I want to... | Go to |
|--------------|-------|
| Know which screens already exist | [1. What is built today](#1-what-is-built-today) |
| Add a new page/route | [2. Routes and file structure](#2-routes-and-file-structure) |
| Understand login, refresh and session expiry | [3. Providers and session lifecycle](#3-providers-and-session-lifecycle) |
| Call the backend from a component | [4. The API client](#4-the-api-client-srclibapits) |
| Understand the AI chat widget | [5. AI chat UI](#5-ai-chat-ui-componentsask-opsly-aitsx) |
| Reuse an existing UI piece instead of writing one | [6. UI components](#6-ui-components-srccomponents) |
| See how the AI reaches OpenRouter | [7. AI and OpenRouter](#7-ai-and-openrouter) |
| Follow the coding rules | [8. Conventions and rules](#8-conventions-and-rules) |
| Know what is still missing | [10. Known gaps](#10-known-gaps--next-steps) |

---

## In one minute

- **Stack:** Next.js 14 (App Router) · React 18 · TypeScript (strict) · Tailwind CSS · lucide icons ·
  react-hook-form + zod · Vitest for tests.
- **State:** two React contexts do the heavy lifting — `AuthProvider` (session) and
  `NotificationProvider` (bell unread count). Toasts live in `ToastProvider`.
- **Data:** every backend call goes through `src/lib/api.ts`, which adds the token, retries once after
  a token refresh, and throws a typed `ApiError`.
- **Sessions:** the refresh token is an HttpOnly cookie, so a page reload restores the session
  silently; a countdown modal warns 30 seconds before the session dies.
- **AI:** the chat widget calls `POST /api/ai/chat` on our backend. The backend agent calls **OpenRouter**
  (https://openrouter.ai) over HTTPS with a Bearer API key. The browser never talks to the model.
- **Reality check:** the shell exists (landing page, login, components, chat). The dashboard and list
  screens do **not** exist yet — see [10. Known gaps](#10-known-gaps--next-steps).

---

## Contents

- [1. What is built today](#1-what-is-built-today)
- [2. Routes and file structure](#2-routes-and-file-structure)
- [3. Providers and session lifecycle](#3-providers-and-session-lifecycle)
- [4. The API client](#4-the-api-client-srclibapits)
- [5. AI chat UI](#5-ai-chat-ui-componentsask-opsly-aitsx)
- [6. UI components](#6-ui-components-srccomponents)
- [7. AI and OpenRouter](#7-ai-and-openrouter)
- [8. Conventions and rules](#8-conventions-and-rules)
- [9. Testing](#9-testing)
- [10. Known gaps / next steps](#10-known-gaps--next-steps)
- [11. Commands](#11-commands)

---

# 1. What is built today

**Read this before you plan any frontend work** — several links in the UI point to pages that do not
exist yet, so clicking them currently lands on a 404.

| Route | Status | What it is |
|-------|--------|------------|
| `/` | ✅ built | Marketing/landing page (`app/page.tsx`) |
| `/staff/login` | ✅ built | Staff sign-in (zod + react-hook-form) |
| `/customer/login` | ✅ built | Customer sign-in |
| `/customer/register` | ✅ built | Customer self-registration |
| `(auth)` layout | ✅ built | The split-screen shell used by all auth pages |
| `/dashboard` | ❌ missing | Staff home — linked from the sidebar |
| `/customers`, `/jobs`, `/technicians`, `/invoices`, `/payments`, `/users`, `/tasks` | ❌ missing | Staff list/detail screens — linked from the sidebar/topbar |
| `/customer/dashboard`, `/customer/requests`, `/customer/invoices`, `/customer/payments`, `/customer/profile` | ❌ missing | The whole customer portal |

**Why this is not a disaster:** the shell pieces are already in place. `Sidebar`, `Topbar`,
`SessionGate`, `AskOpslyAI` and the entire `ui/*` component library exist, so the missing screens are
mostly "compose existing components + call an existing API method".

---

# 2. Routes and file structure

**How routing works here:** Next.js App Router maps folders to URLs. A folder in parentheses, like
`(auth)`, is a *route group* — it only shares a layout and does not appear in the URL.

```
src/app/
├── layout.tsx                 root layout: fonts, theme script, the three providers
├── globals.css                Tailwind layers + design tokens
├── page.tsx                   "/" landing page
└── (auth)/                    shared split-screen layout (not part of the URL)
    ├── layout.tsx
    ├── staff/login/page.tsx          -> /staff/login
    └── customer/
        ├── login/page.tsx            -> /customer/login
        └── register/page.tsx         -> /customer/register
```

**The pattern for every new screen** (already used by the login pages, and what the missing screens
should follow):

1. `page.tsx` stays tiny — it only renders a feature component from the same folder.
2. That feature component is `"use client"` and holds the state, the API call and the four view states
   (loading / error / empty / success).
3. Data comes from `src/lib/api.ts`; types come from `src/types/index.ts`.
4. Shared shell (sidebar, topbar, session gate, AI chat) belongs in the layout, not in the page.

**Planned route groups** (to be added together with the missing pages):

```
src/app/(staff)/   layout.tsx + dashboard, customers, jobs, technicians, invoices, payments, users, tasks
src/app/customer/  layout.tsx + dashboard, requests, invoices, payments, profile
```

Both layouts follow the same shape as `(auth)/layout.tsx`: guard on `useAuth().status`, redirect
unauthenticated visitors to the matching login page, then render `Sidebar` + `Topbar` + the page, plus
`<SessionGate />` and `<AskOpslyAI />`.

---

# 3. Providers and session lifecycle

**Why this matters:** the app must survive a page reload without asking the user to log in again, and
it must end the session cleanly when the token dies. One provider handles both.

`src/app/layout.tsx` nests three providers — the order matters:

```
ToastProvider  ->  AuthProvider  ->  NotificationProvider  ->  {page}
```

| Provider | What it gives you |
|----------|-------------------|
| `providers/toast-provider` | `useToast()` — success / error / warning / info toasts |
| `providers/auth-provider` | `useAuth()` — `status`, `user`, `accessToken`, `loginStaff`, `loginCustomer`, `registerCustomer`, `logout`, `refreshSession`, `sessionWarning` |
| `providers/notification-provider` | `useNotifications()` — bell unread count; polls `GET /api/notifications/unread-count` every 45 s **only while authenticated** |

**Step by step, from page load to forced logout:**

1. **Restore.** `AuthProvider` calls `refreshTokens()` once. The refresh token lives in an HttpOnly
   cookie, so no secret sits in JavaScript — this is how a reload keeps you signed in.
2. **Remember.** On success `applyAuth()` stores the access token in memory (mirrored to
   `localStorage` for convenience) and schedules a timer **30 seconds before expiry**.
3. **Warn.** When the timer fires the provider tries a silent refresh. Success: nothing happens.
   Failure: `sessionWarning` becomes `true`.
4. **Count down.** `<SessionGate />` (mounted by the app shells) shows a modal with a 30-second
   countdown. "Stay signed in" calls `refreshSession()`; if the user does nothing, the app logs out and
   redirects via `loginPathForRole(role)` → `/staff/login` or `/customer/login`.
5. **Recover.** If the tab was in the background and comes back with an expired token, the provider
   refreshes again.
6. **React to 401s.** `api.ts` and React stay decoupled through a small *auth bridge*:
   `bindAuthBridge({ getAccessToken, setAuth, onSessionExpired })` is registered once by
   `AuthProvider`, so the API client can read the token and expire the session without importing React.

**Route guarding:** `(staff)` pages must reject CUSTOMER accounts (send them to `/customer/dashboard`)
and `/customer/**` must reject staff (send them to `/dashboard`) — the same idea the login pages
already use when they redirect an authenticated visitor away.

---

# 4. The API client (`src/lib/api.ts`)

**One file talks to the backend.** If you need data, add a method here rather than calling `fetch`
inside a component.

```ts
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/+$/, "");
```

**What the helpers do**

| Helper | Purpose |
|--------|---------|
| `request<T>(path, { method, body, auth })` | JSON call: adds the bearer token, sends `credentials: "include"`, unwraps `ApiResponse<T>`, and on a **401** refreshes once and retries before giving up |
| `uploadRequest<T>(path, formData)` | Same, but for `FormData` (profile image, invoice file) — no JSON content-type |
| `refreshTokens()` | `POST /api/auth/refresh` using the HttpOnly cookie; concurrent 401s share one in-flight call |
| `bindAuthBridge({ ... })` | Lets `AuthProvider` plug in token access and the "session expired" reaction, so this file needs no React import |
| `ApiError` | The only error type thrown: `{ message, status, fieldErrors? }`. `fieldErrors` is the backend validation map, perfect for `setError` in react-hook-form |

**One object per backend module** — the method names match the endpoints (`request` paths are relative
to `/api`, so `aiApi.chat` calls `POST {API_BASE}/api/ai/chat`):

| Object | Methods |
|--------|---------|
| `authApi` | `staffLogin`, `customerLogin`, `registerCustomer`, `logout` |
| `staffApi` | `list`, `getById`, `create`, `update`, `activate`, `deactivate`, `remove`, `restore` |
| `customerApi` | `list`, `getById`, `create`, `update`, `remove`, `restore`, `me`, `updateMyProfile`, `grantAccess` |
| `jobApi` | `list`, `getById`, `create`, `myJobs`, `myRequests`, `myRequest`, `assignTechnician`, `start`, `complete`, `close` |
| `invoiceApi` | `list`, `getById`, `create`, `issue`, `myInvoices`, `myInvoice`, `uploadFile` |
| `paymentApi` | `list`, `create`, `update`, `delete`, `getById`, `listByInvoice`, `myPayments` |
| `technicianApi` | `list`, `getById`, `getMyProfile` |
| `userProfileApi` | `me`, `update`, `uploadProfileImage` |
| `notificationApi` | `list` (unread rows only), `unreadCount`, `markRead`, `markAllRead` |
| `aiApi` | `chat(message)` |

**Handling an error in a form** (the pattern the login pages use):

```tsx
try {
  await loginStaff(email, password);
  router.replace("/dashboard");
} catch (error) {
  if (error instanceof ApiError && error.fieldErrors) {
    for (const [field, message] of Object.entries(error.fieldErrors)) setError(field, { message });
  } else if (error instanceof ApiError) {
    setFormError(error.message);
  }
}
```

---

# 5. AI chat UI (`components/ask-opsly-ai.tsx`)

**What the user sees:** a floating button that opens a chat panel; `<AskOpslyAI />` is mounted by the
app layouts, so the assistant is available on every authenticated screen.

| Feature | How it works |
|---------|--------------|
| Messages | A local list of user/assistant bubbles with timestamps; sent with `aiApi.chat(input)` |
| Voice input | `useVoiceInput(lang, onTranscript)` from `lib/voice` (Web Speech API), with a language picker: `en-IN`, `en-US`, `hi-IN`, `mr-IN`, `ta-IN` |
| Voice output | `speak(text, lang)` / `stopSpeaking()`; a mute toggle sits in the header |
| Attachments | Up to 5 images/videos/audio/files, previewed locally — client-side only today |
| Errors | Failures are shown as toasts and the input returns to the idle state |

```ts
const result = await aiApi.chat(input);   // -> { message: string, toolCalls?: [...] }
```

**Important:** the browser talks **only** to our own backend (`POST /api/ai/chat`). It never contacts
the model provider and never holds the provider URL — see [§7](#7-ai-and-openrouter).

---

# 6. UI components (`src/components/`)

**Rule of thumb: never restyle a button.** A shared component almost certainly already exists.

```
components/
├── providers/     toast-provider, auth-provider, notification-provider, notification-bell
├── layout/        sidebar, topbar, notification-bell
├── ui/            avatar, badge, button, confirm-dialog, entity-form, entity-modal,
│                  filter-tabs, input (+ input.test.tsx), modal, pagination,
│                  responsive-table, select, stat-cards, states
├── dashboard/     metric-cards, overview-chart, recent-activity, status-donut, top-customers
├── ask-opsly-ai.tsx          the floating AI chat
├── session-gate.tsx          session-expiry countdown modal
├── session-loading-modal.tsx shown while the session is loading or redirecting
├── admin-only.tsx            renders children only for admins
├── auth-form.tsx             AuthFormHeader used by login/register
└── logo.tsx, page-header.tsx, theme-toggle.tsx
```

**The four view states are already solved** — use these instead of writing your own:

| Need | Component |
|------|-----------|
| Table loading | `TableSkeleton` / `PageLoader` (`ui/states`) |
| Empty list | `EmptyState` (`ui/states`) |
| Failed request | `ErrorState` with a retry button (`ui/states`) |
| Desktop table + mobile cards | `ResponsiveTable` (`ui/responsive-table`) with `renderMobileCard` |
| Paging | `Pagination` (`ui/pagination`) |
| Filter chips | `FilterTabs` (`ui/filter-tabs`) |
| Stats row | `StatCards` (`ui/stat-cards`) |
| Status labels | `Badge`, `RoleBadge`, `DeletedBadge` (`ui/badge`) |
| Confirm a destructive action | `ConfirmDialog` (`ui/confirm-dialog`) |

**Styling conventions**

- Tailwind utilities only; dark mode is **class-based** (`dark:` variants). `THEME_INIT_SCRIPT`
  (`ui/states`) applies the stored theme before hydration so there is no flash, and `theme-toggle` /
  `topbar` switch it, saving the choice under the `opsly-theme` key.
- Icons come from `lucide-react` only.
- Fonts: Plus Jakarta Sans for UI, JetBrains Mono for numbers/codes (configured in `tailwind.config.ts`).

---

# 7. AI and OpenRouter

**The complete path of one AI question:**

```
AskOpslyAI (browser)
   |  POST /api/ai/chat   { "message": "how many jobs are pending?" }
   v
Opsly backend agent  (AiChatService + ToolRegistry)
   |  system prompt + user message + the tool list for the caller's role
   v
OpenRouter (https://openrouter.ai)  ->  one model (default: google/gemini-2.5-flash-preview-04-17)
   |  "call tool list_jobs with { status: 'PENDING' }"
   v
tool runs the same service the REST API uses -> PostgreSQL
   |  result text goes back to the model
   v
final text answer  ->  { "message": "...", "toolCalls": [ ... ] }
```

**Provider details:**

| Setting | Value |
|---------|-------|
| Provider | OpenRouter (https://openrouter.ai) — OpenAI-compatible API, proxies many models |
| Auth | Bearer API key (`OPENROUTER_API_KEY`), sent from backend only |
| Default model | `google/gemini-2.5-flash-preview-04-17` (configurable via `OPENROUTER_MODEL`) |
| Max tokens | `OPENROUTER_MAX_TOKENS` (default 1024) |
| Temperature | `OPENROUTER_TEMPERATURE` (default 0.3) |
| Required headers | `HTTP-Referer: https://opsly.app`, `X-Title: Opsly` (free-tier models) |
| Transport | Spring `RestClient` — no SDK, no self-hosted server |

**What this means for the frontend:**

- There is **one** call to remember: `aiApi.chat(message)`. Nothing else changes.
- The response shape is fixed: `{ message, toolCalls? }`. You may show `toolCalls[].tool` as
  "used: list_jobs" for transparency — the UI does not need to know which model answered.
- **No key, no SDK, no provider URL in the browser.** The OpenRouter API key lives only in the
  backend configuration (`OPENROUTER_API_KEY` in `backend/.env`). `NEXT_PUBLIC_*` values are public,
  so never put a secret there.
- Changing the model or provider settings is a backend-only change — the frontend never needs an update.
- Permission handling is invisible to the UI: if the user's role is not allowed to run the requested
  tool, the assistant answers with a clear explanation instead of doing the action.

Full backend detail (config, request/response JSON, tool list): [BACKEND.md §7–§9](../backend/BACKEND.md).

---

# 8. Conventions and rules

**TypeScript**

- Strict mode is on and `any` is not used. If a shape is unknown, define it in `src/types/index.ts`.
- The shared types mirror the backend exactly: `ApiResponse<T>`, Spring's `Page<T>` as `Paged<T>`, and
  Java enums as string unions (`JobStatus`, `InvoiceStatus`, `PaymentStatus`, `Role`, ...).
- Prefer `type` for unions and `interface` for object shapes, as the existing files do.

**Components**

- Server components by default; add `"use client"` only where you need state, effects or events.
- Keep `page.tsx` tiny and put the feature logic in a sibling component in the same folder.
- Reuse `ui/*` primitives instead of styling raw elements.
- Every data screen handles **loading, error and empty** states before the success state.

**Data**

- All requests go through `src/lib/api.ts`. Never call `fetch` directly in a component.
- No duplicate API calls and no unnecessary `useEffect`; always clean up timers and listeners.
- Surface errors consistently: fields through `ApiError.fieldErrors`, everything else through a toast
  or an inline message.

**Security and roles**

- Never expose a secret client-side. `NEXT_PUBLIC_*` variables are public.
- Never bypass `AuthProvider` for an authenticated call.
- Role checks in the UI are cosmetic — they hide things, they do not secure them.

**When you change something**

- If you touch an endpoint contract or a type, update `src/types/index.ts`, the API object in `api.ts`
  and this document (plus `../backend/BACKEND.md` when the backend changed).
- Prefer extending an existing pattern over inventing a new one.

---

# 9. Testing

```powershell
npm test          # vitest run  (jsdom environment, "@" alias resolved to ./src)
```

- Runner: **Vitest** with React Testing Library and `@testing-library/user-event`.
- What exists today: `src/components/ui/input.test.tsx` — types into the input, submits, and asserts the
  collected values (the react-hook-form `register` path).
- Style: drive the component like a user (labels, clicks, typing) and assert on what a user can see.
  Avoid snapshot-only tests.
- There is no end-to-end suite; API calls are not mocked globally, so keep tests focused on components
  rather than on network behaviour.

---

---

# 10. Known gaps / next steps

**What is missing in the frontend, in priority order.**

1. **The staff area does not exist yet.** These routes are linked from the sidebar and topbar but have
   no pages, so they 404 today:

   ```
   /dashboard            staff home (stat cards + charts + recent activity)
   /customers            list, /customers/new, /customers/[id], /customers/[id]/edit
   /jobs                 list, /jobs/new, /jobs/[id]
   /technicians          list, /technicians/[id]
   /invoices             list, /invoices/new, /invoices/[id]
   /payments             list, /payments/new, /payments/[id]/edit
   /users                list, /users/new, /users/[id], /users/[id]/edit
   /tasks                the AI task/automation view
   ```

   Add a `(staff)/layout.tsx` first: guard on `useAuth()`, redirect unauthenticated users to
   `/staff/login` and CUSTOMER accounts to `/customer/dashboard`, then render `Sidebar` + `Topbar` +
   `{children}` + `<SessionGate />` + `<AskOpslyAI />` (copy the shape of `customer/layout.tsx` from the
   reference implementation).

2. **The customer portal does not exist yet** — `customer/layout.tsx` plus `/customer/dashboard`,
   `/customer/requests`, `/customer/invoices`, `/customer/payments`, `/customer/profile`. All the API
   methods already exist (`jobApi.myRequests`, `invoiceApi.myInvoices`, `paymentApi.myPayments`,
   `customerApi.me`, `userProfileApi.*`).

3. **Duplicated modules to delete.** `src/app/lib/*` and `src/app/types/index.ts` are byte-identical
   copies of `src/lib/*` and `src/types/index.ts`, and nothing imports the `app/` copies. Keep
   `@/lib/*` + `@/types` and remove the duplicates.

4. **`src/lib/index.ts` duplicates the type definitions** already in `src/types/index.ts`. Keep one
   source of truth (the convention used by every other file is `@/types`).

5. **Fresh clone setup.** `node_modules` is not committed — run `npm install` before `npm run dev`.

6. **Not wired yet:** voice transcripts and attachments stay on the client; sending files to the AI
   agent is not implemented on the backend.

---

# 11. Commands

```powershell
npm install      # install dependencies (required once per clone)
npm run dev      # dev server on http://localhost:3000 (backend must run on :8080)
npm run build    # production build; also performs the full type check
npm start        # serve the production build
npm test         # run the Vitest suite once
```

---

_End of FRONTEND.md — keep it in sync with `src/`, `../AGENTS.md` and `../backend/BACKEND.md`._
