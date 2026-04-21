export default function TopologyMap() {
  return (
    <main className="pt-24 xl:ml-80 min-h-screen bg-surface-container-lowest p-8 lg:p-16 flex flex-col relative z-0">
      <header className="mb-24 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1.5 h-1.5 rounded-full bg-tertiary-container shadow-[0_0_12px_rgba(0,133,91,0.6)]"></div>
          <span className="font-mono text-xs text-on-surface-variant uppercase tracking-[0.2em]">Live Telemetry</span>
        </div>
        <h1 className="font-headline text-[3.5rem] leading-none tracking-tight text-primary mb-4">Topology Map</h1>
        <p className="font-body text-[1.125rem] text-on-surface-variant max-w-2xl font-medium">&#39;Exactly-Once&#39; Data Pipeline Configuration &amp; Execution State</p>
      </header>

      <section className="relative w-full max-w-6xl mx-auto mt-12 flex-1 flex items-center justify-center">
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-outline-variant/30 to-transparent -translate-y-1/2 z-0 hidden lg:block"></div>
        <div className="flex flex-col lg:flex-row items-center justify-between w-full gap-8 lg:gap-4 relative z-10">
          
          <div className="group flex flex-col items-center gap-4 w-40">
            <div className="w-20 h-20 rounded-xl bg-surface-container-low flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-1">
              <span className="material-symbols-outlined text-3xl text-primary font-light">person</span>
            </div>
            <div className="text-center">
              <h3 className="font-body text-sm font-semibold text-primary mb-1">User</h3>
              <p className="font-mono text-[0.6875rem] text-on-surface-variant uppercase tracking-widest">ID: EXT-01</p>
            </div>
          </div>
          
          <div className="lg:hidden text-outline-variant/40"><span className="material-symbols-outlined">arrow_downward</span></div>

          <div className="group flex flex-col items-center gap-4 w-40">
            <div className="w-20 h-20 rounded-xl bg-surface-container-low flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-1">
              <span className="material-symbols-outlined text-3xl text-primary font-light">router</span>
            </div>
            <div className="text-center">
              <h3 className="font-body text-sm font-semibold text-primary mb-1">Gateway</h3>
              <p className="font-mono text-[0.6875rem] text-on-surface-variant uppercase tracking-widest">INGRESS_V2</p>
            </div>
          </div>
          
          <div className="lg:hidden text-outline-variant/40"><span className="material-symbols-outlined">arrow_downward</span></div>

          <div className="group flex flex-col items-center gap-4 w-48 relative">
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-tertiary-container shadow-[0_0_12px_rgba(0,133,91,0.5)] z-20"></div>
            <div className="w-24 h-24 rounded-xl bg-surface-container-lowest border border-outline-variant/10 shadow-[0_16px_32px_rgba(94,94,94,0.04)] flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-2 relative z-10">
              <span className="material-symbols-outlined text-4xl text-primary font-light">hub</span>
            </div>
            <div className="text-center">
              <h3 className="font-body text-sm font-semibold text-primary mb-1">Kafka Broker</h3>
              <p className="font-mono text-[0.6875rem] text-tertiary-fixed uppercase tracking-widest bg-surface-container-low px-2 py-1 rounded-sm mt-2">PARTITION_04</p>
            </div>
          </div>

          <div className="lg:hidden text-outline-variant/40"><span className="material-symbols-outlined">arrow_downward</span></div>

          <div className="group flex flex-col items-center gap-4 w-40 relative">
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-tertiary-container z-20"></div>
            <div className="w-20 h-20 rounded-xl bg-surface-container-low flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-1">
              <span className="material-symbols-outlined text-3xl text-primary font-light">memory</span>
            </div>
            <div className="text-center">
              <h3 className="font-body text-sm font-semibold text-primary mb-1">Consumer</h3>
              <p className="font-mono text-[0.6875rem] text-on-surface-variant uppercase tracking-widest">WORKER_X86</p>
            </div>
          </div>

          <div className="lg:hidden text-outline-variant/40"><span className="material-symbols-outlined">arrow_downward</span></div>

          <div className="group flex flex-col items-center gap-4 w-40">
            <div className="w-20 h-20 rounded-xl bg-surface-container-low flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-1">
              <span className="material-symbols-outlined text-3xl text-primary font-light">database</span>
            </div>
            <div className="text-center">
              <h3 className="font-body text-sm font-semibold text-primary mb-1">Destination</h3>
              <p className="font-mono text-[0.6875rem] text-on-surface-variant uppercase tracking-widest">PG_CLUSTER</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="mt-32 max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-outline-variant/10 pt-12">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[0.6875rem] text-on-surface-variant uppercase tracking-widest">Throughput</span>
          <span className="font-headline text-2xl text-primary">45,912 msg/s</span>
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[0.6875rem] text-on-surface-variant uppercase tracking-widest">Latency (P99)</span>
          <span className="font-headline text-2xl text-primary">12.4 ms</span>
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[0.6875rem] text-on-surface-variant uppercase tracking-widest">System Status</span>
          <span className="font-mono text-sm text-tertiary-fixed mt-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            STABLE_EXACTLY_ONCE
          </span>
        </div>
      </footer>
    </main>
  );
}
