import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import { createChildLogger } from './logger.js';

const log = createChildLogger('docker-executor');
const execAsync = promisify(exec);

// On Windows with Docker Desktop, the pipe is npipe:////./pipe/docker_engine
// On Linux/Mac it's unix:///var/run/docker.sock
// Let the user override via DOCKER_HOST env var, otherwise auto-detect.
const isWindows = process.platform === 'win32';
const DEFAULT_DOCKER_HOST = isWindows
    ? 'npipe:////./pipe/docker_engine'
    : 'unix:///var/run/docker.sock';
const DOCKER_HOST = process.env.DOCKER_HOST || DEFAULT_DOCKER_HOST;
const dockerEnv = { ...process.env, DOCKER_HOST };

// ─── Types ──────────────────────────────────────────

export interface GithubExecConfig {
    repoUrl: string;          // e.g. "https://github.com/user/repo.git"
    branch?: string;          // default: "main"
    buildCommand?: string;    // e.g. "npm install" or "pip install -r requirements.txt"
    runCommand: string;       // e.g. "node server.js" or "python main.py"
    dockerImage?: string;     // default: "node:22-alpine"
    timeoutMs?: number;       // default: 300000 (5 minutes)
    memoryLimit?: string;     // default: "512m"
    cpuLimit?: string;        // default: "1.0"
    envVars?: Record<string, string>;  // environment variables to inject
    workDir?: string;         // working directory inside container (relative to repo root)
}

export interface DockerExecResult {
    success: boolean;
    output: string;
    exitCode: number;
    containerId: string;
    durationMs: number;
    error?: string;
}

// ─── Docker Executor ────────────────────────────────

/**
 * Executes a GitHub repo inside an ephemeral Docker container.
 *
 * Flow:
 * 1. Create a container with git installed
 * 2. Clone the repo (with optional branch)
 * 3. Run the build command (e.g., npm install)
 * 4. Run the execution command (e.g., node server.js)
 * 5. Capture stdout/stderr
 * 6. Destroy the container
 */
export async function executeInContainer(
    config: GithubExecConfig,
    jobId: string
): Promise<DockerExecResult> {
    const startTime = Date.now();
    const containerName = `pulse-job-${jobId.slice(0, 8)}-${crypto.randomBytes(4).toString('hex')}`;
    const branch = config.branch || 'main';
    const dockerImage = config.dockerImage || 'node:22-alpine';
    const timeoutMs = config.timeoutMs || 300000; // 5 min default
    const memoryLimit = config.memoryLimit || '512m';
    const cpuLimit = config.cpuLimit || '1.0';
    const workDir = config.workDir || '.';

    log.info(
        {
            jobId,
            containerName,
            repoUrl: config.repoUrl,
            branch,
            dockerImage,
            timeoutMs,
        },
        'Starting GitHub repo execution in Docker container'
    );

    try {
        // ─── Step 1: Pre-flight checks omitted ─────────
        // We skip "docker info" because Windows child_process.exec can occasionally fail or hang 
        // leading to false positives. We will rely on spawn('docker') to surface errors natively.

        // ─── Step 2: Build the shell script to run inside container ──
        // This script: clones repo → cd into it → build → run
        const repoDir = '/workspace/repo';

        const shellScript = buildShellScript({
            repoUrl: config.repoUrl,
            branch,
            repoDir,
            buildCommand: config.buildCommand,
            runCommand: config.runCommand,
            workDir,
        });

        // ─── Step 3: Build env vars flags ────────────────
        const envFlags: string[] = [];
        if (config.envVars) {
            for (const [key, value] of Object.entries(config.envVars)) {
                // Sanitize env var names (only allow alphanumeric + underscore)
                const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, '');
                envFlags.push('-e', `${sanitizedKey}=${value}`);
            }
        }

        // ─── Step 4: Start the container ─────────────────
        const dockerRunArgs = [
            'run',
            '--name', containerName,
            '--rm',                          // auto-remove on exit
            '--memory', memoryLimit,
            '--cpus', cpuLimit,
            '--network', 'bridge',           // allow network access for git clone & npm install
            '--workdir', '/workspace',
            '--label', `pulse.job.id=${jobId}`,
            '--label', 'pulse.managed=true',
            ...envFlags,
            dockerImage,
            '/bin/sh', '-c', shellScript,
        ];

        log.info({ containerName, dockerImage }, 'Creating Docker container');

        const result = await runDockerWithTimeout(dockerRunArgs, timeoutMs, containerName);

        const durationMs = Date.now() - startTime;

        log.info(
            {
                jobId,
                containerName,
                exitCode: result.exitCode,
                durationMs,
                outputLength: result.output.length,
            },
            result.exitCode === 0
                ? 'GitHub repo execution completed successfully'
                : 'GitHub repo execution failed'
        );

        return {
            success: result.exitCode === 0,
            output: result.output.slice(0, 8192), // Cap output at 8KB
            exitCode: result.exitCode,
            containerId: containerName,
            durationMs,
            error: result.exitCode !== 0 ? `Process exited with code ${result.exitCode}` : undefined,
        };
    } catch (err: any) {
        const durationMs = Date.now() - startTime;

        log.error(
            { jobId, containerName, error: err.message },
            'Docker execution error'
        );

        // Force cleanup on error
        await forceRemoveContainer(containerName);

        return {
            success: false,
            output: err.message || 'Unknown Docker execution error',
            exitCode: -1,
            containerId: containerName,
            durationMs,
            error: err.message,
        };
    }
}

