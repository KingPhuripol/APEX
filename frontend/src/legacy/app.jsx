import React, { useState, useEffect, useCallback } from 'react';
import Login from './login.jsx';
import Hub from './hub.jsx';
import Axia from './axia.jsx';
import SmartLiva from './smartliva.jsx';
import Picha from './picha.jsx';
import Sidebar from './sidebar.jsx';
import { applyAccent, MODULES, Icon, StatusDot } from './ui.jsx';

// ============================================================
// App — APEX Clinical AI Suite (root)
// ============================================================

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [active, setActive] = useState("hub");
  const [offline, setOffline] = useState(true);
  const [running, setRunning] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    applyAccent(MODULES[active]);
  }, [active]);

  // close drawer on tab switch (mobile)
  useEffect(() => {
    setNavOpen(false);
  }, [active]);

  const runAnalysis = useCallback(() => {
    setRunning(true);
    setTimeout(() => setRunning(false), 2400);
  }, []);

  if (!authed) {
    return <Login onLogin={() => setAuthed(true)} />;
  }

  const m = MODULES[active];

  return (
    <div className="flex relative min-h-screen" data-screen-label={m.name}>
      <Sidebar
        active={active}
        setActive={setActive}
        offline={offline}
        setOffline={setOffline}
        running={running}
        runAnalysis={runAnalysis}
        onLogout={() => setAuthed(false)}
        open={navOpen}
        onClose={() => setNavOpen(false)}
      />
      <main className="flex-1 min-w-0">
        {/* Topbar */}
        <div className="h-14 px-4 sm:px-6 border-b hairline flex items-center gap-3 sticky top-0 z-20" style={{ background: "var(--surface)" }}>
          <button
            className="lg:hidden w-9 h-9 rounded-md grid place-items-center border hairline hover:bg-slate-50 t-secondary shrink-0"
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
          >
            <Icon name="menu" size={16} />
          </button>
          <Breadcrumb mod={m} />
          <div className="ml-auto flex items-center gap-2">
            <GlobalSearch />
            <button className="hidden md:grid w-9 h-9 rounded-md place-items-center border hairline hover:bg-slate-50 t-secondary" title="Help">
              <Icon name="circle-help" size={15} />
            </button>
            <button className="w-9 h-9 rounded-md grid place-items-center border hairline hover:bg-slate-50 t-secondary relative" title="Notifications">
              <Icon name="bell" size={15} />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#c1272d] border-2 border-white" />
            </button>
          </div>
        </div>

        {/* Page body */}
        <div className="px-4 sm:px-6 py-4 sm:py-5" key={active}>
          {active === "hub" && <Hub running={running} offline={offline} runAnalysis={runAnalysis} setActive={setActive} />}
          {active === "axia" && <Axia running={running} />}
          {active === "smartliva" && <SmartLiva running={running} />}
          {active === "picha" && <Picha running={running} />}

          <Footer offline={offline} />
        </div>
      </main>
    </div>
  );
}

function Breadcrumb({ mod }) {
  return (
    <div className="flex items-center gap-2 text-[13px] whitespace-nowrap min-w-0">
      <Icon name="layout-grid" size={14} className="t-muted hidden sm:inline-flex" />
      <span className="t-muted hidden sm:inline">APEX Suite</span>
      <Icon name="chevron-right" size={12} className="t-dim hidden sm:inline-flex" />
      <span
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border accent-transition shrink-0"
        style={{ background: "var(--accent-soft)", color: "var(--accent-text)", borderColor: "var(--accent)" }}
      >
        <Icon name={mod.icon} size={12} />
        <span className="font-semibold">{mod.name}</span>
      </span>
      <Icon name="chevron-right" size={12} className="t-dim hidden md:inline-flex" />
      <span className="t-secondary hidden md:inline truncate">{mod.long}</span>
    </div>
  );
}

function GlobalSearch() {
  return (
    <div className="hidden md:flex items-center gap-2 px-2.5 h-9 rounded-md border hairline w-[260px] xl:w-[320px]" style={{ background: "var(--surface)" }}>
      <Icon name="search" size={14} className="t-muted" />
      <input
        placeholder="Patient, MRN, study…"
        className="flex-1 min-w-0 bg-transparent outline-none text-[13px] t-primary placeholder:t-muted"
      />
      <span className="hidden xl:inline-flex font-mono text-[10.5px] t-muted px-1.5 py-0.5 rounded border hairline">⌘ K</span>
    </div>
  );
}

function Footer({ offline }) {
  return (
    <div className="mt-6 pt-4 border-t hairline flex flex-wrap items-center justify-between gap-y-2 text-[11.5px] t-muted">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>APEX Clinical AI Suite · v2.6.1</span>
        <span className="hidden sm:inline">·</span>
        <span>HIPAA · PDPA</span>
        <span className="hidden md:inline">·</span>
        <span className="hidden md:inline">FDA 510(k) K231104</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <StatusDot tone={offline ? "warn" : "ok"} />
          {offline ? "Local inference (offline)" : "Cloud telemetry on"}
        </span>
      </div>
    </div>
  );
}