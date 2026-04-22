"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getHealth,
  getMetrics,
  getJobStats,
  listJobs,
  getJob,
  type HealthCheck,
  type SystemMetrics,
  type JobStats,
  type JobsResponse,
  type Job,
} from "./api";

// ─── Generic polling hook ───────────────────────────

function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  enabled = true
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const refetch = useCallback(async () => {
    try {
      const result = await fetcher();
      if (mountedRef.current) {
        setData(result);
        setError(null);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err.message || "Fetch failed");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetcher]);

  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) return;

    refetch();
    const id = setInterval(refetch, intervalMs);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [refetch, intervalMs, enabled]);

  return { data, error, loading, refetch };
}

// ─── Health Hook ────────────────────────────────────

export function useHealth(intervalMs = 10000) {
  return usePolling<HealthCheck>(getHealth, intervalMs);
}

// ─── Metrics Hook ───────────────────────────────────

export function useMetrics(intervalMs = 5000) {
  return usePolling<SystemMetrics>(getMetrics, intervalMs);
}

// ─── Job Stats Hook ─────────────────────────────────

export function useJobStats(intervalMs = 5000) {
  return usePolling<JobStats>(getJobStats, intervalMs);
}

// ─── Jobs List Hook ─────────────────────────────────

export function useJobs(
  page = 1,
  status?: string,
  limit = 20,
  intervalMs = 8000
) {
  const offset = (page - 1) * limit;
  const fetcher = useCallback(
    () => listJobs(limit, offset, status),
    [limit, offset, status]
  );
  return usePolling<JobsResponse>(fetcher, intervalMs);
}

// ─── Single Job Hook ────────────────────────────────

export function useJob(id: string | null) {
  const fetcher = useCallback(() => {
    if (!id) return Promise.resolve(null);
    return getJob(id);
  }, [id]);

  return usePolling<{ job: Job; executions: any[] } | null>(
    fetcher,
    10000,
    !!id
  );
}

// ─── Format Helpers ─────────────────────────────────

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GiB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MiB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${bytes} B`;
}

export function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${Math.floor(seconds % 60)}s`;
}

export function statusColor(status: string): string {
  switch (status) {
    case "COMPLETED":
      return "bg-primary text-on-primary";
    case "RUNNING":
      return "border border-primary text-primary";
    case "SCHEDULED":
      return "bg-surface-container-high text-on-surface";
    case "QUEUED":
      return "border border-primary text-primary";
    case "FAILED":
    case "DEAD":
      return "bg-[#ba1a1a] text-white";
    case "CANCELLED":
      return "bg-surface-container-highest text-on-surface-variant";
    default:
      return "bg-surface-container-high text-on-surface";
  }
}

export function getTimestamp(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  } catch {
    return dateStr;
  }
}