// ─── Shell Script Builder ───────────────────────────

function buildShellScript(params: {
    repoUrl: string;
    branch: string;
    repoDir: string;
    buildCommand?: string;
    runCommand: string;
    workDir: string;
}): string {
    const { repoUrl, branch, repoDir, buildCommand, runCommand, workDir } = params;

    // Build a proper shell script with newlines (not && chaining)
    // Using set -e so any failed command exits immediately with its exit code
    const lines: string[] = [
        'set -e',
        '',
        '# Install git if not present',
        'echo "▸ [Pulse] Setting up environment..."',
        'if ! which git > /dev/null 2>&1; then',
        '  apk add --no-cache git 2>/dev/null || (apt-get update -qq && apt-get install -y -qq git 2>/dev/null) || true',
        'fi',
        '',
        '# Clone the repository',
        `echo "▸ [Pulse] Cloning ${repoUrl} (branch: ${branch})..."`,
        `git clone --depth 1 --branch "${branch}" "${repoUrl}" "${repoDir}" 2>&1 || { echo "✗ [Pulse] Failed to clone repository"; exit 1; }`,
        '',
        '# Navigate into repo',
        `cd "${repoDir}/${workDir}" || { echo "✗ [Pulse] Working directory not found: ${workDir}"; exit 1; }`,
        'echo "▸ [Pulse] Repository cloned successfully"',
    ];

    // Build step (e.g., npm install)
    if (buildCommand) {
        lines.push(
            '',
            '# Build step',
            `echo "▸ [Pulse] Running build: ${buildCommand}"`,
            `${buildCommand} 2>&1 || { echo "✗ [Pulse] Build command failed"; exit 1; }`,
            'echo "▸ [Pulse] Build completed"'
        );
    }

    // Run step — capture exit code manually so set -e doesn't exit first
    lines.push(
        '',
        '# Run step',
        `echo "▸ [Pulse] Running: ${runCommand}"`,
        'echo "─────────────────────────────────────"',
        'set +e',  // disable set -e so we can capture exit code
        `${runCommand} 2>&1`,
        'EXIT_CODE=$?',
        'set -e',
        'echo "─────────────────────────────────────"',
        'echo "▸ [Pulse] Command exited with code $EXIT_CODE"',
        'exit $EXIT_CODE'
    );

    return lines.join('\n');
}

// ─── Docker Process Runner ──────────────────────────

