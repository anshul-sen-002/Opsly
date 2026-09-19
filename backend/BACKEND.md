# BACKEND.md — Opsly backend

**What this document is:** a current-architecture map of the Spring Boot service: packages, rules,
endpoints, the AI agent (OpenRouter), and the optional OpenSearch service-request search layer. It
assumes you have read [`../AGENTS-1.md`](../AGENTS-1.md) first.

---

## In one minute

- **Stack:** Spring Boot 3.2.5 · Java 17 · Maven · PostgreSQL (Hibernate `ddl-auto=update`)
- **Packages:** 11 (`ai`, `auth`, `customer`, `dashboard`, `invoice`, `job`, `notification`, `payment`,
  `search`, `technician`, `user`) + shared `common`
- **Security:** Spring Security · JWT access token (15 min, Bearer) · refresh token in an HttpOnly cookie (7 days, rotated)
- **API style:** every endpoint returns `ApiResponse<T>`; every list is a Spring `Page<T>`
- **AI:** `POST /api/ai/chat` → OpenRouter (OpenAI-compatible API) → tool calls → same services as REST
  → PostgreSQL. Browser never sees the model provider or its API key.
- **Run it:** backend `mvn spring-boot:run` (port 8080), frontend `npm run dev` (port 3000)
- **Tests:** backend `src/test` is empty — no test classes yet

--

## Contents

