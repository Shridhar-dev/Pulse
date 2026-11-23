# ⚡ Pulse

> **High-Throughput Distributed Task Scheduling Engine**  
> Schedule HTTP calls, webhooks, scripts, and GitHub repo executions — reliably, at scale, exactly once.

---

## Table of Contents

- [What Is Pulse?](#what-is-pulse)
- [Architecture Overview](#architecture-overview)
- [How It Works — Full Flow](#how-it-works--full-flow)
- [Exactly-Once Guarantees](#exactly-once-guarantees)
- [Delivery Modes](#delivery-modes)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Tech Stack](#tech-stack)

---

## What Is Pulse?

Pulse is a **distributed task scheduling platform** where you can say:

- *"At 3:00 PM tomorrow, make an HTTP POST to this URL with this payload."*
- *"Every 10 minutes, run this GitHub repo inside a Docker container and return the output."*
- *"Sign this user up for a trial — but only do it once, even if the network retries the request."*

Pulse guarantees those tasks fire **exactly once** — even when individual servers crash, networks partition, or clocks drift.

---

## Architecture Overview

Pulse has three independently scalable node types that communicate through PostgreSQL and Redis:

```
┌──────────────────────────────────────────────────────────────────────┐
│                            PULSE SYSTEM                              │
│                                                                      │
│  ┌─────────────┐      ┌──────────────────┐      ┌─────────────────┐ │
│  │  API NODES  │      │ SCHEDULER NODES  │      │  WORKER NODES   │ │
│  │  (Hono)     │      │                  │      │  (BullMQ)       │ │
│  │             │      │ Polls DB every   │      │                 │ │
│  │ POST /jobs  │      │ 1 second for due │      │ Executes jobs   │ │
│  │ GET  /jobs  │      │ jobs → pushes to │      │ (HTTP/Webhook/  │ │
│  │ DELETE ...  │      │ Redis queue      │      │  Code/Docker)   │ │
│  └──────┬──────┘      └────────┬─────────┘      └────────┬────────┘ │
│         │                      │                          │          │
│         │ writes               │ reads/claims             │ updates  │
│         ▼                      ▼                          │          │
│  ┌────────────────────────────────────────┐               │          │
│  │            PostgreSQL                  │◄──────────────┘          │
│  │  jobs • job_executions • users         │                          │
│  │  rate_limits                           │                          │
│  └────────────────────────────────────────┘                          │
│                                                                      │
│  ┌────────────────────────────────────────┐                          │
│  │              Redis                     │                          │
│  │  1. BullMQ Job Queue (3 queues)        │                          │
│  │  2. Distributed Locks (Lua atomic)     │                          │
│  │  3. Fencing Token Counters             │                          │
│  └────────────────────────────────────────┘                          │
└──────────────────────────────────────────────────────────────────────┘
```

---

## How It Works — Full Flow

### Phase 1 — Ingestion (API Node)

A client sends `POST /api/jobs`. The API server:
1. Authenticates the `X-API-Key` header
2. Checks plan-based rate limits
3. Validates the idempotency key — if the same key already exists, returns the existing job (no duplicate created)
4. Writes the job to PostgreSQL with `status = SCHEDULED`

### Phase 2 — Discovery (Scheduler Node)

Every **1 second**, the Scheduler polls PostgreSQL:

```sql
SELECT * FROM jobs
WHERE status = 'SCHEDULED'
  AND scheduledAt <= NOW() + INTERVAL '500ms'
FOR UPDATE SKIP LOCKED
LIMIT 100;
```

> `FOR UPDATE SKIP LOCKED` is critical: when multiple Scheduler Nodes run simultaneously, they each grab a non-overlapping slice of due jobs — no blocking, no duplicate processing.

### Phase 3 — Locking & Queuing

For each job found, the Scheduler atomically (Lua script on Redis):

1. **Acquires a distributed lock** — `SET pulse:lock:{jobId} {nodeId} NX PX 30000`
2. **Increments a fencing token** — `INCR pulse:fencing:{jobId}` → returns a monotonically increasing number, e.g. `7`
3. **Updates the DB** — `status = QUEUED`, stores `lockFencingToken = 7`, generates an `executionId`
4. **Publishes to BullMQ** — pushes `{ jobId, executionId, fencingToken: 7, ...payload }` using `executionId` as the BullMQ job ID (native deduplication)
5. **Releases the lock**

### Phase 4 — Execution (Worker Node)

A BullMQ Worker picks up the message and runs three guards before touching anything:

```
GUARD 1 — Fencing Token Check
  Read job from DB. Is DB's lockFencingToken > message's fencingToken?
  → Yes: stale/zombie message → ABORT silently.
  → No:  proceed.

GUARD 2 — Idempotency Insert
  INSERT INTO job_executions (jobId, executionId, ...) VALUES (...)
  → If (jobId, executionId) already exists: PostgreSQL throws error 23505
    → This executionId was already processed → ABORT silently.
  → If insert succeeds: this worker owns this execution attempt.

GUARD 3 — Atomic RUNNING transition
  UPDATE jobs SET status = 'RUNNING' WHERE id = ? AND executionId = ?
```

Then it executes the delivery (HTTP call, webhook, code run, Docker container), and finalizes:

| Outcome | Action |
|---|---|
| **Success** | `status = COMPLETED`; if recurring → reschedule |
| **Failure, retries left** | `status = SCHEDULED`, `scheduledAt = now + backoff`, `retryCount++` |
| **Failure, retries exhausted** | `status = DEAD`, push to Dead Letter Queue |

### Phase 5 — Watchdog (Recovery)

Runs every **30 seconds** to rescue stuck jobs:

| Stuck condition | Action |
|---|---|
| `status = QUEUED` and lock expired (Scheduler crashed before publish) | Reset to `SCHEDULED`, clear lock |
| `status = RUNNING` and execution timed out (Worker crashed mid-run) | Reset to `SCHEDULED`, `retryCount++` |

### Job Status State Machine

```
                      ┌─────────────┐
              ┌───────►  SCHEDULED  │◄─────────────────────────┐
              │       │  (waiting)  │◄──────────────┐           │
              │       └──────┬──────┘        (retry) │  (recurring
              │              │ Scheduler picks up     │   reschedule)
              │       ┌──────▼──────┐                │           │
              │       │   QUEUED    │                │           │
              │       │ (in BullMQ) │                │           │
              │       └──────┬──────┘                │           │
         (watchdog)          │ Worker picks up        │           │
              │       ┌──────▼──────┐       ┌────────┴────────┐  │
              │       │   RUNNING   ├─FAIL──►    FAILED       │  │
              │       │ (executing) │       │  (will retry)   │  │
              │       └──────┬──────┘       └─────────────────┘  │
              │              │                                     │
              └──────────────►  COMPLETED ──────────────────────► ┘

   DEAD      : retryCount >= maxRetries → sent to Dead Letter Queue
   CANCELLED : manually cancelled via DELETE /api/jobs/:id
```

---

## Exactly-Once Guarantees

Pulse layers **four independent mechanisms** to prevent double-execution:

| Layer | Mechanism | Prevents |
|---|---|---|
| **1. PostgreSQL `FOR UPDATE SKIP LOCKED`** | Row-level locking during Scheduler poll | Two Schedulers claiming the same job |
| **2. Redis Distributed Lock + Fencing Token** | Atomic `SET NX` + monotonic `INCR` | Zombie Schedulers re-queuing a job |
| **3. BullMQ native `jobId` deduplication** | `executionId` used as BullMQ's jobId | Duplicate messages in the queue |
| **4. `job_executions` UNIQUE constraint** | `UNIQUE(jobId, executionId)` in PostgreSQL | A second Worker acting on a redelivered message |

---

## Delivery Modes

| Mode | Config | What Happens |
|---|---|---|
| `HTTP` | `{ url, method, headers, body }` | Standard `fetch()` to any URL |
| `WEBHOOK` | `{ url, secret }` | `fetch()` with `X-Pulse-Signature: sha256=<hmac>` header |
| `CODE_EXEC` | `{ filePath }` | `child_process.exec("node {filePath}")` |
| `GITHUB_EXEC` | `{ repoUrl, branch, buildCmd, runCmd }` | Ephemeral Docker container: clone → build → run → capture output → destroy |

---

## Database Schema

### `users`

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `email` | varchar(255) | Unique login email |
| `passwordHash` | text | bcrypt hash |
| `apiKey` | varchar(64) | Unique API key (sent in `X-API-Key` header) |
| `plan` | enum | `FREE / STARTER / PRO / ENTERPRISE` |
| `maxJobsPerMinute` | integer | Rate limit based on plan |

### `jobs` ⭐

The source of truth for every scheduled task.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `userId` | UUID | FK → users |
| `idempotencyKey` | varchar | Prevents duplicate job creation |
| `name` | varchar | Human-readable name |
| `payload` | JSONB | Arbitrary data passed to the endpoint |
| `scheduledAt` | timestamp | When this job should fire |
| `toleranceMs` | integer | Acceptable scheduling imprecision (ms) |
| `isRecurring` | boolean | Whether this job repeats |
| `intervalMs` | bigint | Interval between recurring runs |
| `deliveryType` | enum | `HTTP / WEBHOOK / CODE_EXEC / GITHUB_EXEC` |
| `deliveryConfig` | JSONB | Delivery-type-specific config |
| `status` | enum | `SCHEDULED / QUEUED / RUNNING / COMPLETED / FAILED / DEAD / CANCELLED` |
| `retryCount` | integer | Number of retry attempts so far |
| `maxRetries` | integer | Max retries before DEAD |
| `lockedBy` | varchar | Scheduler node currently holding this job |
| `lockedAt` | timestamp | When the lock was acquired |
| `lockFencingToken` | bigint | Monotonic token for zombie detection |
| `executionId` | varchar | UUID for the current execution attempt |
| `startedAt` | timestamp | When RUNNING began |
| `completedAt` | timestamp | When COMPLETED |
| `failedAt` | timestamp | When last FAILED |
| `errorMessage` | text | Last failure message |

**Key Indexes:**
```sql
idx_jobs_scheduled_poll  ON (status, scheduledAt)       -- Scheduler poll
idx_jobs_locked_at       ON (lockedBy, lockedAt)        -- Watchdog recovery
idx_jobs_idempotency     ON (userId, idempotencyKey) UNIQUE
idx_jobs_status          ON (status)
```

### `job_executions` ⭐

Audit log of every execution attempt. The `UNIQUE(jobId, executionId)` constraint is the physical exactly-once enforcer.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `jobId` | UUID | FK → jobs |
| `executionId` | varchar | Unique ID for this attempt |
| `fencingToken` | bigint | Lock edition at time of execution |
| `status` | varchar | `RUNNING / COMPLETED / FAILED / DEAD` |
| `startedAt` | timestamp | Execution start |
| `completedAt` | timestamp | Execution end |
| `result` | JSONB | `{ statusCode, durationMs, responseBody }` |
| `errorMessage` | text | Error if failed |
| `workerNodeId` | varchar | Which worker ran this |

### `rate_limits`

Tracks API usage per user per time window for plan enforcement.

| Column | Type | Description |
|---|---|---|
| `userId` | UUID | Which user |
| `windowStart` | timestamp | Start of the current rate limit window |
| `count` | integer | Jobs created in this window |

---

## API Reference

All API requests require an `X-API-Key` header (or `Authorization: Bearer <jwt>`).

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Log in, receive JWT |
| `POST` | `/api/jobs` | Create a one-time job |
| `GET` | `/api/jobs` | List your jobs |
| `GET` | `/api/jobs/:id` | Get a specific job |
| `DELETE` | `/api/jobs/:id` | Cancel a SCHEDULED job |
| `POST` | `/api/cron-jobs` | Create a recurring job |
| `GET` | `/api/cron-jobs` | List recurring jobs |
| `POST` | `/api/github-jobs` | Schedule a GitHub repo execution |
| `POST` | `/api/execute` | Trigger an immediate execution |
| `GET` | `/api/health` | System health check |

### Example: Create a Job

```bash
curl -X POST http://localhost:3002/api/jobs \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Send welcome email",
    "scheduledAt": "2026-12-01T09:00:00Z",
    "idempotencyKey": "welcome-user-42",
    "deliveryType": "HTTP",
    "deliveryConfig": {
      "url": "https://api.myapp.com/emails/send",
      "method": "POST",
      "body": { "userId": 42, "template": "welcome" }
    },
    "maxRetries": 3
  }'
```

### Example: Create a Recurring Job

```bash
curl -X POST http://localhost:3002/api/cron-jobs \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Hourly report",
    "deliveryType": "WEBHOOK",
    "deliveryConfig": {
      "url": "https://myapp.com/hooks/report",
      "secret": "my-signing-secret"
    },
    "intervalMs": 3600000
  }'
```

---

## Project Structure

```
Pulse/
├── backend/                    # Node.js scheduling engine
│   ├── src/
│   │   ├── api/                # Hono route handlers
│   │   │   ├── auth.routes.ts
│   │   │   ├── job.routes.ts
│   │   │   ├── cron-jobs.routes.ts
│   │   │   ├── github-jobs.routes.ts
│   │   │   ├── execute.routes.ts
│   │   │   └── health.routes.ts
│   │   ├── scheduler/
│   │   │   └── scheduler.ts    # Poll loop, lock, publish
│   │   ├── consumer/
│   │   │   ├── worker.ts       # BullMQ worker, 3-guard execution
│   │   │   └── delivery.ts     # HTTP/Webhook/CodeExec/GithubExec
│   │   ├── db/
│   │   │   └── schema.ts       # Drizzle ORM table definitions
│   │   ├── lib/
│   │   │   ├── redis.ts        # Distributed lock (Lua scripts)
│   │   │   ├── queue.ts        # BullMQ queue setup + publish
│   │   │   ├── docker-executor.ts  # Ephemeral Docker runs
│   │   │   ├── auth.ts         # JWT / API key validation
│   │   │   ├── rate-limiter.ts
│   │   │   └── logger.ts       # Pino structured logging
│   │   ├── config.ts           # All env-var config in one place
│   │   └── index.ts            # Main entry — starts all 3 node types
│   ├── docker-compose.yml      # PostgreSQL + Redis
│   └── package.json
│
└── frontend/                   # Next.js 16 dashboard
    ├── app/
    │   ├── command-center/     # Job management UI
    │   ├── schedule/           # Schedule builder
    │   ├── topology/           # Live node topology view
    │   ├── topology-engine/
    │   ├── vault/              # Secrets & credentials
    │   └── settings-config/
    └── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker + Docker Compose
- Bun (for the frontend)

### 1. Start Infrastructure

```bash
cd backend
docker compose up -d
# Starts PostgreSQL on :5442 and Redis on :6379
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values (defaults work for local dev)
```

### 3. Run Database Migrations

```bash
npm run migrate
```

### 4. Start the Backend

```bash
# All-in-one (API + Scheduler + Workers in one process):
npm run dev

# Or run each node type independently:
npm run dev              # API Node  → :3002
npm run dev:scheduler    # Scheduler Node
npm run dev:consumer     # Worker Node
```

### 5. Start the Frontend

```bash
cd frontend
bun install
bun run dev
# → http://localhost:3000
```

---

## Configuration

All configuration is via environment variables (with sensible defaults for local development):

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://pulse:pulse_secret@localhost:5442/pulse_db` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `API_PORT` | `3002` | HTTP port for the API server |
| `JWT_SECRET` | *(dev value)* | Secret for signing JWTs — **change in production** |
| `JWT_EXPIRY` | `24h` | JWT token lifetime |
| `SCHEDULER_POLL_INTERVAL_MS` | `1000` | How often the Scheduler polls for due jobs |
| `SCHEDULER_BATCH_SIZE` | `100` | Max jobs per Scheduler poll |
| `SCHEDULER_LOCK_TTL_MS` | `30000` | Redis lock TTL — Watchdog recovery window |
| `SCHEDULER_CONCURRENCY` | `3` | Scheduler instances per process |
| `CONSUMER_CONCURRENCY` | `10` | Parallel Worker goroutines per process |
| `CONSUMER_MAX_RETRIES` | `5` | Default max retries before DEAD |
| `CONSUMER_RETRY_BACKOFF_BASE_MS` | `1000` | Base for exponential backoff: `base * 2^retryCount` |
| `CONSUMER_EXECUTION_TIMEOUT_MS` | `60000` | Execution timeout before Watchdog recovery |
| `CLOCK_SKEW_TOLERANCE_MS` | `500` | Tolerance added to `scheduledAt` comparisons |

---

## Tech Stack

| Component | Technology |
|---|---|
| **API Framework** | [Hono](https://hono.dev) on Node.js |
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4, GSAP |
| **Database** | PostgreSQL 16 (via [Drizzle ORM](https://orm.drizzle.team)) |
| **Queue** | [BullMQ](https://bullmq.io) on Redis 7 |
| **Distributed Locks** | Redis + Lua atomic scripts (ioredis) |
| **Auth** | JWT (jose) + bcrypt API keys + Clerk (frontend) |
| **Logging** | [Pino](https://getpino.io) structured JSON logs |
| **Container Execution** | Docker (ephemeral containers for GITHUB_EXEC) |
| **Validation** | Zod |
| **Testing** | Vitest |
| **Language** | TypeScript 5 throughout |

---

## Why Not Kafka?

Pulse originally used Kafka KRaft (3-broker cluster). It was switched to **BullMQ + Redis** because:

| Concern | Kafka | BullMQ |
|---|---|---|
| Setup complexity | 3-broker cluster, KRaft config | Single Redis instance |
| Job deduplication | No native job-level dedup | Native `jobId` dedup |
| Retry logic | Manual, complex | Built-in with configurable backoff |
| Latency | Higher (disk-based) | Lower (in-memory) |
| Operational overhead | High | Low |
| Fit for task scheduling | Overkill | Purpose-built |

> **The analogy:** Kafka is a giant public bulletin board where many people read the same notices forever. BullMQ is a task inbox where one worker picks up a task and it disappears from the queue.

Kafka shines when you need **event replay** and **fan-out to multiple independent consumer groups**. Pulse needs neither.

---

<p align="center">Built with ⚡ by the Pulse team</p>
