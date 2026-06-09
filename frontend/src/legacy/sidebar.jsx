import React, { useState, useEffect, useRef, useMemo, useCallback, useContext } from 'react';
import { Icon, MODULES, Badge, SectionLabel, Stat, ProgressBar, RadialGauge, Sparkline, Btn, Kbd, Card, StatusDot, KV, PageHeader, PatientStrip, PatientPhoto, applyAccent, Tip, InfoTip, AIOverride, Modal, MfaInput, ToastProvider, useToasts, fmtTime, FLAG_DEFS } from './ui.jsx';
// ============================================================
// Sidebar — Clinical light theme (responsive drawer)
// ============================================================

function Sidebar({ active, setActive, offline, setOffline, running, runAnalysis, onLogout, open, onClose }) {
  const modKeys = ["hub", "axia", "smartliva", "picha"];
  const time = useClock();

  return (
    <>
      {/* Mobile/tablet backdrop */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/40 z-30 backdrop-blur-[1px]"
          onClick={onClose}
        />
      )}

      <aside
        data-screen-label="00 Sidebar"
        className={`flex flex-col border-r hairline shrink-0
          fixed lg:sticky top-0 left-0 h-screen z-40 lg:z-10
          w-[280px] lg:w-[240px] xl:w-[260px]
          transition-transform duration-200
          ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        style={{ background: "var(--surface)" }}
      >
        {/* Brand */}
        <div className="px-4 lg:px-5 pt-4 lg:pt-5 pb-3.5 lg:pb-4 border-b hairline flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-9 h-9 rounded-md grid place-items-center shrink-0" style={{ background: "var(--accent)" }}>
              <div className="w-3.5 h-3.5 rounded-sm bg-white" style={{ clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)" }} />
            </div>
            <div className="leading-tight whitespace-nowrap min-w-0">
              <div className="text-[15px] font-semibold tracking-[-0.01em] t-primary">APEX</div>
              <div className="text-[11px] t-muted">Clinical AI Suite</div>
            </div>
          </div>
          <button className="lg:hidden w-8 h-8 rounded-md grid place-items-center hover:bg-slate-100 t-secondary" onClick={onClose} aria-label="Close menu">
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Session */}
        <div className="px-4 lg:px-5 py-3.5 border-b hairline">
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-full bg-slate-100 grid place-items-center text-[12px] font-semibold t-primary border hairline-strong shrink-0">
              PT
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
            </div>
            <div className="leading-tight min-w-0 flex-1">
              <div className="text-[13px] font-semibold t-primary truncate">Dr. Phuripol T.</div>
              <div className="text-[11.5px] t-muted truncate">Chief Clinical Officer</div>
            </div>
            <button onClick={onLogout} className="w-7 h-7 rounded-md hover:bg-slate-100 grid place-items-center t-muted shrink-0" title="Sign out">
              <Icon name="log-out" size={14} />
            </button>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
            <Badge tone="ok"><StatusDot tone="ok" />On-shift</Badge>
            <Badge tone="neutral">{time}</Badge>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <div className="px-2 mb-2 label-eyebrow">Modules</div>
          <div className="space-y-0.5">
            {modKeys.map((k) => {
              const m = MODULES[k];
              const isActive = active === k;
              return (
                <button
                  key={k}
                  data-active={isActive}
                  onClick={() => setActive(k)}
                  className={`nav-item w-full flex items-center gap-2.5 pl-3 pr-2.5 py-2 rounded-md text-left accent-transition
                    ${isActive ? "" : "hover:bg-slate-50"}`}
                >
                  <span
                    className="nav-icon w-7 h-7 rounded-md grid place-items-center border accent-transition shrink-0"
                    style={!isActive ? { borderColor: "var(--line)", color: "#475569", background: "var(--surface-2)" } : undefined}
                  >
                    <Icon name={m.icon} size={14} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <div className={`text-[13px] font-semibold leading-tight ${isActive ? "" : "t-primary"}`}>
                      {m.short}
                    </div>
                    <div className={`text-[11px] leading-tight truncate ${isActive ? "opacity-80" : "t-muted"}`}>{m.long}</div>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="px-2 mt-5 mb-2 label-eyebrow">Active worklist</div>
          <div className="space-y-0.5">
            {CASES.map((c) => (
              <button key={c.id} className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: MODULES[c.mod].accent }} />
                  <div className="text-[12.5px] t-primary font-medium truncate flex-1">{c.id}</div>
                  <div className="text-[11px] t-muted shrink-0">{c.age}</div>
                </div>
                <div className="pl-3.5 text-[11.5px] t-muted truncate">{c.label} · {c.where}</div>
              </button>
            ))}
          </div>

          <div className="px-2 mt-5 mb-2 label-eyebrow">System</div>
          <div className="space-y-0.5">
            <SideLink icon="bell" label="Notifications" right={<Badge tone="danger">3</Badge>} />
            <SideLink icon="history" label="Audit log" />
            <SideLink icon="book-open" label="Documentation" />
            <SideLink icon="settings" label="Preferences" />
          </div>
        </nav>

        {/* Footer */}
        <div className="px-3 pt-3 pb-3.5 border-t hairline space-y-2.5">
          <div className="px-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Icon name={offline ? "wifi-off" : "wifi"} size={14} className={offline ? "text-[#b15c00]" : "text-emerald-600"} />
              <div className="leading-tight whitespace-nowrap min-w-0">
                <div className="text-[12.5px] font-medium t-primary">Offline inference</div>
                <div className="text-[11px] t-muted">Local GPU only</div>
              </div>
            </div>
            <div className={`switch shrink-0 ${offline ? "on" : ""}`} onClick={() => setOffline(!offline)} />
          </div>
          <Btn icon={running ? "loader" : "play"} className="w-full" onClick={runAnalysis} disabled={running}>
            {running ? "Analyzing…" : "Run AI analysis"}
          </Btn>
        </div>
      </aside>
    </>
  );
}

function SideLink({ icon, label, right }) {
  return (
    <button className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md hover:bg-slate-50 text-left">
      <Icon name={icon} size={14} className="text-slate-500" />
      <span className="flex-1 text-[12.5px] t-primary">{label}</span>
      {right}
    </button>
  );
}

function useClock() {
  const [t, setT] = useState(() => fmt(new Date()));
  useEffect(() => {
    const id = setInterval(() => setT(fmt(new Date())), 30 * 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}
function fmt(d) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }) + " ICT";
}

const CASES = [
  { id: "C-44211", label: "ICH · frontal", where: "ED-3", age: "74F", mod: "axia" },
  { id: "C-44208", label: "Hepatic nodule", where: "GI-OPD", age: "58M", mod: "smartliva" },
  { id: "C-44197", label: "CCA grade-3", where: "Path-Lab", age: "63M", mod: "picha" },
  { id: "C-44193", label: "Midline shift", where: "ICU-7", age: "81F", mod: "axia" },
];



export default Sidebar;