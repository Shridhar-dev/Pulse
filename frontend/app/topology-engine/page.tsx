export default function TopologyEngine() {
  return (
    <div className="flex flex-1 overflow-hidden h-[calc(100vh-65px)]">
      {/* SideNavBar SRE Assistant */}
      {/* <aside className="bg-surface-container-lowest backdrop-blur-md text-on-surface font-body text-xs font-medium left-0 h-full w-64 border-r border-outline-variant/10 flex flex-col gap-2 p-4 pt-8 shrink-0 relative z-10">
        <div className="mb-8 px-2">
          <div className="text-lg font-headline font-bold text-primary mb-1">Gemini</div>
          <div className="text-[0.6875rem] text-primary-fixed uppercase tracking-wider">Infrastructure Assistant</div>
        </div>
        <a className="bg-surface-container-low text-primary rounded-sm shadow-sm p-3 flex items-center gap-3 focus-within:ring-1 focus-within:ring-primary" href="#">
          <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
          AI Assistant
        </a>
        <a className="text-on-surface-variant hover:bg-surface-container p-3 rounded-sm flex items-center gap-3 hover:translate-x-1 transition-transform duration-200 focus-within:ring-1 focus-within:ring-primary" href="#">
          <span className="material-symbols-outlined text-[18px]">insights</span>
          Insights
        </a>
        <a className="text-on-surface-variant hover:bg-surface-container p-3 rounded-sm flex items-center gap-3 hover:translate-x-1 transition-transform duration-200 focus-within:ring-1 focus-within:ring-primary" href="#">
          <span className="material-symbols-outlined text-[18px]">history</span>
          History
        </a>
        <a className="text-on-surface-variant hover:bg-surface-container p-3 rounded-sm flex items-center gap-3 hover:translate-x-1 transition-transform duration-200 focus-within:ring-1 focus-within:ring-primary" href="#">
          <span className="material-symbols-outlined text-[18px]">menu_book</span>
          Documentation
        </a>
        <div className="mt-auto pt-4 border-t border-outline-variant/10">
          <button className="w-full bg-primary text-on-primary py-2 px-4 rounded-sm text-xs font-medium hover:bg-primary-fixed transition-colors flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[16px]">chat</span>
            Ask Pulse AI
          </button>
        </div>
      </aside> */}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-12 bg-surface-container-lowest">
        <header className="mb-16">
          <h1 className="text-[3.5rem] font-headline font-semibold tracking-[-0.02em] leading-tight text-primary mb-4">Topology Map</h1>
          <p className="text-[1.125rem] font-body text-primary-fixed max-w-2xl">Distributed flow analysis and real-time locking visualization across ingestion, partitioning, and consumption layers.</p>
        </header>

        <div className="grid grid-cols-12 gap-12">
          {/* Main Flow Diagram */}
          <div className="col-span-8 space-y-12 relative min-h-[600px]">
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <path className="stroke-outline-variant/30 stroke-[1px] fill-none" d="M 150 100 L 150 200 L 400 200 L 400 300"></path>
              <path className="stroke-outline-variant/30 stroke-[1px] fill-none" d="M 650 100 L 650 200 L 400 200"></path>
            </svg>

            {/* Ingestion Layer */}
            <section className="relative z-10">
              <div className="text-[0.6875rem] font-label uppercase tracking-[0.05em] text-primary-fixed mb-6 border-b border-surface-container-high pb-2">Ingestion Layer</div>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-surface-container-lowest border border-outline-variant/10 p-6 rounded text-left">
                  <div className="flex justify-between items-start mb-4">
                    <div className="relative">
                      <h3 className="font-headline text-[1.125rem] font-medium">Edge Ingest A</h3>
                      <div className="absolute top-0 -right-4 w-1.5 h-1.5 rounded-full bg-tertiary-container shadow-[0_0_8px_rgba(0,133,91,0.4)]"></div>
                    </div>
                    <span className="font-mono text-[0.6875rem] text-primary-fixed">shard_id: a7f9-22</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[0.875rem]">
                      <span className="text-primary-fixed">Throughput</span>
                      <span className="font-mono">4.2k req/s</span>
                    </div>
                    <div className="flex justify-between items-center text-[0.875rem]">
                      <span className="text-primary-fixed">Latency</span>
                      <span className="font-mono">12ms</span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container-low p-6 rounded text-left border border-transparent">
                  <div className="flex justify-between items-start mb-4">
                    <div className="relative">
                      <h3 className="font-headline text-[1.125rem] font-medium">Edge Ingest B</h3>
                      <div className="absolute top-0 -right-4 w-1.5 h-1.5 rounded-full bg-tertiary-container shadow-[0_0_8px_rgba(0,133,91,0.4)]"></div>
                    </div>
                    <span className="font-mono text-[0.6875rem] text-primary-fixed">shard_id: b1c4-88</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[0.875rem]">
                      <span className="text-primary-fixed">Throughput</span>
                      <span className="font-mono">3.8k req/s</span>
                    </div>
                    <div className="flex justify-between items-center text-[0.875rem]">
                      <span className="text-primary-fixed">Latency</span>
                      <span className="font-mono">14ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Partitions Layer */}
            <section className="relative z-10 pt-12">
              <div className="text-[0.6875rem] font-label uppercase tracking-[0.05em] text-primary-fixed mb-6 border-b border-surface-container-high pb-2">Kafka Partitions</div>
              <div className="bg-surface-container-lowest border border-outline-variant/10 p-8 rounded flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="font-headline text-[1.5rem] font-medium">Topic: task_events_main</span>
                  <span className="font-mono text-[0.6875rem] text-primary-fixed">replication_factor: 3</span>
                </div>
                <div className="flex gap-2">
                  <div className="w-12 h-16 bg-surface-container-low flex flex-col items-center justify-center border-b-2 border-tertiary-container">
                    <span className="font-mono text-[0.6875rem]">P0</span>
                  </div>
                  <div className="w-12 h-16 bg-surface-container-low flex flex-col items-center justify-center border-b-2 border-tertiary-container">
                    <span className="font-mono text-[0.6875rem]">P1</span>
                  </div>
                  <div className="w-12 h-16 bg-surface-container-low flex flex-col items-center justify-center border-b-2 border-tertiary-container">
                    <span className="font-mono text-[0.6875rem]">P2</span>
                  </div>
                  <div className="w-12 h-16 bg-surface-container-low flex flex-col items-center justify-center border-b-2 border-error opacity-50">
                    <span className="font-mono text-[0.6875rem]">P3</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Consumers & Locking Layer */}
            <section className="relative z-10 pt-12">
              <div className="text-[0.6875rem] font-label uppercase tracking-[0.05em] text-primary-fixed mb-6 border-b border-surface-container-high pb-2">Active Consumers &amp; Locking</div>
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-surface-container-lowest border border-outline-variant/10 p-5 rounded">
                  <div className="flex justify-between items-center mb-6">
                    <div className="font-mono text-[0.875rem] bg-surface-container-low px-2 py-1 rounded-sm">worker-alpha</div>
                    <span className="material-symbols-outlined text-[16px] text-tertiary-container">lock</span>
                  </div>
                  <div className="text-[0.6875rem] text-primary-fixed uppercase mb-2">Redlock Status</div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-tertiary-container"></div>
                    <span className="font-mono text-[0.875rem]">Acquired</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-surface-container-high flex justify-between text-[0.6875rem]">
                    <span className="text-primary-fixed">TTL</span>
                    <span className="font-mono">45s</span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest border border-outline-variant/10 p-5 rounded">
                  <div className="flex justify-between items-center mb-6">
                    <div className="font-mono text-[0.875rem] bg-surface-container-low px-2 py-1 rounded-sm">worker-beta</div>
                    <span className="material-symbols-outlined text-[16px] text-outline-variant">lock_open</span>
                  </div>
                  <div className="text-[0.6875rem] text-primary-fixed uppercase mb-2">Redlock Status</div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-outline-variant"></div>
                    <span className="font-mono text-[0.875rem] text-primary-fixed">Waiting</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-surface-container-high flex justify-between text-[0.6875rem]">
                    <span className="text-primary-fixed">Queue</span>
                    <span className="font-mono">12</span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest border border-outline-variant/10 p-5 rounded border-t-2 border-t-error">
                  <div className="flex justify-between items-center mb-6">
                    <div className="font-mono text-[0.875rem] bg-surface-container-low px-2 py-1 rounded-sm text-error">worker-gamma</div>
                    <span className="material-symbols-outlined text-[16px] text-error">warning</span>
                  </div>
                  <div className="text-[0.6875rem] text-primary-fixed uppercase mb-2">Redlock Status</div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-error"></div>
                    <span className="font-mono text-[0.875rem] text-error">Timeout</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-surface-container-high flex justify-between text-[0.6875rem]">
                    <span className="text-primary-fixed">Retry</span>
                    <span className="font-mono">3/3</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Side Panel */}
          <div className="col-span-4 space-y-8">
            <div className="bg-surface-container-low p-8 rounded h-full flex flex-col">
              <div className="mb-8">
                <h2 className="font-headline text-[1.5rem] font-medium mb-2">Jitter Monitor</h2>
                <p className="text-[0.875rem] text-primary-fixed">Thundering Herd Mitigation Analysis</p>
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <div className="relative h-48 w-full border-b border-surface-container-highest mb-4">
                  <div className="absolute bottom-0 left-[10%] w-[2px] h-[20%] bg-outline-variant/40"></div>
                  <div className="absolute bottom-0 left-[20%] w-[2px] h-[40%] bg-primary"></div>
                  <div className="absolute bottom-0 left-[30%] w-[2px] h-[80%] bg-primary"></div>
                  <div className="absolute bottom-0 left-[40%] w-[2px] h-[100%] bg-tertiary-container"></div>
                  <div className="absolute bottom-0 left-[50%] w-[2px] h-[70%] bg-primary"></div>
                  <div className="absolute bottom-0 left-[60%] w-[2px] h-[50%] bg-outline-variant/40"></div>
                  <div className="absolute bottom-0 left-[70%] w-[2px] h-[30%] bg-outline-variant/40"></div>
                  <div className="absolute bottom-0 left-[80%] w-[2px] h-[10%] bg-outline-variant/40"></div>
                  
                  <div className="absolute top-[20%] left-[35%] w-1 h-1 bg-primary rounded-full opacity-50"></div>
                  <div className="absolute top-[40%] left-[45%] w-1 h-1 bg-primary rounded-full opacity-50"></div>
                  <div className="absolute top-[10%] left-[40%] w-1.5 h-1.5 bg-tertiary-container rounded-full"></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[0.6875rem] text-primary-fixed uppercase tracking-wider mb-1">Tasks Dist.</div>
                    <div className="font-mono text-[1.125rem]">10,042</div>
                  </div>
                  <div>
                    <div className="text-[0.6875rem] text-primary-fixed uppercase tracking-wider mb-1">Spread Window</div>
                    <div className="font-mono text-[1.125rem]">150ms</div>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-surface-container-highest">
                <button className="w-full bg-transparent border border-outline-variant/40 text-primary py-2 px-4 rounded-sm text-[0.875rem] font-medium hover:bg-surface-container-highest transition-colors flex justify-center items-center gap-2">
                  Adjust Jitter Seed
                  <span className="material-symbols-outlined text-[16px]">tune</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
