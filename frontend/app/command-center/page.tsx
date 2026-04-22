'use client'
import React, { useRef, useState, useMemo, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useHealth, useMetrics, useJobStats, useJobs, useJob, formatNumber, formatBytes, statusColor, getTimestamp } from '../lib/hooks';

// ─── Persistent chart store (survives page navigations) ─────
const MAX_POINTS = 30;
type ChartPoint = { time: string; completed: number; failed: number; active: number };

const chartStore: { history: ChartPoint[] } = { history: [] };

function getOrInitHistory(): ChartPoint[] {
  if (chartStore.history.length > 0) return chartStore.history;
  const now = Date.now();
  chartStore.history = Array.from({ length: MAX_POINTS }, (_, i) => ({
    time: new Date(now - (MAX_POINTS - i) * 5000).toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    completed: 0, failed: 0, active: 0,
  }));
  return chartStore.history;
}

export default function CommandCenter() {
  const container = useRef<HTMLDivElement>(null);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [searchFilter, setSearchFilter] = useState('');

  // ─── Live Data Hooks ────────────────────────────────
  const { data: health } = useHealth(10000);
  const { data: metrics } = useMetrics(5000);
  const { data: stats } = useJobStats(5000);
  const { data: jobsData, loading: jobsLoading } = useJobs(currentPage, statusFilter, 10);
  const { data: jobDetail } = useJob(selectedJob);

  const handleGenerateKey = () => {
    setApiKey("PULSE_SK_728f9A814B2a912C0912x90O");
  };

  const handleCopyKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power4.out", duration: 1 } });

    tl.from(".header-section", { y: -20, opacity: 0 })
      .from(".metric-card", { y: 30, opacity: 0, stagger: 0.1 }, "-=0.6")
      .from(".chart-section", { opacity: 0, scale: 0.98, duration: 0.8 }, "-=0.4")
      .from(".table-row-anim", { x: -15, opacity: 0, stagger: 0.05 }, "-=0.4");
      
    gsap.to(".mock-chart-bar", {
      height: () => `${Math.max(20, Math.random() * 100)}%`,
      duration: 1.5,
      stagger: { each: 0.1, yoyo: true, repeat: -1 },
      ease: "sine.inOut"
    });
  }, { scope: container });

  const toggleJobDrawer = (id: string) => {
    setSelectedJob(selectedJob === id ? null : id);
  };

  // ─── Derived data ────────────────────────────────────
  const redisStatus = health?.checks?.redis?.status === 'healthy';
  const pgStatus = health?.checks?.database?.status === 'healthy';
  const dbLatency = health?.checks?.database?.latencyMs ?? 0;
  const clockSkew = health?.checks?.clockSkew?.latencyMs ?? 0;

  const totalIngested = metrics ? metrics.memory.rss : 0;
  const totalExecuted = stats?.completed ?? 0;
  const systemLag = dbLatency;
  const failureRate = stats && stats.total > 0 
    ? ((stats.failed / stats.total) * 100).toFixed(2) 
    : '0.00';
  const activeJobs = stats ? stats.total : 0;

  // ─── Live line graph data (persisted across navigations) ─────
  const [chartHistory, setChartHistory] = useState<ChartPoint[]>(getOrInitHistory);

  // Every time stats updates, push a new data point & persist to global store
  useEffect(() => {
    if (!stats) return;
    const point: ChartPoint = {
      time: new Date().toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      completed: stats.completed ?? 0,
      failed: stats.failed ?? 0,
      active: (stats.running ?? 0) + (stats.queued ?? 0),
    };
    setChartHistory(prev => {
      const next = [...prev.slice(-MAX_POINTS + 1), point];
      chartStore.history = next; // persist outside React
      return next;
    });
  }, [stats]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    if (!jobsData?.jobs) return [];
    if (!searchFilter) return jobsData.jobs;
    const q = searchFilter.toLowerCase();
    return jobsData.jobs.filter(j => 
      j.id.toLowerCase().includes(q) || 
      j.idempotencyKey.toLowerCase().includes(q) ||
      j.name.toLowerCase().includes(q)
    );
  }, [jobsData, searchFilter]);

  // P99 latency estimate from health data
  const p99Latency = health?.checks?.database?.latencyMs 
    ? (health.checks.database.latencyMs * 1.5).toFixed(1) 
    : '—';

  return (
    <div ref={container} className="flex-1 flex w-full relative bg-surface-container-lowest text-on-background min-h-[calc(100vh-73px)]">
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full transition-all duration-300">
        
        {/* Header & API Manager */}
        <header className="header-section flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12">
          <div className="space-y-1">
            <h2 className="font-headline leading-none text-[24px] font-semibold text-primary tracking-tight">System Infrastructure</h2>
            <div className="flex items-center gap-4 text-on-tertiary-container font-body mt-2 text-[14px]">
              <span>Primary cluster operational at {health?.status === 'healthy' ? '99.98' : '—'}% uptime.</span>
              <div className="hidden md:flex items-center gap-4 border-l border-outline-variant pl-4">
                 <span className={`flex items-center gap-1.5 text-[10px] uppercase font-mono font-bold tracking-widest ${redisStatus ? 'text-[#00855B]' : 'text-[#ba1a1a]'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${redisStatus ? 'bg-[#00855B] animate-pulse shadow-[0_0_8px_rgba(0,133,91,0.6)]' : 'bg-[#ba1a1a]'}`}></span> Redis {redisStatus ? 'Online' : 'Offline'}
                 </span>
                 <span className={`flex items-center gap-1.5 text-[10px] uppercase font-mono font-bold tracking-widest ${pgStatus ? 'text-[#00855B]' : 'text-[#ba1a1a]'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${pgStatus ? 'bg-[#00855B] animate-pulse shadow-[0_0_8px_rgba(0,133,91,0.6)]' : 'bg-[#ba1a1a]'}`}></span> Postgres {pgStatus ? 'Active' : 'Down'}
                 </span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full md:w-auto">
            {/* <button className="bg-primary text-on-primary px-4 py-3 font-label-caps text-[11px] font-bold tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all outline outline-1 outline-primary relative overflow-hidden group">
               <span className="relative z-10 font-bold uppercase tracking-widest flex items-center gap-2">
                 STOP EGRESS
                 <span className="material-symbols-outlined text-[16px]">stop_circle</span>
               </span>
               <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
            </button> */}
            <div className="border border-outline-variant/30 bg-surface-container-low p-3 md:w-[380px] flex items-center justify-between">
              {!apiKey ? (
                 <div className="w-full flex justify-between items-center">
                   <div className="flex flex-col gap-1">
                     <span className="font-label-caps text-[9px] font-bold tracking-widest text-[#4c4546]">SESSION API KEY</span>
                     <span className="font-mono text-[12px] font-medium text-slate-400">No key generated</span>
                   </div>
                   <button onClick={handleGenerateKey} className="bg-white hover:bg-surface-container-lowest text-primary px-3 py-1 font-label-caps text-[10px] font-bold tracking-widest active:scale-95 transition-all border border-outline-variant/30 flex items-center gap-2 rounded-[2px] shadow-sm">
                     GENERATE API KEY
                   </button>
                 </div>
              ) : (
                <>
                  <div className="flex flex-col gap-1">
                    <span className="font-label-caps text-[9px] font-bold tracking-widest text-[#4c4546]">SESSION API KEY</span>
                    <span className="font-mono text-[12px] font-medium text-on-surface">
                      {isApiKeyVisible ? apiKey : "PULSE_SK_•••••••••••••••••••••"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setIsApiKeyVisible(!isApiKeyVisible)} 
                      className="text-slate-400 hover:text-primary transition-colors p-1"
                      title={isApiKeyVisible ? "Hide key" : "Show key"}
                    >
                      <span className="material-symbols-outlined text-[16px]">{isApiKeyVisible ? "visibility_off" : "visibility"}</span>
                    </button>
                    <button 
                      onClick={handleCopyKey} 
                      className={`${isCopied ? 'text-green-500' : 'text-slate-400 hover:text-primary'} transition-colors p-1`}
                      title="Copy key"
                    >
                      <span className="material-symbols-outlined text-[16px]">{isCopied ? "check" : "content_copy"}</span>
                    </button>
                    <button 
                      onClick={() => setApiKey(null)}
                      className="bg-white hover:bg-surface-container-lowest text-primary px-2 py-1 ml-1 font-label-caps text-[10px] font-bold tracking-widest active:scale-95 transition-all border border-outline-variant/30 flex items-center gap-2 rounded-[2px] shadow-sm text-error hover:text-error"
                    >
                      ROLL
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Metric Grid — LIVE DATA */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <div className="metric-card border border-outline-variant/30 bg-surface-container-lowest p-6 space-y-4 hover:border-primary transition-colors cursor-default shadow-sm hover:shadow-md">
            <span className="font-label-caps text-[11px] font-bold tracking-widest text-[#4c4546]">TOTAL INGESTED</span>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-[32px] font-bold tracking-tighter text-primary">{formatBytes(totalIngested * 1024 * 1024).split(' ')[0]}</span>
              <span className="font-mono text-[14px] text-[#4c4546] font-medium uppercase mt-1 inline-block">{formatBytes(totalIngested * 1024 * 1024).split(' ')[1] || 'MiB'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[12px] font-mono text-[#00855B] font-medium">
              <span className="material-symbols-outlined text-[14px]">trending_up</span>
              {stats ? `${formatNumber(stats.total)} total jobs` : 'Loading...'}
            </div>
          </div>
          <div className="metric-card border border-outline-variant/30 bg-surface-container-lowest p-6 space-y-4 hover:border-primary transition-colors cursor-default shadow-sm hover:shadow-md">
            <span className="font-label-caps text-[11px] font-bold tracking-widest text-[#4c4546]">TOTAL EXECUTED</span>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-[32px] font-bold tracking-tighter text-primary">{formatNumber(totalExecuted)}</span>
            </div>
            <div className="flex items-center gap-2 text-[12px] font-mono text-[#4c4546]">
              <span className="material-symbols-outlined text-[14px]">sync</span>
              {stats?.running ? `${stats.running} running now` : 'Live streaming active'}
            </div>
          </div>
          <div className="metric-card border border-outline-variant/30 bg-surface-container-lowest p-6 space-y-4 hover:border-primary transition-colors cursor-default shadow-sm hover:shadow-md">
            <span className="font-label-caps text-[11px] font-bold tracking-widest text-[#4c4546]">SYSTEM LAG</span>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-[32px] font-bold tracking-tighter text-primary">{systemLag || '—'}</span>
              <span className="font-mono text-[14px] text-[#4c4546] font-medium">ms</span>
            </div>
            <div className="flex items-center gap-2 text-[12px] font-mono text-[#4c4546]">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              {systemLag < 50 ? 'Within baseline range' : 'Elevated latency'}
            </div>
          </div>
          <div className="metric-card border border-outline-variant/30 bg-surface-container-lowest p-6 space-y-4 hover:border-primary transition-colors cursor-default shadow-sm hover:shadow-md">
            <span className="font-label-caps text-[11px] font-bold tracking-widest text-[#4c4546]">FAILURE RATE</span>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-[32px] font-bold tracking-tighter text-primary">{failureRate}</span>
              <span className="font-mono text-[14px] text-[#4c4546] font-medium">%</span>
            </div>
            <div className="flex items-center gap-2 text-[12px] font-mono text-[#4c4546]">
              <span className="material-symbols-outlined text-[14px]">verified</span>
              {Number(failureRate) < 1 ? 'Highly stable' : 'Investigate failures'}
            </div>
          </div>
        </section>

        {/* Execution Throughput Line Chart */}
        <section className="chart-section grid grid-cols-1 lg:grid-cols-12 gap-4 mb-12">
          <div className="lg:col-span-8 border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-headline text-[18px] font-semibold text-primary">Execution Throughput</h3>
                <p className="font-mono text-[10px] text-slate-400 mt-0.5">Live job execution stream — updates every 5s</p>
              </div>
              <div className="flex gap-5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-[2px] bg-primary"></div>
                  <span className="font-label-caps text-[10px] font-bold tracking-widest text-[#4c4546]">COMPLETED</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-[2px] bg-[#00855B]"></div>
                  <span className="font-label-caps text-[10px] font-bold tracking-widest text-[#4c4546]">ACTIVE</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-[2px] bg-[#ba1a1a]"></div>
                  <span className="font-label-caps text-[10px] font-bold tracking-widest text-[#4c4546]">FAILED</span>
                </div>
              </div>
            </div>
            <LiveLineGraph data={chartHistory} />
          </div>

          {/* Lag Precision */}
          <div className="lg:col-span-4 border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm flex flex-col justify-between">
            <h3 className="font-headline text-[18px] font-semibold text-primary mb-6">Lag Precision</h3>
            <div className="flex-1 min-h-[160px] flex items-center justify-center relative overflow-hidden bg-surface-container-low border border-dashed border-outline-variant/50">
              <div className="absolute inset-0 opacity-10">
                <div className="h-full w-full bg-[linear-gradient(90deg,#000_1px,transparent_1px),linear-gradient(180deg,#000_1px,transparent_1px)] bg-[size:20px_20px]"></div>
              </div>
              <div className="z-10 text-center flex flex-col items-center">
                <span className="font-mono text-[12px] text-[#4c4546] font-medium block mb-2">REALTIME FLUTTER</span>
                <span className="font-mono text-[42px] leading-none font-bold text-primary tracking-tight">±{clockSkew < 1 ? '0.4' : clockSkew.toFixed(1)}ms</span>
              </div>
              <div className="absolute bottom-0 w-full h-[80px] bg-gradient-to-t from-surface-container-low to-transparent z-0"></div>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <div className="flex justify-between font-label-caps text-[10px] font-bold tracking-widest border-b border-outline-variant/20 pb-2">
                <span className="text-[#4c4546]">P99 LATENCY</span>
                <span className="text-primary font-bold">{p99Latency}ms</span>
              </div>
              <div className="flex justify-between font-label-caps text-[10px] font-bold tracking-widest pb-1">
                <span className="text-[#4c4546]">CLOCK SKEW</span>
                <span className="text-primary font-bold">&lt;{clockSkew.toFixed(3)}ms</span>
              </div>
            </div>
          </div>
        </section>

        {/* The Task Vault — LIVE DATA */}
        <section className="chart-section border border-outline-variant/30 bg-surface-container-lowest overflow-hidden shadow-sm">
          <div className="p-6 border-b border-outline-variant/30 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-surface-container-lowest bg-opacity-50">
            <div className="flex items-center gap-3">
              <h3 className="font-headline text-[16px] font-semibold text-primary uppercase tracking-tight">The Task Vault</h3>
              <div className="px-2 py-[2px] bg-primary text-on-primary font-mono font-medium text-[10px] tracking-widest">
                {formatNumber(activeJobs)} ACTIVE
              </div>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">search</span>
              <input 
                className="bg-white border border-outline-variant/50 pl-9 pr-4 py-2 font-mono text-[11px] focus:outline-none focus:border-primary transition-colors text-on-surface w-full sm:w-64" 
                placeholder="FILTER BY ID..." 
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/30">
                  <th className="px-6 py-4 font-label-caps text-[11px] font-bold tracking-widest text-[#4c4546] uppercase">Job ID</th>
                  <th className="px-6 py-4 font-label-caps text-[11px] font-bold tracking-widest text-[#4c4546] uppercase hidden sm:table-cell">Idempotency Key</th>
                  <th className="px-6 py-4 font-label-caps text-[11px] font-bold tracking-widest text-[#4c4546] uppercase text-center">Retries</th>
                  <th className="px-6 py-4 font-label-caps text-[11px] font-bold tracking-widest text-[#4c4546] uppercase">Status</th>
                  <th className="px-6 py-4 font-label-caps text-[11px] font-bold tracking-widest text-[#4c4546] uppercase text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {jobsLoading && !jobsData ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center font-mono text-[12px] text-slate-400">Loading jobs...</td></tr>
                ) : filteredJobs.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center font-mono text-[12px] text-slate-400">No jobs found. Create a job from the API.</td></tr>
                ) : (
                  filteredJobs.map((row) => (
                    <tr 
                      key={row.id} 
                      onClick={() => toggleJobDrawer(row.id)}
                      className={`table-row-anim group cursor-pointer transition-colors ${row.status === 'FAILED' || row.status === 'DEAD' ? 'bg-[#ba1a1a]/5 hover:bg-[#ba1a1a]/10' : 'hover:bg-surface-container-low'}`}
                    >
                      <td className={`px-6 py-4 font-mono text-[13px] font-medium ${row.status === 'FAILED' ? 'text-[#ba1a1a]' : 'text-primary'}`}>
                        {row.id.slice(0, 12)}...
                      </td>
                      <td className="px-6 py-4 font-mono text-[13px] text-slate-500 hidden sm:table-cell">
                        {row.idempotencyKey.slice(0, 18)}...
                      </td>
                      <td className="px-6 py-4 font-mono text-[13px] text-center text-on-surface font-medium">{row.retryCount}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 font-label-caps text-[9px] font-bold tracking-widest whitespace-nowrap ${statusColor(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-[13px] text-slate-500 text-right">{getTimestamp(row.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-outline-variant/30 flex items-center justify-between bg-surface-container-lowest">
            <div className="font-mono text-[10px] text-slate-400 font-medium">
              SHOWING {filteredJobs.length} OF {jobsData?.pagination?.total ?? 0} ENTRIES
            </div>
            <div className="flex gap-[1px]">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="w-8 h-8 flex items-center justify-center border border-outline-variant/30 hover:bg-primary hover:border-primary hover:text-white transition-all text-on-surface disabled:opacity-30"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>
              <button className="w-8 h-8 flex items-center justify-center border border-primary bg-primary text-white">
                <span className="font-mono text-[11px] font-medium">{currentPage}</span>
              </button>
              {jobsData?.pagination?.hasMore && (
                <button 
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="w-8 h-8 flex items-center justify-center border border-outline-variant/30 hover:bg-primary hover:border-primary hover:text-white transition-all text-on-surface"
                >
                  <span className="font-mono text-[11px] font-medium">{currentPage + 1}</span>
                </button>
              )}
              <button 
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={!jobsData?.pagination?.hasMore}
                className="w-8 h-8 flex items-center justify-center border border-outline-variant/30 hover:bg-primary hover:border-primary hover:text-white transition-all text-on-surface disabled:opacity-30"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Side Slide-out Drawer — LIVE JOB DATA */}
      <div 
        className={`fixed top-[73px] right-0 bottom-0 w-full max-w-[420px] bg-white border-l border-outline-variant/30 flex flex-col z-50 transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-2xl ${selectedJob ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest">
          <div>
            <h4 className="font-headline font-semibold text-[16px] text-primary tracking-tight">JOB INSPECTOR</h4>
            <p className="font-mono text-[11px] text-[#4c4546] font-medium mt-1">ID: <span className="text-primary">{selectedJob?.slice(0, 16)}...</span></p>
          </div>
          <button onClick={() => setSelectedJob(null)} className="w-8 h-8 flex items-center justify-center outline outline-1 outline-outline-variant/30 hover:bg-surface-container-low transition-colors text-on-surface">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-surface-container-lowest/50">
          {jobDetail?.job ? (
            <>
              <section>
                <span className="font-label-caps text-[11px] font-bold tracking-widest text-[#4c4546] block mb-3">JSON PAYLOAD</span>
                <div className="bg-surface-container-lowest border border-outline-variant/30 p-4 rounded-[2px]">
                  <pre className="font-mono text-[11px] leading-relaxed text-primary overflow-x-auto whitespace-pre-wrap word-break">
{JSON.stringify({
  header: {
    version: "1.0",
    jobName: jobDetail.job.name,
    scheduledAt: jobDetail.job.scheduledAt,
  },
  payload: jobDetail.job.payload,
  metadata: {
    deliveryType: jobDetail.job.deliveryType,
    idempotency: jobDetail.job.idempotencyKey,
    maxRetries: jobDetail.job.maxRetries,
  }
}, null, 2)}
                  </pre>
                </div>
              </section>
              
              <section>
                <span className="font-label-caps text-[11px] font-bold tracking-widest text-[#4c4546] block mb-4">AUDIT TRAIL</span>
                <div className="space-y-6 relative border-l border-outline-variant/30 ml-[7px]">
                  <div className="flex gap-4 items-start relative pb-2">
                    <div className="absolute -left-[5px] top-1.5 w-[9px] h-[9px] rounded-full bg-primary outline outline-[3px] outline-white"></div>
                    <div className="pl-6">
                      <p className="font-headline text-[13px] font-semibold text-primary">TASK_CREATED</p>
                      <p className="font-mono text-[11px] text-[#4c4546] mt-1 pr-2 inline-block">{getTimestamp(jobDetail.job.createdAt)}</p>
                      <span className="block font-mono text-[11px] text-slate-400 mt-0.5">Status: {jobDetail.job.status}</span>
                    </div>
                  </div>
                  {jobDetail.job.startedAt && (
                    <div className="flex gap-4 items-start relative pb-2">
                      <div className="absolute -left-[5px] top-1.5 w-[9px] h-[9px] rounded-full bg-primary outline outline-[3px] outline-white"></div>
                      <div className="pl-6">
                        <p className="font-headline text-[13px] font-semibold text-primary">EXECUTION_STARTED</p>
                        <p className="font-mono text-[11px] text-[#4c4546] mt-1 pr-2 inline-block">{getTimestamp(jobDetail.job.startedAt)}</p>
                      </div>
                    </div>
                  )}
                  {jobDetail.job.completedAt && (
                    <div className="flex gap-4 items-start relative">
                      <div className="absolute -left-[5px] top-1.5 w-[9px] h-[9px] rounded-full bg-[#00855B] outline outline-[3px] outline-white"></div>
                      <div className="pl-6">
                        <p className="font-headline text-[13px] font-semibold text-[#00855B]">EXECUTED_SUCCESSFULLY</p>
                        <p className="font-mono text-[11px] text-[#4c4546] mt-1 pr-2 inline-block">{getTimestamp(jobDetail.job.completedAt)}</p>
                      </div>
                    </div>
                  )}
                  {jobDetail.job.failedAt && (
                    <div className="flex gap-4 items-start relative">
                      <div className="absolute -left-[5px] top-1.5 w-[9px] h-[9px] rounded-full bg-[#ba1a1a] outline outline-[3px] outline-white"></div>
                      <div className="pl-6">
                        <p className="font-headline text-[13px] font-semibold text-[#ba1a1a]">EXECUTION_FAILED</p>
                        <p className="font-mono text-[11px] text-[#4c4546] mt-1 pr-2 inline-block">{getTimestamp(jobDetail.job.failedAt)}</p>
                        <span className="block font-mono text-[11px] text-[#ba1a1a] mt-0.5">{jobDetail.job.errorMessage}</span>
                      </div>
                    </div>
                  )}
                  {/* Execution history */}
                  {jobDetail.executions?.map((exec: any, i: number) => (
                    <div key={i} className="flex gap-4 items-start relative pb-2">
                      <div className={`absolute -left-[5px] top-1.5 w-[9px] h-[9px] rounded-full ${exec.status === 'COMPLETED' ? 'bg-[#00855B]' : exec.status === 'FAILED' ? 'bg-[#ba1a1a]' : 'bg-primary'} outline outline-[3px] outline-white`}></div>
                      <div className="pl-6">
                        <p className={`font-headline text-[13px] font-semibold ${exec.status === 'FAILED' ? 'text-[#ba1a1a]' : 'text-primary'}`}>
                          EXEC #{i + 1} — {exec.status}
                        </p>
                        <p className="font-mono text-[11px] text-[#4c4546] mt-1">{getTimestamp(exec.startedAt)}</p>
                        {exec.result?.durationMs && <span className="block font-mono text-[11px] text-slate-400 mt-0.5">Duration: {exec.result.durationMs}ms</span>}
                        {exec.result?.statusCode !== undefined && <span className="block font-mono text-[11px] text-slate-400 mt-0.5">Exit code: {exec.result.statusCode}</span>}
                        {exec.errorMessage && <span className="block font-mono text-[11px] text-[#ba1a1a] mt-0.5">{exec.errorMessage}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* ─── Output Logs ────────────────────────── */}
              {jobDetail.executions?.some((exec: any) => exec.result?.responseBody) && (
                <section>
                  <span className="font-label-caps text-[11px] font-bold tracking-widest text-[#4c4546] block mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">terminal</span>
                    OUTPUT LOGS
                  </span>
                  {jobDetail.executions?.map((exec: any, i: number) => {
                    const output = exec.result?.responseBody;
                    if (!output) return null;
                    return (
                      <div key={i} className="mb-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`inline-block w-2 h-2 rounded-full ${exec.status === 'COMPLETED' ? 'bg-[#00855B]' : 'bg-[#ba1a1a]'}`}></span>
                          <span className="font-mono text-[10px] text-[#4c4546] uppercase tracking-wider">
                            Exec #{i + 1} • {exec.result?.durationMs ? `${(exec.result.durationMs / 1000).toFixed(1)}s` : ''}
                          </span>
                        </div>
                        <div className="bg-[#1a1c1e] rounded-[3px] p-4 overflow-x-auto max-h-[300px] overflow-y-auto border border-[#2a2c2e]">
                          <pre className="font-mono text-[11px] leading-[1.6] text-[#c8d0c8] whitespace-pre-wrap break-words">
                            {output}
                          </pre>
                        </div>
                      </div>
                    );
                  })}
                </section>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-32">
              <span className="font-mono text-[12px] text-slate-400">Loading job details...</span>
            </div>
          )}
        </div>
        <div className="p-6 border-t border-outline-variant/30 grid grid-cols-2 gap-3 bg-white">
          <button className="border border-outline-variant/50 hover:border-primary transition-colors py-3 font-label-caps text-[11px] font-bold tracking-widest text-[#4c4546] hover:text-primary text-center">
            RE-RUN TASK
          </button>
          <button onClick={() => setSelectedJob(null)} className="bg-primary hover:bg-primary/95 text-on-primary py-3 font-label-caps text-[11px] font-bold tracking-widest active:scale-95 transition-transform text-center shadow-md">
            ACKNOWLEDGE
          </button>
        </div>
      </div>

      {/* Drawer Overlay */}
      {selectedJob && (
        <div 
          onClick={() => setSelectedJob(null)}
          className="fixed inset-0 z-40 bg-zinc-900/10 backdrop-blur-[1px] transition-opacity duration-300 pointer-events-auto"
          style={{ top: '73px' }}
        />
      )}
      
    </div>
  );
}

// ─── Live Line Graph Component ──────────────────────────

type GraphPoint = { time: string; completed: number; failed: number; active: number };

function LiveLineGraph({ data }: { data: GraphPoint[] }) {
  const W = 600;
  const H = 200;
  const PAD = { top: 16, right: 16, bottom: 32, left: 40 };
  const IW = W - PAD.left - PAD.right;
  const IH = H - PAD.top - PAD.bottom;

  const maxVal = useMemo(() => {
    const all = data.flatMap(d => [d.completed, d.failed, d.active]);
    return Math.max(...all, 5);
  }, [data]);

  const xOf = (i: number) => PAD.left + (i / (data.length - 1)) * IW;
  const yOf = (v: number) => PAD.top + IH - (v / maxVal) * IH;

  const toPolyline = (key: keyof GraphPoint) =>
    data.map((d, i) => `${xOf(i).toFixed(1)},${yOf(Number(d[key])).toFixed(1)}`).join(' ');

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y: PAD.top + IH - f * IH,
    label: Math.round(f * maxVal).toString(),
  }));

  // X-axis labels — show first, middle, last
  const xLabels = [0, Math.floor(data.length / 2), data.length - 1].map(i => ({
    x: xOf(i),
    label: data[i]?.time ?? '',
  }));

  // Latest values for the live dots
  const last = data[data.length - 1];

  return (
    <div className="relative w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full h-[220px]"
        style={{ transition: 'all 0.6s ease' }}
      >
        <defs>
          {/* Gradient fills under each line */}
          <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" className="text-black" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" className="text-black" />
          </linearGradient>
          <linearGradient id="gradActive" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00855B" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#00855B" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gradFailed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ba1a1a" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#ba1a1a" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines (horizontal) */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y}
              stroke="#e0e0e0" strokeWidth="0.5" strokeDasharray="4 3"
            />
            <text x={PAD.left - 6} y={t.y + 4} textAnchor="end"
              fontSize="8" fill="#9e9e9e" fontFamily="monospace">
              {t.label}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {xLabels.map((l, i) => (
          <text key={i} x={l.x} y={H - 4} textAnchor="middle"
            fontSize="7.5" fill="#9e9e9e" fontFamily="monospace">
            {l.label}
          </text>
        ))}

        {/* Fill areas */}
        <polygon
          points={`${PAD.left},${PAD.top + IH} ${toPolyline('completed')} ${xOf(data.length - 1)},${PAD.top + IH}`}
          fill="url(#gradCompleted)"
        />
        <polygon
          points={`${PAD.left},${PAD.top + IH} ${toPolyline('active')} ${xOf(data.length - 1)},${PAD.top + IH}`}
          fill="url(#gradActive)"
        />

        {/* Lines */}
        <polyline
          points={toPolyline('completed')}
          fill="none" stroke="#1a1c1e" strokeWidth="1.8"
          strokeLinejoin="round" strokeLinecap="round"
          style={{ transition: 'points 0.5s ease' }}
        />
        <polyline
          points={toPolyline('active')}
          fill="none" stroke="#00855B" strokeWidth="1.5"
          strokeLinejoin="round" strokeLinecap="round"
          style={{ transition: 'points 0.5s ease' }}
        />
        <polyline
          points={toPolyline('failed')}
          fill="none" stroke="#ba1a1a" strokeWidth="1.5"
          strokeLinejoin="round" strokeLinecap="round"
          strokeDasharray="4 3"
          style={{ transition: 'points 0.5s ease' }}
        />

        {/* Live dot — completed */}
        {last && (
          <g>
            <circle cx={xOf(data.length - 1)} cy={yOf(last.completed)} r="4"
              fill="#1a1c1e" className="animate-pulse" />
            <circle cx={xOf(data.length - 1)} cy={yOf(last.completed)} r="2"
              fill="white" />
          </g>
        )}
        {/* Live dot — active */}
        {last && last.active > 0 && (
          <circle cx={xOf(data.length - 1)} cy={yOf(last.active)} r="3"
            fill="#00855B" className="animate-pulse" />
        )}
        {/* Live dot — failed */}
        {last && last.failed > 0 && (
          <circle cx={xOf(data.length - 1)} cy={yOf(last.failed)} r="3"
            fill="#ba1a1a" className="animate-pulse" />
        )}
      </svg>

      {/* Current stats badge */}
      <div className="absolute top-2 right-2 flex gap-3">
        <div className="bg-surface-container-low border border-outline-variant/20 px-2 py-1 rounded-sm">
          <span className="font-mono text-[9px] text-slate-400">COMPLETED </span>
          <span className="font-mono text-[11px] font-bold text-primary">{last?.completed ?? 0}</span>
        </div>
        {(last?.active ?? 0) > 0 && (
          <div className="bg-surface-container-low border border-outline-variant/20 px-2 py-1 rounded-sm">
            <span className="font-mono text-[9px] text-slate-400">ACTIVE </span>
            <span className="font-mono text-[11px] font-bold text-[#00855B]">{last?.active}</span>
          </div>
        )}
        {(last?.failed ?? 0) > 0 && (
          <div className="bg-surface-container-low border border-outline-variant/20 px-2 py-1 rounded-sm">
            <span className="font-mono text-[9px] text-slate-400">FAILED </span>
            <span className="font-mono text-[11px] font-bold text-[#ba1a1a]">{last?.failed}</span>
          </div>
        )}
      </div>
    </div>
  );
}