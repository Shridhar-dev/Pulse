// ─── Pulse Backend API Client ───────────────────────
// Proxied via Next.js rewrites: /api/* → http://localhost:3002/api/*

const API = "/api";

// ─── Generic Fetcher ────────────────────────────────

async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const defaultHeaders = await getAuthHeaders();
  
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error (${res.status})`);
  }

  return res.json();
}

// ─── Health ─────────────────────────────────────────

export interface HealthCheck {
  status: "healthy" | "degraded";
  timestamp: string;
  uptime: number;
  checks: {
    database: { status: string; latencyMs?: number; error?: string };
    redis: { status: string; latencyMs?: number; error?: string };
    clockSkew: { status: string; latencyMs?: number; error?: string };
  };
}

export async function getHealth(): Promise<HealthCheck> {
  return apiFetch("/health");
}

export interface SystemMetrics {
  timestamp: string;
  uptime: number;
  memory: { rss: number; heapUsed: number; heapTotal: number };
  redis: { memory: string; clients: number };
  queues: {
    execution: Record<string, number>;
    events: Record<string, number>;
    dlq: Record<string, number>;
  };
  workers: Array<{
    id: string;
    status: string;
    activeJobs: number;
    processedTotal: number;
    failedTotal: number;
  }>;
}

export async function getMetrics(): Promise<SystemMetrics> {
  return apiFetch("/health/metrics");
}

// ─── Auth (legacy backend JWT) ──────────────────────

export async function login(email: string, password: string) {
  return apiFetch("/auth/signin", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function signup(email: string, password: string) {
  return apiFetch("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// ─── Auth helpers (localStorage) ────────────────────

export function getStoredAuth(): {
  token: string;
  apiKey: string;
  email: string;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("pulse_auth");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeAuth(token: string, apiKey: string, email: string) {
  localStorage.setItem("pulse_auth", JSON.stringify({ token, apiKey, email }));
}

export function clearAuth() {
  localStorage.removeItem("pulse_auth");
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};

  if (typeof window !== "undefined") {
    // 1. Try to read Clerk session cookie first (most reliable)
    const cookieMatch = document.cookie.match(/(^| )__session=([^;]+)/);
    if (cookieMatch) {
      headers["Authorization"] = `Bearer ${cookieMatch[2]}`;
      return headers;
    }

    // 2. Try window.Clerk explicit getter
    if ((window as any).Clerk?.session) {
      try {
        const token = await (window as any).Clerk.session.getToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
          // Wipe legacy auth if we are using Clerk
          localStorage.removeItem('pulse_auth');
          return headers;
        }
      } catch (err) {
        console.error("[api.ts] Error fetching Clerk Token:", err);
      }
    }
    
    // Safety wipe if Clerk is present but NO session is available (don't fallback to garbage legacy)
    if ((window as any).Clerk) {
        localStorage.removeItem('pulse_auth');
    }
  }

  // 3. Fallback to Legacy Pulse Auth (only if Clerk is completely absent or we are server-side)
  if (!headers["Authorization"]) {
    const auth = getStoredAuth();
    if (auth) {
      if (auth.token) headers["Authorization"] = `Bearer ${auth.token}`;
      if (auth.apiKey) headers["X-API-Key"] = auth.apiKey;
    }
  }

  return headers;
}

// ─── Jobs ───────────────────────────────────────────

export interface Job {
  id: string;
  name: string;
  idempotencyKey: string;
  scheduledAt: string;
  toleranceMs: number;
  isRecurring: boolean;
  intervalMs: number | null;
  payload: Record<string, unknown>;
  deliveryType: "HTTP" | "WEBHOOK" | "CODE_EXEC" | "GITHUB_EXEC";
  deliveryConfig: Record<string, unknown>;
  status: string;
  retryCount: number;
  maxRetries: number;
  executionId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobsResponse {
  jobs: Job[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface JobStats {
  total: number;
  scheduled: number;
  queued: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  recurring: number;
}

export async function listJobs(
  limit = 50,
  offset = 0,
  status?: string
): Promise<JobsResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });
  if (status && status !== "ALL") params.set("status", status);
  return apiFetch(`/jobs?${params}`);
}

export async function getJob(
  id: string
): Promise<{ job: Job; executions: any[] }> {
  return apiFetch(`/jobs/${id}`);
}

export async function getJobStats(): Promise<JobStats> {
  return apiFetch("/jobs/stats");
}

export async function cancelJob(id: string) {
  return apiFetch(`/jobs/${id}`, {
    method: "DELETE",
  });
}

export async function createJob(data: any) {
  return apiFetch("/jobs", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function bulkCreateJobs(jobs: any[]) {
  return apiFetch("/jobs/bulk", {
    method: "POST",
    body: JSON.stringify({ jobs }),
  });
}

// ─── Cron Jobs ──────────────────────────────────────

export async function listCronJobs() {
  return apiFetch("/cron-jobs");
}

export async function executeFile(file: File, command: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('command', command);

  // Use raw fetch for FormData because apiFetch assumes JSON headers
  const token = typeof window !== 'undefined' ? localStorage.getItem('pulse_api_token') : null;
  const url = process.env.NEXT_PUBLIC_API_URL || '/api';
  
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${url}/execute`, {
    method: 'POST',
    headers,
    body: formData
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Execution failed');
  }

  return res.json();
}

// ─── GitHub Jobs ────────────────────────────────────

export async function listGithubJobs(limit = 50, offset = 0) {
  return apiFetch(`/github-jobs?limit=${limit}&offset=${offset}`);
}

export async function getGithubJob(id: string) {
  return apiFetch(`/github-jobs/${id}`);
}
