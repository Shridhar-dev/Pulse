# Pulse — High-Throughput Distributed Task Scheduling Engine

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         Pulse (Distributed Scheduler)                        │
│                                                                              │
│  ┌─────────┐    ┌──────────────┐    ┌──────────────┐    ┌────────────────┐  │
│  │  API     │───▶│  Job Store   │───▶│  Scheduler   │───▶│ Redis+BullMQ   │  │
│  │  Gateway │    │  (Postgres)  │    │  (Poller)    │    │  Queues        │  │
│  └─────────┘    └──────────────┘    └──────────────┘    └────────────────┘  │
│       │                │                    │                    │            │
│       │           ┌────┴─────┐         ┌────┴─────┐        ┌───┴──────┐    │
│       │           │  Redis   │         │  Clock   │        │ Consumer │    │
│       │           │  (Lock)  │         │  Sync    │        │ Workers  │    │
│       │           └──────────┘         └──────────┘        └──────────┘    │
│       │                                                         │            │
│       │                                                    ┌────┴─────┐     │
│       │                                                    │ Executor │     │
│       │                                                    │ (Docker) │     │
│       │                                                    └──────────┘     │
│  ┌────┴──────────────────────────────────────────────────────────────────┐  │
│  │                    Delivery Layer (HTTP / Webhook)                     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Flow

1. **User** signs up → gets API key → schedules jobs via REST API
2. **API Gateway** validates, rate-limits, stores job in PostgreSQL with status=`SCHEDULED`
3. **Scheduler** polls DB for due jobs, acquires distributed lock (Redis), updates status=`QUEUED`
4. Job is published to **BullMQ queue** (backed by Redis) for parallel consumption
5. **Consumer workers** (BullMQ Workers) pick up jobs, update status=`RUNNING`, execute via delivery layer
6. On completion → status=`COMPLETED`; on failure → retry logic with exponential backoff
7. Lock timeout watchdog reclaims stuck jobs

## Exactly-Once Guarantee

- **Idempotency keys** on every job prevent duplicate scheduling
- **Distributed locks** (Redis + fencing tokens) prevent concurrent execution
- **BullMQ workers** with job-level deduplication (executionId as BullMQ jobId) ensure at-least-once delivery
- **Database-level deduplication** (unique execution_id per run) converts at-least-once to exactly-once
- **Fencing tokens** reject stale lock holders from completing jobs

## Clock Skew Handling

- All nodes use NTP-synced time with configurable tolerance
- Scheduler uses DB server time (SELECT NOW()) as canonical clock
- Jobs have a `tolerance_ms` window for scheduling precision
