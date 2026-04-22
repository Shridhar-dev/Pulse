'use client'

import React, { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { createJob } from '../lib/api';

export default function HttpJobSchedule() {
  const container = useRef(null);
  const [deliveryType, setDeliveryType] = useState<'HTTP' | 'WEBHOOK'>('HTTP');
  const [scheduleType, setScheduleType] = useState<'ONETIME' | 'RECURRING'>('ONETIME');
  
  // Form State
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('POST');
  const [maxRetries, setMaxRetries] = useState(3);
  const [payload, setPayload] = useState('{\n  "message": "Hello from Pulse!"\n}');
  const [executeAt, setExecuteAt] = useState('');
  const [intervalMs, setIntervalMs] = useState(60000);
  
  // Status State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power4.out", duration: 1 } });
    
    tl.from(".page-title", { y: -20, opacity: 0, duration: 0.8 })
      .from(".bento-card", {
        y: 30,
        opacity: 0,
        stagger: 0.15,
        clearProps: "all"
      }, "-=0.6")
      .from(".form-element", {
        y: 10,
        opacity: 0,
        stagger: 0.05,
        clearProps: "all"
      }, "-=0.8");
  }, { scope: container });

  const handleSchedule = async () => {
    setError(null);
    setSuccess(false);

    if (!name || !url) {
      setError('Name and Endpoint URL are required');
      return;
    }

    setIsSubmitting(true);
    try {
      let parsedPayload = {};
      try {
        parsedPayload = payload.trim() ? JSON.parse(payload) : {};
      } catch {
        throw new Error('Invalid JSON syntax in payload');
      }

      const jobData = {
        name,
        idempotencyKey: crypto.randomUUID(),
        scheduledAt: scheduleType === 'ONETIME' && executeAt 
          ? new Date(executeAt).toISOString() 
          : new Date().toISOString(),
        isRecurring: scheduleType === 'RECURRING',
        intervalMs: scheduleType === 'RECURRING' ? Number(intervalMs) : undefined,
        deliveryType,
        deliveryConfig: {
          url,
          method,
        },
        payload: parsedPayload,
        maxRetries: Number(maxRetries)
      };

      await createJob(jobData);
      setSuccess(true);
      // Reset sensitive fields
      setName('');
      setUrl('');
      setExecuteAt('');
    } catch (err: any) {
      setError(err.message || 'Failed to schedule job');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main ref={container} className="p-12 max-w-7xl mx-auto flex flex-col gap-8">
      <header>
        <h1 className="page-title font-headline text-[2.5rem] tracking-tight text-primary">Schedule New Job</h1>
        <p className="page-title font-body text-[1rem] text-on-surface-variant max-w-2xl mt-2 font-medium">
          Create HTTP or Webhook push actions.
        </p>
      </header>

      {error && (
        <div className="bg-error-container text-error p-4 rounded-lg font-mono text-sm shadow-md animate-in fade-in slide-in-from-top-4">
          <span className="font-bold uppercase mr-2">Error:</span> {error}
        </div>
      )}

      {success && (
        <div className="bg-tertiary-container/20 border border-tertiary/30 text-tertiary p-4 rounded-lg font-mono text-sm shadow-md animate-in fade-in slide-in-from-top-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          Job scheduled successfully! Idempotency key checked.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Job Configuration */}
        <section className="bento-card lg:col-span-8 bg-surface-container-low p-8 rounded-lg border border-outline-variant/10">
          <div className="flex items-center gap-3 mb-8">
            <span className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center font-bold font-mono text-xs">1</span>
            <h2 className="font-headline text-[1.25rem] font-medium text-on-surface">Job Configuration</h2>
          </div>

          <div className="space-y-6">
            <div className="form-element flex flex-col gap-2">
              <label className="font-label text-[0.6875rem] uppercase tracking-widest text-outline-variant">Job Name</label>
              <input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/20 focus:border-primary focus:ring-0 text-sm font-body px-4 py-3 rounded-t-sm transition-colors" 
                placeholder="e.g. Send daily report" 
                type="text" 
              />
            </div>

            <div className="form-element flex flex-col gap-2">
              <label className="font-label text-[0.6875rem] uppercase tracking-widest text-outline-variant">Delivery Type</label>
              <div className="flex p-1 bg-surface-container-lowest rounded-md border border-outline-variant/10">
                <button 
                  onClick={() => setDeliveryType('HTTP')}
                  className={`flex-1 py-2 text-sm font-medium rounded transition-all flex items-center justify-center gap-2 ${deliveryType === 'HTTP' ? 'bg-primary/10 text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
                >
                  <span className="material-symbols-outlined text-[16px]">http</span>
                  HTTP
                </button>
                <button 
                  onClick={() => setDeliveryType('WEBHOOK')}
                  className={`flex-1 py-2 text-sm font-medium rounded transition-all flex items-center justify-center gap-2 ${deliveryType === 'WEBHOOK' ? 'bg-primary/10 text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
                >
                  <span className="material-symbols-outlined text-[16px]">webhook</span>
                  WEBHOOK
                </button>
              </div>
            </div>

            <div className="form-element flex flex-col gap-2">
              <label className="font-label text-[0.6875rem] uppercase tracking-widest text-outline-variant">Endpoint URL</label>
              <input 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/20 focus:border-primary focus:ring-0 text-sm font-mono px-4 py-3 rounded-t-sm transition-colors" 
                placeholder="https://httpbin.org/post" 
                type="url" 
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="form-element flex flex-col gap-2">
                <label className="font-label text-[0.6875rem] uppercase tracking-widest text-outline-variant">Method</label>
                <div className="relative">
                  <select 
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="appearance-none w-full bg-surface-container-lowest border-0 border-b border-outline-variant/20 focus:border-primary focus:ring-0 text-sm font-mono px-4 py-3 rounded-t-sm transition-colors"
                  >
                    <option>POST</option>
                    <option>GET</option>
                    <option>PUT</option>
                    <option>PATCH</option>
                    <option>DELETE</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant pointer-events-none">expand_more</span>
                </div>
              </div>
              <div className="form-element flex flex-col gap-2">
                <label className="font-label text-[0.6875rem] uppercase tracking-widest text-outline-variant">Max Retries</label>
                <input 
                  value={maxRetries}
                  onChange={(e) => setMaxRetries(Number(e.target.value))}
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/20 focus:border-primary focus:ring-0 text-sm font-mono px-4 py-3 rounded-t-sm transition-colors" 
                  type="number" 
                  min="0"
                  max="10"
                />
              </div>
            </div>

            <div className="form-element flex flex-col gap-2">
              <label className="font-label text-[0.6875rem] uppercase tracking-widest text-outline-variant">Payload (JSON)</label>
              <textarea 
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/20 focus:border-primary focus:ring-0 text-sm font-mono px-4 py-3 rounded-sm transition-colors h-32 resize-y" 
              />
            </div>
          </div>
        </section>

        {/* Right Column: Schedule */}
        <section className="bento-card lg:col-span-4 flex flex-col gap-8">
          <div className="bg-surface-container-low p-8 rounded-lg border border-outline-variant/10">
            <div className="flex items-center gap-3 mb-8">
              <span className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center font-bold font-mono text-xs">2</span>
              <h2 className="font-headline text-[1.25rem] font-medium text-on-surface">Schedule</h2>
            </div>
            
            <div className="space-y-6">
              <div className="form-element flex flex-col gap-2">
                <label className="font-label text-[0.6875rem] uppercase tracking-widest text-outline-variant">Schedule Type</label>
                <div className="flex p-1 bg-surface-container-lowest rounded-md border border-outline-variant/10">
                  <button 
                    onClick={() => setScheduleType('ONETIME')}
                    className={`flex-1 py-2 text-sm font-medium rounded transition-all flex items-center justify-center gap-2 ${scheduleType === 'ONETIME' ? 'bg-primary/10 text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
                  >
                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                    One-time
                  </button>
                  <button 
                    onClick={() => setScheduleType('RECURRING')}
                    className={`flex-1 py-2 text-sm font-medium rounded transition-all flex items-center justify-center gap-2 ${scheduleType === 'RECURRING' ? 'bg-primary/10 text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
                  >
                    <span className="material-symbols-outlined text-[16px]">autorenew</span>
                    Recurring
                  </button>
                </div>
              </div>

              {scheduleType === 'ONETIME' ? (
                <div className="form-element flex flex-col gap-2">
                  <label className="font-label text-[0.6875rem] uppercase tracking-widest text-outline-variant">Execute At</label>
                  <input 
                    value={executeAt}
                    onChange={(e) => setExecuteAt(e.target.value)}
                    className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/20 text-on-surface focus:border-primary focus:ring-0 text-sm font-mono px-4 py-3 rounded-t-sm transition-colors" 
                    type="datetime-local" 
                  />
                </div>
              ) : (
                <div className="form-element flex flex-col gap-2">
                  <label className="font-label text-[0.6875rem] uppercase tracking-widest text-outline-variant">Interval (ms)</label>
                  <input 
                    value={intervalMs}
                    onChange={(e) => setIntervalMs(Number(e.target.value))}
                    className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/20 focus:border-primary focus:ring-0 text-sm font-mono px-4 py-3 rounded-t-sm transition-colors" 
                    type="number" 
                  />
                  <span className="text-[10px] text-outline-variant">Default 60,000ms (1 minute)</span>
                </div>
              )}

              <button 
                onClick={handleSchedule}
                disabled={isSubmitting}
                className="form-element w-full mt-4 bg-primary text-on-primary py-3 rounded text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isSubmitting ? 'hourglass_empty' : 'bolt'}
                </span>
                {isSubmitting ? 'Scheduling...' : 'Schedule Job'}
              </button>
            </div>
          </div>
          
          <div className="form-element bg-surface-container-lowest border border-outline-variant/10 p-6 rounded-lg">
             <div className="flex gap-3">
               <span className="material-symbols-outlined text-tertiary text-lg">info</span>
               <p className="text-[0.875rem] text-on-surface-variant leading-relaxed">
                 Jobs are processed with <strong>&apos;exactly-once&apos;</strong> delivery guarantees bounded by Redis distributed locks. Payload sizes are restricted to 256KB constraint vectors.
               </p>
             </div>
          </div>
        </section>

      </div>
    </main>
  );
}
