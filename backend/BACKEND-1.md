# Backend guide — Opsly

The backend is the Spring Boot REST API and the security/business-rule boundary for the Next.js frontend.

Repository rules: [AGENTS-1.md](../AGENTS-1.md) · Frontend details: [../frontend/FRONTEND-1.md](../frontend/FRONTEND-1.md)

## Stack and setup

- Java 17, Spring Boot 3.2, Maven.
- Spring Web, Spring Security, JWT, Spring Data JPA/Hibernate.
- PostgreSQL for persistence; Hibernate `ddl-auto=update` is used.
- Cloudinary stores profile images and invoice files.
- OpenRouter powers the server-side AI assistant; search may use AWS OpenSearch.
- JUnit tests run from `backend/src/test/java`.

```bash
cd backend
cp .env.example .env
mvn spring-boot:run       # http://localhost:8080
mvn test
```

Use `application.yml` plus the appropriate local/prod profile or environment variables. Never commit `.env` files or real credentials.

## Package layout

```text
src/main/java/com/opsly/
├── common/       API envelope, exceptions, validation, uploads and security
└── <feature>/    controller, service, entity, repository and dto
```

The common response/error and validation modules are shared by features. Feature code should follow `controller → service → repository → entity`; map entities to DTOs at the API boundary.

## API conventions

- All application endpoints are under `/api` and return `ApiResponse<T>`.
- Success responses include a message and data; errors use the global handler's consistent shape.
- Controllers validate inputs, call services and map responses; they should remain thin.
- Services enforce authorization, ownership and business rules.
- Paged endpoints return Spring `Page<T>`-style page data.
- Access control uses role checks, resource ownership checks and, where appropriate, `@PreAuthorize`.

### Main endpoint groups

| Base path | Purpose |
|---|---|
| `/api/auth` | Login, registration, refresh and logout |
| `/api/users` | Staff account management and current-user profile |
| `/api/users/me/profile-image` | Upload the current user's profile image |
| `/api/customers` | Customer CRUD and customer self-service |
| `/api/jobs` | Job requests, assignments, lifecycle and staff views |
| `/api/technicians` | Technician directory and detail |
| `/api/invoices` | Invoice CRUD and invoice files |
| `/api/payments` | Payment CRUD and customer payments |
| `/api/dashboard` | Operational summaries and reports |
| `/api/notifications` | Notifications and unread count |
| `/api/search` | Search endpoints |
| `/api/ai` | AI chat proxy |
| `/api/health` | Health check |

Controller annotations and service checks are the source of truth; do not infer authorization from the frontend.

## Authentication and security

- Short-lived JWT access tokens are sent as Bearer tokens.
- Refresh tokens are stored in rotating HttpOnly cookies.
- Roles are enforced in the backend; hiding a button is not authorization.
- Validate request bodies with Jakarta Bean Validation and `@Valid`.
- Keep OpenRouter, Cloudinary, database and OpenSearch credentials server-side.
- Validate uploaded file type, size and storage identifiers before saving or deleting.

## Validation and uploads

- Shared phone rules live in `common/validation/PhonePatterns.java`.
- The matching frontend helper is `src/lib/validation.ts`; keep both rules and messages aligned.
- Profile image responses include `profileImageUrl` so the UI can render the account photo after login/refresh.
- Cloudinary URLs are delivery data; public IDs are used for deletion.

## Data and tests

Entities map to PostgreSQL tables and are managed through repositories. Keep DTOs separate from entities and avoid exposing persistence objects directly.

`backend/src/test` contains 13 JUnit test classes covering validation, authentication/profile mapping and service behaviour. Run `mvn test` after changes. Mock repositories and external services; do not require PostgreSQL, Cloudinary, OpenSearch or OpenRouter for unit tests.

