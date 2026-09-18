# AGENTS.md — Opsly (project guide)

**Read this file first.** It explains what Opsly is, how the two halves of the project fit together,
and the rules to follow. Everything else is detail, kept in two module guides:

| Document | What it covers |
|----------|----------------|
| `AGENTS.md` (this file) | Product idea, architecture, end-to-end flows, commands, working rules |
| [`backend/BACKEND.md`](backend/BACKEND.md) | The Spring Boot service: packages, entities, endpoints, the AI agent |
| [`frontend/FRONTEND.md`](frontend/FRONTEND.md) | The Next.js app: routes, providers, API client, UI components |

The document is split into four parts, from "what is this" to "how do I work in it".

---

## How to use this document

| I want to... | Go to |
|--------------|-------|
| Understand what Opsly does | [1.1 What Opsly is](#11-what-opsly-is) |
| Start the project on my machine | [1.4 Run it locally](#14-run-it-locally), [1.5 Configuration](#15-configuration-and-secrets) |
| Understand the data model (users, jobs, invoices) | [2.1 Domain model](#21-domain-model) |
| Understand who is allowed to do what | [2.2 Roles and permissions](#22-roles-and-permissions) |
| Understand login and session handling | [2.3 Accounts](#23-accounts-how-users-are-created), [2.4 Login and tokens](#24-login-tokens-and-sessions) |
| Understand the job → invoice → payment flow | [2.6 Business workflows](#26-business-workflows) |
| Understand the AI assistant | [Part 3](#part-3--ai-assistant-ollama) |
| Know what is still missing in the project | [4.6 Current state](#46-current-state-and-next-steps) |
| Follow the coding rules | [4.1 Rules](#41-rules-for-agents-and-developers) to [4.4 Definition of done](#44-definition-of-done) |

---

## In one minute

- **What it is.** Opsly is a service-operations platform for small service businesses (AC repair,
  plumbing, electrical, appliance service). It runs the full service cycle in one place:
  `customer request → technician assigned → work done → invoice → payment → closed`.
- **Who uses it.** Four roles — **ADMIN**, **MANAGER**, **TECHNICIAN**, **CUSTOMER**. Each role sees
  only its own slice of the data; the backend is the only place where that is decided.
- **How it is built.** A Next.js frontend talks to a single Spring Boot backend over JSON. The backend
  owns every business rule, permission and database write.
- **The AI part.** The UI has a chat assistant ("Ask Opsly AI"). The frontend calls **our backend
  agent** (`POST /api/ai/chat`), and the agent calls an **Ollama** model hosted on our own server (EC2).
  When the model asks for data, the agent runs a *tool* that goes through the same services and the same
  permission checks as the REST API. See [Part 3](#part-3--ai-assistant-ollama).
- **Running it.** Backend: `mvn spring-boot:run` → port `8080`. Frontend: `npm run dev` → port `3000`.
- **Current status.** The backend is complete. The frontend has the shell (landing page, login pages,
  component library) but the dashboard/list pages are still to be built — see
  [4.6](#46-current-state-and-next-steps).

---

## Contents

**Part 1 — Getting started**
- [1.1 What Opsly is](#11-what-opsly-is)
- [1.2 Repository layout](#12-repository-layout)
- [1.3 Tech stack](#13-tech-stack)
- [1.4 Run it locally](#14-run-it-locally)
- [1.5 Configuration and secrets](#15-configuration-and-secrets)

**Part 2 — How the system works**
- [2.1 Domain model](#21-domain-model)
- [2.2 Roles and permissions](#22-roles-and-permissions)
- [2.3 Accounts: how users are created](#23-accounts-how-users-are-created)
- [2.4 Login, tokens and sessions](#24-login-tokens-and-sessions)
- [2.5 What happens on a request](#25-what-happens-on-a-request)
- [2.6 Business workflows](#26-business-workflows)
- [2.7 Notifications](#27-notifications)
- [2.8 API surface](#28-api-surface)

**Part 3 — AI assistant (Ollama)**
- [3.1 How the AI works](#31-how-the-ai-works)
- [3.2 What the AI can do per role](#32-what-the-ai-can-do-per-role)

**Part 4 — Working in this repo**
- [4.1 Rules for agents and developers](#41-rules-for-agents-and-developers)
- [4.2 Database rules](#42-database-rules)
- [4.3 Security rules](#43-security-rules)
- [4.4 Definition of done](#44-definition-of-done)
- [4.5 Glossary](#45-glossary)
- [4.6 Current state and next steps](#46-current-state-and-next-steps)

---

# Part 1 — Getting started

## 1.1 What Opsly is

Opsly runs the whole service business of a small company in one place: instead of WhatsApp threads,
paper job cards and spreadsheets, the flow below lives in a single system.

```
customer request -> technician assigned -> work in progress -> completed
                 -> invoice issued      -> payment recorded  -> closed
```

Any step can be performed in two ways, and both must follow identical rules:

1. **Through the UI** — someone clicks buttons.
2. **Through the AI assistant** — someone writes "assign the AC job to Ravi"; the agent picks a tool,
   and that tool calls the very same service the button would have called.

| Role | In one line | Typical actions |
|------|-------------|-----------------|
| ADMIN | Owns the system | manage staff accounts, plus everything a manager does |
| MANAGER | Runs day-to-day operations | customers, assign/close jobs, invoices, payments |
| TECHNICIAN | Does the work | see own jobs, start own job, complete own job |
| CUSTOMER | Buys the service | raise a request, track it, see own invoices and payments |

A customer can exist **without a login** (a walk-in recorded by staff). A technician always has a
login, because jobs are assigned to them.

## 1.2 Repository layout

Two independent applications in one folder, communicating only over HTTP:

```
Opsly/
├── AGENTS.md              <- this guide
├── backend/               Spring Boot API - owns every rule and all data
│   ├── BACKEND.md
│   ├── pom.xml
│   ├── .env               local secrets (git-ignored)
│   ├── src/main/java/com/opsly/{ai, auth, common, customer, dashboard,
│                                invoice, job, notification, payment,
│                                technician, user}
└── frontend/              Next.js app - only a view
    ├── FRONTEND.md
    ├── package.json
    ├── .env.local         NEXT_PUBLIC_API_URL (git-ignored)
    └── src/{app, components, lib, types}
```

- Git remote `https://github.com/anshul-sen-002/Opsly.git`, branch `main`.
- There is **no Maven wrapper** — use `mvn` from the PATH.

## 1.3 Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14.2 (App Router) · React 18 · TypeScript 5 (strict) |
| Forms / styling | react-hook-form + zod · Tailwind CSS 3 (class-based dark mode) · lucide-react |
| Backend | Spring Boot 3.2.5 · Java 17 · Maven |
| Security | Spring Security · JWT access token · refresh token in an HttpOnly cookie |
| Data | Spring Data JPA + Hibernate `ddl-auto=update` on PostgreSQL (no migration tool) |
| API docs | springdoc-openapi → `/swagger-ui.html` |
| Uploads | Cloudinary (profile images, invoice files) |
| AI | **Ollama** (self-hosted, e.g. on EC2) — OpenAI-compatible chat API + one model |
| Tests | Vitest + Testing Library (frontend); backend `src/test` is still empty |

## 1.4 Run it locally

**Prerequisites:** JDK 17, Maven 3.9+, Node.js 18+, PostgreSQL with a database named `sop_db`.

```powershell
cd backend
mvn spring-boot:run        # terminal 1 - serves http://localhost:8080

cd frontend
npm install
npm run dev                # terminal 2 - serves http://localhost:3000
```

| Command | What it does |
|---------|--------------|
| `mvn -q compile` | compile the backend only (quick sanity check) |
| `mvn clean package` | build the runnable jar into `target/` |
| `npm run build` | production build; also type-checks the whole frontend |
| `npm test` | run the frontend test suite once |
| `http://localhost:8080/swagger-ui.html` | browse and try every endpoint |

**First login:** on startup `AdminBootstrap` creates one ADMIN from `INITIAL_ADMIN_EMAIL` /
`INITIAL_ADMIN_PASSWORD` if no admin exists yet. Sign in at `/staff/login`, then create managers and
technicians from the staff screen.

## 1.5 Configuration and secrets

No secret is ever stored in a committed file. `application.properties` (committed) contains only
`${ENV_VAR}` placeholders and activates the `local` profile; the real values live in
`application-local.properties` (git-ignored) or in the environment.

| File | Committed? | Holds |
|------|-----------|-------|
| `backend/src/main/resources/application.properties` | yes | placeholders + `spring.profiles.active=local` |
| `backend/src/main/resources/application-local.properties` | **no** | local dev values (profile `local`) |
| `backend/.env` | **no** | the environment variables below |
| `frontend/.env.local` | **no** | `NEXT_PUBLIC_API_URL` (default `http://localhost:8080`) |

**Backend environment variables**

| Variable | Meaning |
|----------|---------|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | PostgreSQL connection |
| `JWT_SECRET` | HS256 signing key, at least 32 characters |
| `JWT_EXPIRATION` | access-token lifetime in ms (`900000` = 15 min) |
| `JWT_REFRESH_EXPIRATION` | refresh-token lifetime in ms (`604800000` = 7 days) |
| `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD` | the first admin account |
| `ALLOWED_ORIGINS` | CORS allow-list, comma-separated (`http://localhost:3000`) |
| `OLLAMA_BASE_URL` | the Ollama server, e.g. `http://54.161.15.10:11434` |
| `OLLAMA_MODEL` | the model to run, e.g. `qwen2.5:0.5b` (must support tools) |
| `SWAGGER_UI_PATH`, `SWAGGER_DOCS_PATH` | Swagger paths |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | file uploads |

Never commit or log `.env`, `application-local.properties`, `.env.local`, passwords, JWT secrets,
API keys or tokens. The Ollama server URL is backend configuration only — never place a secret in a
`NEXT_PUBLIC_*` variable, because those are readable by everyone in the browser.

---

# Part 2 — How the system works

## 2.1 Domain model

**The eight things the system stores** (each is a database table and a type in both codebases):

| Concept | In plain words | Key detail |
|---------|----------------|------------|
| `User` | A login account | email + BCrypt password + role + status; can be soft-deleted |
| `Customer` | A person/business that receives the service | may have **no** login account at all |
| `Technician` | A person who performs the service | always linked 1:1 to a TECHNICIAN `User` |
| `Job` | One service request | the lifecycle object: PENDING → ASSIGNED → IN_PROGRESS → COMPLETED → CLOSED |
| `Invoice` | What the customer is billed | exactly one per job, and only after the job is CLOSED |
| `Payment` | Money received | many per invoice; drives the invoice status |
| `Notification` | A bell entry for one user | created from business events, never directly by a controller |
| `RefreshToken` | A stored session token | one row per session; rotated on every refresh |

**How they relate** (read `1 ---- N` as "one has many"):

```
User       1 ---- 0..1  Customer          a login may have a customer profile
User       1 ---- 1     Technician        a technician login always has a profile
Customer   1 ---- N     Job               a customer raises many jobs
Technician 1 ---- N     Job               a technician is assigned many jobs
Job        1 ---- 1     Invoice           one invoice per job
Invoice    1 ---- N     Payment           an invoice can be paid in parts
User       1 ---- N     Notification      each bell entry belongs to one user
User       1 ---- N     RefreshToken      each session belongs to one user
```

Two consequences worth remembering:

- **A customer is not the same thing as a login.** Staff can record a customer from a phone enquiry
  with no account, and grant portal access later.
- **Job status and invoice status are independent.** Closing a job never marks an invoice as paid; an
  invoice becomes `PARTIALLY_PAID`/`PAID` only when payments are recorded.

## 2.2 Roles and permissions

Four roles exist, and every permission question is answered in the backend:

| Role | Can see | Can do |
|------|---------|--------|
| `ADMIN` | everything | everything a MANAGER can, plus create/activate/deactivate/delete/restore staff accounts |
| `MANAGER` | all business data | customers, grant portal access, assign/close jobs, create/issue invoices, record/update/delete payments |
| `TECHNICIAN` | **only own jobs**, customer list, own profile | start own job, complete own job |
| `CUSTOMER` | **only own** requests, invoices, payments | raise requests, edit own profile, view own invoices/payments |

**Three layers decide access, in this order:**

1. **Frontend (cosmetic).** The sidebar and topbar hide what a role should not use. Convenience only —
   not security.
2. **Backend role check.** `@PreAuthorize` on each endpoint rejects the wrong role with HTTP 403.
3. **Backend ownership check.** Even with the right role, a technician may only touch a job assigned to
   *them*, and a customer may only read *their own* records. Services throw `ForbiddenException` when
   ownership fails, and the caller's identity always comes from the JWT — never from the request body.

The AI assistant obeys the same three layers: tools are filtered by role when the model asks for them,
and the tool executor passes the authenticated user into the same service, so ownership is enforced
exactly as it is for the REST API.

## 2.3 Accounts: how users are created

| How | Endpoint | Who may call it | What happens |
|-----|----------|-----------------|--------------|
| Bootstrap admin | — (runs at startup) | the system | creates one ADMIN if no ADMIN exists; idempotent; never logs credentials |
| Customer self-registration | `POST /api/auth/customer/register` | public | creates `User(CUSTOMER)` + `Customer` profile in **one** transaction; the role is forced server-side |
| Staff creation | `POST /api/admin/staff` | ADMIN | creates ADMIN / MANAGER / TECHNICIAN; for TECHNICIAN it also creates the profile; CUSTOMER is rejected here |
| Grant portal access | `POST /api/customers/{id}/grant-access` | ADMIN, MANAGER | links a new `User(CUSTOMER)` to an existing walk-in customer (duplicate email is rejected) |

**Deactivation vs deletion** — two different things, often confused:

- **Deactivate** sets the status to `INACTIVE`: the person can no longer log in, and any still-valid
  token stops working immediately. The row stays.
- **Delete** is *soft*: `deleted = true` plus `deletedAt`. Deleted rows disappear from normal lists and
  appear in the trash view, and can be **restored** afterwards. Nothing is ever hard-deleted.

## 2.4 Login, tokens and sessions

One backend flow serves both login screens (`/staff/login` and `/customer/login`):

```
email + password
  -> AuthenticationManager verifies credentials (BCrypt)
  -> account must be ACTIVE and not deleted
  -> issue the access token (JWT, short-lived)
  -> create a refresh token row and return it as an HttpOnly cookie
```

| Token | Lives for | Kept where | Used for |
|-------|-----------|------------|----------|
| Access token (JWT, HS256) | `JWT_EXPIRATION` = 15 min | browser memory (+ `localStorage`) | sent as `Authorization: Bearer <token>` on every request |
| Refresh token | `JWT_REFRESH_EXPIRATION` = 7 days | HttpOnly cookie `refreshToken` (`path=/`, `SameSite=Lax`) | only `POST /api/auth/refresh` uses it, to get a new pair |

Things that matter in practice:

- The JWT carries `sub` (email), `role` and `userId`, so the backend knows who is calling without a
  database round-trip (it still loads the account to check the status).
- **Refresh rotates the token:** the old refresh token is revoked and a new one issued, so a leaked
  token is usable only once.
- **Logout** revokes the refresh token in the database and clears the cookie; the access token simply
  expires naturally within 15 minutes.
- **A disabled account loses access immediately**, even before its access token expires.
- In the browser this becomes: silent refresh shortly before expiry, otherwise a 30-second countdown
  modal and a redirect to the correct login page
  (see [FRONTEND.md §3](frontend/FRONTEND.md)).

## 2.5 What happens on a request

Every API call travels the same path — knowing it explains most of the behaviour you will observe:

```
1. HTTP request arrives
2. SecurityFilterChain runs
     JwtAuthFilter reads "Authorization: Bearer <token>"
       -> token valid? -> load the user -> put it in the SecurityContext
3. @PreAuthorize checks the role for this endpoint        (403 if the role is wrong)
4. Controller runs: @Valid checks the body, @AuthenticationPrincipal gives the User
5. Service runs inside a transaction: ownership, status rules, calculations
6. Repository reads/writes PostgreSQL
7. DTO is mapped and wrapped in ApiResponse<T> and returned as JSON
```

If a step fails, `GlobalExceptionHandler` converts the exception into the same JSON envelope, so the
frontend always sees `{ success: false, message: ... }` with a sensible HTTP status:

| Situation | Status | Example |
|-----------|--------|---------|
| missing record | 404 | "Job not found" |
| rule violated | 400 | "Job must be in ASSIGNED status to start" |
| duplicate | 409 | "Email already registered" |
| wrong role or not the owner | 403 | "You are not assigned to this job" |
| bad credentials / expired token | 401 | "Invalid email or password" |
| validation failure | 400 | `data` = `{ "email": "Email is required" }` |
| unexpected error | 500 | generic message, no internals |

## 2.6 Business workflows

**The job lifecycle — the core of the product**

```
PENDING --assign (ADMIN/MANAGER)--> ASSIGNED --start (TECHNICIAN, own job)--> IN_PROGRESS
        --complete (TECHNICIAN, own job)--> COMPLETED --close (ADMIN/MANAGER)--> CLOSED
```

- Only these transitions are allowed; anything else returns a 400.
- A technician can only start/complete a job assigned to *them* (otherwise 403).
- A customer creates a job (status `PENDING`) and can follow it, but cannot assign or close it.

**Invoices and payments**

```
CLOSED job --> create invoice (DRAFT: subtotal + tax) --issue--> ISSUED
           --> payment recorded --> PARTIALLY_PAID --> PAID
           --> overdue (past due date) --> OVERDUE
```

- An invoice can only be created for a **CLOSED** job, and only one invoice per job.
- Only payments with status `SUCCESS` count towards the invoice total.
- The invoice status is recomputed every time a payment is created, updated or deleted.
- Job status and invoice status never affect each other automatically.

**Customers**

Recorded by staff (no login) → optionally granted portal access (creates the login) → can be soft
deleted and restored. Deleted records stay in the database so history never breaks.

## 2.7 Notifications

**Why it exists:** staff and customers should learn about events without refreshing a page. The UI bell
shows an unread count and lists the entries.

```
a service saves data and publishes an event (e.g. JobAssignedEvent)
   -> NotificationListener (@TransactionalEventListener, AFTER_COMMIT)
   -> NotificationService.create(userId, type, title, message, link)
   -> a Notification row -> the browser bell polls the unread count
```

| Event | Who gets notified |
|-------|-------------------|
| job created | ADMIN + MANAGER |
| job assigned | the assigned technician |
| job started / completed / closed | staff roles, the technician, and the customer's login (if any) |
| invoice issued | the customer's login (skipped when the customer has no account) |
| payment received | ADMIN + MANAGER |
| customer registered | ADMIN + MANAGER |

Two design points worth remembering: notifications are created **after the transaction commits** (a
rolled-back assignment notifies nobody), and services only publish facts — they know nothing about who
reads them.

## 2.8 API surface

```
AUTH          POST /api/auth/customer/register | /customer/login | /staff/login | /refresh | /logout
AI            POST /api/ai/chat
DASHBOARD     GET  /api/dashboard/summary
STAFF         POST|GET /api/admin/staff · GET|PUT /api/admin/staff/{id}
              PUT /{id}/activate | /{id}/deactivate · DELETE /{id} · PUT /{id}/restore
PROFILE       GET|PUT /api/users/me · POST /api/users/me/profile-image
CUSTOMERS     POST|GET /api/customers · GET|PUT|DELETE /api/customers/{id} · PUT /{id}/restore
              POST /{id}/grant-access · GET|PUT /api/customers/me
TECHNICIANS   GET /api/technicians · GET /api/technicians/{id} · GET /api/technicians/me
JOBS          POST|GET /api/jobs · GET /api/jobs/{id} · GET /api/jobs/my-jobs
              GET /api/jobs/my-requests[/{id}] · PUT /api/jobs/{id}/assign | start | complete | close
INVOICES      POST|GET /api/invoices · GET /api/invoices/{id} · PUT /{id}/issue · POST /{id}/file
              GET /api/invoices/my-invoices[/{id}]
PAYMENTS      POST|GET /api/payments · PUT|DELETE /api/payments/{id} · GET /invoice/{invoiceId}
              GET /api/payments/my-payments
NOTIFICATIONS GET /api/notifications · GET /unread-count · PUT /{id}/read · PUT /read-all
```

Which roles may call each of these: [BACKEND.md §5](backend/BACKEND.md). The response envelope is always
the same:

```json
{ "success": true,  "message": "OK",        "data": { } }
{ "success": false, "message": "Not found" }
```

Validation failures place a `{ field: message }` map inside `data`, which the frontend feeds straight
into form fields.

---

# Part 3 — AI assistant (Ollama)

## 3.1 How the AI works

**The short version:** the frontend calls our backend agent, and the agent calls an **Ollama** model
running on our own server (EC2).
Everything the assistant does is done through the same services the REST API uses, with the same
permission checks.

```
+--------------------+     POST /api/ai/chat      +-----------------------------+
|  AskOpslyAI (UI)   | -------------------------> |  Opsly agent (backend)      |
|  chat + voice      | <------------------------- |  AiChatService+ToolRegistry |
+--------------------+   { message, toolCalls }   +--------------+--------------+
                                                                | prompt + tools
                                                                v
                                                 +-----------------------------+
                                                 |  Ollama (EC2)               |
                                                 |  one model, OpenAI API      |
                                                 +--------------+--------------+
                                                                | "call tool X"
                                                                v
                                                 +-----------------------------+
                                                 |  tool -> the same service   |
                                                 |  the REST API uses -> DB    |
                                                 +-----------------------------+
```

**Six things to remember:**

1. **The browser never talks to the model.** It only knows `POST /api/ai/chat`. The Ollama server is
   reached from the backend only (`OLLAMA_BASE_URL`).
2. **The provider is a self-hosted Ollama server**, configured by `OLLAMA_BASE_URL` and `OLLAMA_MODEL`
   (a single model, called through the OpenAI-compatible API). Bedrock is no longer used.
3. **The model never decides permissions.** Before a tool runs, the tool registry checks the caller's
   role; a role that is not allowed gets a clear refusal instead of an action.
4. **The model can only use registered tools** — 27 of them — and each one calls an existing, validated
   service. There is no raw SQL, no shell and no reflection.
5. **Identity always comes from the JWT**, never from the conversation. So a technician asking the
   assistant about "my jobs" gets their own jobs, and a customer cannot read anyone else's data — even
   if the model is tricked into trying.
6. **The agent loop is bounded** (8 rounds). If the model cannot finish, the user gets a plain message
   plus a record of what was attempted.

Switching provider, region or model is a **backend-only change** — the UI contract
(`{ message }` in, `{ message, toolCalls }` out) stays the same. Technical detail:
[BACKEND.md §8–§9](backend/BACKEND.md).

## 3.2 What the AI can do per role

The assistant is available to every signed-in user, but the tool list shrinks with the role:

| Role | The assistant can... | Example prompt |
|------|---------------------|----------------|
| ADMIN | everything a manager can, plus staff management | "create a manager account for priya@shop.com" |
| MANAGER | work with customers, technicians, jobs, invoices and payments | "assign job 12 to the electrician" / "record a ₹2000 UPI payment on INV-2026-0007" |
| TECHNICIAN | work with **their own** jobs | "what is on my plate today?" / "start job 15" |
| CUSTOMER | work with **their own** requests and bills | "raise a request: AC not cooling, tomorrow 10am" / "how much do I owe?" |

Because the tools run the real services, an action taken through the assistant behaves exactly like the
action taken in the UI: the same validation, the same status rules, the same notifications. When a
request is outside the role, the assistant says so rather than failing silently.

---

# Part 4 — Working in this repo

## 4.1 Rules for agents and developers

**Always**

- Read the code you are about to change — and the relevant section of this guide or the module docs.
- Implement only what was asked; do not "improve" unrelated code on the way.
- Preserve existing behaviour unless a change is explicitly requested.
- Follow the patterns already present in the file/package/folder you are editing.
- Keep types strong: Java DTOs and enums, TypeScript without `any`.
- Keep it simple: no new dependency, abstraction or comment unless it earns its place.
- Compile before claiming success (`mvn -q compile`, `npm run build`), or run the tests.
- Update the matching document when a contract, rule or flow changes.

**Ask first**

- Large refactors, architecture changes, database or schema changes.
- Anything touching authentication, authorization, CORS or cookies.
- Any change that spans several features (backend + frontend + AI tools).
- Adding an abstraction for code that repeats three times — confirm it is wanted first.

**Never**

- Weaken auth, CORS, cookie flags or BCrypt "to make development easier".
- Bypass a role check or an ownership check — not even temporarily, not even in the UI.
- Return an entity straight from a controller.
- Let the AI model decide who may do what.
- Commit or log a secret (`.env`, `application-local.properties`, keys, tokens).

## 4.2 Database rules

- The schema is created and updated by Hibernate (`ddl-auto=update`). There is **no migration tool**, so
  treat entity changes carefully.
- Ask before touching relationships, and never make a destructive schema change silently.
- Use `@Transactional` whenever more than one write must succeed or fail together (job assignment,
  invoice recalculation, registration, granting access).
- Prefer `FetchType.LAZY`, avoid N+1 queries, and make every list endpoint pageable.
- Constraints live on the entities: unique `User.email`, one invoice per job, nullable `customer.user_id`.
- Deletes are **soft** (`deleted` + `deletedAt`) for users and customers. Nothing is hard-deleted without
  approval.

## 4.3 Security rules

Never hardcode or log passwords, JWT secrets, API keys, tokens or database credentials.

| Question | Where it is answered |
|----------|----------------------|
| May this role call this endpoint? | `@PreAuthorize` on the controller |
| May this user act on this record? | the service (ownership checks) |
| May the AI run this tool for this user? | `allowedRoles` in the tool registry |
| Is this account still allowed at all? | `JwtAuthFilter` (status + soft-delete check) |

Additional rules:

- The caller identity always comes from the JWT (`@AuthenticationPrincipal User`) — never from a request
  body, query parameter or AI tool argument.
- The Ollama URL, Cloudinary and database credentials live in `backend/.env` and
  `application-local.properties`, both git-ignored, and stay server-side.
- `NEXT_PUBLIC_*` values are visible to every browser — never put a secret there.
- Error responses never leak stack traces or internal details (`GlobalExceptionHandler` maps everything).

## 4.4 Definition of done

A change is complete when:

- The requested behaviour works and was **actually verified** (compiled/run/tested, not just written).
- Existing behaviour is preserved.
- Permissions are not bypassed and ownership is still enforced server-side.
- Status transitions are validated in the service layer, and mirrored in the tool registry if the action
  is also exposed to the AI.
- Responses keep the `ApiResponse<T>` shape and errors stay consistent.
- No unnecessary code, dependency or feature was added.
- The backend compiles (`mvn -q compile`) and the frontend compiles (`npm run build`).
- The relevant document was updated: this file, `backend/BACKEND.md`, `frontend/FRONTEND.md`.

## 4.5 Glossary

| Term | Meaning |
|------|---------|
| DTO | Data Transfer Object — the request/response shape of an endpoint; entities are never exposed |
| Entity | A Java class mapped to a database table |
| Service layer | Where business rules live; the only layer allowed to write data |
| Ownership check | "Is this record yours?" — enforced in the service, based on the JWT |
| Soft delete | Marking a row deleted (`deleted = true`) instead of removing it, so it can be restored |
| Pageable / `Paged<T>` | Spring's pagination request/response; used by every list endpoint |
| JWT | Signed token proving who the caller is; carries email, role and userId |
| Access vs refresh token | Short-lived token for API calls vs long-lived token used only to renew it |
| HttpOnly cookie | A cookie JavaScript cannot read — how the refresh token is stored safely |
| Rotation | Replacing the refresh token on every use so a stolen one is single-use |
| Agent | The backend component that drives the model, runs its tool requests and returns the answer |
| Tool | One capability the model may request (e.g. `list_jobs`); executed against a real service |
| Foundation model | The Ollama model the agent calls |
| Ollama server | The self-hosted LLM runtime (e.g. on EC2) that answers the agent's chat requests |
| CORS | The browser rule that decides which origins may call the API (`app.cors.allowed-origins`) |

## 4.6 Current state and next steps

| Area | State |
|------|-------|
| Backend | **Complete** — 11 packages, all endpoints, notifications, uploads, AI agent with 27 tools |
| Backend tests | `src/test` exists but has no test classes yet |
| Frontend — shell | **Done** — landing page, auth pages, providers, session handling, full `ui/*` library, AI chat |
| Frontend — features | **Missing** — `/dashboard`, `/customers`, `/jobs`, `/technicians`, `/invoices`, `/payments`, `/users`, `/tasks`, and the entire customer portal (those links currently 404) |
| AI | Agent and tools are implemented; the provider is a self-hosted **Ollama** server (see [Part 3](#part-3--ai-assistant-ollama)) |

**Suggested order of work**

1. Add `(staff)/layout.tsx` (guard + sidebar + topbar + session gate + AI chat).
2. Build the staff screens on top of the existing components: dashboard → customers → jobs →
   invoices → payments → technicians → users.
3. Build the `customer/**` portal using the existing customer API methods.
4. Clean up the duplicated `src/app/lib` and `src/app/types` modules.
5. Add backend tests for the service rules (job transitions, invoice recalculation, ownership).

Full frontend detail: [FRONTEND.md §10](frontend/FRONTEND.md).

---

## Where to go next

| Need | Document |
|------|----------|
| Backend packages, entities, endpoints, AI internals, Ollama config | [`backend/BACKEND.md`](backend/BACKEND.md) |
| Frontend routes, providers, API client, UI components, known gaps | [`frontend/FRONTEND.md`](frontend/FRONTEND.md) |

---

_End of AGENTS.md — keep it in sync with `backend/BACKEND.md` and `frontend/FRONTEND.md`._
