'use client'

import React, { useRef, useState, useMemo } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useJobs, statusColor, getTimestamp, formatNumber } from '../lib/hooks';

function mapStatusToHttp(status: string): { display: string; color: string } {
  switch (status) {
    case 'COMPLETED': return { display: '200 OK', color: 'text-[#00855B]' };
    case 'RUNNING': return { display: '102 PROCESSING', color: 'text-primary' };
    case 'SCHEDULED': return { display: '202 ACCEPTED', color: 'text-on-surface-variant' };
    case 'QUEUED': return { display: '202 QUEUED', color: 'text-primary' };
    case 'FAILED': return { display: '502 BAD GATEWAY', color: 'text-[#ba1a1a]' };
    case 'DEAD': return { display: '500 DEAD LETTER', color: 'text-[#ba1a1a]' };
    case 'CANCELLED': return { display: '499 CANCELLED', color: 'text-outline' };
    default: return { display: status, color: 'text-on-surface-variant' };
  }
}

export default function RegistryExplorer() {
  const container = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [idFilter, setIdFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');

  const { data: jobsData, loading } = useJobs(currentPage, statusFilter || undefined, 20, 8000);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power4.out", duration: 1 } });

    tl.from(".header-content", { y: -30, opacity: 0, stagger: 0.1 })
    .from(".header-btn", { scale: 0.8, opacity: 0, stagger: 0.1 }, "-=0.8")
    .from(".filter-bar", { width: "0%", opacity: 0, duration: 1.2, ease: "expo.inOut" }, "-=0.5")
    .from(".filter-item", { y: 10, opacity: 0, stagger: 0.05 }, "-=0.4")
    .from(".table-container", { y: 40, opacity: 0, duration: 1.2 }, "-=0.8")
    .from(".log-row", { x: -20, opacity: 0, stagger: 0.08, duration: 0.8, clearProps: "all" }, "-=0.6");

    gsap.to(".live-dot", {
      scale: 1.4, opacity: 0, repeat: -1, duration: 1.5, ease: "sine.inOut"
    });

  }, { scope: container });

  // Locally filter by idempotency key and name
  const filteredJobs = useMemo(() => {
    if (!jobsData?.jobs) return [];
    return jobsData.jobs.filter(j => {
      if (idFilter && !j.idempotencyKey.toLowerCase().includes(idFilter.toLowerCase())) return false;
      if (nameFilter && !j.name.toLowerCase().includes(nameFilter.toLowerCase())) return false;
      return true;
    });
  }, [jobsData, idFilter, nameFilter]);

  const clearFilters = () => {
    setStatusFilter('');
    setIdFilter('');
    setNameFilter('');
    setCurrentPage(1);
  };

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
          <input 
            className="w-full bg-transparent border-0 border-b border-outline-variant/20 focus:border-primary focus:ring-0 text-sm font-mono px-0 py-1 transition-colors" 
            placeholder="req_8f72..." 
            type="text"
            value={idFilter}
            onChange={(e) => setIdFilter(e.target.value)}
          />
        </div>
        <div className="filter-item flex-1 min-w-[200px]">
          <label className="block font-label text-[0.6875rem] uppercase tracking-widest text-outline mb-2">Job Name</label>
          <input 
            className="w-full bg-transparent border-0 border-b border-outline-variant/20 focus:border-primary focus:ring-0 text-sm font-mono px-0 py-1 transition-colors" 
            placeholder="cache-purge..." 
            type="text"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
          />
        </div>
        <div className="filter-item w-48">
          <label className="block font-label text-[0.6875rem] uppercase tracking-widest text-outline mb-2">Status</label>
          <div className="relative">
            <select 
              className="w-full bg-transparent border-0 border-b border-outline-variant/20 focus:border-primary focus:ring-0 text-sm appearance-none transition-colors"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
              <option value="RUNNING">Running</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="QUEUED">Queued</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 text-outline text-sm">expand_more</span>
          </div>
        </div>
        <button 
          onClick={clearFilters}
          className="filter-item bg-surface text-primary font-body text-sm font-medium px-4 py-2 rounded-DEFAULT hover:bg-surface-dim transition-colors border border-outline-variant/10"
        >
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
                <th className="py-4 px-4 font-label text-[0.6875rem] uppercase tracking-widest text-outline font-semibold w-24 text-right">Retries</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {loading && !jobsData ? (
                <tr><td colSpan={6} className="py-12 text-center font-mono text-sm text-slate-400">Loading events...</td></tr>
              ) : filteredJobs.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center font-mono text-sm text-slate-400">No events found</td></tr>
              ) : (
                filteredJobs.map((job, i) => {
                  const httpMap = mapStatusToHttp(job.status);
                  const isError = job.status === 'FAILED' || job.status === 'DEAD';
                  return (
                    <tr key={job.id} className={`log-row hover:bg-surface-bright transition-colors group cursor-pointer ${isError ? 'bg-error-container/5' : ''}`}>
                      <td className="py-4 px-4">
                        <div className="relative w-1.5 h-1.5">
                          <div className={`absolute inset-0 rounded-full ${isError ? 'bg-error' : 'bg-tertiary'} ${!isError ? 'live-dot' : ''}`}></div>
                          <div className={`w-full h-full rounded-full ${isError ? 'bg-error' : 'bg-tertiary'} shadow-[0_0_8px_rgba(0,0,0,0.2)]`}></div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`font-mono text-[10px] ${httpMap.color} bg-surface-container-low px-2 py-1 rounded border border-outline-variant/20 font-bold`}>
                          {httpMap.display}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono text-[11px] text-on-surface-variant">
                        {new Date(job.createdAt).toISOString().replace('T', ' ').slice(0, 23)}
                      </td>
                      <td className="py-4 px-4 font-mono text-[11px] text-on-surface group-hover:text-primary transition-colors">
                        {job.id.slice(0, 16)}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-mono text-[11px] text-on-surface truncate max-w-md">
                          {job.deliveryType} {job.name}
                        </div>
                        {isError && job.errorMessage && (
                          <div className="font-mono text-[9px] text-error mt-1 uppercase tracking-tight">
                            {job.errorMessage.slice(0, 80)}
                          </div>
                        )}
                      </td>
                      <td className={`py-4 px-4 font-mono text-[11px] text-right ${isError ? 'text-error' : 'text-on-surface-variant'}`}>
                        {job.retryCount}/{job.maxRetries}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-surface-container-low border-t border-outline-variant/10 p-3 flex justify-between items-center">
          <span className="font-body text-[10px] uppercase tracking-widest text-on-surface-variant font-medium">
            {filteredJobs.length} of {formatNumber(jobsData?.pagination?.total ?? 0)} results
          </span>
          <div className="flex gap-4">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="text-outline hover:text-primary transition-colors disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <span className="font-mono text-[11px] text-on-surface-variant self-center">Page {currentPage}</span>
            <button 
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={!jobsData?.pagination?.hasMore}
              className="text-outline hover:text-primary transition-colors disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}