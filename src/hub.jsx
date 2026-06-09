// ============================================================
// APEX Hub — Shift Overview (clinician-centric, not IT-admin)
// ============================================================

function Hub() {
  return (
    <div className="fade-up space-y-4">
      <PageHeader
        eyebrow="APEX Suite · Shift Hub"
        title="My shift — Dr. Phuripol T."
        subtitle="Cases assigned to you this shift. AI runs automatically when studies arrive — no manual trigger needed."
        right={
          <>
            <Badge tone="ok"><StatusDot tone="ok" />All systems nominal</Badge>
            <Badge tone="info"><Icon name="zap" size={11} /> Auto-run active</Badge>
            <Btn variant="secondary" icon="download" size="sm">Shift report</Btn>
          </>
        }
      />

      {/* KPI Row — shift-centric, not IT admin */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <KPICard label="My queue" value="6" sub="Cases assigned this shift" iconName="inbox">
          <div className="mt-3">
            <Sparkline data={[1, 2, 3, 4, 5, 6, 6, 6]} color="var(--accent)" />
          </div>
        </KPICard>

        <KPICard label="Pending sign-out" value="3" unit="studies" sub="Require acknowledgement before handoff" iconName="signature" iconTone="warn">
          <div className="mt-3 space-y-1.5">
            <PendingRow label="C-44211 · AXIA" urgency="Critical" tone="danger" />
            <PendingRow label="C-44208 · SmartLiva" urgency="Urgent" tone="warn" />
            <PendingRow label="C-44215 · SmartLiva" urgency="Routine" tone="neutral" />
          </div>
        </KPICard>

        <KPICard label="Triage alerts" value="7" unit="open" sub="2 critical · 3 urgent · 2 routine" iconName="triangle-alert" iconTone="danger">
          <div className="mt-3 flex items-center gap-1">
            <span className="h-1.5 flex-1 rounded-full" style={{ background: "#c1272d" }} />
            <span className="h-1.5 flex-1 rounded-full" style={{ background: "#c1272d" }} />
            <span className="h-1.5 flex-1 rounded-full" style={{ background: "#d97706" }} />
            <span className="h-1.5 flex-1 rounded-full" style={{ background: "#d97706" }} />
            <span className="h-1.5 flex-1 rounded-full" style={{ background: "#d97706" }} />
            <span className="h-1.5 flex-1 rounded-full" style={{ background: "#10b981" }} />
            <span className="h-1.5 flex-1 rounded-full" style={{ background: "#10b981" }} />
          </div>
        </KPICard>

        <KPICard label="Shift progress" value="3 / 6" sub="Studies acknowledged" iconName="check-circle" iconTone="ok">
          <div className="mt-3">
            <ProgressBar value={3} max={6} tone="ok" />
            <div className="mt-2 text-[11px] t-muted">Last: C-44190 · 07:34 ICT</div>
          </div>
        </KPICard>
      </div>

      {/* Triage timeline + throughput + model cache */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2" eyebrow="Cross-module" title="Triage timeline · last 90 min"
          right={<Badge tone="neutral"><Icon name="filter" size={11} /> All severities</Badge>}>
          <Timeline />
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4">
          <Card eyebrow="Today" title="Module throughput · 24 h">
            <ThroughputBars />
          </Card>
          <Card eyebrow="System" title="Model cache" right={<Badge tone="ok"><StatusDot tone="ok" />3 / 3 loaded</Badge>}>
            <div className="space-y-1.5">
              <CacheRow label="AXIA · nnU-Net v4.2" device="CUDA" mb={1742} />
              <CacheRow label="SmartLiva · ViT-B/16" device="MPS" mb={612} />
              <CacheRow label="PICHA · UNI v2" device="CUDA" mb={2380} />
            </div>
            <div className="mt-3 pt-2 border-t hairline text-[11.5px] t-muted flex items-center gap-1.5">
              <Icon name="zap" size={12} className="text-emerald-600" />
              Studies auto-trigger inference on arrival
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PendingRow({ label, urgency, tone }) {
  const colors = { danger: "#c1272d", warn: "#d97706", neutral: "#94a3b8" };
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: colors[tone] }} />
      <span className="flex-1 t-primary font-medium truncate">{label}</span>
      <Badge tone={tone} className="text-[10px]">{urgency}</Badge>
    </div>
  );
}

function KPICard({ className = "", label, value, unit, sub, iconName, iconTone, children }) {
  const tones = {
    danger: "bg-[#fde8e9] text-[#8b1a1f] border-[#f4c5c8]",
    warn: "bg-[#fdf1de] text-[#b15c00] border-[#f3d9b1]",
    ok: "bg-[#def4e8] text-[#066c44] border-[#c1e6d2]",
    default: "bg-slate-50 text-slate-600 border-slate-200",
  };
  const tone = tones[iconTone || "default"];
  return (
    <div className={`card card-elev p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <Stat label={label} value={value} unit={unit} sub={sub} />
        <span className={`w-8 h-8 rounded-md grid place-items-center border ${tone} shrink-0`}>
          <Icon name={iconName} size={15} />
        </span>
      </div>
      {children}
    </div>
  );
}

function CacheRow({ label, device, mb }) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#10b981" }} />
      <div className="text-[12px] t-primary flex-1 truncate font-medium">{label}</div>
      <div className="font-mono text-[11px] t-muted shrink-0">{device}</div>
      <div className="font-mono text-[11px] t-secondary tabular-nums shrink-0">{mb}&nbsp;MB</div>
    </div>
  );
}

const TIMELINE = [
  { t: "06:42:18", mod: "axia", sev: "Critical", title: "Right MCA hemorrhage · 34.2 mL", who: "C-44211 · 74F", note: "Midline shift 4.8 mm — neurosurgery paged", tone: "danger" },
  { t: "07:08:05", mod: "smartliva", sev: "Urgent", title: "Hepatic nodule 28 mm · suspicious", who: "C-44208 · 58M", note: "Conformal set {F3, F4} · kPa 14.1", tone: "warn" },
  { t: "07:21:44", mod: "picha", sev: "Diagnostic", title: "Cholangiocarcinoma · grade 3", who: "C-44197 · 63M", note: "MARS report ready · confidence 0.94", tone: "info" },
  { t: "07:34:12", mod: "axia", sev: "Resolved", title: "Negative for ICH (ruled out)", who: "C-44190 · 22M", note: "Slice review complete · 32 / 32", tone: "ok" },
  { t: "07:52:30", mod: "smartliva", sev: "Routine", title: "Liver steatosis — mild", who: "C-44215 · 41F", note: "Conformal set {S1}", tone: "neutral" },
];

function Timeline() {
  return (
    <div className="relative">
      <div className="absolute left-[72px] top-1 bottom-1 w-px bg-slate-200" />
      <ul className="space-y-2.5">
        {TIMELINE.map((e, i) => {
          const m = MODULES[e.mod];
          return (
            <li key={i} className="flex items-start gap-3">
              <div className="w-[60px] shrink-0 text-right font-mono text-[11px] t-muted pt-2 tabular-nums">{e.t}</div>
              <div className="relative shrink-0 mt-2.5">
                <span className="block w-2.5 h-2.5 rounded-full ring-4 ring-white" style={{ background: m.accent }} />
              </div>
              <div className="flex-1 surface-2 rounded-md px-3 py-2.5 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge style={{ background: m.soft, color: m.text, borderColor: m.accent + "33" }}>
                    <Icon name={m.icon} size={10} /> {m.short}
                  </Badge>
                  <Badge tone={e.tone}>{e.sev}</Badge>
                  <span className="text-[13px] font-semibold t-primary truncate">{e.title}</span>
                  <span className="text-[11.5px] t-muted ml-auto whitespace-nowrap shrink-0 font-mono">{e.who}</span>
                </div>
                <div className="text-[12px] t-secondary mt-1">{e.note}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ThroughputBars() {
  const data = [
    { k: "AXIA", v: 42, c: MODULES.axia.accent },
    { k: "SmartLiva", v: 28, c: MODULES.smartliva.accent },
    { k: "PICHA", v: 19, c: MODULES.picha.accent },
  ];
  const max = 60;
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.k}>
          <div className="flex items-center justify-between text-[12.5px]">
            <span className="t-primary font-medium">{d.k}</span>
            <span className="font-mono t-secondary">{d.v}&nbsp;<span className="t-muted">studies</span></span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: (d.v / max) * 100 + "%", background: d.c }} />
          </div>
        </div>
      ))}
      <div className="mt-2 text-[11px] t-muted flex items-center justify-between">
        <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
      </div>
    </div>
  );
}

Object.assign(window, { Hub });
