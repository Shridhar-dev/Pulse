import { Hono } from 'hono';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import crypto from 'crypto';
import { createChildLogger } from '../lib/logger.js';

const log = createChildLogger('execute-routes');
const execAsync = promisify(exec);

export const executeRoutes = new Hono();

// ─── POST /api/execute ─────────────────────────────────

executeRoutes.post('/', async (c) => {
    try {
        const body = await c.req.parseBody();
        const codeFile = body['file'] as File;
        const commandTemplate = body['command'] as string;

        if (!codeFile || !commandTemplate) {
            return c.json({ error: 'Data missing. "file" and "command" fields are required.' }, 400);
        }

        const buffer = await codeFile.arrayBuffer();
        const tmpPath = join(tmpdir(), `${crypto.randomUUID()}_${codeFile.name}`);

        await writeFile(tmpPath, Buffer.from(buffer));

        // Replace the magic string {file} with the actual full path to the uploaded file
        // For example: "node {file}" becomes "node /tmp/123_script.js"
        const finalCommand = commandTemplate.replace('{file}', tmpPath);

        log.info({ finalCommand }, 'Executing command');

        const startTime = process.hrtime.bigint();

        let output = '';
        let success = true;

        try {
            // Limit execution to 10 seconds to avoid blocking the server
            const { stdout, stderr } = await execAsync(finalCommand, { timeout: 10000 });
            output = stdout + (stderr ? '\n' + stderr : '');
        } catch (e: any) {
            success = false;
            output = e.stdout || e.stderr || e.message;
        } finally {
            // Cleanup the temp file
            try {
                await unlink(tmpPath);
            } catch (err) {
                log.warn({ err, tmpPath }, 'Failed to delete temp file');
            }
        }

        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1e6; // Convert nanoseconds to milliseconds

        log.info({ success, durationMs }, 'Execution completed');

        return c.json({
            success,
            output: output.trim(),
            durationMs,
            executedCommand: finalCommand,
        });

    } catch (err: any) {
        log.error({ err }, 'Execution route error');
        return c.json({ error: err.message }, 500);
    }
});
