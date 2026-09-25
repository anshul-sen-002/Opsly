# AGENTS-1.md — Opsly contributor guide

Architecture, commands, conventions and checks for this repository.

Frontend: [`frontend/FRONTEND-1.md`](frontend/FRONTEND-1.md)
Backend: [`backend/BACKEND.md`](backend/BACKEND.md)

## 1. Overview

Opsly is a service-operations platform for small and medium businesses: customers, staff,
technicians, jobs, invoices, payments, notifications, dashboards and an AI assistant.

**Architecture:** `Next.js frontend → Spring Boot REST API → PostgreSQL`

The browser talks only to our backend. AI calls go `frontend → backend → OpenRouter`; the model
never receives database or service credentials. Search optionally uses AWS OpenSearch.

**Job lifecycle:** `PENDING → ASSIGNED → IN_PROGRESS → COMPLETED → CLOSED`

| Role | Access |
|---|---|
| `ADMIN` | Everything, including staff accounts |
| `MANAGER` | Customers, jobs, technicians, invoices, payments, reports |
| `TECHNICIAN` | Own assigned jobs and own profile |
| `CUSTOMER` | Own requests, invoices, payments and profile |

**Authorization is enforced in the backend.** Frontend guards only hide inaccessible UI; they are
not a security boundary. Never rely on a hidden button or a client-side role check.

## 2. Setup and commands

**Requirements:** Java 17, Maven, PostgreSQL, Node.js 20+, npm.

```bash
# Backend
cd backend
cp .env.example .env
mvn spring-boot:run               # http://localhost:8080
mvn test

# Frontend
cd frontend
cp .env.example .env.local
npm install
npm run dev                       # http://localhost:3000
npx tsc --noEmit
npx vitest run
npm run build
```

Do not commit `.env`, `.env.local`, `.next`, `node_modules` or `tsconfig.tsbuildinfo`. Keep real
credentials only in local environment files or deployment secrets.

## 3. Project structure

```text
Opsly/
├── backend/                 Spring Boot API — see backend/BACKEND.md
│   └── src/main/java/com/opsly/
│       ├── common/          Shared response, errors, validation, uploads, security
│       └── <feature>/       controller, service, entity, repository, dto
├── frontend/                Next.js app — see frontend/FRONTEND-1.md
│   ├── src/app/             Pages grouped by (staff), (auth), customer
│   ├── src/components/      Layout, providers, dashboard and ui components
│   ├── src/lib/             API client, types, validation, utilities
│   └── src/types/           Shared TypeScript types
```

## 4. Coding conventions

**General**

- Match the existing style; do not introduce a competing abstraction or library.
- Keep changes focused. Do not refactor unrelated files while fixing a feature.
- Never commit secrets, credentials, generated files or debug output.
- Use absolute paths when recording file locations.

**Backend**

- Validate requests with Jakarta Bean Validation; add `@Valid` at controller entry points.
- Keep controllers thin; business rules belong in services.
- Do not return entities directly; map to DTOs.
- Use constructor injection and Spring `Page<T>` for paged lists.

**Frontend**

- Use `"use client"` only where interactivity is needed; keep API calls in `src/lib/api.ts`.
- Reuse `EntityForm`/`EntityModal`, `ResponsiveTable` and `ui/*` before creating new abstractions.
- Use the existing Tailwind and lucide styles. Do not add a CSS framework, icon set or state library.
- Use shared Zod schemas and `src/lib/validation.ts` helpers for form validation.
- Render an appropriate loading placeholder, `EmptyState`, and `ErrorState` with retry for async views.
- Keep accessibility basics: labelled controls, keyboard support, and `aria-live`/`aria-busy` for loading regions.
- Update the parallel `Staff`, `Customer` and auth types when a response shape changes.

## 5. Security

- JWT access tokens are short-lived and sent as Bearer tokens.
- Refresh tokens are stored in HttpOnly cookies and rotated.
- Roles and resource ownership are checked in the backend, usually with `@PreAuthorize` plus
  service-level checks.
- Never expose provider keys or secrets to the browser.
- Cloudinary uploads must validate content type and size before storing a file.
- Sanitize user-controlled output; never render untrusted HTML without escaping.

## 6. Data and API rules

- All backend endpoints live under `/api` and return `ApiResponse<T>`.
- Errors use the consistent shape produced by the global exception handler.
- Shared validation rules, such as the phone number rule, live in common modules and are reused by
  the matching frontend validators.
- The schema is managed by Hibernate `ddl-auto=update`; do not add a migration tool without an
  explicit requirement.

## 7. Testing

- Backend: JUnit tests under `backend/src/test/java`.
- Frontend: Vitest and Testing Library tests under `frontend/src/**/*.test.ts(x)`.
- Add tests for new validation, API mapping or user-visible behaviour.
- Keep tests deterministic; mock network calls instead of contacting external services.
- Test success, validation failure, and the empty/error path when relevant.

## 8. Before you finish

1. Run the relevant type checks, tests and build for the files you changed.
2. Check the diff for debug output, stray files or accidental API changes.
3. Update documentation when routes, commands, configuration or validation rules change.
4. Do not claim a change is complete until the verification command has passed.
5. Keep the final summary short: what changed, which files, and the verification results.
