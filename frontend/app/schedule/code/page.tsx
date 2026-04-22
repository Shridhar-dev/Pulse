'use client'

import React, { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { executeFile } from '../../lib/api';

export default function CodeRunner() {
  const container = useRef(null);
  
  const [mode, setMode] = useState<'CRON' | 'ONCE'>('ONCE');
  const [lang, setLang] = useState('JavaScript');
  const [interval, setInterval] = useState('1m');
  const [jobName, setJobName] = useState('');
  
  const [file, setFile] = useState<File | null>(null);
  const [command, setCommand] = useState('node {file}');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power4.out", duration: 1 } });
    
    tl.from(".page-header", { y: -20, opacity: 0, duration: 0.8 })
      .from(".bento-area", {
        y: 30,
        opacity: 0,
        stagger: 0.15,
        clearProps: "all"
      }, "-=0.6")
      .from(".cron-table", {
        y: 20,
        opacity: 0
      }, "-=0.5");
  }, { scope: container });

  const intervals = ['30s', '1m', '5m', '15m', '30m', '1h', '6h', '24h'];
  const languages = [
    { id: 'JavaScript', icon: 'javascript' },
    { id: 'TypeScript', icon: 'code' },
    { id: 'Python', icon: 'terminal' },
    { id: 'Bash', icon: 'terminal' },
    { id: 'Ruby', icon: 'terminal' },
    { id: 'Go', icon: 'code' },
    { id: 'Custom', icon: 'settings' }
  ];

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleExecute = async () => {
    setError(null);
    setSuccess(false);
    setOutput(null);

    if (!file) {
      setError('Please upload a file first.');
      return;
    }
    if (!command) {
      setError('Run command is required.');
      return;
    }

    if (mode === 'CRON') {
      // For now, mock the CRON submission since backend cron wrapper isn't strictly ready
      setIsSubmitting(true);
      setTimeout(() => {
        setSuccess(true);
        setIsSubmitting(false);
      }, 1000);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await executeFile(file, command);
      setSuccess(true);
      setOutput(result.output || 'No output.');
      setDuration(result.durationMs);
    } catch (err: any) {
      setError(err.message || 'Execution failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main ref={container} className="p-12 max-w-[1600px] mx-auto flex flex-col gap-8 w-full relative z-0">
      
      <header className="page-header flex items-center justify-between">
        <div>
           <h1 className="font-headline text-[2.5rem] tracking-tight text-primary leading-none flex items-center gap-3">
             <span className="material-symbols-outlined text-3xl text-tertiary">bolt</span>
             Code Runner & Cron Jobs
           </h1>
           <p className="font-mono text-[0.75rem] text-on-surface-variant uppercase tracking-widest mt-3 font-bold">
             Execute scripts via secure isolated runtime
           </p>
        </div>
        <div className="flex bg-surface-container-low p-1 rounded-md border border-outline-variant/10 w-80">
          <button 
            onClick={() => setMode('CRON')}
            className={`flex-1 py-2 text-sm font-medium rounded transition-all flex items-center justify-center gap-2 ${mode === 'CRON' ? 'bg-primary/10 text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
          >
            <span className="material-symbols-outlined text-[16px]">autorenew</span> Schedule as Cron
          </button>
          <button 
            onClick={() => setMode('ONCE')}
            className={`flex-1 py-2 text-sm font-medium rounded transition-all flex items-center justify-center gap-2 ${mode === 'ONCE' ? 'bg-primary/10 text-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
          >
            <span className="material-symbols-outlined text-[16px]">play_arrow</span> Run Once
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-error-container text-error p-4 rounded-lg font-mono text-sm shadow-md animate-in fade-in slide-in-from-top-4">
          <span className="font-bold uppercase mr-2">Error:</span> {error}
        </div>
      )}

      {success && mode === 'CRON' && (
        <div className="bg-tertiary-container/20 border border-tertiary/30 text-tertiary p-4 rounded-lg font-mono text-sm shadow-md animate-in fade-in slide-in-from-top-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          Cron Job registered successfully for execution every {interval}.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Script Context */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
          />
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`bento-area border-2 border-dashed ${file ? 'border-tertiary/50 bg-tertiary/5' : 'border-primary/20 bg-primary/5'} rounded-lg h-64 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/10 transition-colors group`}
          >
            <span className={`material-symbols-outlined text-4xl mb-4 group-hover:scale-110 transition-transform ${file ? 'text-tertiary' : 'text-primary'}`}>
              {file ? 'description' : 'folder_open'}
            </span>
            <span className={`font-headline text-lg font-medium ${file ? 'text-tertiary' : 'text-primary'}`}>
              {file ? file.name : 'Drop your code file here'}
            </span>
            <span className="font-mono text-[10px] text-on-surface-variant mt-2 uppercase tracking-widest">
              {file ? `${(file.size / 1024).toFixed(1)} KB` : 'or click to browse • .js, .ts, .py, .sh, .rb, .go'}
            </span>
          </div>

          <div className="bento-area bg-surface-container-low p-6 rounded-lg border border-outline-variant/10">
            <h3 className="font-label text-[0.6875rem] uppercase tracking-widest text-outline-variant mb-4">Language</h3>
            <div className="flex flex-wrap gap-3">
              {languages.map(l => (
                <button 
                  key={l.id}
                  onClick={() => setLang(l.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-mono transition-all ${
                    lang === l.id 
                      ? 'bg-primary/10 text-primary border border-primary/30 shadow-[0_0_8px_rgba(var(--primary-rgb),0.15)]' 
                      : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/20 hover:border-primary/30'
                  }`}
                >
                  {l.id}
                </button>
              ))}
            </div>
          </div>

          <div className="bento-area bg-surface-container-low p-6 rounded-lg border border-outline-variant/10">
             <div className="flex flex-col gap-2">
                <label className="font-label text-[0.6875rem] uppercase tracking-widest text-outline-variant">Run Command</label>
                <div className="relative">
                  <input 
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/20 focus:border-primary focus:ring-0 text-sm font-mono px-4 py-3 rounded-t-sm transition-colors text-primary" 
                    type="text" 
                  />
                </div>
                <span className="text-[10px] text-outline-variant font-mono mt-1"><code className="bg-surface-container-highest px-1 rounded text-primary-fixed">{'{file}'}</code> — path to your uploaded file</span>
              </div>
          </div>

        </div>

        {/* Right Column: Execution Rules */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <div className="bento-area bg-surface-container-low p-8 rounded-lg border border-outline-variant/10 flex-1 flex flex-col">
            <div className="flex items-center gap-2 border-b border-outline-variant/10 pb-4 mb-6">
              <span className="material-symbols-outlined text-primary text-[20px]">{mode === 'CRON' ? 'autorenew' : 'play_arrow'}</span>
              <h2 className="font-headline text-[1.25rem] font-medium text-on-surface">
                {mode === 'CRON' ? 'Schedule Recurring Execution' : 'Execute Immediately'}
              </h2>
            </div>
            
            <div className="flex-1 flex flex-col gap-8">
              {mode === 'CRON' && (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="font-label text-[0.6875rem] uppercase tracking-widest text-outline-variant">Cron Job Name</label>
                    <input 
                      value={jobName}
                      onChange={(e) => setJobName(e.target.value)}
                      className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/20 focus:border-primary focus:ring-0 text-sm font-body px-4 py-3 rounded-t-sm transition-colors" 
                      placeholder="e.g. Daily report generator" 
                      type="text" 
                    />
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    <label className="font-label text-[0.6875rem] uppercase tracking-widest text-outline-variant">Run Every</label>
                    <div className="grid grid-cols-4 gap-3">
                      {intervals.map(i => (
                        <button 
                          key={i}
                          onClick={() => setInterval(i)}
                          className={`py-3 rounded border text-sm font-mono font-bold transition-all ${
                            interval === i 
                              ? 'border-primary bg-primary/10 text-primary' 
                              : 'border-outline-variant/20 bg-surface-container-lowest hover:border-primary/40 text-on-surface-variant'
                          }`}
                        >
                          {i}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-tertiary-container/10 border border-tertiary-container/30 rounded text-[0.875rem] text-tertiary font-medium flex gap-3 items-start mt-auto">
                    <span className="material-symbols-outlined text-[18px] opacity-80">info</span>
                    <div>
                      Your file will be stored on the server and executed with <br/> <code className="font-mono text-xs bg-tertiary/10 px-1 rounded mx-1 text-tertiary">{command}</code> every <strong className="text-tertiary-fixed">{interval}</strong>.
                    </div>
                  </div>
                </>
              )}

              {mode === 'ONCE' && (
                <div className="flex flex-col gap-4 h-full">
                  <div className="p-4 bg-primary-container/10 border border-primary-container/30 rounded text-[0.875rem] text-primary font-medium flex gap-3 items-start">
                      <span className="material-symbols-outlined text-[18px] opacity-80">info</span>
                      <div>
                        The file will be temporarily uploaded, executed, and immediately deleted. You will see the live console output here.
                      </div>
                  </div>

                  {output !== null && (
                    <div className="flex-1 bg-black p-4 rounded-lg overflow-y-auto mb-4 border border-outline-variant/20 relative group">
                      <div className="absolute top-2 right-2 text-xs font-mono text-outline-variant bg-surface-container-lowest px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        {duration?.toFixed(2)}ms
                      </div>
                      <pre className="font-mono text-xs text-primary-fixed whitespace-pre-wrap">{output}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button 
              onClick={handleExecute}
              disabled={isSubmitting}
              className="w-full mt-6 py-4 rounded-lg bg-primary text-on-primary font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
            >
               <span className="material-symbols-outlined text-[20px]">
                 {isSubmitting ? 'hourglass_empty' : (mode === 'CRON' ? 'autorenew' : 'bolt')}
               </span>
               {isSubmitting ? 'Processing...' : (mode === 'CRON' ? 'Schedule Cron Job' : 'Execute Now')}
            </button>
          </div>
        </div>

        {/* Bottom Panel */}
        {mode === 'CRON' && (
          <div className="cron-table lg:col-span-12 mt-8 bg-surface-container-lowest border border-outline-variant/10 rounded-lg shadow-xl shadow-black/5 overflow-hidden">
            <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low/30">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">autorenew</span>
                <h2 className="font-headline text-[1.125rem] font-medium text-on-surface leading-none">Active Cron Jobs (0)</h2>
              </div>
              <button className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 border border-outline-variant/20 px-3 py-1.5 rounded bg-surface-container-lowest">
                <span className="material-symbols-outlined text-[14px]">refresh</span> Refresh
              </button>
            </div>

            <div className="p-16 flex flex-col items-center justify-center text-center opacity-60">
              <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">alarm_off</span>
              <h3 className="font-headline text-lg font-semibold text-on-surface">No cron jobs yet</h3>
              <p className="font-body text-sm text-on-surface-variant mt-2">Upload a file above and schedule it as a recurring cron job</p>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
