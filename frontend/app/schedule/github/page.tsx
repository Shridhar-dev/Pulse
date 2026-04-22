'use client'

import React, { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { createJob } from '../../lib/api';

export default function GithubJobs() {
  const container = useRef(null);
  
  const [jobName, setJobName] = useState('');
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('main');
  const [buildCommand, setBuildCommand] = useState('npm install');
  const [runCommand, setRunCommand] = useState('node NODE.js');
  const [memory, setMemory] = useState('512m');
  const [cpu, setCpu] = useState('1.0');
  const [image, setImage] = useState('node:22-alpine');
  const [scheduleMode, setScheduleMode] = useState<'IMMEDIATE' | 'SCHEDULED' | 'RECURRING'>('IMMEDIATE');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power4.out", duration: 1 } });
    
    tl.from(".page-header", { y: -20, opacity: 0, duration: 0.8 })
      .from(".config-panel", {
        y: 30,
        opacity: 0,
        stagger: 0.1,
        clearProps: "all"
      }, "-=0.6")
      .from(".preview-pane", {
        scale: 0.95,
        opacity: 0,
        ease: "back.out(1.5)"
      }, "-=0.5");
  }, { scope: container });

  const currentCommand = `$ docker run --rm \\
    --memory ${memory} --cpus ${cpu} \\
    ${image} \\
    sh -c '
      git clone --branch ${branch} ${repo || '<repo-url>'} .
      ${buildCommand}
      ${runCommand}
    '`;

  const handleLaunch = async () => {
    setError(null);
    setSuccess(false);

    if (!jobName || !repo || !runCommand) {
      setError("Job Name, Repository URL, and Run Command are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const jobData = {
        name: jobName,
        idempotencyKey: crypto.randomUUID(),
        scheduledAt: new Date().toISOString(),
        isRecurring: scheduleMode === 'RECURRING',
        intervalMs: scheduleMode === 'RECURRING' ? 3600000 : undefined,
        deliveryType: 'GITHUB_EXEC',
        deliveryConfig: {
          repoUrl: repo,
          branch,
          buildCommand,
          runCommand,
          dockerImage: image,      // backend expects "dockerImage", not "image"
          memoryLimit: memory,     // backend expects "memoryLimit", not "memory"
          cpuLimit: cpu            // backend expects "cpuLimit", not "cpu"
        },
        payload: {},
        maxRetries: 3
      };

      await createJob(jobData);
      setSuccess(true);
      setJobName('');
      setRepo('');
    } catch (err: any) {
      setError(err.message || 'Failed to launch GitHub Job');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main ref={container} className="p-12 max-w-[1600px] mx-auto flex flex-col gap-8 w-full">
      <header className="page-header flex gap-4 items-center">
        <div className="w-12 h-12 bg-surface-container-low border border-outline-variant/10 rounded-lg flex items-center justify-center">
          <img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" className="w-8 h-8 rounded-full invert-[1] opacity-80" alt="GitHub" />
        </div>
        <div>
          <h1 className="font-headline text-[2.5rem] tracking-tight text-primary leading-none">GitHub Jobs</h1>
          <p className="font-mono text-[0.75rem] text-primary-fixed uppercase tracking-widest mt-2 font-bold">
            Docker Execution
          </p>
        </div>
      </header>

      {error && (
        <div className="bg-error-container text-error p-4 rounded-lg font-mono text-sm shadow-md animate-in fade-in slide-in-from-top-4">
          <span className="font-bold uppercase mr-2">Error:</span> {error}
        </div>
      )}

      {success && (
        <div className="bg-tertiary-container/20 border border-tertiary/30 text-tertiary p-4 rounded-lg font-mono text-sm shadow-md animate-in fade-in slide-in-from-top-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          GitHub Job launched successfully! Tracking execution ID...
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column */}
        <div className="lg:col-span-6 flex flex-col gap-8">
          {/* Repository Box */}
          <section className="config-panel bg-surface-container-low p-8 rounded-lg border border-outline-variant/10">
            <div className="flex items-center gap-3 mb-8">
              <span className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center font-bold font-mono text-xs">1</span>
              <h2 className="font-headline text-[1.25rem] font-medium text-on-surface">Repository</h2>
            </div>
            
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="font-label text-[0.6875rem] uppercase tracking-widest text-outline-variant">Job Name</label>
                <input 
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/20 focus:border-primary focus:ring-0 text-sm font-body px-4 py-3 rounded-t-sm transition-colors" 
                  placeholder="e.g. Build & Test API" 
                  type="text" 
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="font-label text-[0.6875rem] uppercase tracking-widest text-outline-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">code</span>
                  Repository URL
                </label>
                <input 
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/20 focus:border-primary focus:ring-0 text-sm font-mono px-4 py-3 rounded-t-sm transition-colors" 
                  placeholder="https://github.com/user/repo" 
                  type="url" 
                />
                <span className="text-[10px] text-outline-variant font-mono mt-1">Public HTTPS Git URL (e.g., https://github.com/user/repo.git)</span>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="font-label text-[0.6875rem] uppercase tracking-widest text-outline-variant">Branch</label>
                  <input 
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/20 focus:border-primary focus:ring-0 text-sm font-mono px-4 py-3 rounded-t-sm transition-colors" 
                    type="text" 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-label text-[0.6875rem] uppercase tracking-widest text-outline-variant">Working Directory</label>
                  <input 
                    className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/20 focus:border-primary focus:ring-0 text-sm font-mono px-4 py-3 rounded-t-sm transition-colors" 
                    placeholder="(root)" 
                    type="text" 
                  />
                  <span className="text-[10px] text-outline-variant font-mono mt-1">Relative to repo root</span>
                </div>
              </div>
            </div>
          </section>

          {/* Commands Box */}
          <section className="config-panel bg-surface-container-low p-8 rounded-lg border border-outline-variant/10">
            <div className="flex items-center gap-3 mb-8">
              <span className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center font-bold font-mono text-xs">2</span>
              <h2 className="font-headline text-[1.25rem] font-medium text-on-surface">Commands</h2>
            </div>
            
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="font-label text-[0.6875rem] uppercase tracking-widest text-outline-variant">Build Command</label>
                <input 
                  value={buildCommand}
                  onChange={(e) => setBuildCommand(e.target.value)}
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/20 focus:border-primary focus:ring-0 text-sm font-mono px-4 py-3 rounded-t-sm transition-colors" 
                  type="text" 
                />
                <span className="text-[10px] text-outline-variant font-mono mt-1">Runs before the main command (e.g., npm install, pip install -r requirements.txt)</span>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="font-label text-[0.6875rem] uppercase tracking-widest text-error flex items-center gap-1">Run Command *</label>
                <input 
                  value={runCommand}
                  onChange={(e) => setRunCommand(e.target.value)}
                  className="w-full bg-surface-container-lowest border-0 border-b border-error/50 focus:border-error focus:ring-0 text-sm font-mono px-4 py-3 rounded-t-sm transition-colors" 
                  type="text" 
                />
                <span className="text-[10px] text-outline-variant font-mono mt-1">Main command to execute inside the container</span>
              </div>
            </div>
          </section>

          {/* Environment Variables */}
          <section className="config-panel bg-transparent border-2 border-dashed border-outline-variant/20 p-6 rounded-lg hover:border-primary/30 transition-colors cursor-pointer flex items-center justify-center gap-2 group">
            <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors">add</span>
            <span className="font-body text-sm font-medium text-outline-variant group-hover:text-primary transition-colors">Environment Variables (optional)</span>
          </section>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-6 flex flex-col gap-8">
          
          {/* Docker Config */}
          <section className="config-panel bg-surface-container-low p-8 rounded-lg border border-outline-variant/10">
            <div className="flex items-center gap-3 mb-8">
              <span className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center font-bold font-mono text-xs">3</span>
              <h2 className="font-headline text-[1.25rem] font-medium text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                Docker Configuration
              </h2>
            </div>
            
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="font-label text-[0.6875rem] uppercase tracking-widest text-outline-variant">Image Source</label>
                <div className="flex p-1 bg-surface-container-lowest rounded-md border border-outline-variant/10">
                  <button className="flex-1 py-1.5 text-sm font-medium rounded transition-all bg-primary/10 text-primary shadow-sm flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">list</span> Presets
                  </button>
                  <button className="flex-1 py-1.5 text-sm font-medium rounded transition-all text-on-surface-variant hover:bg-surface-container-high flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">edit</span> Custom
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="font-label text-[0.6875rem] uppercase tracking-widest text-outline-variant">Docker Image</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'node:22-alpine', label: 'Node.js 22', icon: 'javascript' },
                    { id: 'node:20-alpine', label: 'Node.js 20', icon: 'javascript' },
                    { id: 'python:3.12-slim', label: 'Python 3.12', icon: 'terminal' },
                    { id: 'golang:1.22-alpine', label: 'Go 1.22', icon: 'code' },
                    { id: 'ruby:3.3-alpine', label: 'Ruby 3.3', icon: 'terminal' },
                    { id: 'rust:1.77-slim', label: 'Rust 1.77', icon: 'terminal' },
                    { id: 'ubuntu:24.04', label: 'Ubuntu 24.04', icon: 'laptop' }
                  ].map(img => (
                    <button 
                      key={img.id}
                      onClick={() => setImage(img.id)}
                      className={`flex items-center px-4 py-3 rounded border text-sm font-mono text-left transition-all ${
                        image === img.id 
                          ? 'border-primary bg-primary/5 text-primary shadow-[0_0_12px_rgba(var(--primary-rgb),0.1)]' 
                          : 'border-outline-variant/20 bg-surface-container-lowest hover:border-primary/40 text-on-surface-variant'
                      }`}
                    >
                      {img.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-outline-variant/10">
                <div className="flex flex-col gap-2">
                  <label className="font-label text-[0.6875rem] uppercase tracking-widest text-outline-variant">Memory Limit</label>
                  <select onChange={(e) => setMemory(e.target.value)} value={memory} className="w-full appearance-none bg-surface-container-lowest border-0 border-b border-outline-variant/20 focus:border-primary focus:ring-0 text-sm font-mono px-4 py-3 rounded-t-sm transition-colors">
                    <option value="256m">256 MB</option>
                    <option value="512m">512 MB</option>
                    <option value="1024m">1 GB</option>
                    <option value="2048m">2 GB</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-label text-[0.6875rem] uppercase tracking-widest text-outline-variant">CPU Limit</label>
                  <select onChange={(e) => setCpu(e.target.value)} value={cpu} className="w-full appearance-none bg-surface-container-lowest border-0 border-b border-outline-variant/20 focus:border-primary focus:ring-0 text-sm font-mono px-4 py-3 rounded-t-sm transition-colors">
                    <option value="0.5">0.5 CPU</option>
                    <option value="1.0">1 CPU</option>
                    <option value="2.0">2 CPU</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-label text-[0.6875rem] uppercase tracking-widest text-outline-variant">Timeout</label>
                  <select defaultValue="5 minutes" className="w-full appearance-none bg-surface-container-lowest border-0 border-b border-outline-variant/20 focus:border-primary focus:ring-0 text-sm font-mono px-4 py-3 rounded-t-sm transition-colors">
                    <option>1 minute</option>
                    <option>5 minutes</option>
                    <option>15 minutes</option>
                    <option>1 hour</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-label text-[0.6875rem] uppercase tracking-widest text-outline-variant">Max Retries</label>
                  <input className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/20 focus:border-primary focus:ring-0 text-sm font-mono px-4 py-3 rounded-t-sm transition-colors" defaultValue="3" type="number" />
                </div>
              </div>
            </div>
          </section>

          {/* Schedule Mode */}
          <section className="config-panel bg-surface-container-low p-8 rounded-lg border border-outline-variant/10">
             <div className="flex items-center gap-3 mb-6">
                <span className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center font-bold font-mono text-xs">4</span>
                <h2 className="font-headline text-[1.25rem] font-medium text-on-surface">Schedule</h2>
              </div>
              <div className="flex p-1 bg-surface-container-lowest rounded-md border border-outline-variant/10 mb-4">
                <button onClick={() => setScheduleMode('IMMEDIATE')} className={`flex-1 py-2 text-sm font-medium rounded transition-all flex items-center justify-center gap-2 ${scheduleMode === 'IMMEDIATE' ? 'bg-primary/10 text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
                  <span className="material-symbols-outlined text-[16px]">bolt</span> Immediate
                </button>
                <button onClick={() => setScheduleMode('SCHEDULED')} className={`flex-1 py-2 text-sm font-medium rounded transition-all flex items-center justify-center gap-2 ${scheduleMode === 'SCHEDULED' ? 'bg-primary/10 text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
                  <span className="material-symbols-outlined text-[16px]">schedule</span> Scheduled
                </button>
                <button onClick={() => setScheduleMode('RECURRING')} className={`flex-1 py-2 text-sm font-medium rounded transition-all flex items-center justify-center gap-2 ${scheduleMode === 'RECURRING' ? 'bg-primary/10 text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
                  <span className="material-symbols-outlined text-[16px]">autorenew</span> Recurring
                </button>
              </div>
              <div className="p-4 bg-tertiary-container/10 border border-tertiary-container/30 rounded text-sm text-tertiary font-medium flex gap-2 items-center">
                <span className="material-symbols-outlined text-[18px]">info</span>
                Job will start within ~5 seconds of submission
              </div>
          </section>

          {/* Preview Pane */}
          <section className="preview-pane bg-surface-container-lowest p-6 rounded-lg border border-outline-variant/10 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="font-label text-[0.6875rem] uppercase tracking-widest text-outline-variant mb-4">Execution Preview</div>
            <pre className="font-mono text-[0.875rem] text-primary whitespace-pre-wrap leading-relaxed select-all">
              {currentCommand}
            </pre>
          </section>

          <button 
            onClick={handleLaunch}
            disabled={isSubmitting}
            className="w-full py-4 rounded-lg bg-primary text-on-primary font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.99] mt-4 disabled:opacity-50 disabled:pointer-events-none"
          >
            <span className="material-symbols-outlined text-[20px]">
              {isSubmitting ? 'hourglass_empty' : 'rocket_launch'}
            </span>
            {isSubmitting ? 'Launching...' : 'Launch Docker Job'}
          </button>
        </div>

      </div>
    </main>
  );
}
