# ⚡ Pulse — High-Throughput Distributed Task Scheduling Engine

> A scheduling system capable of ingesting and reliably executing **10,000+ tasks per second** with **exactly-once execution guarantees**, distributed locking, and clock-skew handling.

---

## Architecture

```
       ┌──────────┐
       │   User   │──── API Key ────┐
       └──────────┘                 │
                                    ▼
  ┌──────────────────────────────────────────────────────────────┐
  │                     PULSE CLUSTER                             │
  │                                                               │
  │  ┌─────────────┐    ┌────────────┐    ┌──────────────────┐   │
  │  │  API Server  │───▶│  PostgreSQL │◀───│  Scheduler Node  │   │
  │  │  (Hono)      │    │  (Job Store)│    │  (Poller)        │   │
  │  └─────────────┘    └────────────┘    └───────┬──────────┘   │
  │         │                │                     │              │
  │         │           ┌────┴────┐          ┌─────▼────────┐    │
  │         │           │  Redis  │          │  Kafka KRaft  │    │
  │         │           │  (Lock) │          │  (3 brokers)  │    │
  │         │           └─────────┘          │  P1│P2│P3│P4  │    │
  │         │                                └──┬──┬──┬──────┘    │
  │         │                                   │  │  │           │
  │         │                          ┌────────┘  │  └────────┐  │
  │         │                          ▼           ▼           ▼  │
  │         │                     ┌─────────┐ ┌─────────┐ ┌─────┐│
  │         │                     │Consumer1│ │Consumer2│ │  C3 ││
  │         │                     └────┬────┘ └────┬────┘ └──┬──┘│
  │         │                          │           │          │   │
  │         │                     ┌────▼───────────▼──────────▼─┐│
  │         │                     │       Delivery Layer         ││
  │         │                     │  HTTP │ Webhook │ Kafka      ││
  │         │                     └──────────────────────────────┘│
  └──────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Start Infrastructure

```bash
# Start PostgreSQL, Redis, and Kafka KRaft cluster (3 brokers)
docker compose up -d

# Wait for services to be healthy (~30s for Kafka)
docker compose ps
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Database Migration

```bash
npm run migrate
```

### 4. Seed Demo Data (Optional)

```bash
npm run seed
```

### 5. Start the System

```bash
# All-in-one mode (API + Scheduler + Consumers)
npm run dev

# OR run components separately for horizontal scaling:
npm run dev              # API Server
npm run dev:scheduler    # Scheduler Node
npm run dev:consumer     # Consumer Workers
```

### 6. Test It

```bash
# Sign up
curl -X POST http://localhost:3002/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@test.com","password":"password123"}'

# Schedule a job (use the API key from signup response)
curl -X POST http://localhost:3002/api/jobs \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "name": "send-notification",
    "idempotencyKey": "notif-001",
    "scheduledAt": "2026-04-21T12:00:00Z",
    "payload": {"userId": "123", "message": "Hello!"},
    "deliveryType": "HTTP",
    "deliveryConfig": {
      "url": "https://httpbin.org/post",
      "method": "POST"
    }
  }'

# Run load test (10,000 jobs)
npm run test:load
```

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account, get API key |
| POST | `/api/auth/signin` | Sign in, get JWT token |
| POST | `/api/auth/refresh-api-key` | Rotate API key (JWT auth) |
| GET | `/api/auth/me` | Get current user profile |

### Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/jobs` | Schedule a single job |
| POST | `/api/jobs/bulk` | Schedule up to 1,000 jobs |
| GET | `/api/jobs` | List jobs (paginated) |
| GET | `/api/jobs/:id` | Get job details + executions |
| DELETE | `/api/jobs/:id` | Cancel a SCHEDULED job |
| GET | `/api/jobs/:id/executions` | Get execution history |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Full system health check |
| GET | `/api/health/live` | Liveness probe |
| GET | `/api/health/ready` | Readiness probe |

---

## Exactly-Once Execution Guarantee

This is the hardest problem in the system. Here's our **honest answer** to how it works:

### The Chain of Guarantees

```
1. IDEMPOTENCY KEYS     → Prevent duplicate job creation
2. SELECT FOR UPDATE     → Prevent scheduler contention  
   SKIP LOCKED
3. DISTRIBUTED LOCKS     → Prevent multiple schedulers from
   (Redis + Fencing)       picking the same job
4. FENCING TOKENS        → Detect and reject stale lock holders
5. KAFKA acks=-1         → Message durably replicated before ack
6. MANUAL OFFSET COMMIT  → Only commit after full processing
7. DB EXECUTION RECORD   → Unique (job_id, execution_id) prevents
   (Unique Index)          duplicate execution records
```

### Under Failure Conditions

