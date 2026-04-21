export default function SettingsConfig() {
  return (
    <div className="flex flex-1 overflow-hidden h-[calc(100vh-65px)] bg-surface-container-lowest">
      {/* RIGHT SIDEBAR: Gemini SRE Assistant */} {/* Testing on left side */}
      <aside className="hidden xl:flex flex-col p-6 h-[calc(100vh-65px)] w-80 bg-surface-container-lowest border-l border-outline-variant/10 z-20 shrink-0">
        <div className="mb-8">
          <h2 className="font-headline font-bold text-lg text-tertiary tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined">auto_awesome</span>
            Gemini SRE
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mt-2">Operational Intelligence</p>
        </div>
        <div className="flex-1 flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant">Inference Model</label>
            <div className="relative">
              <select className="w-full appearance-none bg-surface-container-lowest border border-outline-variant/10 text-primary font-body text-sm rounded-DEFAULT py-2.5 pl-3 pr-10 focus:ring-0 focus:border-tertiary transition-colors shadow-sm">
                <option>Gemini 1.5 Pro</option>
                <option>Gemini 1.5 Flash</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">expand_more</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant">Telemetry Access Level</label>
            <div className="flex flex-col gap-2 mt-1">
              <label className="flex items-start gap-3 p-3 bg-surface-container-lowest rounded-DEFAULT border border-tertiary shadow-sm cursor-pointer">
                <input defaultChecked className="mt-0.5 text-tertiary focus:ring-tertiary bg-surface-container-lowest border-outline-variant" name="access" type="radio" />
                <div className="flex flex-col">
                  <span className="font-body text-sm font-medium text-primary">Full Cluster View</span>
                  <span className="font-body text-xs text-on-surface-variant mt-0.5">Allows model to read all logs and metrics.</span>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 bg-transparent rounded-DEFAULT border border-outline-variant/10 cursor-pointer opacity-70 hover:opacity-100 transition-opacity">
                <input className="mt-0.5 text-tertiary focus:ring-tertiary bg-surface-container-lowest border-outline-variant" name="access" type="radio" />
                <div className="flex flex-col">
                  <span className="font-body text-sm font-medium text-primary">Scoped Context</span>
                  <span className="font-body text-xs text-on-surface-variant mt-0.5">Model only sees manually provided traces.</span>
                </div>
              </label>
            </div>
          </div>
        </div>
        <div className="mt-auto pt-6 border-t border-outline-variant/10 flex items-center justify-between">
          <span className="font-mono text-[10px] text-on-surface-variant">Status: Online</span>
          <div className="w-2 h-2 rounded-full bg-tertiary shadow-[0_0_8px_rgba(0,133,91,0.4)] animate-pulse"></div>
        </div>
      </aside>
      {/* LEFT SIDEBAR: Admin Navigation */}
      {/* <aside className="flex flex-col p-4 h-full w-64 bg-surface-container-lowest border-r border-outline-variant/10 flex-shrink-0 z-10 relative">
        <div className="px-4 py-6 mb-4">
          <h1 className="font-headline font-bold text-xl text-primary tracking-tighter">Pulse Admin</h1>
          <p className="text-on-surface-variant font-label text-xs mt-1">Infrastructure Management</p>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          <a className="flex items-center gap-3 px-3 py-2.5 bg-surface-container text-primary rounded-DEFAULT transition-all duration-200 ease-in-out group" href="#">
            <span className="material-symbols-outlined text-[20px]">person</span>
            <span className="font-label text-[13px] font-medium">Profile</span>
          </a>
          <a className="flex items-center gap-3 px-3 py-2.5 text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-all duration-200 ease-in-out rounded-DEFAULT group" href="#">
            <span className="material-symbols-outlined text-[20px]">dns</span>
            <span className="font-label text-[13px] font-medium">Infrastructure</span>
          </a>
          <a className="flex items-center gap-3 px-3 py-2.5 text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-all duration-200 ease-in-out rounded-DEFAULT group" href="#">
            <span className="material-symbols-outlined text-[20px]">terminal</span>
            <span className="font-label text-[13px] font-medium">API</span>
          </a>
          <a className="flex items-center gap-3 px-3 py-2.5 text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-all duration-200 ease-in-out rounded-DEFAULT group" href="#">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="font-label text-[13px] font-medium">Notifications</span>
          </a>
          <a className="flex items-center gap-3 px-3 py-2.5 text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-all duration-200 ease-in-out rounded-DEFAULT group" href="#">
            <span className="material-symbols-outlined text-[20px]">smart_toy</span>
            <span className="font-label text-[13px] font-medium">AI Assistant</span>
          </a>
        </nav>
        <div className="mt-auto px-2">
          <button className="w-full bg-primary text-on-primary font-label text-sm font-medium py-2.5 rounded-DEFAULT hover:bg-primary-container transition-colors shadow-sm">
            Upgrade Plan
          </button>
        </div>
      </aside> */}

      {/* CENTER COLUMN: Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto bg-surface-container-lowest relative">
        <div className="max-w-4xl w-full mx-auto px-12 py-16 flex flex-col gap-16">
          <header>
            <h2 className="font-headline text-[3.5rem] leading-none tracking-[-0.02em] text-primary">Settings</h2>
          </header>

          {/* 1. Profile Section */}
          <section className="flex flex-col gap-6">
            <h3 className="font-headline text-2xl font-medium text-primary tracking-tight">Identity</h3>
            <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm border border-outline-variant/10 flex gap-10 items-start">
              <div className="flex flex-col items-center gap-4">
                <div className="w-24 h-24 rounded-full bg-surface-container-low flex items-center justify-center overflow-hidden relative group cursor-pointer border border-outline-variant/10">
                  <img alt="Profile avatar" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDRbvUnIP5tS8CcndjDHf64KnFaUFO83MrZN76exqtudK0UD9EYp-V_ZaXY4l95JS3XZSoymKtTQ-Pk22e2YOcjbrH2M0Xwyci7SrEy5uJOzrqd-aqmErMDMRmukI3p2WiBLA4r4youd5VPPrawmjpWVipyhgXFiYnJTZ2otHGVdD7rU4zNC4CrvyUE_J9SR-PIUAtYmAOMIzqnIso1LKVXvFsvRGtJFH8WiEYOLD_VtKT50YO268smfijhV6Xfkpl37cEoiFDVlQ" />
                  <div className="absolute inset-0 bg-primary/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-white">upload</span>
                  </div>
                </div>
                <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">Update</span>
              </div>
              <div className="flex-1 flex flex-col gap-6">
                <div className="flex flex-col gap-1 relative">
                  <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant">Full Name</label>
                  <input className="w-full bg-transparent border-0 border-b border-outline-variant/20 px-0 py-2 text-primary font-body text-sm focus:ring-0 focus:border-primary transition-colors" type="text" defaultValue="Elena Rostova" />
                </div>
                <div className="flex flex-col gap-1 relative">
                  <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant">Work Email</label>
                  <input className="w-full bg-transparent border-0 border-b border-outline-variant/20 px-0 py-2 text-primary font-body text-sm focus:ring-0 focus:border-primary transition-colors" type="email" defaultValue="elena.rostova@pulse.dev" />
                </div>
                <div className="flex flex-col gap-1 relative">
                  <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant">Role Designation</label>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center justify-center bg-surface-container-low text-primary font-mono text-xs px-2.5 py-1 rounded-sm border border-outline-variant/10">SRE Lead</span>
                    <span className="inline-flex items-center justify-center bg-tertiary-container/10 text-tertiary font-mono text-xs px-2.5 py-1 rounded-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-tertiary mr-1.5 shadow-[0_0_8px_rgba(0,133,91,0.4)]"></span> Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 2. Infrastructure Section */}
          <section className="flex flex-col gap-6">
            <h3 className="font-headline text-2xl font-medium text-primary tracking-tight">Active Topography</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-surface-container-low p-6 rounded-lg flex flex-col justify-between aspect-[4/3]">
                <div className="flex justify-between items-start">
                  <span className="material-symbols-outlined text-on-surface-variant">public</span>
                </div>
                <div>
                  <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-1">Azure Region</p>
                  <p className="font-mono text-primary text-sm">US-East-1</p>
                </div>
              </div>
              <div className="bg-surface-container-low p-6 rounded-lg flex flex-col justify-between aspect-[4/3]">
                <div className="flex justify-between items-start">
                  <span className="material-symbols-outlined text-on-surface-variant">schema</span>
                </div>
                <div>
                  <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-1">Kafka Version</p>
                  <p className="font-mono text-primary text-sm">3.5.1</p>
                </div>
              </div>
              <div className="bg-surface-container-low p-6 rounded-lg flex flex-col justify-between aspect-[4/3]">
                <div className="flex justify-between items-start">
                  <span className="material-symbols-outlined text-on-surface-variant">view_stream</span>
                </div>
                <div>
                  <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-1">Partition Count</p>
                  <p className="font-mono text-primary text-sm">3</p>
                </div>
              </div>
            </div>
          </section>

          {/* 3. API & Keys */}
          <section className="flex flex-col gap-6">
            <h3 className="font-headline text-2xl font-medium text-primary tracking-tight">Security Credentials</h3>
            <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm border border-outline-variant/10 flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-body text-base font-semibold text-primary">Gemini API Configuration</h4>
                  <p className="font-body text-sm text-on-surface-variant mt-1">Bring Your Own Key (BYOK) active for telemetry inference.</p>
                </div>
                <span className="inline-flex items-center justify-center bg-surface-container-low text-primary font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm border border-outline-variant/10">Production</span>
              </div>
              <div className="bg-surface-container-low p-4 rounded-md flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px]">key</span>
                  <code className="font-mono text-sm text-primary">sk-gemini-***************************8f9a</code>
                </div>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant hover:text-primary">
                  <span className="material-symbols-outlined text-[18px]">content_copy</span>
                </button>
              </div>
              <div className="flex items-center gap-4 pt-2">
                <button className="bg-primary text-on-primary font-label text-xs uppercase tracking-widest px-6 py-2.5 rounded-DEFAULT hover:bg-primary-container transition-colors">Rotate Key</button>
                <button className="bg-transparent border border-error/30 text-error font-label text-xs uppercase tracking-widest px-6 py-2.5 rounded-DEFAULT hover:bg-error/5 transition-colors">Revoke Access</button>
              </div>
            </div>
          </section>

          {/* 4. Notifications */}
          <section className="flex flex-col gap-6">
            <h3 className="font-headline text-2xl font-medium text-primary tracking-tight">Alert Horizons</h3>
            <div className="bg-surface-container-lowest rounded-lg shadow-sm border border-outline-variant/10 flex flex-col">
              <div className="flex items-center justify-between p-6">
                <div>
                  <p className="font-body text-sm font-semibold text-primary">System Lag Alerts</p>
                  <p className="font-body text-xs text-on-surface-variant mt-1">Notify when Kafka consumer lag exceeds 500ms threshold.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input defaultChecked className="sr-only peer" type="checkbox" value="" />
                  <div className="w-9 h-5 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-tertiary"></div>
                </label>
              </div>
              <div className="w-full h-4 bg-surface-container-low/30"></div>
              <div className="flex items-center justify-between p-6">
                <div>
                  <p className="font-body text-sm font-semibold text-error">Kill Switch Activation</p>
                  <p className="font-body text-xs text-on-surface-variant mt-1">Require multi-factor approval before dropping partitions.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input className="sr-only peer" type="checkbox" value="" />
                  <div className="w-9 h-5 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-error"></div>
                </label>
              </div>
            </div>
          </section>
        </div>
      </main>

      
    </div>
  );
}
