'use client'

import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export default function RegistryExplorer() {
  const container = useRef(null);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power4.out", duration: 1 } });

    // 1. Header & Actions Entrance
    tl.from(".header-content", { 
      y: -30, 
      opacity: 0, 
      stagger: 0.1 
    })
    .from(".header-btn", { 
      scale: 0.8, 
      opacity: 0, 
      stagger: 0.1 
    }, "-=0.8")

    // 2. Filter Bar Reveal (Expanding width like a scanner)
    .from(".filter-bar", {
      width: "0%",
      opacity: 0,
      duration: 1.2,
      ease: "expo.inOut"
    }, "-=0.5")
    .from(".filter-item", {
      y: 10,
      opacity: 0,
      stagger: 0.05
    }, "-=0.4")

    // 3. Table Container Entrance
    .from(".table-container", {
      y: 40,
      opacity: 0,
      duration: 1.2
    }, "-=0.8")

    // 4. Staggered Table Rows (The "Retrieval" effect)
    .from(".log-row", {
      x: -20,
      opacity: 0,
      stagger: 0.08,
      duration: 0.8,
      clearProps: "all" // Important for hover transitions to work post-animation
    }, "-=0.6");

    // 5. Live Indicator Pulse (Continuous)
    gsap.to(".live-dot", {
      scale: 1.4,
      opacity: 0,
      repeat: -1,
      duration: 1.5,
      ease: "sine.inOut"
    });

  }, { scope: container });

  return (
    <main ref={container} className="flex-1 max-w-[1600px] w-full mx-auto px-8 py-12 flex flex-col gap-8">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-4">
        <div className="header-content">
          <h1 className="font-headline text-[3.5rem] tracking-tight leading-none text-primary mb-2">Registry</h1>
          <p className="font-body text-[1.125rem] text-on-surface-variant max-w-2xl font-medium">
            High-fidelity event stream and execution logs.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="header-btn bg-transparent border border-outline-variant/10 text-primary font-body text-sm font-medium px-4 py-2 rounded-DEFAULT hover:bg-surface-container-low transition-all active:scale-95 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export CSV
          </button>
          <button className="header-btn bg-primary text-on-primary font-body text-sm font-medium px-4 py-2 rounded-DEFAULT hover:bg-primary-container transition-all active:scale-95 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">play_arrow</span>
            Live Stream
          </button>
        </div>
      </header>

      {/* Filter Bar */}
      <section className="filter-bar bg-surface-container-low rounded-lg p-4 flex flex-wrap gap-4 items-end overflow-hidden origin-left">
        <div className="filter-item flex-1 min-w-[200px]">
          <label className="block font-label text-[0.6875rem] uppercase tracking-widest text-outline mb-2">Idempotency Key</label>
          <input className="w-full bg-transparent border-0 border-b border-outline-variant/20 focus:border-primary focus:ring-0 text-sm font-mono px-0 py-1 transition-colors" placeholder="req_8f72..." type="text" />
        </div>
        <div className="filter-item flex-1 min-w-[200px]">
          <label className="block font-label text-[0.6875rem] uppercase tracking-widest text-outline mb-2">Target URL</label>
          <input className="w-full bg-transparent border-0 border-b border-outline-variant/20 focus:border-primary focus:ring-0 text-sm font-mono px-0 py-1 transition-colors" placeholder="api.service.com/..." type="text" />
        </div>
        <div className="filter-item w-48">
          <label className="block font-label text-[0.6875rem] uppercase tracking-widest text-outline mb-2">Status</label>
          <div className="relative">
            <select className="w-full bg-transparent border-0 border-b border-outline-variant/20 focus:border-primary focus:ring-0 text-sm appearance-none transition-colors">
              <option value="">All Statuses</option>
              <option value="200">200 OK</option>
              <option value="500">5xx Server Error</option>
            </select>
            <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 text-outline text-sm">expand_more</span>
          </div>
        </div>
        <button className="filter-item bg-surface text-primary font-body text-sm font-medium px-4 py-2 rounded-DEFAULT hover:bg-surface-dim transition-colors border border-outline-variant/10">
          Clear Filters
        </button>
      </section>

      {/* Table Section */}
      <section className="table-container bg-surface-container-lowest flex-1 overflow-hidden flex flex-col border border-outline-variant/10 rounded-lg shadow-2xl shadow-black/5">
        <div className="overflow-x-auto no-scrollbar flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low sticky top-0 z-10">
              <tr>
                <th className="py-4 px-4 font-label text-[0.6875rem] uppercase tracking-widest text-outline font-semibold w-12"></th>
                <th className="py-4 px-4 font-label text-[0.6875rem] uppercase tracking-widest text-outline font-semibold w-32">Status</th>
                <th className="py-4 px-4 font-label text-[0.6875rem] uppercase tracking-widest text-outline font-semibold w-48">Timestamp</th>
                <th className="py-4 px-4 font-label text-[0.6875rem] uppercase tracking-widest text-outline font-semibold w-48">Event ID</th>
                <th className="py-4 px-4 font-label text-[0.6875rem] uppercase tracking-widest text-outline font-semibold">Operation</th>
                <th className="py-4 px-4 font-label text-[0.6875rem] uppercase tracking-widest text-outline font-semibold w-24 text-right">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {[
                { status: "200 OK", id: "evt_9k2m4p8v", op: "POST /v1/billing/subscriptions", time: "124ms", color: "tertiary" },
                { status: "201 CREATED", id: "evt_7j1n3o9q", op: "PUT /api/webhooks/status", time: "89ms", color: "tertiary" },
                { status: "502 BAD GATEWAY", id: "evt_5h8l2m7r", op: "GET /internal/auth/verify", time: "5002ms", color: "error", error: true },
                { status: "429 TOO MANY", id: "evt_3f6k1j5p", op: "POST /v2/analytics/ingest", time: "12ms", color: "outline" },
              ].map((log, i) => (
                <tr key={i} className={`log-row hover:bg-surface-bright transition-colors group cursor-pointer ${log.error ? 'bg-error-container/5' : ''}`}>
                  <td className="py-4 px-4">
                    <div className="relative w-1.5 h-1.5">
                      <div className={`absolute inset-0 rounded-full bg-${log.color} ${log.error ? '' : 'live-dot'}`}></div>
                      <div className={`w-full h-full rounded-full bg-${log.color} shadow-[0_0_8px_rgba(0,0,0,0.2)]`}></div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`font-mono text-[10px] text-${log.color} bg-${log.color}-container/10 px-2 py-1 rounded border border-${log.color}/20 font-bold`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-mono text-[11px] text-on-surface-variant">2023-10-27 14:23:45.102</td>
                  <td className="py-4 px-4 font-mono text-[11px] text-on-surface group-hover:text-primary transition-colors">{log.id}</td>
                  <td className="py-4 px-4">
                    <div className="font-mono text-[11px] text-on-surface truncate max-w-md">{log.op}</div>
                    {log.error && <div className="font-mono text-[9px] text-error mt-1 uppercase tracking-tight">Timeout: Connection failed</div>}
                  </td>
                  <td className={`py-4 px-4 font-mono text-[11px] text-right ${log.error ? 'text-error' : 'text-on-surface-variant'}`}>
                    {log.time}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-surface-container-low border-t border-outline-variant/10 p-3 flex justify-between items-center">
          <span className="font-body text-[10px] uppercase tracking-widest text-on-surface-variant font-medium">1-4 of 14,293 results</span>
          <div className="flex gap-4">
             <button className="text-outline hover:text-primary transition-colors"><span className="material-symbols-outlined text-[20px]">chevron_left</span></button>
             <button className="text-outline hover:text-primary transition-colors"><span className="material-symbols-outlined text-[20px]">chevron_right</span></button>
          </div>
        </div>
      </section>
    </main>
  );
}