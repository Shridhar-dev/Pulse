import { createChildLogger } from '../lib/logger.js';
import { type JobMessage } from '../lib/queue.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { access, constants } from 'fs/promises';
import { executeInContainer, validateGithubRepoUrl, type GithubExecConfig } from '../lib/docker-executor.js';

const log = createChildLogger('delivery');
const execAsync = promisify(exec);

export interface DeliveryResult {
    success: boolean;
    statusCode?: number;
    responseBody?: string;
    error?: string;
    durationMs: number;
}

/**
 * Delivery Layer — Executes the job by delivering its payload
 * to the configured endpoint.
 *
 * Supports:
 * - HTTP: Direct HTTP requests to any endpoint
 * - WEBHOOK: HTTP POST with signing headers
 * - CODE_EXEC: Execute a stored code file locally
 */
export async function executeDelivery(job: JobMessage): Promise<DeliveryResult> {
    const startTime = Date.now();

    try {
        switch (job.deliveryType) {
            case 'HTTP':
                return await executeHttpDelivery(job, startTime);

            case 'WEBHOOK':
                return await executeWebhookDelivery(job, startTime);

            case 'CODE_EXEC':
                return await executeCodeExecDelivery(job, startTime);

            case 'GITHUB_EXEC':
                return await executeGithubExecDelivery(job, startTime);

            default:
                return {
                    success: false,
                    error: `Unknown delivery type: ${job.deliveryType}`,
                    durationMs: Date.now() - startTime,
                };
        }
    } catch (err: any) {
        return {
            success: false,
            error: err.message || 'Unknown delivery error',
            durationMs: Date.now() - startTime,
        };
    }
}

/**
 * HTTP delivery — sends the job payload to the configured URL.
 */
async function executeHttpDelivery(
    job: JobMessage,
    startTime: number
): Promise<DeliveryResult> {
    const url = job.deliveryConfig.url as string | undefined;
    const method = (job.deliveryConfig.method as string) || 'POST';
    const headers = (job.deliveryConfig.headers as Record<string, string>) || {};
    const timeout_ms = (job.deliveryConfig.timeout_ms as number) || 30000;

    if (!url) {
        return {
            success: false,
            error: 'No URL configured for HTTP delivery',
            durationMs: Date.now() - startTime,
        };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeout_ms as number);

    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-Pulse-Job-Id': job.jobId,
                'X-Pulse-Execution-Id': job.executionId,
                'X-Pulse-Fencing-Token': job.fencingToken.toString(),
                'X-Pulse-Scheduled-At': job.scheduledAt,
                'X-Pulse-Retry-Count': job.retryCount.toString(),
                ...(headers as Record<string, string>),
            },
            body: JSON.stringify({
                jobId: job.jobId,
                name: job.name,
                payload: job.payload,
                scheduledAt: job.scheduledAt,
                executionId: job.executionId,
                retryCount: job.retryCount,
            }),
            signal: controller.signal,
        });

        const responseBody = await response.text();
        const durationMs = Date.now() - startTime;

        // 2xx status codes are considered success
        const success = response.status >= 200 && response.status < 300;

        log.info(
            {
                jobId: job.jobId,
                url,
                method,
                statusCode: response.status,
                success,
                durationMs,
            },
            'HTTP delivery completed'
        );

        return {
            success,
            statusCode: response.status,
            responseBody: responseBody.slice(0, 1024), // Limit stored response
            durationMs,
        };
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Webhook delivery — HTTP POST with Pulse signature headers.
 */
async function executeWebhookDelivery(
    job: JobMessage,
    startTime: number
): Promise<DeliveryResult> {
    const url = job.deliveryConfig.url as string | undefined;
    const headers = (job.deliveryConfig.headers as Record<string, string>) || {};
    const timeout_ms = (job.deliveryConfig.timeout_ms as number) || 30000;

    if (!url) {
        return {
            success: false,
            error: 'No URL configured for Webhook delivery',
            durationMs: Date.now() - startTime,
        };
    }

    const timestamp = Date.now().toString();
    const bodyStr = JSON.stringify({
        event: 'job.execution',
        jobId: job.jobId,
        name: job.name,
        payload: job.payload,
        scheduledAt: job.scheduledAt,
        executionId: job.executionId,
        retryCount: job.retryCount,
        timestamp,
    });

    // Create HMAC signature for webhook verification
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(job.executionId),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(bodyStr));
    const signature = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeout_ms as number);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Pulse-Signature': `sha256=${signature}`,
                'X-Pulse-Timestamp': timestamp,
                'X-Pulse-Job-Id': job.jobId,
                'X-Pulse-Delivery-Id': job.executionId,
                ...(headers as Record<string, string>),
            },
            body: bodyStr,
            signal: controller.signal,
        });

        const responseBody = await response.text();
        const durationMs = Date.now() - startTime;
        const success = response.status >= 200 && response.status < 300;

        log.info(
            { jobId: job.jobId, url, statusCode: response.status, success, durationMs },
            'Webhook delivery completed'
        );

        return { success, statusCode: response.status, responseBody: responseBody.slice(0, 1024), durationMs };
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * CODE_EXEC delivery — executes a locally stored code file.
 * 
 * deliveryConfig should contain:
 * - filePath: absolute path to the stored code file
 * - command: command template, e.g. "node {file}" or "python3 {file}"
 */
