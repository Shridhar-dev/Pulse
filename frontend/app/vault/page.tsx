export default function VaultSettings() {
  return (
    <main className="pt-24 pb-16 px-6 md:px-12 max-w-6xl mx-auto flex gap-12">
      <div className="flex-1 space-y-16">
        <header>
          <h1 className="font-headline text-[3.5rem] leading-none tracking-[-0.02em] text-primary mb-4">The Vault</h1>
          <p className="font-body text-[1.125rem] text-on-surface-variant max-w-2xl">Manage your API keys, authentication tokens, and infrastructure access credentials.</p>
        </header>

        <section className="bg-surface-container-low p-1 rounded-md">
          <div className="bg-surface-container-lowest p-8 rounded-DEFAULT">
            <div className="flex items-start justify-between mb-8">
              <div>
                <h2 className="font-body text-[1.125rem] font-semibold text-on-surface mb-1">Gemini AI Access</h2>
                <p className="font-body text-[0.875rem] text-on-surface-variant">Bring Your Own Key (BYOK) configuration for internal models.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container ring-4 ring-tertiary-container/20"></span>
                <span className="font-label text-[0.6875rem] uppercase tracking-[0.05em] text-tertiary-container font-medium">Active</span>
              </div>
            </div>
            <form className="space-y-6">
              <div className="space-y-2">
                <label className="font-label text-[0.6875rem] uppercase tracking-[0.05em] text-on-surface-variant transition-colors group-focus-within:text-primary block">API Key</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-0 text-on-surface-variant text-[18px]">key</span>
                  <input className="w-full bg-transparent border-0 border-b border-outline-variant/20 py-2 pl-7 pr-10 font-mono text-[0.875rem] text-on-surface focus:ring-0 focus:border-primary transition-colors" readOnly={true} type="password" value="AIzaSyB................................" />
                  <button className="absolute right-0 text-on-surface-variant hover:text-primary transition-colors" type="button">
                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                  </button>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button className="bg-surface-container hover:bg-surface-dim text-on-surface px-6 py-2 rounded-DEFAULT font-body text-[0.875rem] font-medium transition-colors" type="button">Rotate Key</button>
                <button className="bg-transparent border border-outline-variant/10 text-error hover:bg-error-container/50 px-6 py-2 rounded-DEFAULT font-body text-[0.875rem] font-medium transition-colors" type="button">Revoke</button>
              </div>
            </form>
          </div>
        </section>

        <section className="bg-surface-container-low p-1 rounded-md">
          <div className="bg-surface-container-lowest p-8 rounded-DEFAULT">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-body text-[1.125rem] font-semibold text-on-surface mb-1">Active Keys</h2>
                <p className="font-body text-[0.875rem] text-on-surface-variant">Tokens used for external integrations.</p>
              </div>
              <button className="bg-primary text-on-primary px-5 py-2 rounded-sm font-body text-[0.875rem] font-medium hover:opacity-90 transition-opacity flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">add</span>
                Create Key
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-4 border-b border-outline-variant/10 last:border-0">
                <div>
                  <h3 className="font-body text-[0.875rem] font-medium text-on-surface">Production Web App</h3>
                  <p className="font-mono text-[0.6875rem] text-on-surface-variant mt-1">pk_live_********************8f92</p>
                </div>
                <div className="flex items-center gap-6">
                  <span className="font-body text-[0.875rem] text-on-surface-variant">Created Oct 12, 2023</span>
                  <button className="text-on-surface-variant hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[20px]">more_horiz</span>
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between py-4 border-b border-outline-variant/10 last:border-0">
                <div>
                  <h3 className="font-body text-[0.875rem] font-medium text-on-surface">Staging Environment</h3>
                  <p className="font-mono text-[0.6875rem] text-on-surface-variant mt-1">pk_test_********************4a1b</p>
                </div>
                <div className="flex items-center gap-6">
                  <span className="font-body text-[0.875rem] text-on-surface-variant">Created Jan 05, 2024</span>
                  <button className="text-on-surface-variant hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[20px]">more_horiz</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