| Failure Scenario | What Happens | Guarantee |
|-----------------|--------------|-----------|
| API crash during job creation | Client retries with same idempotency key → returns existing job | No duplicate |
| Scheduler crashes after locking | Lock expires (TTL), job reverts to SCHEDULED | Job re-scheduled |
| Scheduler crashes after Kafka publish | Consumer processes it; if scheduler retries, fencing token catches it | At-most-once |
| Consumer crashes before offset commit | Message redelivered → execution record exists → idempotent skip | Exactly-once |
| Consumer crashes during delivery | Lock timeout → job reverts → retry with new execution ID | At-most-once per attempt |
| Kafka broker dies | ISR=2 with 3 replicas, message survives | No data loss |
| Redis crashes | Scheduler uses DB `SELECT FOR UPDATE SKIP LOCKED` as fallback | Degraded but functional |

### What We DON'T Guarantee

- **End-to-end exactly-once with external systems**: If the HTTP endpoint processes the request but the response is lost, the consumer will retry. The external system must also be idempotent (we include `X-Pulse-Execution-Id` headers for this).
- **Sub-millisecond scheduling precision**: We use DB server time with configurable tolerance (default 500ms).

---

## Kafka KRaft Configuration

The system uses Kafka in **KRaft mode** (no ZooKeeper):

- **3 broker nodes** with combined controller+broker roles
- **6 partitions** per topic for parallel consumption
- **Replication factor 3** with `min.insync.replicas=2`
- **Idempotent producer** enabled for exactly-once publishing
- **Manual offset commit** — offsets are committed only after the job completes

### Topics

| Topic | Partitions | Purpose |
|-------|-----------|---------|
| `pulse.jobs.execution` | 6 | Job execution messages |
| `pulse.jobs.dlq` | 3 | Dead letter queue |
| `pulse.jobs.events` | 6 | Job lifecycle events |

---

## Clock Skew Handling

Instead of fighting clock synchronization across nodes, we use **database server time as the canonical clock**:

```typescript
// Every scheduler poll uses DB time, not local time
const serverTime = await getServerTime(); // SELECT NOW()
```

This means:
- ✅ All schedulers agree on "now" regardless of their local clocks
- ✅ Jobs fire at the correct time even if NTP drifts
- ✅ No need for complex vector clocks or Lamport timestamps
- ⚠️ Trade-off: extra DB round-trip per poll, DB becomes time authority

---

## Horizontal Scaling

### API Servers
Stateless — scale to N replicas behind a load balancer.

### Scheduler Nodes
Multiple schedulers can run concurrently thanks to:
- `SELECT FOR UPDATE SKIP LOCKED` — no contention between schedulers
- Redis distributed locks — prevent duplicate Kafka publishing
- Fencing tokens — detect stale schedulers

### Consumer Workers
Kafka consumer group handles partition assignment automatically.
More consumers = more parallelism (up to partition count).

### Database
- Connection pooling (max 20 per node)
- Indexes optimized for scheduler polling
- Consider read replicas for the API layer

---

## Pricing Plans

| Plan | Jobs/Minute | Description |
|------|------------|-------------|
| FREE | 100 | Getting started |
| STARTER | 1,000 | Small projects |
| PRO | 10,000 | Production workloads |
| ENTERPRISE | 100,000 | High-volume systems |

---

## Project Structure

```
pulse-backend/
├── src/
│   ├── index.ts                 # Main entry (API + Scheduler + Consumer)
│   ├── config.ts                # Environment configuration
│   ├── api/
│   │   ├── auth.routes.ts       # Authentication endpoints
│   │   ├── job.routes.ts        # Job CRUD endpoints
│   │   └── health.routes.ts     # Health check endpoints
│   ├── db/
│   │   ├── index.ts             # Database connection + server time
│   │   ├── schema.ts            # Drizzle ORM schema
│   │   ├── migrate.ts           # SQL migrations
│   │   └── seed.ts              # Demo data seeder
│   ├── lib/
│   │   ├── auth.ts              # JWT, API keys, middleware
│   │   ├── kafka.ts             # Kafka producer/consumer/admin
│   │   ├── redis.ts             # Distributed locks (fencing tokens)
│   │   ├── logger.ts            # Structured logging (pino)
│   │   └── rate-limiter.ts      # Per-plan rate limiting
│   ├── scheduler/
│   │   ├── scheduler.ts         # Core scheduler (polling + publishing)
│   │   └── index.ts             # Standalone scheduler entry
│   ├── consumer/
│   │   ├── worker.ts            # Consumer worker (offset commit + execution)
│   │   ├── delivery.ts          # HTTP/Webhook/Kafka delivery layer
│   │   └── index.ts             # Standalone consumer entry
│   ├── types/
│   │   └── hono.ts              # Hono environment types
│   └── tests/
│       └── load-test.ts         # Load testing script
├── docker-compose.yml           # Kafka KRaft + PostgreSQL + Redis
├── Dockerfile                   # Production image
├── ARCHITECTURE.md              # Architecture documentation
└── package.json
```

---

## Environment Variables

See [`.env.example`](.env.example) for all configuration options.

Key settings:
- `SCHEDULER_BATCH_SIZE`: Jobs per poll cycle (default: 100)
- `SCHEDULER_POLL_INTERVAL_MS`: Poll frequency (default: 1000ms)
- `CONSUMER_CONCURRENCY`: Parallel workers (default: 10)
- `CLOCK_SKEW_TOLERANCE_MS`: Scheduling tolerance (default: 500ms)
