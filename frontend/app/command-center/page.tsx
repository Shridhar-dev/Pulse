export default function CommandCenter() {
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-surface-container-lowest relative bg-surface-container-lowest text-on-surface flex h-screen overflow-hidden antialiased selection:bg-primary selection:text-on-primary">
      <main className="flex-1 overflow-y-auto p-8 lg:p-8">
        <div className="max-w-[1600px] mx-auto space-y-8">
          
          <div className="flex items-end justify-between mb-12">
            <div>
              <h1 className="text-[3.5rem] leading-none font-headline font-bold tracking-[-0.02em] text-primary">System Overlook</h1>
              <p className="text-on-surface-variant font-body text-body-md mt-4 max-w-xl">Real-time telemetry and execution matrices for global infrastructure. Pulse rate is nominal.</p>
            </div>
            <div className="flex items-center gap-3 text-label-sm font-label uppercase tracking-widest text-on-surface-variant">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container shadow-[0_0_8px_rgba(0,133,91,0.4)]"></span>
                Live Sync
              </span>
              <span className="text-surface-dim">|</span>
              <span>UTC 14:02:45</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[minmax(280px,auto)]">
            
            <div className="col-span-1 md:col-span-4 bg-surface-container-low rounded-lg p-8 flex flex-col justify-between relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <h3 className="text-label-sm font-label uppercase tracking-[0.05em] text-on-surface-variant">Total Tasks Executed</h3>
                <span className="material-symbols-outlined text-[20px] text-surface-tint">memory</span>
              </div>
              <div className="mt-auto z-10">
                <div className="font-mono text-[4rem] leading-none tracking-tight text-primary font-medium">
                  24,892,104
                </div>
                <div className="flex items-center gap-2 mt-4 font-body text-body-md">
                  <span className="text-tertiary-fixed font-medium flex items-center">
                    <span className="material-symbols-outlined text-[16px] mr-1">trending_up</span>
                    +2.4%
                  </span>
                  <span className="text-on-surface-variant text-sm">vs last hour</span>
                </div>
              </div>
              <div className="absolute -right-12 -bottom-12 w-64 h-64 border border-outline-variant/20 rounded-full opacity-50 pointer-events-none group-hover:scale-110 transition-transform duration-700 ease-out"></div>
            </div>

            <div className="col-span-1 md:col-span-8 bg-surface-container-low rounded-lg p-8 flex flex-col relative overflow-hidden">
              <div className="flex justify-between items-start mb-8 z-10">
                <h3 className="text-label-sm font-label uppercase tracking-[0.05em] text-on-surface-variant">Tasks / Sec</h3>
                <div className="flex gap-4">
                  <span className="text-xs font-mono text-on-surface-variant">Avg: 4.2k</span>
                  <span className="text-xs font-mono text-primary font-medium">Peak: 6.8k</span>
                </div>
              </div>
              <div className="flex-1 relative w-full h-full min-h-[180px]">
                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 200">
                  <defs>
                    <linearGradient id="line-gradient" x1="0%" x2="100%" y1="0%" y2="0%">
                      <stop offset="0%" stopColor="#000000" stopOpacity="0.1"></stop>
                      <stop offset="50%" stopColor="#000000" stopOpacity="0.8"></stop>
                      <stop offset="100%" stopColor="#000000" stopOpacity="1"></stop>
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur result="coloredBlur" stdDeviation="4"></feGaussianBlur>
                      <feMerge>
                        <feMergeNode in="coloredBlur"></feMergeNode>
                        <feMergeNode in="SourceGraphic"></feMergeNode>
                      </feMerge>
                    </filter>
                  </defs>
                  
                  <line stroke="#c6c6c6" strokeDasharray="4 4" strokeOpacity="0.2" strokeWidth="1" x1="0" x2="1000" y1="50" y2="50"></line>
                  <line stroke="#c6c6c6" strokeDasharray="4 4" strokeOpacity="0.2" strokeWidth="1" x1="0" x2="1000" y1="100" y2="100"></line>
                  <line stroke="#c6c6c6" strokeDasharray="4 4" strokeOpacity="0.2" strokeWidth="1" x1="0" x2="1000" y1="150" y2="150"></line>
                  
                  <path className="drop-shadow-sm" d="M0,180 C50,180 80,120 120,130 C160,140 190,80 240,60 C290,40 320,110 380,90 C440,70 470,160 520,140 C570,120 600,50 650,40 C700,30 740,90 800,100 C860,110 900,50 950,30 L1000,20" fill="none" filter="url(#glow)" stroke="url(#line-gradient)" strokeWidth="3"></path>
                  
                  <path d="M0,180 C50,180 80,120 120,130 C160,140 190,80 240,60 C290,40 320,110 380,90 C440,70 470,160 520,140 C570,120 600,50 650,40 C700,30 740,90 800,100 C860,110 900,50 950,30 L1000,20 L1000,200 L0,200 Z" fill="url(#line-gradient)" opacity="0.03"></path>
                </svg>
              </div>
            </div>

            <div className="col-span-1 md:col-span-6 bg-surface-container-low rounded-lg p-6 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-label-sm font-label uppercase tracking-[0.05em] text-on-surface-variant flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  Kafka Offsets Feed
                </h3>
                <button className="text-xs font-mono text-surface-tint hover:text-primary transition-colors">Pause</button>
              </div>
              <div className="flex-1 bg-surface-container-lowest rounded-DEFAULT border border-outline-variant/10 p-4 font-mono text-[0.8rem] leading-relaxed overflow-y-auto terminal-scroll relative group">
                <div className="text-surface-tint opacity-50 space-y-1">
                  <div className="flex gap-4"><span className="w-16 text-right">[14:02:40]</span><span className="text-tertiary-fixed-dim">INFO</span><span className="text-on-surface">Offset committed: topic=events-prod partition=4 offset=948271</span></div>
                  <div className="flex gap-4"><span className="w-16 text-right">[14:02:41]</span><span className="text-tertiary-fixed-dim">INFO</span><span className="text-on-surface">Offset committed: topic=auth-logs partition=1 offset=22841</span></div>
                  <div className="flex gap-4"><span className="w-16 text-right">[14:02:42]</span><span className="text-error opacity-80">WARN</span><span className="text-on-surface">Rebalance triggered: group=consumer-metrics-v2</span></div>
                  <div className="flex gap-4"><span className="w-16 text-right">[14:02:42]</span><span className="text-tertiary-fixed-dim">INFO</span><span className="text-on-surface">Partitions revoked: topic=metrics-raw partition=0,1,2</span></div>
                  <div className="flex gap-4"><span className="w-16 text-right">[14:02:44]</span><span className="text-tertiary-fixed-dim">INFO</span><span className="text-on-surface">Partitions assigned: topic=metrics-raw partition=0,1,2,3</span></div>
                  <div className="flex gap-4"><span className="w-16 text-right">[14:02:45]</span><span className="text-tertiary-fixed-dim">INFO</span><span className="text-on-surface">Offset committed: topic=events-prod partition=4 offset=948285</span></div>
                  <div className="flex gap-4"><span className="w-16 text-right">[14:02:45]</span><span className="text-tertiary-fixed-dim">INFO</span><span className="text-on-surface">Offset committed: topic=metrics-raw partition=2 offset=110592</span></div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-surface-container-lowest to-transparent pointer-events-none"></div>
              </div>
            </div>

            <div className="col-span-1 md:col-span-6 bg-surface-container-low rounded-lg p-6 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-label-sm font-label uppercase tracking-[0.05em] text-on-surface-variant">Azure Node Matrix</h3>
                <div className="flex gap-3 text-xs font-mono text-on-surface-variant">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-tertiary-container"></span> 42</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-error"></span> 1</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-surface-dim"></span> 5</span>
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="grid grid-cols-8 gap-2 w-full max-w-md">
                   {Array.from({length: 48}).map((_, i) => {
                     const isError = i === 11;
                     const isDim = [2, 17, 26, 30, 39].includes(i);
                     const bg = isError ? 'bg-error shadow-[0_0_12px_rgba(186,26,26,0.6)] z-10' : isDim ? 'bg-surface-dim' : 'bg-tertiary-container';
                     return (
                        <div key={i} className={`aspect-square rounded-[2px] hover:scale-110 transition-transform cursor-pointer shadow-sm relative group ${bg}`}>
                          {isError && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 p-2 bg-inverse-surface text-inverse-on-surface text-xs font-mono rounded-DEFAULT opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                                NODE_ERR_503
                                <br/><span className="text-error-container">Latency spike</span>
                            </div>
                          )}
                        </div>
                     );
                   })}
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
