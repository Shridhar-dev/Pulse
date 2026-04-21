export default function RegistryExplorer() {
  return (
    <main className="flex-1 max-w-[1600px] w-full mx-auto px-8 py-12 flex flex-col gap-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-0 pb-4">
        <div>
          <h1 className="font-headline text-[3.5rem] tracking-tight leading-none text-primary mb-2">Registry</h1>
          <p className="font-body text-[1.125rem] text-on-surface-variant max-w-2xl">High-fidelity event stream and execution logs.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-transparent border border-outline-variant/10 text-primary font-body text-sm font-medium px-4 py-2 rounded-DEFAULT hover:bg-surface-container-low transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export CSV
          </button>
          <button className="bg-primary text-on-primary font-body text-sm font-medium px-4 py-2 rounded-DEFAULT hover:bg-primary-container transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">play_arrow</span>
            Live Stream
          </button>
        </div>
      </header>

      <section className="bg-surface-container-low rounded-lg p-4 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block font-label text-[0.6875rem] uppercase tracking-widest text-outline mb-2">Idempotency Key</label>
          <input className="w-full bg-transparent border-0 border-b border-outline-variant/20 focus:border-primary focus:ring-0 text-sm font-mono px-0 py-1 transition-colors placeholder-outline/50" placeholder="e.g. req_8f72..." type="text" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block font-label text-[0.6875rem] uppercase tracking-widest text-outline mb-2">Target URL</label>
          <input className="w-full bg-transparent border-0 border-b border-outline-variant/20 focus:border-primary focus:ring-0 text-sm font-mono px-0 py-1 transition-colors placeholder-outline/50" placeholder="api.service.com/..." type="text" />
        </div>
        <div className="w-48">
          <label className="block font-label text-[0.6875rem] uppercase tracking-widest text-outline mb-2">Status</label>
          <div className="relative">
            <select className="w-full bg-transparent border-0 border-b border-outline-variant/20 focus:border-primary focus:ring-0 text-sm font-body px-0 py-1 appearance-none transition-colors">
              <option value="">All Statuses</option>
              <option value="200">200 OK</option>
              <option value="400">4xx Client Error</option>
              <option value="500">5xx Server Error</option>
            </select>
            <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-sm">expand_more</span>
          </div>
        </div>
        <div className="w-48">
          <label className="block font-label text-[0.6875rem] uppercase tracking-widest text-outline mb-2">Time Range</label>
          <div className="relative">
            <select className="w-full bg-transparent border-0 border-b border-outline-variant/20 focus:border-primary focus:ring-0 text-sm font-body px-0 py-1 appearance-none transition-colors">
              <option value="1h">Last 1 Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="custom">Custom...</option>
            </select>
            <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-sm">expand_more</span>
          </div>
        </div>
        <button className="bg-surface text-primary font-body text-sm font-medium px-4 py-2 rounded-DEFAULT hover:bg-surface-dim transition-colors border border-outline-variant/10">
          Clear Filters
        </button>
      </section>

      <section className="bg-surface-container-lowest flex-1 overflow-hidden flex flex-col border border-outline-variant/10 rounded-lg">
        <div className="overflow-x-auto no-scrollbar flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low sticky top-0 z-10">
              <tr>
                <th className="py-3 px-4 font-label text-[0.6875rem] uppercase tracking-widest text-outline font-medium w-12"></th>
                <th className="py-3 px-4 font-label text-[0.6875rem] uppercase tracking-widest text-outline font-medium w-32">Status</th>
                <th className="py-3 px-4 font-label text-[0.6875rem] uppercase tracking-widest text-outline font-medium w-48">Timestamp</th>
                <th className="py-3 px-4 font-label text-[0.6875rem] uppercase tracking-widest text-outline font-medium w-48">Event ID</th>
                <th className="py-3 px-4 font-label text-[0.6875rem] uppercase tracking-widest text-outline font-medium">Target / Operation</th>
                <th className="py-3 px-4 font-label text-[0.6875rem] uppercase tracking-widest text-outline font-medium w-24 text-right">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              <tr className="hover:bg-surface-bright transition-colors group cursor-pointer">
                <td className="py-3 px-4"><div className="w-1.5 h-1.5 rounded-full bg-tertiary-container shadow-[0_0_8px_rgba(0,133,91,0.4)]"></div></td>
                <td className="py-3 px-4"><span className="font-mono text-xs text-tertiary-fixed bg-tertiary-container/10 px-2 py-1 rounded-DEFAULT border border-tertiary-container/20">200 OK</span></td>
                <td className="py-3 px-4 font-mono text-xs text-on-surface-variant">2023-10-27 14:23:45.102</td>
                <td className="py-3 px-4 font-mono text-xs text-on-surface">evt_9k2m4p8v...</td>
                <td className="py-3 px-4"><div className="font-mono text-xs text-on-surface truncate max-w-md">POST /v1/billing/subscriptions/sub_123</div></td>
                <td className="py-3 px-4 font-mono text-xs text-on-surface-variant text-right">124ms</td>
              </tr>
              <tr className="hover:bg-surface-bright transition-colors group cursor-pointer">
                <td className="py-3 px-4"><div className="w-1.5 h-1.5 rounded-full bg-tertiary-container shadow-[0_0_8px_rgba(0,133,91,0.4)]"></div></td>
                <td className="py-3 px-4"><span className="font-mono text-xs text-tertiary-fixed bg-tertiary-container/10 px-2 py-1 rounded-DEFAULT border border-tertiary-container/20">201 CREATED</span></td>
                <td className="py-3 px-4 font-mono text-xs text-on-surface-variant">2023-10-27 14:23:42.881</td>
                <td className="py-3 px-4 font-mono text-xs text-on-surface">evt_7j1n3o9q...</td>
                <td className="py-3 px-4"><div className="font-mono text-xs text-on-surface truncate max-w-md">PUT /api/webhooks/delivery_status</div></td>
                <td className="py-3 px-4 font-mono text-xs text-on-surface-variant text-right">89ms</td>
              </tr>
              <tr className="hover:bg-surface-bright transition-colors group cursor-pointer bg-error-container/5">
                <td className="py-3 px-4"><div className="w-1.5 h-1.5 rounded-none bg-error shadow-[0_0_8px_rgba(186,26,26,0.4)]"></div></td>
                <td className="py-3 px-4"><span className="font-mono text-xs text-error bg-error-container/50 px-2 py-1 rounded-DEFAULT border border-error/20">502 BAD GATEWAY</span></td>
                <td className="py-3 px-4 font-mono text-xs text-on-surface-variant">2023-10-27 14:23:39.015</td>
                <td className="py-3 px-4 font-mono text-xs text-on-surface">evt_5h8l2m7r...</td>
                <td className="py-3 px-4">
                  <div className="font-mono text-xs text-on-surface truncate max-w-md">GET /internal/auth/verify_token</div>
                  <div className="font-mono text-[10px] text-error mt-1">Error: Connection timeout after 5000ms</div>
                </td>
                <td className="py-3 px-4 font-mono text-xs text-error text-right">5002ms</td>
              </tr>
              <tr className="hover:bg-surface-bright transition-colors group cursor-pointer">
                <td className="py-3 px-4"><div className="w-1.5 h-1.5 rounded-full bg-outline shadow-[0_0_8px_rgba(119,119,119,0.4)]"></div></td>
                <td className="py-3 px-4"><span className="font-mono text-xs text-outline bg-surface-container-high px-2 py-1 rounded-DEFAULT border border-outline-variant/30">429 TOO MANY REQ</span></td>
                <td className="py-3 px-4 font-mono text-xs text-on-surface-variant">2023-10-27 14:23:35.442</td>
                <td className="py-3 px-4 font-mono text-xs text-on-surface">evt_3f6k1j5p...</td>
                <td className="py-3 px-4"><div className="font-mono text-xs text-on-surface truncate max-w-md">POST /v2/analytics/ingest</div></td>
                <td className="py-3 px-4 font-mono text-xs text-on-surface-variant text-right">12ms</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="bg-surface-container-low border-t border-outline-variant/10 p-3 flex justify-between items-center">
          <span className="font-body text-xs text-on-surface-variant">Showing 1-4 of 14,293 events</span>
          <div className="flex gap-1">
            <button className="p-1 text-outline hover:text-primary transition-colors disabled:opacity-50" disabled={true}>
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button className="p-1 text-outline hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
