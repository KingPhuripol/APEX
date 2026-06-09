// ============================================================
// App — APEX Clinical AI Suite (root) — patient-centric routing
// ============================================================

function App() {
  const [authed, setAuthed] = useState(false);
  const [view, setView] = useState("worklist"); // "worklist" | "hub" | "patient"
  const [activePatientId, setActivePatientId] = useState(null);
  const [activeStudyMod, setActiveStudyMod] = useState(null);
  const [offline, setOffline] = useState(true);
  const [navOpen, setNavOpen] = useState(false);

  // Apply accent for current context
  useEffect(() => {
    if (view === "patient" && activeStudyMod) applyAccent(MODULES[activeStudyMod]);
    else applyAccent(MODULES.hub);
  }, [view, activeStudyMod]);

  // Close drawer on navigation
  useEffect(() => { setNavOpen(false); }, [view, activePatientId]);

  const openPatient = useCallback((patientId, mod) => {
    const patient = PATIENTS.find((p) => p.id === patientId);
    const studyMod = mod || patient?.studies?.[0]?.mod || "axia";
    setActivePatientId(patientId);
    setActiveStudyMod(studyMod);
    setView("patient");
  }, []);

  const backToWorklist = useCallback(() => {
    setView("worklist");
    setActivePatientId(null);
    setActiveStudyMod(null);
    applyAccent(MODULES.hub);
  }, []);

  const switchStudyMod = useCallback((mod) => {
    setActiveStudyMod(mod);
    applyAccent(MODULES[mod]);
  }, []);

  const switchView = useCallback((v) => {
    setView(v);
    if (v !== "patient") {
      setActivePatientId(null);
      setActiveStudyMod(null);
      applyAccent(MODULES.hub);
    }
  }, []);

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  const activePatient = activePatientId ? PATIENTS.find((p) => p.id === activePatientId) : null;

  return (
    <ToastProvider>
      <div className="flex relative min-h-screen">
        <Sidebar
          view={view}
          setView={switchView}
          activePatient={activePatient}
          activeStudyMod={activeStudyMod}
          onSwitchStudy={switchStudyMod}
          offline={offline}
          setOffline={setOffline}
          onLogout={() => setAuthed(false)}
          onOpenWorklist={backToWorklist}
          open={navOpen}
          onClose={() => setNavOpen(false)}
        />
        <main className="flex-1 min-w-0">
          {/* Topbar */}
          <div
            className="h-14 px-4 sm:px-6 border-b hairline flex items-center gap-3 sticky top-0 z-20"
            style={{ background: "var(--surface)" }}
          >
            <button
              className="lg:hidden w-9 h-9 rounded-md grid place-items-center border hairline hover:bg-slate-50 t-secondary shrink-0"
              onClick={() => setNavOpen(true)}
              aria-label="Open menu"
            >
              <Icon name="menu" size={16} />
            </button>
            <TopBreadcrumb
              view={view}
              patient={activePatient}
              mod={activeStudyMod}
              onBack={backToWorklist}
              onSwitchMod={switchStudyMod}
            />
            <div className="ml-auto flex items-center gap-2">
              <GlobalSearch onOpenPatient={openPatient} />
              <button
                className="hidden md:grid w-9 h-9 rounded-md place-items-center border hairline hover:bg-slate-50 t-secondary"
                title="Help"
              >
                <Icon name="circle-help" size={15} />
              </button>
              <button
                className="w-9 h-9 rounded-md grid place-items-center border hairline hover:bg-slate-50 t-secondary relative"
                title="Notifications"
              >
                <Icon name="bell" size={15} />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#c1272d] border-2 border-white" />
              </button>
            </div>
          </div>

          {/* Page body */}
          <div className="px-4 sm:px-6 py-4 sm:py-5" key={view + activePatientId + activeStudyMod}>
            {view === "worklist" && <Worklist onOpenPatient={openPatient} />}
            {view === "hub" && <Hub />}
            {view === "patient" && activePatient && (
              <PatientDetailView
                patient={activePatient}
                studyMod={activeStudyMod}
                onSwitchMod={switchStudyMod}
                onBack={backToWorklist}
                offline={offline}
              />
            )}
            <Footer offline={offline} />
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}

// ---- Patient-centric detail view ----
function PatientDetailView({ patient, studyMod, onSwitchMod, onBack, offline }) {
  const sev = SEV_DEF[patient.severity] || { tone: "neutral", label: patient.severity };

  return (
    <div className="fade-up space-y-4">
      {/* Context bar — back + patient identity + study tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[12.5px] font-medium border hairline t-secondary hover:bg-slate-50 shrink-0"
        >
          <Icon name="arrow-left" size={14} />
          Worklist
        </button>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[12px] t-muted">{patient.id}</span>
          <Icon name="chevron-right" size={12} className="t-dim" />
          <Badge tone={sev.tone}>{sev.label}</Badge>
          <span className="text-[13px] font-semibold t-primary hidden sm:inline whitespace-nowrap">{patient.name}</span>
          {patient.flags?.length > 0 && (
            <div className="flex items-center gap-1">
              {patient.flags.map((f) => {
                const d = FLAG_DEFS[f.k] || { tone: "neutral", icon: "circle-alert", label: f.k.toUpperCase() };
                return (
                  <Tip key={f.k} text={f.note || d.label}>
                    <Badge tone={d.tone} className="!px-1.5 !py-0">
                      <Icon name={d.icon} size={10} />
                    </Badge>
                  </Tip>
                );
              })}
            </div>
          )}
        </div>
        {/* Quick-jump to other studies for this patient */}
        {patient.studies.length > 1 && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-[11px] t-muted hidden md:inline shrink-0">Also in this case:</span>
            {patient.studies.map((s) => {
              const m = MODULES[s.mod];
              const active = s.mod === studyMod;
              return (
                <button
                  key={s.mod}
                  onClick={() => onSwitchMod(s.mod)}
                  className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[12.5px] font-medium border accent-transition whitespace-nowrap
                    ${active
                      ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent-text)]"
                      : "border-slate-200 t-secondary bg-white hover:bg-slate-50"
                    }`}
                >
                  <Icon name={m.icon} size={13} />
                  {m.short}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Module viewers */}
      {studyMod === "axia" && <Axia running={false} />}
      {studyMod === "smartliva" && <SmartLiva running={false} />}
      {studyMod === "picha" && <Picha running={false} />}
    </div>
  );
}

// ---- Topbar breadcrumb ----
function TopBreadcrumb({ view, patient, mod, onBack, onSwitchMod }) {
  if (view === "worklist") {
    return (
      <div className="flex items-center gap-2 text-[13px] whitespace-nowrap min-w-0">
        <Icon name="layout-grid" size={14} className="t-muted hidden sm:inline-flex" />
        <span className="t-muted hidden sm:inline">APEX Suite</span>
        <Icon name="chevron-right" size={12} className="t-dim hidden sm:inline-flex" />
        <span
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border accent-transition"
          style={{ background: "var(--accent-soft)", color: "var(--accent-text)", borderColor: "var(--accent)" }}
        >
          <Icon name="list" size={12} />
          <span className="font-semibold">My Worklist</span>
        </span>
      </div>
    );
  }

  if (view === "hub") {
    return (
      <div className="flex items-center gap-2 text-[13px] whitespace-nowrap min-w-0">
        <Icon name="layout-grid" size={14} className="t-muted hidden sm:inline-flex" />
        <span className="t-muted hidden sm:inline">APEX Suite</span>
        <Icon name="chevron-right" size={12} className="t-dim hidden sm:inline-flex" />
        <span
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border accent-transition"
          style={{ background: "var(--accent-soft)", color: "var(--accent-text)", borderColor: "var(--accent)" }}
        >
          <Icon name="layout-grid" size={12} />
          <span className="font-semibold">Shift Hub</span>
        </span>
      </div>
    );
  }

  // Patient view
  if (patient && mod) {
    const m = MODULES[mod];
    return (
      <div className="flex items-center gap-1.5 text-[13px] min-w-0 flex-wrap">
        <button
          onClick={onBack}
          className="t-muted hover:t-primary hidden sm:inline-flex items-center gap-1 h-7 px-1.5 rounded-md hover:bg-slate-100"
        >
          <Icon name="list" size={12} />
          <span className="hidden md:inline text-[12px]">Worklist</span>
        </button>
        <Icon name="chevron-right" size={12} className="t-dim hidden sm:inline-flex shrink-0" />
        <span className="t-secondary hidden md:inline whitespace-nowrap font-mono text-[12px]">{patient.id}</span>
        <Icon name="chevron-right" size={12} className="t-dim hidden md:inline-flex shrink-0" />
        <span
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border accent-transition shrink-0"
          style={{ background: "var(--accent-soft)", color: "var(--accent-text)", borderColor: "var(--accent)" }}
        >
          <Icon name={m.icon} size={12} />
          <span className="font-semibold">{m.short}</span>
        </span>
        {/* Inline quick-jump for other studies (visible on xl) */}
        {patient.studies.filter((s) => s.mod !== mod).length > 0 && (
          <div className="hidden xl:flex items-center gap-1 ml-1">
            {patient.studies.filter((s) => s.mod !== mod).map((s) => {
              const sm = MODULES[s.mod];
              return (
                <button
                  key={s.mod}
                  onClick={() => onSwitchMod(s.mod)}
                  className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[11.5px] border border-slate-200 t-secondary hover:bg-slate-50 whitespace-nowrap"
                >
                  <Icon name={sm.icon} size={11} />
                  {sm.short}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }
  return null;
}

function GlobalSearch({ onOpenPatient }) {
  return (
    <div
      className="hidden md:flex items-center gap-2 px-2.5 h-9 rounded-md border hairline w-[260px] xl:w-[320px]"
      style={{ background: "var(--surface)" }}
    >
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

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