function runDockerWithTimeout(
    args: string[],
    timeoutMs: number,
    containerName: string
): Promise<{ output: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
        const proc = spawn('docker', args, {
            stdio: ['ignore', 'pipe', 'pipe'],
            
        });

        let output = '';
        let timedOut = false;

        // Collect stdout
        proc.stdout.on('data', (data: Buffer) => {
            output += data.toString();
            // Limit output buffer to prevent memory issues
            if (output.length > 16384) {
                output = output.slice(-16384);
            }
        });

        // Collect stderr
        proc.stderr.on('data', (data: Buffer) => {
            output += data.toString();
            if (output.length > 16384) {
                output = output.slice(-16384);
            }
        });

        // Timeout handler
        const timeout = setTimeout(async () => {
            timedOut = true;
            log.warn({ containerName, timeoutMs }, 'Container execution timed out, killing...');

            // Kill the container
            try {
                await execAsync(`docker kill ${containerName}`, { timeout: 10000,  });
            } catch {
                // Container might have already exited
            }

            proc.kill('SIGKILL');
        }, timeoutMs);

        proc.on('close', (code: number | null) => {
            clearTimeout(timeout);

            if (timedOut) {
                resolve({
                    output: output + `\n✗ [Pulse] Execution timed out after ${timeoutMs / 1000}s`,
                    exitCode: 124, // Standard timeout exit code
                });
            } else {
                resolve({
                    output,
                    exitCode: code ?? 1,
                });
            }
        });

        proc.on('error', (err: Error) => {
            clearTimeout(timeout);
            reject(err);
        });
    });
}

// ─── Cleanup ────────────────────────────────────────

async function forceRemoveContainer(containerName: string): Promise<void> {
    try {
        await execAsync(`docker rm -f ${containerName}`, { timeout: 15000,  });
        log.info({ containerName }, 'Force-removed container');
    } catch {
        // Container might not exist or already removed
    }
}

/**
 * Cleanup orphaned Pulse containers (safety net).
 * Can be called periodically to remove any stuck containers.
 */
export async function cleanupOrphanedContainers(): Promise<number> {
    try {
        const { stdout } = await execAsync(
            'docker ps -q --filter "label=pulse.managed=true" --filter "status=running"',
            { timeout: 10000,  }
        );

        const containerIds = stdout.trim().split('\n').filter(Boolean);

        if (containerIds.length === 0) return 0;

        // Check how long they've been running
        let cleaned = 0;
        for (const id of containerIds) {
            try {
                const { stdout: inspectOut } = await execAsync(
                    `docker inspect --format='{{.State.StartedAt}}' ${id}`,
                    { timeout: 5000,  }
                );

                const startedAt = new Date(inspectOut.trim().replace(/'/g, ''));
                const runningMs = Date.now() - startedAt.getTime();

                // Kill containers running for more than 10 minutes
                if (runningMs > 600000) {
                    await execAsync(`docker rm -f ${id}`, { timeout: 10000,  });
                    cleaned++;
                    log.warn({ containerId: id, runningMs }, 'Cleaned up orphaned Pulse container');
                }
            } catch {
                // Skip this container
            }
        }

        return cleaned;
    } catch {
        return 0;
    }
}

/**
 * Validates that a GitHub repo URL is safe to use.
 */
export function validateGithubRepoUrl(url: string): { valid: boolean; error?: string } {
    // Allow HTTPS GitHub URLs
    const githubHttpsPattern = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\.git)?$/;
    // Allow generic HTTPS git URLs
    const genericHttpsPattern = /^https:\/\/[\w.-]+\/[\w./-]+(\.git)?$/;

    if (githubHttpsPattern.test(url) || genericHttpsPattern.test(url)) {
        return { valid: true };
    }

    // Block SSH URLs and other potentially dangerous inputs
    if (url.includes('git@') || url.startsWith('ssh://')) {
        return { valid: false, error: 'SSH Git URLs are not supported. Use HTTPS URLs.' };
    }

    return { valid: false, error: 'Invalid repository URL. Use an HTTPS Git URL (e.g., https://github.com/user/repo.git)' };
}
