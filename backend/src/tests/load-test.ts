import { createChildLogger } from '../lib/logger.js';

const log = createChildLogger('load-test');

const API_BASE = process.env.API_BASE || 'http://localhost:3002';
const TOTAL_JOBS = parseInt(process.env.TOTAL_JOBS || '10000', 10);
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '50', 10);
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '100', 10);

interface TestResult {
    totalJobs: number;
    successfulJobs: number;
    failedJobs: number;
    totalDurationMs: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    jobsPerSecond: number;
}

async function signUp(): Promise<{ token: string; apiKey: string }> {
    const email = `loadtest-${Date.now()}@pulse.dev`;
    const response = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email,
            password: 'loadtest-password-123',
        }),
    });

    if (!response.ok) {
        throw new Error(`Signup failed: ${response.status} ${await response.text()}`);
    }

    const data: any = await response.json();
    return { token: data.token, apiKey: data.user.apiKey };
}

async function scheduleJob(
    apiKey: string,
    index: number
): Promise<{ latencyMs: number; success: boolean }> {
    const start = Date.now();
    const scheduledAt = new Date(Date.now() + 5000 + Math.random() * 10000); // 5-15s from now

    try {
        const response = await fetch(`${API_BASE}/api/jobs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
            },
            body: JSON.stringify({
                name: `load-test-job-${index}`,
                idempotencyKey: `load-test-${Date.now()}-${index}`,
                scheduledAt: scheduledAt.toISOString(),
                toleranceMs: 500,
                payload: {
                    testIndex: index,
                    timestamp: Date.now(),
                    data: `Test payload for job ${index}`,
                },
                deliveryType: 'HTTP',
                deliveryConfig: {
                    url: 'https://httpbin.org/post',
                    method: 'POST',
                    timeout_ms: 10000,
                },
                maxRetries: 3,
            }),
        });

        const latencyMs = Date.now() - start;
        return { latencyMs, success: response.status === 201 || response.status === 200 };
    } catch (err: any) {
        return { latencyMs: Date.now() - start, success: false };
    }
}

async function scheduleBatch(
    apiKey: string,
    startIndex: number,
    batchSize: number
): Promise<{ latencyMs: number; success: boolean; created: number }> {
    const start = Date.now();

    const jobsBatch = Array.from({ length: batchSize }, (_, i) => {
        const index = startIndex + i;
        return {
            name: `load-test-batch-job-${index}`,
            idempotencyKey: `batch-${Date.now()}-${index}`,
            scheduledAt: new Date(Date.now() + 5000 + Math.random() * 10000).toISOString(),
            toleranceMs: 500,
            payload: { testIndex: index },
            deliveryType: 'HTTP' as const,
            deliveryConfig: {
                url: 'https://httpbin.org/post',
                method: 'POST',
                timeout_ms: 10000,
            },
            maxRetries: 3,
        };
    });

    try {
        const response = await fetch(`${API_BASE}/api/jobs/bulk`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
            },
            body: JSON.stringify({ jobs: jobsBatch }),
        });

        const latencyMs = Date.now() - start;
        const data: any = await response.json();
        return {
            latencyMs,
            success: response.ok,
            created: data.created?.length || 0,
        };
    } catch {
        return { latencyMs: Date.now() - start, success: false, created: 0 };
    }
}

async function runLoadTest() {
    log.info('╔══════════════════════════════════════════╗');
    log.info('║       PULSE LOAD TEST                    ║');
    log.info('╚══════════════════════════════════════════╝');
    log.info({
        targetJobs: TOTAL_JOBS,
        concurrency: CONCURRENCY,
        batchSize: BATCH_SIZE,
        apiBase: API_BASE,
    });

    // Step 1: Sign up
    log.info('Signing up test user...');
    const { apiKey } = await signUp();
    log.info({ apiKey: apiKey.slice(0, 10) + '...' }, 'Test user created');

    // Step 2: Schedule jobs (using both single and bulk APIs)
    const latencies: number[] = [];
    let successCount = 0;
    let failCount = 0;

    const startTime = Date.now();

    // Use bulk API for efficiency
    const totalBatches = Math.ceil(TOTAL_JOBS / BATCH_SIZE);
    const batchPromises: Promise<void>[] = [];
    let activeBatches = 0;

    log.info(`Scheduling ${TOTAL_JOBS} jobs in ${totalBatches} batches of ${BATCH_SIZE}...`);

    for (let batch = 0; batch < totalBatches; batch++) {
        // Control concurrency
        while (activeBatches >= CONCURRENCY) {
            await new Promise((resolve) => setTimeout(resolve, 10));
        }

        activeBatches++;

        const batchPromise = (async () => {
            const startIdx = batch * BATCH_SIZE;
            const size = Math.min(BATCH_SIZE, TOTAL_JOBS - startIdx);
            const result = await scheduleBatch(apiKey, startIdx, size);

            latencies.push(result.latencyMs);
            if (result.success) {
                successCount += result.created;
            } else {
                failCount += size;
            }

            activeBatches--;

            if ((batch + 1) % 10 === 0) {
                const elapsed = (Date.now() - startTime) / 1000;
                const rate = successCount / elapsed;
                log.info(
                    {
                        batch: batch + 1,
                        totalBatches,
                        scheduled: successCount,
                        rate: Math.round(rate),
                    },
                    'Progress'
                );
            }
        })();

        batchPromises.push(batchPromise);
    }

    await Promise.all(batchPromises);

    const totalDurationMs = Date.now() - startTime;

    // Step 3: Calculate results
    latencies.sort((a, b) => a - b);
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const p95Index = Math.floor(latencies.length * 0.95);
    const p99Index = Math.floor(latencies.length * 0.99);

    const result: TestResult = {
        totalJobs: TOTAL_JOBS,
        successfulJobs: successCount,
        failedJobs: failCount,
        totalDurationMs,
        avgLatencyMs: Math.round(avgLatency),
        p95LatencyMs: latencies[p95Index] || 0,
        p99LatencyMs: latencies[p99Index] || 0,
        jobsPerSecond: Math.round(successCount / (totalDurationMs / 1000)),
    };

    log.info('');
    log.info('╔══════════════════════════════════════════╗');
    log.info('║       LOAD TEST RESULTS                  ║');
    log.info('╠══════════════════════════════════════════╣');
    log.info(`║  Total Jobs:       ${result.totalJobs.toLocaleString().padStart(18)}`);
    log.info(`║  Successful:       ${result.successfulJobs.toLocaleString().padStart(18)}`);
    log.info(`║  Failed:           ${result.failedJobs.toLocaleString().padStart(18)}`);
    log.info(`║  Duration:         ${(result.totalDurationMs / 1000).toFixed(1).padStart(16)}s`);
    log.info(`║  Throughput:       ${result.jobsPerSecond.toLocaleString().padStart(14)} /s`);
    log.info(`║  Avg Latency:      ${result.avgLatencyMs.toString().padStart(16)}ms`);
    log.info(`║  P95 Latency:      ${result.p95LatencyMs.toString().padStart(16)}ms`);
    log.info(`║  P99 Latency:      ${result.p99LatencyMs.toString().padStart(16)}ms`);
    log.info('╚══════════════════════════════════════════╝');

    // Exit
    process.exit(result.failedJobs > 0 ? 1 : 0);
}

runLoadTest().catch((err) => {
    log.error({ err }, 'Load test failed');
    process.exit(1);
});
