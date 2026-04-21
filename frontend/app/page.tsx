export default function NexusLanding() {
  return (
    <main className="w-full flex flex-col items-center overflow-hidden">
      {/* Hero Section: Atmospheric Precision */}
      <section className="relative w-full max-w-7xl mx-auto px-8 pt-32 pb-48 flex flex-col items-center text-center">
        {/* Abstract Pulse Visualization (CSS/SVG) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] pointer-events-none -z-10 overflow-hidden flex justify-center items-start pt-20 opacity-40">
          <svg fill="none" height="400" viewBox="0 0 800 400" width="800" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 200 L 250 200 L 300 100 L 350 300 L 400 50 L 450 350 L 500 150 L 550 200 L 800 200" stroke="#c6c6c6" strokeDasharray="4 4" strokeWidth="1"></path>
            <circle className="animate-pulse" cx="400" cy="50" fill="#00855b" r="6"></circle>
            <circle className="animate-pulse" cx="400" cy="50" fill="#00855b" opacity="0.2" r="16"></circle>
          </svg>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container-low rounded-full mb-8">
          <span className="w-2 h-2 rounded-full bg-tertiary-container relative">
            <span className="absolute inset-0 rounded-full bg-tertiary-container opacity-50 animate-ping"></span>
          </span>
          <span className="text-xs font-label uppercase tracking-widest text-on-surface-variant font-medium">System Online</span>
        </div>
        <h1 className="text-[4.5rem] leading-[1.05] tracking-tight font-headline font-bold text-primary max-w-4xl mb-6">
          Precision at Scale.
        </h1>
        <p className="text-lg text-on-surface-variant max-w-2xl font-body leading-relaxed mb-12">
          Infrastructure intelligence engineered for the absolute edge. Ensure <span className="text-primary font-semibold">Exactly-Once Delivery</span> and process over <span className="text-primary font-semibold">10k+ TPS</span> with zero latency overhead.
        </p>
        <div className="flex items-center gap-4">
          <button className="bg-primary text-on-primary px-6 py-3 rounded text-sm font-semibold hover:bg-primary-container transition-colors tracking-wide">
            Initialize Pulse
          </button>
          <button className="bg-transparent text-primary px-6 py-3 rounded text-sm font-medium ring-1 ring-outline-variant/30 hover:bg-surface-container transition-colors tracking-wide">
            Read Documentation
          </button>
        </div>
      </section>

      {/* Bento Grid Section: Tonal Shifts */}
      <section className="w-full bg-surface-container-low py-24 px-8 relative">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-outline-variant/10"></div>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Feature 1: Exactly-Once */}
            <div className="col-span-1 md:col-span-2 bg-surface-container-lowest rounded-lg p-10 flex flex-col justify-between group">
              <div className="mb-12">
                <span className="material-symbols-outlined text-primary mb-4 text-[28px]">verified</span>
                <h3 className="font-headline text-2xl font-semibold tracking-tight text-primary mb-2">Exactly-Once Delivery</h3>
                <p className="text-on-surface-variant font-body text-sm max-w-md leading-relaxed">
                  Our bespoke idempotency engine guarantees message delivery precisely one time. No duplicates, no drops, even across multi-region partition failures.
                </p>
              </div>
              {/* Technical Snippet */}
              <div className="bg-surface-bright rounded p-6 ring-1 ring-outline-variant/10 font-mono text-sm text-on-surface-variant">
                <div className="flex justify-between items-center mb-4 border-b border-outline-variant/10 pb-2">
                  <span className="text-xs uppercase tracking-widest text-secondary">Transaction Log</span>
                  <span className="text-tertiary-container flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">check_circle</span> Verified</span>
                </div>
                <div className="space-y-2 opacity-80">
                  <div><span className="text-secondary mr-4">01</span><span className="text-primary">await</span> pulse.commit({'{'}</div>
                  <div><span className="text-secondary mr-4">02</span>  idempotencyKey: <span className="text-tertiary">&#39;req_9A4f2B&#39;</span>,</div>
                  <div><span className="text-secondary mr-4">03</span>  payload: payload_buffer,</div>
                  <div><span className="text-secondary mr-4">04</span>  level: <span className="text-tertiary">&#39;EXACTLY_ONCE&#39;</span></div>
                  <div><span className="text-secondary mr-4">05</span>{'}'});</div>
                </div>
              </div>
            </div>

            {/* Feature 2: High Throughput */}
            <div className="col-span-1 bg-surface-container-lowest rounded-lg p-10 flex flex-col justify-between">
              <div>
                <span className="material-symbols-outlined text-primary mb-4 text-[28px]">speed</span>
                <h3 className="font-headline text-2xl font-semibold tracking-tight text-primary mb-2">10k+ TPS</h3>
                <p className="text-on-surface-variant font-body text-sm leading-relaxed mb-8">
                  Sustained throughput capabilities built for hyper-growth endpoints.
                </p>
              </div>
              {/* Minimalist Gauge */}
              <div className="w-full flex flex-col items-center justify-center py-8 relative">
                <svg className="w-full h-auto max-w-[200px] overflow-visible" viewBox="0 0 100 50">
                  <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#f0f1f1" strokeLinecap="round" strokeWidth="8"></path>
                  <path className="drop-shadow-[0_0_8px_rgba(0,133,91,0.3)]" d="M 10 50 A 40 40 0 0 1 70 20" fill="none" stroke="#00855b" strokeLinecap="round" strokeWidth="8"></path>
                </svg>
                <div className="absolute bottom-4 flex flex-col items-center">
                  <span className="font-headline text-3xl font-bold text-primary tracking-tighter">12,408</span>
                  <span className="font-label text-[10px] uppercase tracking-widest text-secondary mt-1">Req / Sec</span>
                </div>
              </div>
            </div>

            {/* Feature 3: Global Topology */}
            <div className="col-span-1 md:col-span-3 bg-surface-container-lowest rounded-lg p-10 flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="md:w-1/3">
                <h3 className="font-headline text-2xl font-semibold tracking-tight text-primary mb-3">Global Topology</h3>
                <p className="text-on-surface-variant font-body text-sm leading-relaxed mb-6">
                  Distributed globally, managed centrally. Pulse operates across 34 regions with sub-millisecond inter-node communication latency.
                </p>
                <a className="text-primary font-medium text-sm flex items-center gap-1 hover:gap-2 transition-all" href="/topology">
                  View Node Registry <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </a>
              </div>
              <div className="md:w-2/3 w-full h-[300px] rounded bg-surface-container flex items-center justify-center relative overflow-hidden">
                <img alt="Global server network visualization" className="w-full h-full object-cover opacity-80 mix-blend-multiply grayscale" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAiwB6wS7tVUhA9XSC453x_ABCPZ6LPkwUpR3OcK5hPHXEhNbE1CeUZX7CjnWypUjdvbGf_fYUWRuBowaFjDAdOkJVVVQ_y7yfh2PgJ0IMANyTuADD_jW1V9SGhPH1sgsU9veenhhrY4TmkX3q6Wu49r4wVUgsWWAxjUnMeWjm79DWXtQ2x8N-FJi-0tTrscKQgW_EGZBMZd3O8bfOS0XBEYQHxlgEM09rW8RhZQNhjKSWUdE-5NWa9wfxDuSKu0sJlyDSqKusOjA" />
                <div className="absolute top-[30%] left-[20%] w-3 h-3 rounded-full bg-tertiary-container shadow-[0_0_10px_rgba(0,133,91,0.5)]"></div>
                <div className="absolute top-[40%] left-[45%] w-3 h-3 rounded-full bg-tertiary-container shadow-[0_0_10px_rgba(0,133,91,0.5)]"></div>
                <div className="absolute top-[60%] left-[75%] w-3 h-3 rounded-full bg-tertiary-container shadow-[0_0_10px_rgba(0,133,91,0.5)]"></div>
              </div>
            </div>

          </div>
        </div>
      </section>
    </main>
  );
}
