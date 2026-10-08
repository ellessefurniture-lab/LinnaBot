# 🚀 Telegram Bot Management System

A production-ready, enterprise-grade Telegram Bot Management platform featuring an interactive user-facing bot built with **Telegraf**, a high-performance **Node.js + TypeScript** API, **PostgreSQL** with **Prisma ORM**, background job queue with **BullMQ + Redis**, and a modern web dashboard built with **React, TypeScript, and Tailwind CSS**.

---

## 📑 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture & Project Structure](#3-architecture--project-structure)
4. [Prerequisites](#4-prerequisites)
5. [Telegram BotFather Setup](#5-telegram-botfather-setup)
6. [Environment Configuration](#6-environment-configuration)
7. [Database Setup & Prisma Migrations](#7-database-setup--prisma-migrations)
8. [Local Development](#8-local-development)
9. [Running with Docker & Docker Compose](#9-running-with-docker--docker-compose)
10. [Webhook vs. Polling Configuration](#10-webhook-vs-polling-configuration)
11. [Running Tests & Build Verification](#11-running-tests--build-verification)
12. [API Reference Summary](#12-api-reference-summary)
13. [Security Architecture](#13-security-architecture)
14. [Troubleshooting Guide](#14-troubleshooting-guide)

---

## 1. Project Overview

The system bridges Telegram bot automation with a full-featured admin control panel:

* **Interactive User Bot**:
  * Automatic onboarding on `/start` with profile extraction.
  * Inline interactive menus: `[📋 Menu]`, `[👤 My Account]`, `[ℹ️ Help]`, `[📞 Contact Support]`, `[📢 Announcements]`.
  * Multi-format event capture (Text, Photos, Videos, Documents, Voice, Stickers).
  * Direct customer support workflow: Users click "Contact Support", submit their inquiry, and receive live admin responses.
* **Administrator Web Dashboard**:
  * **Telemetry & Metrics**: Live counters, engagement trends, 7-day visual volume graphs, gateway status.
  * **User Moderation**: Filter by status, search by name/username/Telegram ID, inspect message logs, block/unblock, and delete records.
  * **Broadcast Engine**: Compose messages with HTML/Markdown, attach photos/videos/docs, build inline URL/callback buttons, target audience segments (All, Active, Inactive, New Users), schedule deliveries, preview in a real-time Telegram simulator, and monitor delivery progress.
  * **Queue Worker**: BullMQ background processor throttled at a safe 25 msgs/sec to prevent Telegram rate limit bans (with automatic in-memory fallback).
  * **Helpdesk Inbox**: Two-pane ticketing interface allowing admins to chat back and forth directly into users' Telegram apps.
  * **System Configuration**: Real-time toggles for Maintenance Mode, Registration, custom welcome messages, and masked bot token management.
  * **Audit Trails**: Complete audit logging for every admin action, IP address, and timestamp.

---

## 2. Tech Stack

| Domain | Technology |
|---|---|
| **Backend Runtime** | Node.js (v20+) & TypeScript |
| **HTTP Framework** | Express.js |
| **Telegram Framework** | Telegraf v4 |
| **Database** | PostgreSQL 16 |
| **ORM** | Prisma 5 |
| **Queue / Background Jobs** | BullMQ + Redis 7 (with resilient In-Memory fallback) |
| **Frontend Framework** | React 18 + Vite |
| **Styling** | Tailwind CSS (Dark SaaS theme) |
| **Icons** | Lucide React |
| **Validation** | Zod (strict schema enforcement) |
| **Security** | Helmet, CORS, Cookie-Parser, Bcrypt, JWT, Rate Limiting |
| **Logging** | Winston (structured logging) |
| **Testing** | Vitest + Supertest |
| **Containerization** | Docker & Docker Compose |

---

## 3. Architecture & Project Structure

```text
d:\Telegram bot\
├── backend\
│   ├── prisma\
│   │   ├── schema.prisma       # Prisma ORM schema
│   │   └── seed.ts             # Default admin and bot settings seeder
│   ├── src\
│   │   ├── config\             # Zod environment validation & app configuration
│   │   ├── controllers\        # REST controllers (Auth, Users, Broadcasts, etc.)
│   │   ├── middleware\         # JWT auth, rate limiter, error handler, audit logger, webhook auth
│   │   ├── routes\             # API route definitions
│   │   ├── services\           # Business logic (User, Auth, Broadcast, Support, Settings)
│   │   ├── telegram\           # Telegraf bot handlers, menus, and actions
│   │   ├── workers\            # BullMQ rate-limited broadcast processor
│   │   ├── utils\              # Winston logger, Prisma client, standard API responses
│   │   ├── app.ts              # Express application setup
│   │   └── server.ts           # Server bootstrap & lifecycle management
│   ├── tests\
│   │   └── system.test.ts      # Automated Vitest test suite
│   ├── Dockerfile
│   └── package.json
├── frontend\
│   ├── src\
│   │   ├── components\
│   │   │   ├── common\         # Button, Badge, Modal, Toast
│   │   │   ├── layout\         # Sidebar, Navbar, AdminLayout
│   │   │   └── telegram\       # Telegram chat simulator preview
│   │   ├── context\            # AuthContext (JWT storage & session guard)
│   │   ├── pages\              # Dashboard, Users, Broadcasts, Messages, Support, Settings, AuditLogs, Login
│   │   ├── services\           # Axios client with interceptors
│   │   ├── types\              # TypeScript interfaces
│   │   ├── App.tsx             # Route definitions & protected guards
│   │   └── main.tsx
│   ├── nginx.conf              # Production Nginx reverse proxy configuration
│   ├── Dockerfile
│   ├── vite.config.ts
│   └── package.json
├── docker-compose.yml          # Postgres, Redis, Backend, Frontend orchestration
├── .env.example                # Template environment variables
├── .gitignore
└── README.md
```

---

## 4. Prerequisites

* **Node.js**: v18.0.0 or higher (v20+ recommended)
* **npm**: v9+ or **pnpm** / **yarn**
* **PostgreSQL**: v14+ (or Docker)
* **Redis**: v6+ (or Docker; optional in local development due to built-in fallback)
* **Telegram Account**: To generate a bot token via BotFather

---

## 5. Telegram BotFather Setup

1. Open Telegram and search for `@BotFather`.
2. Start a chat and send `/newbot`.
3. Choose a display name (e.g. `My Admin Bot`).
4. Choose a username ending in `bot` (e.g. `my_company_admin_bot`).
5. Copy the generated **HTTP API Token** (e.g. `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`).
6. *(Optional)* Set bot commands by sending `/setcommands` to `@BotFather`:
   ```text
   start - Launch the bot and open main menu
   menu - Display bot options and features
   help - Get help and contact support
   ```

---

## 6. Environment Configuration

Copy the template `.env.example` to `.env` in the root and in `backend/`:

```bash
# On Windows PowerShell:
Copy-Item .env.example .env
Copy-Item .env.example backend\.env
```

### Key Variables:

| Variable | Description | Default |
|---|---|---|
| `PORT` | Backend HTTP port | `5000` |
| `DATABASE_URL` | PostgreSQL connection URL | `postgresql://postgres:postgres@localhost:5432/telegram_bot_db?schema=public` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `JWT_SECRET` | Secret key for signing admin tokens | `Min 32 characters` |
| `ADMIN_EMAIL` | Default admin email for seeding | `admin@example.com` |
| `ADMIN_PASSWORD` | Default admin password | `Admin@123456` |
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather | `Empty by default` |
| `BOT_MODE` | `polling` (local dev) or `webhook` (production) | `polling` |
| `TELEGRAM_WEBHOOK_URL`| Public HTTPS webhook URL | `https://your-domain.com/api/telegram/webhook` |
| `TELEGRAM_WEBHOOK_SECRET`| Secret token to authenticate Telegram requests | `webhook-secret-token-12345` |

---

## 7. Database Setup & Prisma Migrations

Ensure your PostgreSQL instance is running, then run Prisma migration and seed:

```bash
cd backend

# Generate Prisma Client
npx prisma generate

# Run migrations to create PostgreSQL tables
npx prisma migrate dev --name init

# Seed default admin user and initial bot settings
npm run prisma:seed
```

> **Default Seeded Admin Credentials:**
> * **Email:** `admin@example.com`
> * **Password:** `Admin@123456`

---

## 8. Local Development

### 1. Start the Backend API & Telegram Bot:

```bash
cd backend
npm run dev
```

* Express API boots at: `http://localhost:5000/api`
* Telegraf Bot will automatically start in `polling` mode if `TELEGRAM_BOT_TOKEN` is supplied.

### 2. Start the Frontend Admin Dashboard:

```bash
cd frontend
npm run dev
```

* Dashboard UI opens at: `http://localhost:3000`
* Requests to `/api/*` are automatically reverse-proxied to `http://localhost:5000`.

---

## 9. Running with Docker & Docker Compose

To run the entire stack (PostgreSQL, Redis, Backend, Frontend) with a single command:

```bash
# 1. Ensure .env is populated with your values
# 2. Launch all 4 containers
docker compose up -d --build
```

### Checking Container Health:

```bash
docker compose ps
docker compose logs -f backend
```

Access the application:
* **Admin Dashboard:** `http://localhost:3000`
* **API Healthcheck:** `http://localhost:5000/api/health`

---

## 10. Webhook vs. Polling Configuration

### Development Mode (`polling`):
Set in `.env`:
```env
BOT_MODE=polling
```
The bot uses long polling directly with Telegram servers. No public HTTPS endpoint or tunneling is required.

### Production Mode (`webhook`):
Set in `.env`:
```env
BOT_MODE=webhook
TELEGRAM_WEBHOOK_URL=https://api.yourdomain.com/api/telegram/webhook
TELEGRAM_WEBHOOK_SECRET=your_secret_token_12345
```
1. Telegram sends updates to `POST /api/telegram/webhook`.
2. The endpoint verifies the `X-Telegram-Bot-Api-Secret-Token` header.
3. Requests without a matching secret are rejected with HTTP 403 Forbidden.

---

## 11. Running Tests & Build Verification

The project includes unit and integration tests using **Vitest**:

```bash
# Run backend test suite
cd backend
npm run test

# Compile backend TypeScript
npm run build

# Compile frontend TypeScript & build production Vite assets
cd ../frontend
npm run build
```

---

## 12. API Reference Summary

All administrative endpoints require `Authorization: Bearer <token>` or HTTP-only cookie.

### Authentication
* `POST /api/auth/login` - Admin login (rate-limited)
* `POST /api/auth/logout` - Invalidate session cookie
* `GET  /api/auth/me` - Get current admin profile

### Telemetry & Dashboard
* `GET  /api/dashboard/stats` - Counters, bot status, and 7-day activity graphs
* `GET  /api/audit-logs` - View administrative audit trails

### Users
* `GET    /api/users` - Paginated user list with search & status filters
* `GET    /api/users/:id` - Full user profile with message and ticket history
* `PATCH  /api/users/:id` - Update status (`ACTIVE` / `BLOCKED`)
* `DELETE /api/users/:id` - Delete user record

### Broadcasts
* `GET  /api/broadcasts` - List broadcast campaigns
* `POST /api/broadcasts` - Create & queue/schedule a broadcast
* `GET  /api/broadcasts/estimate-target` - Estimate audience recipient count
* `GET  /api/broadcasts/:id` - Campaign details and recipient breakdown
* `POST /api/broadcasts/:id/cancel` - Cancel scheduled broadcast

### Support System
* `GET   /api/support` - Support ticket list (`OPEN` / `RESOLVED`)
* `GET   /api/support/:id` - View conversation messages
* `POST  /api/support/:id/reply` - Send message directly to user's Telegram
* `PATCH /api/support/:id/status` - Mark conversation resolved or open

### Settings
* `GET   /api/settings` - Retrieve bot configuration (secrets masked)
* `PATCH /api/settings` - Update welcome message, maintenance mode, etc.

### Telegram Webhook
* `POST /api/telegram/webhook` - Protected by webhook secret header

---

## 13. Security Architecture

* **Strict Input Validation**: Every endpoint is validated with Zod schemas.
* **Brute-Force Defense**: Express-rate-limit restricts login attempts (10 requests per 15 minutes).
* **Secret Masking**: Bot tokens and secrets are never returned in plain text to the client.
* **Audit Logging**: Every action (logins, user status edits, settings updates, broadcasts) records the admin ID, action type, IP address, and timestamp.
* **Rate-Limited Broadcasts**: Messages are paced at 25 msgs/sec with per-user handling to prevent 429 errors from Telegram.

---

## 14. Troubleshooting Guide

| Issue | Root Cause | Solution |
|---|---|---|
| `Bot not replying to /start` | Token missing or invalid | Ensure `TELEGRAM_BOT_TOKEN` in `.env` is correct and not blocked. Check backend logs. |
| `Cannot connect to Redis` | Redis is not running | The system automatically fails over to the resilient in-memory queue. Broadcasts will continue working normally. |
| `403 Forbidden on Webhook` | Secret token mismatch | Verify `TELEGRAM_WEBHOOK_SECRET` in `.env` matches the secret registered with Telegram. |
| `Prisma Client not initialized` | Generated types out of sync | Run `npx prisma generate` in the `backend` folder. |
| `401 Unauthorized in Dashboard` | Token expired or absent | Sign in using `admin@example.com` / `Admin@123456`. |

---

## 📄 License
MIT License. Built for enterprise reliability and scale.
