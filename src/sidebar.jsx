// ============================================================
// Sidebar — Patient-centric nav + offline confirm + active case
// ============================================================

function Sidebar({ view, setView, activePatient, activeStudyMod, onSwitchStudy, offline, setOffline, onLogout, onOpenWorklist, open, onClose }) {
  const [confirmOffline, setConfirmOffline] = useState(false);
  const time = useClock();

  const handleOfflineToggle = () => {
    setConfirmOffline(true);
  };

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
            <div
              className="relative w-9 h-9 rounded-md grid place-items-center shrink-0"
              style={{ background: "var(--accent)" }}
            >
              <div className="w-3.5 h-3.5 rounded-sm bg-white" style={{ clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)" }} />
            </div>
            <div className="leading-tight whitespace-nowrap min-w-0">
              <div className="text-[15px] font-semibold tracking-[-0.01em] t-primary">APEX</div>
              <div className="text-[11px] t-muted">Clinical AI Suite</div>
            </div>
          </div>
          <button
            className="lg:hidden w-8 h-8 rounded-md grid place-items-center hover:bg-slate-100 t-secondary"
            onClick={onClose}
            aria-label="Close menu"
          >
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
            <button
              onClick={onLogout}
              className="w-7 h-7 rounded-md hover:bg-slate-100 grid place-items-center t-muted shrink-0"
              title="Sign out"
            >
              <Icon name="log-out" size={14} />
            </button>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
            <Badge tone="ok"><StatusDot tone="ok" />On-shift</Badge>
            <Badge tone="neutral" className="font-mono">{time}</Badge>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <div className="px-2 mb-2 label-eyebrow">Navigation</div>
          <div className="space-y-0.5">
            <NavBtn
              icon="list"
              label="My Worklist"
              sub="Active cases · 6 assigned"
              active={view === "worklist"}
              onClick={() => { setView("worklist"); onClose?.(); }}
              badge={<Badge tone="danger" className="ml-auto">1</Badge>}
            />
            <NavBtn
              icon="layout-grid"
              label="Shift Hub"
              sub="Overview &amp; triage timeline"
              active={view === "hub"}
              onClick={() => { setView("hub"); onClose?.(); }}
            />
          </div>

          {/* Active case section — only shown when viewing a patient */}
          {activePatient && (
            <>
              <div className="px-2 mt-5 mb-2 label-eyebrow">Active case</div>
              <div className="mx-1 rounded-md border hairline bg-slate-50 overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <PatientPhoto patient={activePatient} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-semibold t-primary truncate">{activePatient.name}</div>
                      <div className="text-[11px] t-muted truncate">{activePatient.id} · {activePatient.location}</div>
                    </div>
                  </div>
                  {activePatient.flags?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 mt-1.5">
                      {activePatient.flags.map((f) => {
                        const d = FLAG_DEFS[f.k] || { tone: "neutral", icon: "circle-alert", label: f.k.toUpperCase() };
                        return (
                          <Tip key={f.k} text={f.note || d.label}>
                            <Badge tone={d.tone} className="!px-1 !py-0 text-[9.5px]">
                              <Icon name={d.icon} size={9} />{d.label}
                            </Badge>
                          </Tip>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="p-1.5 space-y-0.5">
                  {activePatient.studies.map((s) => {
                    const m = MODULES[s.mod];
                    const active = s.mod === activeStudyMod;
                    return (
                      <button
                        key={s.mod}
                        onClick={() => { onSwitchStudy(s.mod); onClose?.(); }}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left accent-transition
                          ${active ? "bg-[color:var(--accent-soft)] text-[color:var(--accent-text)] border border-[color:var(--accent)]/30" : "hover:bg-white t-secondary border border-transparent"}`}
                      >
                        <Icon name={m.icon} size={13} />
                        <span className="text-[12px] font-medium flex-1">{m.short}</span>
                        {active && <Icon name="chevron-right" size={12} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* My shift queue */}
          <div className="px-2 mt-5 mb-2 label-eyebrow">My shift</div>
          <div className="space-y-0.5">
            <SideLink icon="signature" label="Pending sign-out" right={<Badge tone="warn">3</Badge>} />
            <SideLink icon="bell" label="Notifications" right={<Badge tone="danger">1</Badge>} />
            <SideLink icon="check-square" label="Acknowledgements" right={<Badge tone="accent">2</Badge>} />
          </div>

          <div className="px-2 mt-5 mb-2 label-eyebrow">System</div>
          <div className="space-y-0.5">
            <SideLink icon="history" label="Audit log" />
            <SideLink icon="book-open" label="Documentation" />
            <SideLink icon="settings" label="Preferences" />
          </div>
        </nav>

        {/* Footer — offline toggle (run AI removed; auto-run on study arrival) */}
        <div className="px-3 pt-3 pb-3.5 border-t hairline">
          <div className="px-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Icon
                name={offline ? "wifi-off" : "wifi"}
                size={14}
                className={offline ? "text-[#b15c00]" : "text-emerald-600"}
              />
              <div className="leading-tight whitespace-nowrap min-w-0">
                <div className="text-[12.5px] font-medium t-primary">Offline inference</div>
                <div className="text-[11px] t-muted">Local GPU · auto-run</div>
              </div>
            </div>
            <Tip text="Requires confirmation. Switching mode is logged to the audit trail.">
              <div
                className={`switch shrink-0 ${offline ? "on" : ""}`}
                onClick={handleOfflineToggle}
                role="switch"
                aria-checked={offline}
                tabIndex={0}
                onKeyDown={(e) => (e.key === " " || e.key === "Enter") && handleOfflineToggle()}
              />
            </Tip>
          </div>
        </div>
      </aside>

      {/* Offline mode confirm modal */}
      {confirmOffline && (
        <ConfirmModal
          title={offline ? "Switch to cloud inference?" : "Switch to offline (local GPU)?"}
          body={
            offline
              ? "Switching to cloud mode will route inferences through secure hospital cloud servers. De-identified study metadata will be transmitted. Ensure you are on the hospital VPN."
              : "Switching to offline mode will use local GPU only. Cloud telemetry and sync will be paused. AI latency may increase if GPU is under load."
          }
          confirmLabel={offline ? "Switch to cloud" : "Go offline"}
          cancelLabel="Cancel"
          danger={offline}
          onConfirm={() => setOffline(!offline)}
          onClose={() => setConfirmOffline(false)}
        />
      )}
    </>
  );
}

function NavBtn({ icon, label, sub, active, onClick, badge }) {
  return (
    <button
      data-active={active}
      onClick={onClick}
      className={`nav-item w-full flex items-center gap-2.5 pl-3 pr-2.5 py-2 rounded-md text-left accent-transition
        ${active ? "" : "hover:bg-slate-50"}`}
    >
      <span
        className="nav-icon w-7 h-7 rounded-md grid place-items-center border accent-transition shrink-0"
        style={!active ? { borderColor: "var(--line)", color: "#475569", background: "var(--surface-2)" } : undefined}
      >
        <Icon name={icon} size={14} />
      </span>
      <span className="flex-1 min-w-0">
        <div className={`text-[13px] font-semibold leading-tight ${active ? "" : "t-primary"}`}>{label}</div>
        <div className={`text-[11px] leading-tight truncate ${active ? "opacity-80" : "t-muted"}`}>{sub}</div>
      </span>
      {badge}
    </button>
  );
}

function SideLink({ icon, label, right }) {
  return (
    <button className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md hover:bg-slate-50 text-left min-h-[36px]">
      <Icon name={icon} size={14} className="text-slate-500" />
      <span className="flex-1 text-[12.5px] t-primary">{label}</span>
      {right}
    </button>
  );
}

function useClock() {
  const [t, setT] = useState(() => fmt(new Date()));
  useEffect(() => {
    // Update every second so critical shift shows seconds
    const id = setInterval(() => setT(fmt(new Date())), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}
function fmt(d) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) + " ICT";
}

Object.assign(window, { Sidebar });
