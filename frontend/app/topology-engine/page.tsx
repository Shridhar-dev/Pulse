'use client'

import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useMetrics, useJobStats, useHealth, formatNumber, formatUptime } from '../lib/hooks';

export default function TopologyEngine() {
  const containerRef = useRef(null);

  const { data: metrics } = useMetrics(5000);
  const { data: stats } = useJobStats(5000);
  const { data: health } = useHealth(10000);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.8 } });

    tl.from(".nav-item", { x: -20, opacity: 0, stagger: 0.1 })
      .from(".main-header", { y: 20, opacity: 0 }, "-=0.5")
    .from(".flow-path", {
      strokeDasharray: 1000,
      strokeDashoffset: 1000,
      duration: 2,
      ease: "power2.inOut"
    }, "-=0.5")
    .from(".layer-header", { opacity: 0, x: -10, stagger: 0.3 }, "-=1.5")
    .from(".topology-card", { 
      scale: 0.95, 
      opacity: 0, 
      stagger: 0.1,
      clearProps: "all" 
    }, "-=1")
    .from(".jitter-bar", {
      scaleY: 0,
      stagger: 0.05,
      transformOrigin: "bottom",
      duration: 1,
      ease: "elastic.out(1, 0.5)"
    }, "-=0.5");

    gsap.to(".flow-path", {
      strokeDashoffset: -20,
      repeat: -1,
      duration: 1,
      ease: "none"
    });

  }, { scope: containerRef });

  // Derive topology data from metrics
  const execQueue = metrics?.queues?.execution;
  const eventsQueue = metrics?.queues?.events;
  const dlqQueue = metrics?.queues?.dlq;
  const workers = metrics?.workers || [];

  const ingestNodes = [
    { 
      name: "Edge Ingest A", 
      id: "exec-q", 
      t: execQueue ? formatNumber((execQueue.waiting || 0) + (execQueue.active || 0)) : '—',
      l: health?.checks?.database?.latencyMs ? `${health.checks.database.latencyMs}ms` : '—'
    },
    { 
      name: "Edge Ingest B", 
      id: "evt-q", 
      t: eventsQueue ? formatNumber((eventsQueue.waiting || 0) + (eventsQueue.active || 0)) : '—',
      l: health?.checks?.redis?.latencyMs ? `${health.checks.redis.latencyMs}ms` : '—'
    }
  ];

  // Partition health from queue states
  const partitions = [
    { id: 0, healthy: (execQueue?.waiting ?? 0) > 0 || (execQueue?.active ?? 0) > 0 },
    { id: 1, healthy: (execQueue?.completed ?? 0) > 0 },
    { id: 2, healthy: (eventsQueue?.completed ?? 0) > 0 },
    { id: 3, healthy: (dlqQueue?.waiting ?? 0) === 0 && (dlqQueue?.failed ?? 0) === 0 },
  ];

  // Jitter bars from queue distribution
  const jitterBars = [
    execQueue?.waiting ?? 0,
    execQueue?.active ?? 0,
    execQueue?.completed ?? 0,
    execQueue?.failed ?? 0,
    execQueue?.delayed ?? 0,
    eventsQueue?.waiting ?? 0,
    eventsQueue?.active ?? 0,
    dlqQueue?.waiting ?? 0,
  ];
  const maxJitter = Math.max(...jitterBars, 1);
  const normalizedBars = jitterBars.map(v => Math.max(5, Math.round((v / maxJitter) * 100)));

  const totalDistributed = stats ? stats.total : 0;

  return (
    <div ref={containerRef} className="flex flex-1 overflow-hidden h-[calc(100vh-65px)] bg-surface-container-lowest">

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-12">
        <header className="main-header mb-16">
          <h1 className="text-[3.5rem] font-headline font-semibold tracking-[-0.02em] leading-tight text-primary mb-4">Topology Map</h1>
          <p className="text-[1.125rem] font-body text-primary-fixed max-w-2xl">
            Distributed flow analysis and real-time locking visualization.
            {metrics && <span className="ml-2 font-mono text-[0.75rem] text-on-surface-variant">Uptime: {formatUptime(metrics.uptime)}</span>}
          </p>
        </header>

        <div className="grid grid-cols-12 gap-12">
          <div className="col-span-8 space-y-12 relative min-h-[600px]">
            {/* Background Flow Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <path className="flow-path stroke-primary/20 stroke-[1px] fill-none" d="M 150 100 L 150 200 L 400 200 L 400 300" strokeDasharray="10 5" />
              <path className="flow-path stroke-primary/20 stroke-[1px] fill-none" d="M 650 100 L 650 200 L 400 200" strokeDasharray="10 5" />
            </svg>

            {/* Ingestion Layer */}
            <section className="relative z-10">
              <div className="layer-header text-[0.6875rem] font-label uppercase tracking-wider text-primary-fixed mb-6 border-b border-surface-container-high pb-2">Ingestion Layer</div>
              <div className="grid grid-cols-2 gap-6">
                {ingestNodes.map((node, i) => (
                  <div key={i} className="topology-card bg-surface-container-lowest border border-outline-variant/10 p-6 rounded hover:border-primary/40 transition-colors cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-headline text-[1.125rem] font-medium group-hover:text-primary transition-colors">{node.name}</h3>
                      <span className="font-mono text-[0.6875rem] text-primary-fixed">{node.id}</span>
                    </div>
                    <div className="space-y-2 font-mono text-xs">
                      <div className="flex justify-between"><span>Throughput</span><span>{node.t} req/s</span></div>
                      <div className="flex justify-between"><span>Latency</span><span>{node.l}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Partitions Layer */}
            <section className="relative z-10 pt-12">
              <div className="layer-header text-[0.6875rem] font-label uppercase tracking-wider text-primary-fixed mb-6 border-b border-surface-container-high pb-2">BullMQ Partitions</div>
              <div className="topology-card bg-surface-container-lowest border border-outline-variant/10 p-8 rounded flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="font-headline text-[1.5rem] font-medium">pulse-jobs-execution</span>
                  <span className="font-mono text-[0.6875rem] text-primary-fixed">
                    workers: {workers.length} | memory: {metrics?.redis.memory ?? '—'}
                  </span>
                </div>
                <div className="flex gap-2">
                  {partitions.map(p => (
                    <div key={p.id} className={`w-12 h-16 bg-surface-container-low flex items-center justify-center border-b-2 ${!p.healthy ? 'border-error opacity-40' : 'border-tertiary-container'}`}>
                      <span className="font-mono text-[0.6875rem]">P{p.id}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Consumers — LIVE WORKER DATA */}
            <section className="relative z-10 pt-12">
              <div className="layer-header text-[0.6875rem] font-label uppercase tracking-wider text-primary-fixed mb-6 border-b border-surface-container-high pb-2">
                Active Consumers ({workers.length > 0 ? workers.length : 3})
              </div>
              <div className="grid grid-cols-3 gap-6">
                {(workers.length > 0 ? workers.slice(0, 6) : ['alpha', 'beta', 'gamma'].map((w, i) => ({ id: `worker-${w}`, status: i === 2 ? 'error' : 'active', activeJobs: i === 1 ? 2 : 8, processedTotal: 100, failedTotal: i === 2 ? 5 : 0 }))).map((w: any, i: number) => {
                  const isError = w.status === 'error' || w.failedTotal > 0;
                  const load = w.activeJobs ? Math.min(100, (w.activeJobs / 10) * 100) : (i === 1 ? 30 : 80);
                  return (
                    <div key={i} className="topology-card bg-surface-container-lowest border border-outline-variant/10 p-5 rounded">
                      <div className="flex justify-between items-center mb-6">
                        <div className="font-mono text-[0.875rem] bg-surface-container-low px-2 py-1 rounded-sm">{w.id}</div>
                        <span className={`material-symbols-outlined text-[16px] ${isError ? 'text-error' : 'text-tertiary-container'}`}>
                          {isError ? 'warning' : 'lock'}
                        </span>
                      </div>
                      <div className="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
                        <div className={`h-full ${isError ? 'bg-error' : 'bg-tertiary-container'}`} style={{ width: `${load}%` }}></div>
                      </div>
                      <div className="mt-2 flex justify-between font-mono text-[10px] text-on-surface-variant">
                        <span>Done: {w.processedTotal ?? '—'}</span>
                        <span>Failed: {w.failedTotal ?? 0}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Side Panel: Jitter Monitor */}
          <div className="col-span-4 space-y-8">
            <div className="bg-surface-container-low p-8 rounded h-full flex flex-col">
              <div className="mb-8">
                <h2 className="font-headline text-[1.5rem] font-medium mb-2">Jitter Monitor</h2>
                <p className="text-[0.875rem] text-primary-fixed">Queue Distribution Analysis</p>
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <div className="relative h-48 w-full border-b border-surface-container-highest mb-4 flex items-end justify-between px-2">
                  {normalizedBars.map((h, i) => (
                    <div 
                      key={i} 
                      className={`jitter-bar w-[10%] rounded-t-sm ${h > 80 ? 'bg-tertiary-container' : 'bg-primary'}`} 
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4 font-mono">
                  <div>
                    <div className="text-[0.6875rem] text-primary-fixed uppercase mb-1">Tasks Dist.</div>
                    <div className="text-[1.125rem]">{formatNumber(totalDistributed)}</div>
                  </div>
                  <div>
                    <div className="text-[0.6875rem] text-primary-fixed uppercase mb-1">Redis Mem</div>
                    <div className="text-[1.125rem]">{metrics?.redis?.memory ?? '—'}</div>
                  </div>
                </div>
              </div>
              <button className="mt-8 w-full border border-outline-variant/40 text-primary py-3 rounded-sm text-[0.875rem] font-medium hover:bg-white/5 transition-colors">
                Adjust Jitter Seed
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}