1. [Repository layout](#1-repository-layout)
2. [Domain model](#2-domain-model-and-relationships)
3. [Roles and permissions](#3-roles-and-permissions)
4. [Request lifecycle](#4-request-lifecycle)
5. [API surface](#5-api-surface)
6. [AI architecture (OpenRouter)](#6-ai-architecture-openrouter)
7. [AI tool registry](#7-ai-tool-registry)
8. [Configuration and secrets](#8-configuration-and-secrets)
9. [Response format](#9-response-format)
10. [Database rules](#10-database-rules)
11. [Security rules](#11-security-rules)
12. [Current state and next steps](#12-current-state-and-next-steps)

---

# 1. Repository layout

Two independent codebases communicate only over HTTP. The frontend is a thin view; this backend owns
every rule and every database write.

```
Opsly/
├── AGENTS-1.md              <- project guide (read this first)
├── backend/                 Spring Boot API — owns every rule and all data
│   ├── BACKEND.md           <- this file
│   ├── pom.xml
│   ├── .env                 local secrets (git-ignored)
│   └── src/main/java/com/opsly/{ai, auth, common, customer, dashboard,
│                                invoice, job, notification, payment,
│                                search, technician, user}/
└── frontend/                Next.js app — only a view (see FRONTEND-1.md)
```

**Shared package — `common`:** `ApiResponse` (the response envelope), exception mappers
(`GlobalExceptionHandler`), and base DTOs. No endpoints live here.

---

# 2. Domain model and relationships

Eight core entities, each a database table. Relationships are enforced at the entity/JPA level.

| Entity | Table | Key detail |
|--------|-------|------------|
| `User` | `users` | email + BCrypt password + role + status; soft-deletable via `deleted`/`deletedAt` |
| `RefreshToken` | `refresh_tokens` | stored in DB so logout can revoke; rotated on every use |
| `Customer` | `customers` | may have **no** `User` (walk-in); optional `user_id` unique link |
| `Technician` | `technicians` | **always** linked 1:1 to a `TECHNICIAN` `User` |
| `Job` | `jobs` | service request; `PENDING → ASSIGNED → IN_PROGRESS → COMPLETED → CLOSED` |
| `Invoice` | `invoices` | exactly one per `Job` (`job_id` unique); status independent of job status |
| `Payment` | `payments` | N:1 to `Invoice`; only `SUCCESS` payments count toward the total |
| `Notification` | `notifications` | per-user; created after transaction commit via `@TransactionalEventListener` |

**Relationship map:**

```
User       1 ──── 1        RefreshToken     (one valid refresh token per user)
User       1 ──── 1        Technician        (a technician always has a login)
User       1 ──── 0..1      Customer          (a customer may or may not have a login)
Customer   1 ──── N        Job               (who requested)
Technician 1 ──── N        Job               (who is assigned)
Job        1 ──── 1        Invoice           (one invoice per job)
Invoice    1 ──── N        Payment
User       1 ──── N        Notification
```

**Two things worth remembering:**

- A `Customer` is **not** the same as a `User`/login. Staff can record a customer from a phone call
  with no account, and grant portal access later.
- `Job.status` and `Invoice.status` are **independent**. Closing a job never marks an invoice as paid;
  an invoice transitions to `PARTIALLY_PAID`/`PAID` only when a `SUCCESS` payment is recorded.

---

# 3. Roles and permissions

Four roles, decided entirely in the backend:

| Role | Sees | Can do |
|------|------|--------|
| `ADMIN` | everything | everything a MANAGER can, **plus** create/activate/deactivate/delete/restore staff accounts |
| `MANAGER` | all business data | customers, grant portal access, assign/close jobs, create/issue invoices, record/update/delete payments |
| `TECHNICIAN` | **only own jobs**, customer list, own profile | start own job, complete own job |
| `CUSTOMER` | **only own** requests, invoices, payments | raise requests, edit own profile, view own invoices/payments |

**Three layers of access control, applied in order:**

1. **Frontend (cosmetic).** Sidebar/topbar hide what a role should not use. Convenience only — not security.
2. **`@PreAuthorize` on each endpoint.** Spring Security evaluates the role annotation before the
   controller method runs; wrong role → HTTP 403.
3. **Ownership check in the service layer.** Even with the right role, a technician may only touch a
   job assigned to them; a customer may only read their own records. Services throw `ForbiddenException`
   on failure, and the caller's identity always comes from the JWT — never from the request body.

The AI assistant obeys the same three layers: the tool registry checks role membership before
dispatch, and the tool executor passes the authenticated `User` into the same service, so ownership is
enforced exactly as for the REST API.

---

# 4. Request lifecycle

Every API call travels the same path:

```
1. HTTP request arrives
2. SecurityFilterChain runs
     JwtAuthFilter reads "Authorization: Bearer <token>"
       → token valid? → load the user → put UserDetails in SecurityContext
3. @PreAuthorize checks the role for this endpoint   (403 if the role is wrong)
4. Controller runs: @Valid checks the body,
     @AuthenticationPrincipal gives the authenticated User
5. Service runs inside @Transactional: ownership, status rules, calculations
6. Repository reads/writes PostgreSQL
7. DTO is mapped and wrapped in ApiResponse<T> → returned as JSON
```

If any step fails, `GlobalExceptionHandler` converts the exception into the same JSON envelope so the
frontend always sees `{ success: false, message: ... }` with a sensible HTTP status.

| Situation | Status | Example |
|-----------|--------|---------|
| missing record | 404 | "Job not found" |
| rule violated | 400 | "Job must be in ASSIGNED status to start" |
| duplicate | 409 | "Email already registered" |
| wrong role / not owner | 403 | "You are not assigned to this job" |
| bad credentials / expired token | 401 | "Invalid email or password" |
| validation failure | 400 | `data` = field-error map |
| unexpected error | 500 | generic message, no internals |

---

# 5. API surface

All endpoints are under `/api/`. The role shown is the **minimum** `@PreAuthorize` value; some
endpoints accept `hasAnyRole(...)`. Ownership is enforced in the service layer on top of the role
check.

## Auth (`/api/auth`)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/auth/customer/register` | public | Register a new customer (`User` + `Customer` in one transaction) |
| POST | `/auth/staff/login` | public | Staff login → JWT + refresh cookie |
| POST | `/auth/customer/login` | public | Customer login → same |
| POST | `/auth/refresh` | public | Rotate refresh token (HttpOnly cookie → new JWT pair) |
| POST | `/auth/logout` | public | Revoke refresh token in DB, clears cookie |

## Staff management (`/api/admin/staff`)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/admin/staff` | ADMIN | Create staff (ADMIN/MANAGER/TECHNICIAN) |
| GET | `/admin/staff` | ADMIN+ | List staff (pageable, `?deleted=true`) |
| GET | `/admin/staff/{id}` | ADMIN+ | Get one |
| PUT | `/admin/staff/{id}` | ADMIN, MANAGER | Update (MANAGER: TECHNICIAN only) |
| PUT | `/admin/staff/{id}/activate` | ADMIN | Set ACTIVE |
| PUT | `/admin/staff/{id}/deactivate` | ADMIN | Set INACTIVE (immediate logout) |
| DELETE | `/admin/staff/{id}` | ADMIN | Soft-delete (excludes self) |
| PUT | `/admin/staff/{id}/restore` | ADMIN | Restore soft-deleted |

## User profile (`/api/users/me`)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/users/me` | any authenticated | Current user's profile |
| PUT | `/users/me` | any authenticated | Update name, phone, specialization |
| POST | `/users/me/profile-image` | any authenticated | Upload profile image (Cloudinary) |

## Customers (`/api/customers`)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/customers` | ADMIN, MANAGER | Create a customer (no login required) |
| GET | `/customers` | ADMIN+ | List customers (pageable) |
| GET | `/customers/{id}` | ADMIN, MANAGER | Get one |
| GET | `/customers/me` | CUSTOMER | Get your own profile |
| PUT | `/customers/me` | CUSTOMER | Update your own |
| PUT | `/customers/{id}` | ADMIN, MANAGER | Update a customer |
| DELETE | `/customers/{id}` | ADMIN, MANAGER | Soft-delete |
| PUT | `/customers/{id}/restore` | ADMIN, MANAGER | Restore |
| POST | `/customers/{id}/grant-access` | ADMIN, MANAGER | Create `User(CUSTOMER)` login |

## Technicians (`/api/technicians`)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/technicians` | ADMIN, MANAGER | List (pageable) |
| GET | `/technicians/{id}` | ADMIN, MANAGER | Get one |
| GET | `/technicians/me` | TECHNICIAN | Get your own profile |

## Jobs (`/api/jobs`)

| Method | Path | Role | Transition | Description |
|--------|------|------|------------|-------------|
| POST | `/jobs` | ADMIN, MANAGER, CUSTOMER | `→ PENDING` | Create (customer → own profile) |
| GET | `/jobs` | ADMIN, MANAGER | — | List all (optional `?status=`) |
| GET | `/jobs/{id}` | ADMIN+ | — | Get one |
| GET | `/jobs/my-jobs` | TECHNICIAN | — | Your assigned jobs |
| GET | `/jobs/my-requests` | CUSTOMER | — | Your requests |
| GET | `/jobs/my-requests/{id}` | CUSTOMER | — | Your request (ownership checked) |
| PUT | `/jobs/{id}/assign` | ADMIN, MANAGER | `PENDING → ASSIGNED` | Assign technician |
| PUT | `/jobs/{id}/start` | TECHNICIAN | `ASSIGNED → IN_PROGRESS` | Start own job |
| PUT | `/jobs/{id}/complete` | TECHNICIAN | `IN_PROGRESS → COMPLETED` | Complete own job |
| PUT | `/jobs/{id}/close` | ADMIN, MANAGER | `COMPLETED → CLOSED` | Close job |

## Invoices (`/api/invoices`)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/invoices` | ADMIN, MANAGER | Create invoice for a CLOSED job |
| GET | `/invoices` | ADMIN, MANAGER | List all (pageable) |
| GET | `/invoices/{id}` | ADMIN, MANAGER | Get one |
| GET | `/invoices/my-invoices` | CUSTOMER | List your own |
| GET | `/invoices/my-invoices/{id}` | CUSTOMER | Your invoice (ownership checked) |
| PUT | `/invoices/{id}/issue` | ADMIN, MANAGER | `DRAFT → ISSUED` |
| POST | `/invoices/{id}/file` | ADMIN, MANAGER | Upload invoice PDF (Cloudinary) |

## Payments (`/api/payments`)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/payments` | ADMIN, MANAGER | Record payment |
| GET | `/payments` | ADMIN, MANAGER | List all (pageable) |
| GET | `/payments/{id}` | ADMIN, MANAGER | Get one |
| PUT | `/payments/{id}` | ADMIN, MANAGER | Update |
| DELETE | `/payments/{id}` | ADMIN, MANAGER | Delete |
| GET | `/payments/invoice/{id}` | ADMIN, MANAGER | Payments for one invoice |
| GET | `/payments/my-payments` | CUSTOMER | Your own payments |

## Notifications (`/api/notifications`)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/notifications` | any authenticated | Paged list (newest first) |
| GET | `/notifications/unread-count` | any authenticated | For bell badge |
| PUT | `/notifications/{id}/read` | any authenticated | Mark one read |
| PUT | `/notifications/read-all` | any authenticated | Mark all read |

## Dashboard (`/api/dashboard`)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/dashboard/summary?days=7` | ADMIN+ | Aggregated metrics |

## AI chat (`/api/ai`)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/ai/chat` | any authenticated | Message to OpenRouter agent |

## Search (`/api/search` — optional OpenSearch layer)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/search/health` | any authenticated | Check OpenSearch reachability |
| GET | `/search/service-requests?q=...` | any authenticated | Keyword search (ES/OS, PG fallback) |
---

# 6. AI architecture (OpenRouter)

## Provider

| Setting | Property key | Default |
|---------|-------------|---------|
| API key | `OPENROUTER_API_KEY` | (required) |
| Base URL | `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` |
| Model | `OPENROUTER_MODEL` | `google/gemini-2.5-flash-preview-04-17` |
| Max tokens | `OPENROUTER_MAX_TOKENS` | `1024` |
| Temperature | `OPENROUTER_TEMPERATURE` | `0.3` |

OpenRouter exposes an **OpenAI-compatible** `/v1/chat/completions` endpoint. The backend calls it
using a Spring `RestClient` bean configured in `AiConfig.java` — no SDK, no self-hosted server. The
following headers are sent on every request:

- `Authorization: Bearer <OPENROUTER_API_KEY>`
- `HTTP-Referer: https://opsly.app` (required for free-tier models)
- `X-Title: Opsly`
- `Content-Type: application/json`

If `OPENROUTER_API_KEY` is missing or blank, `AiChatService.chat()` returns a plain-text message
("AI assistant is not configured ...") instead of calling OpenRouter.

## Request path

```
AskOpslyAI (UI)
   |  POST /api/ai/chat  { "message": "..." }
   v
AiChatController  (@PreAuthorize("isAuthenticated()"))
   |  @AuthenticationPrincipal User caller
   v
AiChatService.chat(message, caller)
   |  1. Build system prompt + user message
   |  2. Inject tool definitions for caller's role
   |  3. Call OpenRouter /chat/completions
   |  4a. If tool_calls → ToolRegistry.execute(...) → same services as REST → results fed back
   |  4b. If text → return answer
   |  5. Repeat until done or MAX_ITERATIONS (8) reached
   v
ChatResponse { message, toolCalls? }
```

## System prompt

The system prompt (built per-request in `AiChatService`) tells the model:

- You are "Ask Opsly AI", a helpful service-operations assistant.
- You have access to a list of tools. Use them only when the user's request requires it.
- Always pass the authenticated user's identity implicitly — never ask the user for their ID or role.
- Return the answer as plain text. Do not invent tool results.

Tool definitions are the OpenAI function-calling format:

```json
{
  "type": "function",
  "function": { "name": "list_jobs", "description": "...", "parameters": { ... } }
}
```

## Tool call flow

1. The full tool list (all tools from all five `ToolDefinition` classes) is injected into every
   OpenRouter request. The model decides which to call.
2. When the model emits `tool_calls`, `ToolRegistry.execute()` looks up each tool by name.
3. **Before execution** the registry verifies `tool.isAllowedFor(caller)` — if the caller's role is not
   in the tool's `allowedRoles`, a clear error string is returned to the model instead.
4. The executor (a Java lambda in each `ToolDefinition`) parses the JSON arguments, calls the real
   Spring service, and returns a formatted text result.
5. Results are appended to the conversation as `tool` messages and fed back to OpenRouter.

---

# 7. AI tool registry

Tools live in `com.opsly.ai.tool.definition/` — five classes, one per role group. Each class exposes
a `getTools()` method returning a `List<ToolDefinition>`. `ToolRegistry` collects all of them into a
single `Map<String, ToolDefinition>` at startup via `@PostConstruct`.

| Tool class | Roles | Tools | Domains |
|------------|-------|-------|---------|
| `AdminTools` | ADMIN | `create_staff`, `list_staff`, `deactivate_staff` | Staff management |
| `ManagerTools` | ADMIN, MANAGER | `create_customer`, `list_customers`, `get_customer`, `update_customer`, `grant_portal_access`, `list_technicians`, `get_technician`, `list_jobs`, `get_job`, `assign_technician`, `close_job`, `create_invoice`, `list_invoices`, `get_invoice`, `issue_invoice`, `record_payment`, `list_payments` | All business domains |
| `TechnicianTools` | TECHNICIAN | `my_jobs`, `get_my_job`, `start_job`, `complete_job` | Own jobs only |
| `CustomerTools` | CUSTOMER | `create_job_request`, `my_job_requests`, `get_my_job_details` | Own service requests |
| `ServiceRequestTools` | ALL | `get_my_service_requests`, `get_service_request_details`, `get_today_schedule`, `search_service_requests` | Role-scoped request list/search |

**Total: 22 tools** across all classes.

## How a tool call is authorised

Each `ToolDefinition` carries:

- `name` — the function name the LLM calls
- `description` — natural-language description shown to the model
- `parameters` — JSON schema (built by the `Schema` helper class)
- `allowedRoles` — a `Set<Role>` (e.g. `Set.of(Role.ADMIN)` or `Set.of(Role.ADMIN, Role.MANAGER)`)
- `executor` — a `ToolExecutor` lambda `(args, caller) -> String`

`ToolRegistry.execute()` enforces:

1. Tool name exists in the registry.
2. Caller's role is in `allowedRoles`.
3. The executor runs the **real service** — same validation, ownership checks, and `@Transactional`
   boundaries as the REST endpoint.

The caller identity (`User caller`) comes from `@AuthenticationPrincipal` in `AiChatController` and is
passed through — it is never derived from model arguments.


---

# 8. Configuration and secrets

## Environment variables

All secrets come from `backend/.env` (git-ignored). `application.properties` uses ${ENV_VAR}
placeholders — never hardcodes secrets.

| Variable | Meaning |
|----------|---------|
| DB_URL, DB_USERNAME, DB_PASSWORD | PostgreSQL connection |
| JWT_SECRET | HS256 signing key, min 32 chars |
| JWT_EXPIRATION | Access token TTL in ms (default 900000 = 15 min) |
| JWT_REFRESH_EXPIRATION | Refresh token TTL in ms (default 604800000 = 7 days) |
| INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD | First admin (created on startup) |
| ALLOWED_ORIGINS | CORS allow-list, comma-separated |
| OPENROUTER_API_KEY | Bearer key for OpenRouter chat API |
| OPENROUTER_MODEL | Model name (default: google/gemini-2.5-flash-preview-04-17) |
| OPENROUTER_MAX_TOKENS | Max response tokens (default 1024) |
| OPENROUTER_TEMPERATURE | Sampling temperature (default  .3) |
| OPENROUTER_BASE_URL | Override API base URL if needed |
| OPENSEARCH_ENABLED | Enable/disable OpenSearch (default alse) |
| OPENSEARCH_HOST, OPENSEARCH_PORT, OPENSEARCH_SCHEME | OpenSearch connection |
| CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET | Image uploads |
| SWAGGER_UI_PATH, SWAGGER_DOCS_PATH | Swagger endpoints |

## Key behaviours

- **Admin bootstrap:** AdminBootstrap runs on startup. If no ADMIN exists, it creates one from
  INITIAL_ADMIN_EMAIL/INITIAL_ADMIN_PASSWORD. Idempotent — never logs credentials.
- **Cookie security:** pp.cookie.secure=false in local profile (plain HTTP). Set to 	rue behind
  HTTPS. SameSite = Lax, path = /, HttpOnly = true.
- **Refresh token rotation:** on every /auth/refresh call, the old token is revoked in the DB and a
  new one issued. Logout revokes the token in the DB and clears the cookie.
- **OpenRouter is optional:** if OPENROUTER_API_KEY is unset, the app starts normally — the AI
  chat endpoint just reports "not configured".
- **OpenSearch is optional:** disabled by default. When enabled, it adds keyword search; PostgreSQL
  remains the source of truth.

## What is committed vs git-ignored

| File | Committed? | Holds |
|------|-----------|-------|
| `application.properties` | yes | ${ENV_VAR} placeholders + spring.profiles.active=local |
| pplication-local.properties | no | local dev values |
| `backend/.env` | no | all environment variables |
| pom.xml | yes | Maven dependencies |

**Never commit or log** .env, pplication-local.properties, passwords, JWT secrets, API keys, or
database credentials.

---

# 9. Response format

Every endpoint returns ApiResponse<T>:

`json
{ "success": true,  "message": "...", "data": { ... } }
{ "success": false, "message": "..." }
`

- On success data holds the DTO (or Page<T> for list endpoints).
- On failure data is null and message explains what went wrong.
- Validation errors return a field-error map inside data: { "email": "must not be blank", ... }.
- On errors, GlobalExceptionHandler maps exceptions to the same envelope with the correct HTTP
  status (see [§4 Request lifecycle](#4-request-lifecycle)).

---

# 10. Database rules

- Schema is managed by Hibernate ddl-auto=update. No migration tool is used — be careful with
  entity changes.
- Ask before changing relationships or making destructive schema changes.
- Use @Transactional when more than one write must succeed or fail together (registration,
  job assignment, invoice recalculation, payment recording).
- Prefer FetchType.LAZY to avoid N+1. All list endpoints are pageable (Pageable).
- Constraints live on the entities: unique User.email, one invoice per job (job_id unique),
  nullable Customer.user_id, one Technician per User.
- Deletes are **soft** (deleted + deletedAt) for User and Customer. Nothing is hard-deleted
  without approval.

---

# 11. Security rules

| Question | Where |
|----------|---------|
| May this role call this endpoint? | @PreAuthorize on the controller |
| May this user act on this record? | the service (ownership checks) |
| May the AI run this tool for this user? | llowedRoles in the tool definition |
| Is this account still allowed at all? |  JwtAuthFilter (status + soft-delete check) |

Additional rules:

- Caller identity **always** comes from the JWT (@AuthenticationPrincipal User) — never from a
  request body, query parameter, or AI tool argument.
- OPENROUTER_API_KEY, Cloudinary credentials, and database credentials live in `backend/.env` /
  pplication-local.properties (git-ignored), server-side only.
- NEXT_PUBLIC_* values are visible to every browser — never put a secret there.
- Error responses never leak stack traces or internal details.
- BCrypt is used for password hashing; never weaken for dev convenience.

---

# 12. Current state and next steps

| Area | Status |
|------|--------|
| Backend | Complete — 11 packages, all endpoints, notifications, uploads, AI agent with 22 tools, OpenSearch search |
| Backend tests | src/test exists but has **no test classes yet** |
| AI provider | OpenRouter (https://openrouter.ai), model google/gemini-2.5-flash-preview-04-17 |
| Frontend | Shell done (landing, login pages, providers, session handling, UI library, chat widget). Dashboard + list pages missing. |

**Suggested order of work:**

1. Build staff area: add (staff)/layout.tsx then dashboard → customers → jobs → invoices →
   payments → technicians → users screens.
2. Build customer portal: customer/layout.tsx + dashboard, requests, invoices, payments, profile.
3. Remove duplicated src/app/lib and src/app/types modules.
4. Add backend tests for service rules (job transitions, invoice recalculation, ownership checks).

---

_End of BACKEND.md — keep it in sync with src/, ../AGENTS-1.md and ../frontend/FRONTEND-1.md._