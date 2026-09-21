# 🚀 Opsly

**Opsly** is a service operations management platform built for small and medium-sized service businesses. It brings customers, staff, technicians, service requests, invoices, payments, and AI-powered assistance into one platform.

## 🎯 Problem

Service businesses often manage service requests, technician assignments, customer information, and payments across disconnected tools or manual processes. This makes tracking work, coordinating technicians, and getting operational information difficult.

**Opsly centralizes this workflow into a single platform.**

## ✨ Key Features

- 👥 **Role-based access** — Admin, Manager, Technician, Customer
- 🛠️ **Service request management** — Complete lifecycle from creation to closure
- 👨‍🔧 **Technician assignment** — Assign and track technicians
- 📊 **Operational dashboard & reports**
- 🧾 **Invoices & payments**
- 🤖 **AI Assistant** — Ask questions about operational data using natural language
- 🔎 **Intelligent search** using AWS OpenSearch
- 🔐 **JWT authentication & role-based authorization**

### Service Request Lifecycle

`PENDING → ASSIGNED → IN_PROGRESS → COMPLETED → CLOSED`

## ☁️ Where AWS Fits

Opsly uses **AWS OpenSearch** for intelligent search and retrieval of service-related information.

The AI layer uses **OpenRouter** for model access, while the backend controls authentication, business logic, data access, and AI tool execution.

**Architecture:**

`Next.js → Spring Boot → PostgreSQL`

`AI Assistant → Spring Boot → OpenRouter`

`Search & Retrieval → AWS OpenSearch`

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Spring Boot, Java 17 |
| Security | Spring Security, JWT |
| Database | PostgreSQL |
| AI | OpenRouter |
| Search | AWS OpenSearch |
| API | REST, OpenAPI / Swagger |

## 🏗️ Project Structure

```text
opsly/
├── frontend/   # Next.js application
└── backend/    # Spring Boot REST API
```

## ▶️ Running Locally

### Backend

```bash
cd backend
mvn spring-boot:run
```

Configure your environment variables for PostgreSQL, JWT, OpenRouter, and OpenSearch.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend connects to the Spring Boot REST API through the configured API base URL.

## ☁️ Deployment

| Component | Platform | Notes |
|---|---|---|
| Backend | **Render** (Docker) | Built from `backend/Dockerfile`; service defined in `render.yaml` |
| Frontend | **Vercel** | Set `NEXT_PUBLIC_API_URL` to the Render backend URL |
| Database | **Aiven** (PostgreSQL) | Managed Postgres — the JDBC URL must include `?sslmode=require` |

Backend environment variables are listed in `backend/.env.example`; set the real values in the
Render dashboard (`JWT_SECRET`, `DB_*`, `ALLOWED_ORIGINS`, …).

## 💚 Health Check

`GET /api/health` is a **public** endpoint (no authentication) that always returns `200 Ok`.
Render uses it as the service health check, and an uptime monitor such as **UptimeRobot** can ping
it to keep the free-tier backend awake.

```bash
curl https://<your-backend>.onrender.com/api/health
# {"success":true,"message":"Ok","data":"Ok"}
```

Point UptimeRobot at `https://<your-backend>.onrender.com/api/health` — HTTP `200` means the
backend is up.

## 🤖 AI Assistant

Opsly's AI assistant can answer operational questions using authenticated backend tools.

For example:

- "Show my assigned service requests."
- "What's the status of this request?"
- "What is my schedule today?"

The AI does **not** directly access the database. Requests go through the Spring Boot backend, where authentication, authorization, and business rules are enforced.

## 🔐 Security

- JWT-based authentication
- Role-based authorization
- Backend-enforced permissions
- Authenticated user context for AI tools
- No direct database access from the frontend or AI model

---

Built for **Bharat Builds Hackathon — First Commit** 🚀
