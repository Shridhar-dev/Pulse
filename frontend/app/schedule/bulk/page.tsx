'use client'

import React, { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { bulkCreateJobs } from '../../lib/api';

export default function BulkSchedule() {
  const container = useRef(null);
  const [rows, setRows] = useState([
    { id: 1, name: 'Job 1', url: 'https://httpbin.org/post', method: 'POST', date: '', recurring: false, interval: '' },
    { id: 2, name: 'Job 2', url: 'https://httpbin.org/post', method: 'POST', date: '', recurring: false, interval: '' },
    { id: 3, name: 'Job 3', url: 'https://httpbin.org/post', method: 'POST', date: '', recurring: false, interval: '' },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [globalScheduleTime, setGlobalScheduleTime] = useState('');

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power4.out", duration: 1 } });
    
    tl.from(".page-header", { y: -20, opacity: 0, duration: 0.8 })
      .from(".schedule-all-bar", { y: -10, opacity: 0, duration: 0.6 }, "-=0.5")
      .from(".bulk-container", { y: 40, opacity: 0 }, "-=0.6")
      .from(".job-row", {
        x: -20,
        opacity: 0,
        stagger: 0.05,
        clearProps: "all"
      }, "-=0.6")
      .from(".action-bar", { y: 20, opacity: 0 }, "-=0.5");
  }, { scope: container });

  const addRows = (count: number) => {
    const newRows = Array.from({ length: count }).map((_, i) => ({
      id: rows.length > 0 ? Math.max(...rows.map(r => r.id)) + i + 1 : i + 1,
      name: `Job ${rows.length + i + 1}`,
      url: 'https://httpbin.org/post',
      method: 'POST',
      date: '',
      recurring: false,
      interval: ''
    }));
    setRows([...rows, ...newRows]);
  };

  const removeRow = (index: number) => {
    const newRows = [...rows];
    newRows.splice(index, 1);
    setRows(newRows);
  };

  const updateRow = (index: number, field: string, value: any) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const applyGlobalTime = () => {
    if (!globalScheduleTime) return;
    setRows(rows.map(r => ({ ...r, date: globalScheduleTime })));
  };

  const handleScheduleAll = async () => {
    setError(null);
    setSuccess(false);

    if (rows.length === 0) {
      setError("No jobs configured to schedule.");
      return;
    }

    for (const row of rows) {
      if (!row.name || !row.url) {
        setError(`Row ${row.id} is missing a Name or Endpoint URL.`);
        return;
      }
    }

    // Use globalScheduleTime for all jobs, or now() if not set
    const scheduledAt = globalScheduleTime
      ? new Date(globalScheduleTime).toISOString()
      : new Date().toISOString();

    setIsSubmitting(true);
    try {
      const parsedJobs = rows.map(r => ({
        name: r.name,
        idempotencyKey: crypto.randomUUID(),
        scheduledAt,
        isRecurring: r.recurring,
        intervalMs: r.recurring && r.interval ? Number(r.interval) : undefined,
        deliveryType: 'HTTP',
        deliveryConfig: {
          url: r.url,
          method: r.method
        },
        payload: { bulkId: r.id },
        maxRetries: 3
      }));

      await bulkCreateJobs(parsedJobs);
      setSuccess(true);
      setRows([]);
    } catch (err: any) {
      setError(err.message || 'Failed to bulk schedule jobs');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkSchedule = async () => {
    setError(null);
    setSuccess(false);

    if (rows.length === 0) {
      setError("No jobs configured to schedule.");
      return;
    }

    // Validation
    for (const row of rows) {
      if (!row.name || !row.url) {
        setError(`Row ${row.id} is missing a Name or Endpoint URL.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const parsedJobs = rows.map(r => ({
        name: r.name,
        idempotencyKey: crypto.randomUUID(),
        scheduledAt: r.date ? new Date(r.date).toISOString() : new Date().toISOString(),
        isRecurring: r.recurring,
        intervalMs: r.recurring && r.interval ? Number(r.interval) : undefined,
        deliveryType: 'HTTP',
        deliveryConfig: {
          url: r.url,
          method: r.method
        },
        payload: { bulkId: r.id },
        maxRetries: 3
      }));

      await bulkCreateJobs(parsedJobs);
      setSuccess(true);
      setRows([]); // Clear on success
    } catch (err: any) {
      setError(err.message || 'Failed to bulk schedule jobs');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main ref={container} className="p-12 max-w-[1600px] mx-auto flex flex-col gap-8 w-full">
      <header className="page-header flex justify-between items-end">
        <div>
          <h1 className="font-headline text-[2.5rem] tracking-tight text-primary">Bulk Schedule Jobs</h1>
          <p className="font-body text-[1rem] text-on-surface-variant mt-2 font-medium">
            Configure and schedule multiple tasks simultaneously.
          </p>
        </div>
        <div className="flex bg-surface-container-low p-1 rounded-md border border-outline-variant/10">
          <button className="px-4 py-1.5 text-xs font-bold rounded bg-primary/10 text-primary transition-all">HTTP</button>
        </div>
      </header>

      {/* ── Schedule Everything Bar ──────────────────── */}
      <section className="schedule-all-bar bg-primary text-on-primary rounded-lg p-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shadow-lg shadow-primary/10">
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="material-symbols-outlined text-[28px]">schedule_send</span>
          <div>
            <h2 className="font-headline text-[1.125rem] font-bold leading-none">Schedule Everything</h2>
            <p className="text-[0.6875rem] opacity-80 mt-0.5">Set one time for all jobs, then fire</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-1 sm:justify-end">
          <input
            type="datetime-local"
            value={globalScheduleTime}
            onChange={(e) => setGlobalScheduleTime(e.target.value)}
            className="bg-white/15 border border-white/20 text-on-primary placeholder:text-white/50 rounded-md px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-white/40 transition-all w-full sm:w-auto"
          />
          <button
            onClick={applyGlobalTime}
            disabled={!globalScheduleTime}
            className="px-4 py-2.5 rounded-md bg-white/15 border border-white/20 text-sm font-bold hover:bg-white/25 transition-all disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap"
          >
            Apply to All
          </button>
          <button
            onClick={handleScheduleAll}
            disabled={isSubmitting || rows.length === 0}
            className="px-6 py-2.5 rounded-md bg-white text-primary text-sm font-bold hover:bg-white/90 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2 whitespace-nowrap shadow-md"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isSubmitting ? 'hourglass_empty' : 'rocket_launch'}
            </span>
            {isSubmitting ? 'Scheduling...' : `Schedule All ${rows.length} Jobs`}
          </button>
        </div>
      </section>

      {error && (
        <div className="bg-error-container text-error p-4 rounded-lg font-mono text-sm shadow-md animate-in fade-in slide-in-from-top-4">
          <span className="font-bold uppercase mr-2">Error:</span> {error}
        </div>
      )}

      {success && (
        <div className="bg-tertiary-container/20 border border-tertiary/30 text-tertiary p-4 rounded-lg font-mono text-sm shadow-md animate-in fade-in slide-in-from-top-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          Successfully scheduled {rows.length === 0 ? "all" : ""} jobs in bulk!
        </div>
      )}

      <section className="bulk-container bg-surface-container-lowest border border-outline-variant/10 rounded-lg overflow-hidden flex flex-col shadow-xl shadow-black/5">
        <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low/30">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-on-surface-variant">list_alt</span>
            <div>
              <h2 className="font-headline text-[1.125rem] font-medium text-on-surface leading-none">HTTP Jobs</h2>
              <span className="font-mono text-[0.6875rem] text-outline-variant">{rows.length} jobs configured</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="py-3 px-4 font-label text-[0.6875rem] uppercase tracking-widest text-outline w-12 text-center">#</th>
                <th className="py-3 px-4 font-label text-[0.6875rem] uppercase tracking-widest text-outline w-48">Name</th>
                <th className="py-3 px-4 font-label text-[0.6875rem] uppercase tracking-widest text-outline min-w-[200px]">Endpoint URL</th>
                <th className="py-3 px-4 font-label text-[0.6875rem] uppercase tracking-widest text-outline w-32">Method</th>
                <th className="py-3 px-4 font-label text-[0.6875rem] uppercase tracking-widest text-outline w-56">Scheduled At</th>
                <th className="py-3 px-4 font-label text-[0.6875rem] uppercase tracking-widest text-outline w-24 text-center">Recurring</th>
                <th className="py-3 px-4 font-label text-[0.6875rem] uppercase tracking-widest text-outline w-32">Interval (ms)</th>
                <th className="py-3 px-4 font-label text-[0.6875rem] uppercase tracking-widest text-outline w-24 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {rows.map((row, i) => (
                <tr key={row.id} className="job-row hover:bg-surface-container-low/50 transition-colors group">
                  <td className="py-2 px-4 text-center font-mono text-[10px] text-on-surface-variant">{row.id}</td>
                  <td className="py-2 px-4">
                    <input 
                      value={row.name} 
                      onChange={(e) => updateRow(i, 'name', e.target.value)} 
                      className="w-full bg-transparent border border-transparent focus:bg-surface-container-lowest focus:border-outline-variant/20 focus:ring-0 text-sm font-body px-2 py-1 transition-colors rounded-sm" 
                    />
                  </td>
                  <td className="py-2 px-4">
                    <input 
                      value={row.url} 
                      onChange={(e) => updateRow(i, 'url', e.target.value)} 
                      className="w-full bg-transparent border border-transparent focus:bg-surface-container-lowest focus:border-outline-variant/20 focus:ring-0 text-sm font-mono px-2 py-1 transition-colors rounded-sm" 
                    />
                  </td>
                  <td className="py-2 px-4">
                    <select 
                      value={row.method} 
                      onChange={(e) => updateRow(i, 'method', e.target.value)} 
                      className="w-full bg-transparent border border-transparent focus:bg-surface-container-lowest focus:border-outline-variant/20 focus:ring-0 text-sm font-mono px-2 py-1 transition-colors rounded-sm appearance-none"
                    >
                      <option>POST</option>
                      <option>GET</option>
                      <option>PUT</option>
                      <option>DELETE</option>
                    </select>
                  </td>
                  <td className="py-2 px-4">
                    <input 
                      value={row.date} 
                      onChange={(e) => updateRow(i, 'date', e.target.value)} 
                      type="datetime-local" 
                      className="w-full bg-transparent border border-transparent focus:bg-surface-container-lowest focus:border-outline-variant/20 focus:ring-0 text-[11px] font-mono px-2 py-1 transition-colors rounded-sm text-on-surface" 
                    />
                  </td>
                  <td className="py-2 px-4 text-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={row.recurring} 
                        onChange={(e) => updateRow(i, 'recurring', e.target.checked)} 
                        className="sr-only peer" 
                      />
                      <div className="w-7 h-4 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </td>
                  <td className="py-2 px-4">
                    <input 
                      value={row.interval} 
                      onChange={(e) => updateRow(i, 'interval', e.target.value)} 
                      className="w-full bg-transparent border border-transparent focus:bg-surface-container-lowest focus:border-outline-variant/20 focus:ring-0 text-[11px] font-mono px-2 py-1 transition-colors rounded-sm text-center placeholder:text-outline-variant/30" 
                      placeholder="—" 
                      type="number"
                      disabled={!row.recurring}
                    />
                  </td>
                  <td className="py-2 px-4 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => {
                        setRows([...rows, { ...row, id: Math.max(...rows.map(r => r.id)) + 1 }]);
                      }} className="text-on-surface-variant hover:text-primary transition-colors"><span className="material-symbols-outlined text-[16px]">content_copy</span></button>
                      <button onClick={() => removeRow(i)} className="text-on-surface-variant hover:text-error transition-colors"><span className="material-symbols-outlined text-[16px]">close</span></button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-on-surface-variant text-sm font-mono opacity-60">
                    No jobs added. Click &quot;Add Row&quot; below to begin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-outline-variant/10 bg-surface-container-low/30 flex gap-4">
          <button onClick={() => addRows(1)} className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 border border-outline-variant/20 px-3 py-1.5 rounded bg-surface-container-lowest">
            + Add Row
          </button>
          <button onClick={() => addRows(5)} className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 border border-outline-variant/20 px-3 py-1.5 rounded bg-surface-container-lowest">
            + Add 5
          </button>
          <button onClick={() => addRows(10)} className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 border border-outline-variant/20 px-3 py-1.5 rounded bg-surface-container-lowest">
            + Add 10
          </button>
        </div>
      </section>

      <section className="action-bar">
        <button 
          onClick={handleBulkSchedule}
          disabled={isSubmitting || rows.length === 0}
          className="w-full py-4 rounded-lg bg-primary text-on-primary font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
        >
          <span className="material-symbols-outlined text-[20px]">
            {isSubmitting ? 'hourglass_empty' : 'bolt'}
          </span>
          {isSubmitting ? 'Processing Bulk Registration...' : `Schedule ${rows.length} HTTP Jobs`}
        </button>
      </section>
    </main>
  );
}
