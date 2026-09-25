# FRONTEND-1.md — Opsly frontend

Next.js app map: screens, session handling, API access and reusable UI. Repository rules are in
[`../AGENTS-1.md`](../AGENTS-1.md); API details are in [`../backend/BACKEND.md`](../backend/BACKEND.md).

**The frontend is a view.** It hides unauthorized actions for convenience, but the backend remains
the security boundary. Never put an API key or other secret in client code.

## 1. Overview

- **Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, lucide-react,
  react-hook-form + zod, Vitest.
- **Sessions:** `AuthProvider` holds the authenticated user and access token. A refresh token is
  stored in an HttpOnly cookie, so a reload restores the session without exposing the token to
  JavaScript.
- **Requests:** `src/lib/api.ts` attaches the token, retries one request after a refresh, and
  throws a typed `ApiError`.
- **Toasts:** `ToastProvider` provides success, error, warning and info messages.
- **Notifications:** `NotificationProvider` polls the unread count only while authenticated.
- **Profile images:** the account photo is returned with authentication data and rendered by the
  shared `Avatar` component, including in the top-right account control.

## 2. Setup

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev              # http://localhost:3000
npx tsc --noEmit
npx vitest run
npm run build
```

The frontend calls `NEXT_PUBLIC_API_URL` in development. Never put a secret in a `NEXT_PUBLIC_*`
variable.

## 3. Structure and routes

```text
src/
├── app/
│   ├── (auth)/           Login and registration pages
│   ├── (staff)/          Staff dashboard and management screens
│   ├── customer/         Customer portal screens
│   ├── page.tsx          Landing page
│   └── layout.tsx        Root providers
├── components/
│   ├── layout/           Sidebar, topbar, notifications
│   ├── providers/        Auth, toast and notification contexts
│   ├── dashboard/        Dashboard widgets and skeleton
│   ├── ui/               Reusable buttons, forms, tables, avatars, states
│   └── *.tsx             Shared application components
├── lib/                  API client, types, validation, utilities
└── types/                Shared TypeScript types
```

**Staff routes** (`src/app/(staff)/`):

| Route | Purpose |
|---|---|
| `/dashboard` | Operational overview and quick actions |
| `/customers` | Customer list, detail, create and edit |
| `/jobs` | Job list and detail; supports a `?status=PENDING` deep link |
| `/technicians` | Technician list and detail |
| `/invoices` | Invoice list, detail and create |
| `/payments` | Payment list and create/edit |
| `/users` | Staff directory and account management |

**Customer routes** (`src/app/customer/`):

| Route | Purpose |
|---|---|
| `/customer/dashboard` | Requests, invoices and payment overview |
| `/customer/requests` | Customer service requests |
| `/customer/requests/new` | Create a request |
| `/customer/invoices` | Customer invoices |
| `/customer/payments` | Customer payments |
| `/customer/profile` | Profile details and photo upload |
| `/customer/profile/edit` | Edit profile |

The removed `/tasks` placeholder is not a route. Use `/jobs` for pending work; the dashboard link
uses `?status=PENDING` to open the filtered view.

## 4. Components and forms

- Reuse `components/ui/*` for buttons, inputs, selects, dialogs, tables, avatars and states.
- `EntityForm` and `EntityModal` are the default patterns for staff CRUD screens.
- `ResponsiveTable` renders the table on desktop and accessible cards on small screens.
- `Avatar` uses a supplied `imageUrl` and falls back to the initial/gradient avatar when absent.
- `PageLoader`, `TableSkeleton`, `ProfileSkeleton`, `DetailSkeleton`, `FormSkeleton` and
  `DashboardSkeleton` are loading placeholders. Use `EmptyState` for no data and `ErrorState`
  with retry for failures.

## 5. Validation

- Define Zod schemas in the owning form or a shared module in `src/lib/validation.ts`.
- Use `isValidPhone`/`PHONE_ERROR_MESSAGE` for phone fields so frontend and backend share the same
  rule: optional leading `+`, allowed digits/spaces/`( ) - .`, and at least seven actual digits.
- Keep the matching backend DTO validation in place; client validation is for feedback, not security.

## 6. Authentication and routing

- `AuthProvider` owns `user`, `accessToken`, login/logout and token refresh.
- `src/lib/api.ts` adds the bearer token, refreshes once after an expired access token, and throws
  `ApiError` for API errors.
- Use the role checks in the existing staff/customer layouts; backend authorization is authoritative.
- Profile uploads call `userProfileApi.uploadProfileImage` and update the auth user so the shared
  `Avatar` reflects the new photo immediately.

## 7. Checks and conventions

```bash
cd frontend
npx tsc --noEmit
npx vitest run
npm run build
```

- Keep changes focused and use the existing Tailwind/lucide styles and component APIs.
- Do not use raw `fetch` for backend calls, introduce a new state library, or add secrets to
  `NEXT_PUBLIC_*` variables.
- Keep API response types in sync with backend DTOs; `src/lib/index.ts` and `src/types/index.ts`
  are currently parallel type exports, so update both when a shared shape changes.
- Tests use Vitest, Testing Library and `src/test/setup.ts`; mock network calls and cover the
  changed success, validation and failure paths.

## 8. Related documentation

- Repository rules: [`../AGENTS-1.md`](../AGENTS-1.md)
- Backend/API reference: [`../backend/BACKEND.md`](../backend/BACKEND.md)

