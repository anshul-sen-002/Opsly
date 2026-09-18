# BACKEND.md — Opsly backend

**What this document is:** a map of the Spring Boot service — which package does what, which rules
each service protects, which endpoints exist, and how the AI agent talks to its Ollama server.
It assumes you have read [`../AGENTS.md`](../AGENTS.md) first.

**Golden rule of this codebase:** the backend is the single source of truth. Permissions, ownership
("is this your job?"), status transitions and totals are decided here — never in the UI, never by the
AI model.

---

## How to use this document

| I want to... | Go to |
|--------------|-------|
| Find where a feature lives | [1. Package map](#1-package-map) |
| Change configuration / add an env var | [2. Configuration](#2-configuration) |
| Understand login, JWT and security | [3. Security internals](#3-security-internals) |
| See the database tables and fields | [4. Domain entities](#4-domain-entities) |
| Check who may call an endpoint | [5. Endpoint and permission matrix](#5-endpoint-and-permission-matrix) |
| Understand a business rule (jobs, invoices, payments) | [6. Business rules](#6-business-rules-owned-by-the-services) |
| Understand the notifications | [7. Notifications](#7-notifications) |
| Understand the AI agent loop | [8. AI agent internals](#8-ai-agent-internals) |
| Configure the AI provider | [9. AI provider: Ollama](#9-ai-provider-ollama) |
| Build, run or add a feature | [10. Build, run, test](#10-build-run-test), [11. Checklists](#11-checklists-for-common-changes) |

---

## In one minute

- **Stack:** Spring Boot 3.2.5 · Java 17 · Maven · PostgreSQL · Spring Security (JWT) · Spring Data JPA.
- **Shape:** 11 feature packages, each split into `controller → service → repository → entity/dto`.
- **Security:** JWT access token + refresh token in an HttpOnly cookie; roles checked twice —
  `@PreAuthorize` on the endpoint and `allowedRoles` inside the AI tool registry.
- **AI:** `POST /api/ai/chat` runs an agent loop (max 8 rounds) against a self-hosted **Ollama** model;
  can request tools, and every tool is authorized before it runs.
- **Run:** `mvn spring-boot:run` → `http://localhost:8080`, Swagger at `/swagger-ui.html`.

---

## Contents

- [1. Package map](#1-package-map)
- [2. Configuration](#2-configuration)
- [3. Security internals](#3-security-internals)
- [4. Domain entities](#4-domain-entities)
- [5. Endpoint and permission matrix](#5-endpoint-and-permission-matrix)
- [6. Business rules owned by the services](#6-business-rules-owned-by-the-services)
- [7. Notifications](#7-notifications)
- [8. AI agent internals](#8-ai-agent-internals)
- [9. AI provider: Ollama](#9-ai-provider-ollama)
- [10. Build, run, test](#10-build-run-test)
- [11. Checklists for common changes](#11-checklists-for-common-changes)

---

# 1. Package map

**Where things live** — everything is under `src/main/java/com/opsly/`. Each feature is a package with
the same internal shape, so once you know one package you know them all:

```
controller/  the HTTP boundary - routing, validation, role check. No business logic.
service/     the business rules - ownership checks, status transitions, transactions.
repository/  Spring Data JPA interfaces (queries are derived from method names).
entity/      the database tables as Java classes, plus enums.
dto/         request/response objects. Entities are never returned directly.
```

| Package | What it is responsible for |
|---------|---------------------------|
| `com.opsly` | `OpslyApplication` — the `@SpringBootApplication` entry point |
| `ai` | The AI agent: chat endpoint, agent loop, tool registry and the 4 role tool catalogues |
| `auth` | Login, customer self-registration, refresh, logout |
| `common` | Shared plumbing: security config, JWT, error handling, `ApiResponse`, uploads, admin bootstrap |
| `customer` | Customer profiles (a customer may exist without a login), soft delete/restore, portal access |
| `dashboard` | Aggregated numbers for the dashboard screens |
| `invoice` | Invoice per closed job: create, issue, attach file, customer reads |
| `job` | The service request itself and its status transitions |
| `notification` | In-app bell notifications, produced from domain events |
| `payment` | Payments against invoices and invoice status recalculation |
| `technician` | Technician profiles (always linked 1:1 to a TECHNICIAN login) |
| `user` | The login account, roles/status, staff administration, own-profile endpoints |

**Folder shape on disk**

```
backend/
├── BACKEND.md                  <- this file
├── pom.xml                     Spring Boot 3.2.5 parent, Java 17, jjwt, modelmapper, cloudinary, springdoc
├── .env                        local secrets (git-ignored; not committed)
├── .gitignore                  ignores target/, .env, application-local.properties
└── src/
    ├── main/java/com/opsly/    the 11 packages above
    ├── main/resources/
    │   ├── application.properties        all values are ${ENV_VAR} placeholders; activates profile "local"
    │   └── application-local.properties  real local dev values (git-ignored)
    └── test/                   exists but has no test classes yet
```

Built output goes to `target/` (`opsly-backend-0.0.1-SNAPSHOT.jar`). There is **no Maven wrapper** in
this repository — use the system `mvn` (3.9 or newer).

---

# 2. Configuration

**Idea in one line:** committed properties contain no secrets — they only declare *which* environment
variable feeds each setting, and `spring.profiles.active=local` makes Spring load the git-ignored
`application-local.properties` on top for local development.

```properties
# application.properties (committed) - placeholders only
spring.profiles.active=local
spring.datasource.url=${DB_URL}
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}
app.jwt.secret=${JWT_SECRET}
app.jwt.access-token-expiration=${JWT_EXPIRATION}
app.jwt.refresh-token-expiration=${JWT_REFRESH_EXPIRATION}
app.admin.email=${INITIAL_ADMIN_EMAIL}
app.admin.password=${INITIAL_ADMIN_PASSWORD}
app.cors.allowed-origins=${ALLOWED_ORIGINS}
app.cookie.secure=false
app.cookie.same-site=Lax
app.ai.ollama.base-url=${OLLAMA_BASE_URL:http://localhost:11434}
app.ai.ollama.model=${OLLAMA_MODEL:}
app.ai.ollama.max-tokens=1024
app.ai.ollama.temperature=0.3
springdoc.swagger-ui.path=${SWAGGER_UI_PATH}
springdoc.api-docs.path=${SWAGGER_DOCS_PATH}
app.cloudinary.cloud-name=${CLOUDINARY_CLOUD_NAME:}
app.cloudinary.api-key=${CLOUDINARY_API_KEY:}
app.cloudinary.api-secret=${CLOUDINARY_API_SECRET:}
spring.servlet.multipart.max-file-size=10MB
spring.servlet.multipart.max-request-size=10MB
```

```properties
# application-local.properties (git-ignored) - the real values for your machine
spring.datasource.url=jdbc:postgresql://localhost:5432/sop_db
spring.datasource.username=postgres
spring.datasource.password=<your-password>
app.jwt.secret=<at-least-32-characters>
app.admin.email=<first-admin-email>
app.admin.password=<first-admin-password>
app.cors.allowed-origins=http://localhost:3000
app.ai.ollama.base-url=http://<ec2-ip>:11434
app.ai.ollama.model=qwen2.5:0.5b
app.cloudinary.cloud-name=<cloud-name>
app.cloudinary.api-key=<api-key>
app.cloudinary.api-secret=<api-secret>
```

**Environment variables** (the names used in `application.properties`):

| Variable | Used for |
|----------|----------|
| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` | PostgreSQL connection |
| `JWT_SECRET` | HS256 signing key, >= 32 characters |
| `JWT_EXPIRATION` / `JWT_REFRESH_EXPIRATION` | token lifetimes in ms (900000 / 604800000) |
| `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` | bootstrap admin |
| `ALLOWED_ORIGINS` | CORS origins, comma-separated |
| `OLLAMA_BASE_URL` / `OLLAMA_MODEL` | the AI provider (see §9) |
| `SWAGGER_UI_PATH` / `SWAGGER_DOCS_PATH` | Swagger paths |
| `CLOUDINARY_*` | file uploads |

Other notable settings: `server.port=8080`, `spring.jpa.hibernate.ddl-auto=update`,
`spring.jpa.show-sql=false`, multipart limit `10MB`, cookie flags `secure=false` + `SameSite=Lax`
(local HTTP only).

**Rule:** a value written as `${VAR:}` (with the colon) is optional and the app still starts without
it. A value written as `${VAR}` is required — startup fails when it cannot be resolved, which is
deliberate.

---

# 3. Security internals

**Who is who:** these classes make "logged in" and "allowed" work.

| Class | Responsibility |
|-------|----------------|
| `common/config/SecurityConfig` | Stateless filter chain, CORS from `app.cors.allowed-origins`, `@EnableMethodSecurity`, `BCryptPasswordEncoder`, the public route list |
| `common/security/JwtUtil` | Creates and parses HS256 tokens. Claims: subject = email, `role`, `userId` |
| `common/security/JwtAuthFilter` | Runs once per request: reads `Authorization: Bearer <token>`, validates it, loads the user, fills the `SecurityContext`. Skips deactivated/deleted accounts even with a valid token |
| `user/service/UserDetailsServiceImpl` | Loads a `User` by email (used by the filter and by the login `AuthenticationManager`) |
| `common/config/AdminBootstrap` | `ApplicationRunner` that creates the first ADMIN if none exists — idempotent, never logs credentials |
| `common/response/ApiResponse<T>` | The response envelope used by every endpoint |
| `common/exception/GlobalExceptionHandler` | `@RestControllerAdvice` that converts exceptions into the same envelope |

**Public routes (no token needed):** `POST /api/auth/customer/register`,
`POST /api/auth/customer/login`, `POST /api/auth/staff/login`, `POST /api/auth/refresh`,
`GET /swagger-ui/**`, `GET /v3/api-docs/**`, `OPTIONS /**`. Everything else requires a valid JWT —
including `POST /api/ai/chat`.

**Error mapping** (every response keeps the `ApiResponse` shape):

| Situation | HTTP | Message / data |
|-----------|------|----------------|
| `ResourceNotFoundException` | 404 | resource not found |
| `BadRequestException` | 400 | e.g. "Job must be in ASSIGNED status to start" |
| `ConflictException` | 409 | e.g. "Email already registered" |
| `ForbiddenException` / `AccessDeniedException` | 403 | ownership or role failure |
| `BadCredentialsException` / other auth errors | 401 | "Invalid email or password" |
| disabled or locked account | 403 | "Your account is disabled..." |
| `@Valid` failure | 400 | `data` = `{ field: message }` map |
| anything else | 500 | generic message — internals are never exposed |

---

# 4. Domain entities

**These classes are the database tables.** Fields are listed as they appear in the entity classes;
`-> X` means the field is a relationship.

| Entity | Fields |
|--------|--------|
| `user/entity/User` | `id`, `email` (unique), `password` (BCrypt), `role`, `status`, `deleted`, `deletedAt`, `profileImageUrl`, `profileImagePublicId`, `createdAt`, `updatedAt` |
| `user/entity/RefreshToken` | `id`, `token`, `-> user`, `expiresAt`, `revoked` |
| `customer/entity/Customer` | `id`, `name`, `companyName`, `phone`, `email`, `address`, `city`, `-> user` (nullable), `deleted`, `deletedAt`, `createdAt`, `updatedAt` |
| `technician/entity/Technician` | `id`, `name`, `phone`, `specialization`, `-> user` (required), `createdAt`, `updatedAt` |
| `job/entity/Job` | `id`, `-> customer`, `-> technician` (nullable until assigned), `status`, `description`, `scheduledAt`, `createdAt`, `updatedAt` |
| `invoice/entity/Invoice` | `id`, `-> job`, `-> customer`, `invoiceNumber`, `subtotal`, `tax`, `totalAmount`, `status`, `issuedAt`, `dueDate`, `fileUrl`, `filePublicId`, `createdAt`, `updatedAt` |
| `payment/entity/Payment` | `id`, `-> invoice`, `amount`, `paymentMethod`, `status`, `transactionReference`, `paidAt`, `createdAt` |
| `notification/entity/Notification` | `id`, `-> user`, `type`, `title`, `message`, `link`, `read`, `createdAt` |

**Enums and what their values mean**

| Enum | Values |
|------|--------|
| `Role` | `ADMIN`, `MANAGER`, `TECHNICIAN`, `CUSTOMER` |
| `UserStatus` | `ACTIVE` (can log in), `INACTIVE` (login blocked) |
| `JobStatus` | `PENDING` → `ASSIGNED` → `IN_PROGRESS` → `COMPLETED` → `CLOSED` (in that order only) |
| `InvoiceStatus` | `DRAFT`, `ISSUED`, `PARTIALLY_PAID`, `PAID`, `OVERDUE` |
| `PaymentMethod` | `CASH`, `UPI`, `CARD`, `BANK_TRANSFER` |
| `PaymentStatus` | `PENDING`, `SUCCESS`, `FAILED`, `REFUNDED` (only `SUCCESS` counts towards the invoice total) |
| `NotificationType` | `JOB_ASSIGNED`, `JOB_STARTED`, `JOB_COMPLETED`, `JOB_CLOSED`, `INVOICE_ISSUED`, `PAYMENT_RECEIVED`, `CUSTOMER_REGISTERED` |

**Repositories** are plain `JpaRepository` interfaces; queries are derived from the method names, e.g.
`findByDeleted(...)`, `findByRoleNotAndDeleted(...)`, `findByTechnician(...)`, `findByCustomerId(...)`,
`findByUser(...)`, `countByUserIdAndReadFalse(...)`, `sumAmountByInvoiceAndStatus(...)`.
Every list endpoint accepts a `Pageable` and returns `Page<...Response>` (the frontend type is `Paged<T>`).

---

# 5. Endpoint and permission matrix

**How to read this:** the HTTP layer is guarded by `@PreAuthorize` on the controller, and the same
action performed through the AI has its tool guarded by `allowedRoles` in the tool registry. The two
lists must stay in sync whenever you add or change a permission.

| Method and path | Allowed roles |
|-----------------|---------------|
| `POST /api/auth/customer/register` · `/customer/login` · `/staff/login` · `/refresh` · `/logout` | public (no token) |
| `POST /api/ai/chat` | any authenticated user — the tools are filtered by role |
| `GET /api/dashboard/summary` | ADMIN, MANAGER, TECHNICIAN |
| `POST|GET /api/admin/staff` | ADMIN |
| `GET /api/admin/staff/{id}` | ADMIN, MANAGER, TECHNICIAN |
| `PUT /api/admin/staff/{id}` | ADMIN, MANAGER |
| `PUT /api/admin/staff/{id}/activate` · `/deactivate` · `DELETE /{id}` · `PUT /{id}/restore` | ADMIN |
| `GET /api/customers` · `/api/customers/{id}` | ADMIN, MANAGER (detail also TECHNICIAN) |
| `GET|PUT /api/customers/me` | CUSTOMER (own profile; id comes from the JWT) |
| `POST /api/customers` · `PUT|DELETE /api/customers/{id}` · `PUT /{id}/restore` · `POST /{id}/grant-access` | ADMIN, MANAGER |
| `GET /api/technicians` · `/api/technicians/{id}` | ADMIN, MANAGER |
| `GET /api/technicians/me` | TECHNICIAN |
| `POST /api/jobs` | ADMIN, MANAGER, CUSTOMER |
| `GET /api/jobs` · `/api/jobs/{id}` | ADMIN, MANAGER (detail also TECHNICIAN) |
| `GET /api/jobs/my-jobs` | TECHNICIAN (own only) |
| `GET /api/jobs/my-requests` · `/my-requests/{id}` | CUSTOMER (own only) |
| `PUT /api/jobs/{id}/assign` · `/close` | ADMIN, MANAGER |
| `PUT /api/jobs/{id}/start` · `/complete` | TECHNICIAN (own job only) |
| `POST|GET /api/invoices` · `GET /{id}` · `PUT /{id}/issue` · `POST /{id}/file` | ADMIN, MANAGER |
| `GET /api/invoices/my-invoices` · `/my-invoices/{id}` | CUSTOMER (own only) |
| `POST|GET /api/payments` · `PUT|DELETE /{id}` · `GET /{id}` · `GET /invoice/{invoiceId}` | ADMIN, MANAGER |
| `GET /api/payments/my-payments` | CUSTOMER (own only) |
| `GET|PUT /api/users/me` · `POST /api/users/me/profile-image` | any authenticated user (own account) |
| `GET /api/notifications` · `/unread-count` · `PUT /{id}/read` · `PUT /read-all` | any authenticated user (own rows) |

**Ownership is a second gate.** Being allowed by role is not enough: `JobService` checks that a
technician owns the job before start/complete, `InvoiceService` and `JobService` check that a customer
owns the record before returning it, and `NotificationService` checks the notification belongs to the
caller. All of these compare against the **JWT-derived** user, never against a value sent by the client.

---

# 6. Business rules owned by the services

**Why this section matters:** these rules are the product. They live in the service classes (never in
controllers, never in the UI), and the AI tools call the same services — so a rule written here applies
to both.

## Jobs — `job/service/JobService`

| Action | Rule enforced |
|--------|---------------|
| `createJob` | new jobs always start as `PENDING`; publishes `JobCreatedEvent` |
| `assignTechnician` | only from `PENDING`; sets technician → `ASSIGNED`; notifies the technician's account |
| `startJob` | only from `ASSIGNED`, **and** the caller must be the assigned technician |
| `completeJob` | only from `IN_PROGRESS`, **and** the caller must be the assigned technician |
| `closeJob` | only from `COMPLETED` (ADMIN/MANAGER) |

Anything else is rejected with `BadRequestException` (e.g. "Job must be in ASSIGNED status to start"),
and a wrong technician gets `ForbiddenException` ("You are not assigned to this job"). Status changes
publish `JobStatusEvent` so notifications can follow. Reads are scoped: `getMyJobs(user)` resolves the
technician from the JWT, and `getJobByIdForCustomer` checks ownership before returning.

## Invoices — `invoice/service/InvoiceService`

| Action | Rule enforced |
|--------|---------------|
| `createInvoice` | allowed **only for a CLOSED job**, and only once per job (`ConflictException` otherwise) |
| totals | `totalAmount = subtotal + tax`; number is generated as `INV-{year}-{sequence}` |
| `issueInvoice` | only from `DRAFT` → `ISSUED`, stamps `issuedAt`, notifies the customer's account if it has one |
| `updateInvoiceStatusForPayment` | the single source of truth for invoice status (see below) |
| `uploadFile` | stores the Cloudinary URL/public id on the invoice and deletes the previous file |
| customer reads | scoped by the JWT-derived customer id; foreign invoices raise `ForbiddenException` |

Invoice status is recalculated from the sum of successful payments:

```
totalPaid >= total          -> PAID
totalPaid > 0               -> PARTIALLY_PAID
totalPaid = 0 and no issuedAt -> DRAFT
past dueDate                -> OVERDUE
otherwise                   -> ISSUED
```

## Payments — `payment/service/PaymentService`

| Action | Rule enforced |
|--------|---------------|
| `recordPayment` | refused when the invoice is already `PAID`; saves `Payment(SUCCESS)`, recalculates the invoice status **in the same transaction**, then publishes `PaymentReceivedEvent` |
| `updatePayment` | a payment can never be moved to another invoice; totals are recalculated afterwards |
| `deletePayment` | delete, then recalculate — so `paidAmount` can never drift |
| `getCustomerPayments` | customer-scoped (used by `/my-payments`) |

## Customers — `customer/service/CustomerService`

- Staff-created customers have `user = null` (no login); `grantPortalAccess` creates and links a
  `User(CUSTOMER)` in one transaction and refuses duplicates or an already-linked customer.
- Soft delete/restore via `deleted` + `deletedAt`. List endpoints take a `deleted` flag: `false` =
  active, `true` = trash. Updating a deleted record is rejected.
- `getMyProfile` / `updateMyProfile` resolve the profile from the authenticated user, never from an id.

## Staff — `user/service/AdminService`

- `createStaff` rejects the CUSTOMER role (customers register themselves); for TECHNICIAN it also
  creates the `Technician` profile in the same transaction.
- `activate` / `deactivate` are idempotent and refuse to touch a deleted account.
- `deleteStaff` is a soft delete (`deleted = true`, `status = INACTIVE`) and refuses self-deletion;
  `restoreStaff` reactivates the account.
- List responses exclude CUSTOMER accounts; list **and** detail responses add the technician fields
  (name, phone, specialization) via one batched lookup per page — the login account itself stores no
  phone, so without this merge the Users table shows "—" for every technician.

## Uploads and dashboard

- `CloudinaryConfig` builds the `Cloudinary` bean **only when a cloud name is configured**, so the app
  still boots without credentials; `CloudinaryService` wraps upload and quiet delete.
- `GET /api/dashboard/summary?days=7` aggregates the stat cards, an overview series, status counts, top
  customers and recent activity.

---

# 7. Notifications

**Why it exists:** staff and customers need to know when something happens, without refreshing a page.

```
a service writes data and publishes an event (e.g. JobAssignedEvent)
        -> NotificationListener (@TransactionalEventListener AFTER_COMMIT)
        -> NotificationService.create(userId, type, title, message, link)
        -> row in the Notification table -> the bell polls the unread count
```

**The feed (`GET /api/notifications`) returns unread rows only.** It backs the bell dropdown, which is
a to-do list, not an archive: once an entry is marked read (click or "mark all read") it disappears
from the feed and never reappears. Read rows remain in the database; only `unread-count` and this
feed's `read=false` filter decide what the bell shows.

| Event | Who is notified |
|-------|-----------------|
| `JobCreatedEvent` | ADMIN + MANAGER |
| `JobAssignedEvent` | the assigned technician |
| `JobStatusEvent` | staff roles, the assigned technician, and the customer's login (if any) |
| `InvoiceIssuedEvent` | the customer's login (skipped when the customer has no account) |
| `PaymentReceivedEvent` | ADMIN + MANAGER |
| `CustomerRegisteredEvent` | ADMIN + MANAGER |

`AFTER_COMMIT` matters: if the job assignment rolls back, no notification is sent. Services therefore
stay decoupled — they publish facts and never know who reads them.

---

# 8. AI agent internals

**The idea:** the backend is not just a proxy to a model — it is an *agent*. It decides which tools the
caller may use, runs them itself, and keeps the model in the loop until an answer is ready.

| File | Responsibility |
|------|----------------|
| `ai/controller/AiChatController` | `POST /api/ai/chat`, requires authentication, passes the JWT-resolved `User` to the service |
| `ai/dto/ChatRequest` | `{ message }` — validated (`@NotBlank`, max 2000 chars) |
| `ai/dto/ChatResponse` | `{ message, toolCalls?: [{ tool, result, success }] }` (nulls omitted) |
| `ai/service/AiChatService` | The agent loop below |
| `ai/config/AiConfig` | Builds the provider client and exposes the model settings and `isConfigured()` |
| `ai/tool/ToolRegistry` | Collects all tools, sends their declarations to the model, and **authorizes every call** |
| `ai/tool/ToolDefinition` | One tool: `name`, `description`, JSON-Schema `parameters`, `allowedRoles`, `executor` |
| `ai/tool/ToolExecutor` | The functional interface a tool implements: `String execute(JsonNode args, User caller)` |
| `ai/tool/Schema` | Small helpers to build parameter schemas and read/validate arguments |
| `ai/tool/definition/{Admin,Manager,Technician,Customer}Tools` | The four role-grouped catalogues of tools |

**The loop, step by step** (`AiChatService.chat`, maximum **8** iterations):

1. Build the conversation: a system prompt (who the user is, their role, today's date, behaviour rules)
   plus the user's message.
2. Send the conversation **and all tool declarations** to the model.
3. If the model asks for one or more tools, run each one:
   `ToolRegistry.execute(name, argsJson, caller)` → append the tool result to the conversation → record
   `{ tool, result, success }` for the UI.
4. Go back to step 2 until the model replies with plain text, or the 8-iteration cap is reached.
5. Return the final text plus the tool-call history.

**Security invariants — do not break these:**

- The model is **never trusted for authorization**. `ToolRegistry` checks `allowedRoles` *before* the
  executor runs and returns `Error: Role X is not allowed to use [tool]` instead of executing.
- The caller identity always comes from the JWT (`User caller`) and never from tool arguments.
- Tools call the same services as the REST API, so validation, ownership and status rules are shared.
- Unknown tool names and malformed arguments are rejected. There is no arbitrary SQL, shell command or
  reflection available — only the registered tools exist.

**The tool catalogue (27 tools total)**

| Group | Tools | Who may use them |
|-------|-------|------------------|
| `AdminTools` | `create_staff`, `list_staff`, `deactivate_staff` | ADMIN |
| `ManagerTools` | `create_customer`, `list_customers`, `get_customer`, `update_customer`, `grant_portal_access`, `list_technicians`, `get_technician`, `list_jobs`, `get_job`, `assign_technician`, `close_job`, `create_invoice`, `list_invoices`, `get_invoice`, `issue_invoice`, `record_payment`, `list_payments` | ADMIN, MANAGER |
| `TechnicianTools` | `my_jobs`, `get_my_job`, `start_job`, `complete_job` | TECHNICIAN (own jobs only) |
| `CustomerTools` | `create_job_request`, `my_job_requests`, `get_my_job_details` | CUSTOMER (own data only) |

Effective surface: **ADMIN 20**, **MANAGER 17**, **TECHNICIAN 4**, **CUSTOMER 3**.

---

# 9. AI provider: Ollama

**In one line:** the agent talks to a self-hosted **Ollama** server (for example on an EC2 instance) over
plain HTTP, through its **OpenAI-compatible** chat API and one model. No API key and no AWS service involved.

## Configuration

| Environment variable | Property | Meaning |
|----------------------|----------|---------|
| `OLLAMA_BASE_URL` | `app.ai.ollama.base-url` | the Ollama server, e.g. `http://54.161.15.10:11434` (trailing slashes are stripped) |
| `OLLAMA_MODEL` | `app.ai.ollama.model` | the model to run, e.g. `qwen2.5:0.5b` — must be pulled on the server and support tools |

```properties
# ========== AI / Ollama ==========
app.ai.ollama.base-url=${OLLAMA_BASE_URL:http://localhost:11434}
app.ai.ollama.model=${OLLAMA_MODEL:}
app.ai.ollama.max-tokens=1024
app.ai.ollama.temperature=0.3
```

`AiConfig` builds one `RestClient` bean (`ollamaClient`) that carries the base URL and
`Content-Type: application/json`; trailing slashes in the URL are stripped. It also exposes
`isConfigured()`: when the model is blank, `POST /api/ai/chat` answers "AI assistant is not configured.
Please set OLLAMA_BASE_URL and OLLAMA_MODEL." instead of failing.

**Server-side prerequisites** (outside the app): the Ollama server must accept connections beyond
localhost (`OLLAMA_HOST=0.0.0.0`) and its port must be reachable from the backend (EC2 security group).
The chosen model must be pulled (`ollama pull qwen2.5:0.5b`) and support tool calling — `GET /api/tags`
reports that under `capabilities`.

**Failures are never hidden.** An error from the AI server is logged
(`Ollama chat call failed: status=… reason=…`) and returned in the chat message itself —
`AI service error (404): model 'qwen2.5:0.5b' not found` — instead of a generic "Failed to reach the AI
service". Ollama reports its reason under `error`, either as a plain string (native API) or as an object
carrying `message` (OpenAI-compatible); both are read, so a wrong URL, an unpulled model or a model without
tool support is visible without reading the server log.

## Request — Ollama OpenAI-compatible API

```
POST {app.ai.ollama.base-url}/v1/chat/completions
```

```json
{
  "model": "qwen2.5:0.5b",
  "messages": [
    { "role": "system", "content": "You are Opsly AI ... User: x@y.com | Role: MANAGER | Date: 2026-09-18" },
    { "role": "user", "content": "How many jobs are pending?" }
  ],
  "tools": [{
    "type": "function",
    "function": {
      "name": "list_jobs",
      "description": "List jobs, optionally filtered by status",
      "parameters": { "type": "object", "properties": {}, "required": [] }
    }
  }],
  "tool_choice": "auto",
  "stream": false,
  "max_tokens": 1024,
  "temperature": 0.3
}
```

The `tools` array is exactly what `ToolRegistry.getDefinitions()` already publishes, so the agent sends it
straight through — there is no provider-specific conversion left. Any Ollama model with tool support
(qwen2.5, llama3.1, mistral …) works unchanged.

## Response and how it maps to the loop

```json
{
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "",
      "tool_calls": [{
        "id": "call_f1a2icgx",
        "type": "function",
        "function": { "name": "list_jobs", "arguments": "{\"status\":\"PENDING\"}" }
      }]
    },
    "finish_reason": "tool_calls"
  }]
}
```

| What the agent needs | Where it is in the response |
|----------------------|-----------------------------|
| the final text answer | `choices[0].message.content`, with `finish_reason = "stop"` |
| a tool request | `choices[0].message.tool_calls`, with `finish_reason = "tool_calls"` |
| tool name / id / arguments | `function.name` / `id` / `function.arguments` (a JSON string) |
| the assistant turn to append | `{ "role": "assistant", "content": …, "tool_calls": […] }` echoed back verbatim |
| the tool result to send back | `{ "role": "tool", "tool_call_id": "<id>", "content": "<result>" }` |

## Migration note (provider history)

The architecture, prompts, tools and loop have never changed — only the provider layer does:
**OpenRouter → Amazon Bedrock (Converse API) → Ollama**. Bedrock was dropped because model invocation
stayed unauthorized on the AWS account; Ollama needs no account, no key and no model-access grant.

| Bedrock (removed) | Ollama (current) |
|-------------------|------------------|
| `app.ai.bedrock.api-key` | *not needed* — the server is reached over plain HTTP |
| `app.ai.bedrock.region` + `app.ai.bedrock.endpoint` | `app.ai.ollama.base-url` |
| `app.ai.bedrock.model-id` | `app.ai.ollama.model` |
| `app.ai.bedrock.max-tokens` / `.temperature` | `app.ai.ollama.max-tokens` / `.temperature` |
| `AWS_BEDROCK_API_KEY` / `AWS_REGION` / `BEDROCK_MODEL_ID` | `OLLAMA_BASE_URL` / `OLLAMA_MODEL` |
| `AiConfig.bedrockClient` bean | `AiConfig.ollamaClient` bean |
| `POST /model/{modelId}/converse` | `POST /v1/chat/completions` |
| `output.message.content[].toolUse` | `choices[0].message.tool_calls[].function` |
| `{"role":"user","content":[{"toolResult":{...}}]}` | `{"role":"tool","tool_call_id":...}` |
| `toolSpec.inputSchema.json` | `function.parameters` (already the registry's shape) |
| "Please set AWS_BEDROCK_API_KEY." | "Please set OLLAMA_BASE_URL and OLLAMA_MODEL." |

`ToolRegistry`, `ToolDefinition`, `Schema`, the four tool catalogues, `AiChatController`,
`ChatRequest`/`ChatResponse` and the entire frontend remain untouched.

---

# 10. Build, run, test

```powershell
cd backend

mvn spring-boot:run          # run the app on http://localhost:8080
mvn -q compile               # compile only (fast check after an edit)
mvn clean package            # build target/opsly-backend-0.0.1-SNAPSHOT.jar
mvn test                     # runs src/test/java (currently no test classes)
```

Requirements: JDK 17, Maven 3.9+, a running PostgreSQL (`sop_db`), and the values from
[§2](#2-configuration) available as environment variables or in `application-local.properties`.

**Starting up successfully looks like this:** Hibernate creates/updates the tables, then either
"Admin account already exists. Skipping bootstrap." or "Initial admin account created successfully."
appears in the log. If a required placeholder such as `JWT_SECRET` is missing, startup fails — that is
intentional, not a bug.

**Checking your work:** compile after every change, then exercise the endpoint through
`http://localhost:8080/swagger-ui.html`. For the AI, a quick prompt such as "list pending jobs" proves
the Ollama config, the tool registry and the service layer all work end to end.

---

# 11. Checklists for common changes

**Adding an endpoint**

1. DTO in `dto/` (request/response) with the necessary `@NotBlank` / `@Size` validation.
2. Service method with the business rules and `@Transactional` if more than one write is involved.
3. Controller method: `@PreAuthorize` with the correct roles, `@AuthenticationPrincipal User caller`
   for anything user-specific.
4. Return `ApiResponse.success(message, data)` and map the entity to a DTO.
5. If a notification makes sense, publish an event instead of calling the notification service directly.
6. Document it in [§5](#5-endpoint-and-permission-matrix) here and in
   [`../AGENTS.md`](../AGENTS.md) (§2.8).

**Adding an AI tool**

1. Add a `ToolDefinition` in the right group file (`AdminTools`, `ManagerTools`, `TechnicianTools`,
   `CustomerTools`) with name, description, JSON-Schema parameters and `allowedRoles`.
2. Executor: parse arguments with `Schema`, call the **existing service**, and return a short readable
   string (or `"Error: ..."` on failure).
3. Never read the caller id from arguments — use the `caller` parameter, exactly like the REST layer.
4. Update the tool table in [§8](#8-ai-agent-internals) and the summary in
   [`../AGENTS.md`](../AGENTS.md) (Part 3).

**Changing a status rule**

1. Change it in the service, never in the controller or the UI.
2. Keep the message informative — the AI feeds these messages back to the user.
3. Check whether a notification type exists for the new state; if not, add one.
4. Update [§6](#6-business-rules-owned-by-the-services) and the workflow diagram in
   [`../AGENTS.md`](../AGENTS.md) (§2.6).

**Adding an environment variable**

1. Add a placeholder to `application.properties` (`${VAR}` for required, `${VAR:}` for optional).
2. Use it through `@Value` in a config class — never read `System.getenv` in a service.
3. Add the real value to `application-local.properties` / `.env` (both git-ignored).
4. Document it in [§2](#2-configuration) and in [`../AGENTS.md`](../AGENTS.md) (§1.5).

---

_End of BACKEND.md — keep it in sync with `src/main/java`, `../AGENTS.md` and `../frontend/FRONTEND.md`._