async function executeCodeExecDelivery(
    job: JobMessage,
    startTime: number
): Promise<DeliveryResult> {
    const filePath = job.deliveryConfig.filePath as string | undefined;
    const commandTemplate = job.deliveryConfig.command as string | undefined;

    if (!filePath || !commandTemplate) {
        return {
            success: false,
            error: 'CODE_EXEC requires filePath and command in deliveryConfig',
            durationMs: Date.now() - startTime,
        };
    }

    // Verify the file still exists
    try {
        await access(filePath, constants.R_OK);
    } catch {
        return {
            success: false,
            error: `Code file not found or not readable: ${filePath}`,
            durationMs: Date.now() - startTime,
        };
    }

    const finalCommand = commandTemplate.replace(/\{file\}/g, filePath);

    log.info(
        { jobId: job.jobId, command: finalCommand, filePath },
        'Executing code file (CODE_EXEC delivery)'
    );

    try {
        const { stdout, stderr } = await execAsync(finalCommand, {
            timeout: 60000, // 60 second timeout for cron jobs
            maxBuffer: 1024 * 1024, // 1MB output buffer
        });

        const output = (stdout + (stderr ? '\nSTDERR:\n' + stderr : '')).trim();
        const durationMs = Date.now() - startTime;

        log.info(
            { jobId: job.jobId, durationMs, outputLength: output.length },
            'CODE_EXEC delivery completed successfully'
        );

        return {
            success: true,
            statusCode: 0,
            responseBody: output.slice(0, 4096), // Store up to 4KB of output
            durationMs,
        };
    } catch (err: any) {
        const output = (err.stdout || '') + (err.stderr || '') || err.message;
        const durationMs = Date.now() - startTime;

        log.warn(
            { jobId: job.jobId, durationMs, error: err.message },
            'CODE_EXEC delivery failed'
        );

        return {
            success: false,
            statusCode: err.code || 1,
            responseBody: output.slice(0, 4096),
            error: err.message,
            durationMs,
        };
    }
}

/**
 * GITHUB_EXEC delivery — clones a GitHub repo into an ephemeral Docker
 * container, builds it, runs the specified command, and destroys the container.
 *
 * deliveryConfig should contain:
 * - repoUrl: HTTPS URL of the GitHub repository
 * - branch: branch to clone (default: "main")
 * - buildCommand: build command (e.g., "npm install")
 * - runCommand: execution command (e.g., "node server.js")
 * - dockerImage: Docker image to use (default: "node:22-alpine")
 * - timeoutMs: execution timeout in ms (default: 300000)
 * - memoryLimit: container memory limit (default: "512m")
 * - cpuLimit: container CPU limit (default: "1.0")
 * - envVars: environment variables to inject
 * - workDir: working directory relative to repo root
 */
async function executeGithubExecDelivery(
    job: JobMessage,
    startTime: number
): Promise<DeliveryResult> {
    const ghConfig = job.deliveryConfig as unknown as GithubExecConfig;

    if (!ghConfig.repoUrl) {
        return {
            success: false,
            error: 'GITHUB_EXEC requires repoUrl in deliveryConfig',
            durationMs: Date.now() - startTime,
        };
    }

    if (!ghConfig.runCommand) {
        return {
            success: false,
            error: 'GITHUB_EXEC requires runCommand in deliveryConfig',
            durationMs: Date.now() - startTime,
        };
    }

    // Validate repo URL
    const urlValidation = validateGithubRepoUrl(ghConfig.repoUrl);
    if (!urlValidation.valid) {
        return {
            success: false,
            error: urlValidation.error || 'Invalid repository URL',
            durationMs: Date.now() - startTime,
        };
    }

    log.info(
        {
            jobId: job.jobId,
            repoUrl: ghConfig.repoUrl,
            branch: ghConfig.branch || 'main',
            runCommand: ghConfig.runCommand,
            dockerImage: ghConfig.dockerImage || 'node:22-alpine',
        },
        'Starting GITHUB_EXEC delivery'
    );

    try {
        const result = await executeInContainer(ghConfig, job.jobId);

        const durationMs = Date.now() - startTime;

        log.info(
            {
                jobId: job.jobId,
                containerId: result.containerId,
                exitCode: result.exitCode,
                durationMs,
                outputLength: result.output.length,
            },
            result.success
                ? 'GITHUB_EXEC delivery completed successfully'
                : 'GITHUB_EXEC delivery failed'
        );

        return {
            success: result.success,
            statusCode: result.exitCode,
            responseBody: result.output,
            durationMs,
            error: result.error,
        };
    } catch (err: any) {
        const durationMs = Date.now() - startTime;

        log.error(
            { jobId: job.jobId, error: err.message },
            'GITHUB_EXEC delivery error'
        );

        return {
            success: false,
            error: err.message || 'Docker execution error',
            durationMs,
        };
    }
}
