import React, { useState, useEffect, useRef, useMemo, useCallback, useContext } from 'react';
import { Icon, MODULES, Badge, SectionLabel, Stat, ProgressBar, RadialGauge, Sparkline, Btn, Kbd, Card, StatusDot, KV, PageHeader, PatientStrip, PatientPhoto, applyAccent, Tip, InfoTip, AIOverride, Modal, MfaInput, ToastProvider, useToasts, fmtTime, FLAG_DEFS } from './ui.jsx';
// ============================================================
// APEX Hub — Suite Overview (light clinical)
// ============================================================

function Hub({ running, setActive }) {
  return (
    <div className="fade-up space-y-4">
      <PageHeader
        eyebrow="APEX Suite · Central Hub"
        title="Cross-modality clinical operations"
        subtitle="Unified triage, model telemetry and inference orchestration across AXIA, SmartLiva and PICHA AI."
        right={
          <>
            <Badge tone="ok"><StatusDot tone="ok" />All systems nominal</Badge>
            <Badge tone="info"><Icon name="cpu" size={11} /> 3 models cached</Badge>
            <Btn variant="secondary" icon="download" size="sm">Shift report</Btn>
          </>
        }
      />

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <KPICard label="Active patients" value="148" sub="↑ 12 since 06:00" iconName="users">
          <div className="mt-3"><Sparkline data={[110, 118, 122, 117, 130, 138, 142, 148]} color="var(--accent)" /></div>
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

        <KPICard label="Model cache" value="3 / 3" sub="CPU · MPS · CUDA" iconName="hard-drive" iconTone="ok">
          <div className="mt-3 space-y-1.5">
            <CacheRow label="AXIA · nnU-Net" device="CUDA" mb={1742} />
            <CacheRow label="SmartLiva · ViT-B" device="MPS" mb={612} />
            <CacheRow label="PICHA · UNI v2" device="CUDA" mb={2380} />
          </div>
        </KPICard>

        <KPICard label="Local GPU VRAM" value="14.6" unit="/ 24 GB" sub="2 inferences queued" iconName="zap">
          <div className="mt-3">
            <ProgressBar value={14.6} max={24} tone="accent" />
            <div className="mt-2 flex items-center justify-between text-[11px] t-muted whitespace-nowrap">
              <span>0</span><span>safe ≤ 14 GB</span><span>24 GB</span>
            </div>
          </div>
        </KPICard>
      </div>

      {/* Triage timeline + radials */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2" eyebrow="Cross-module" title="Triage timeline · last 90 min"
          right={<Badge tone="neutral"><Icon name="filter" size={11} /> All severities</Badge>}>
          <Timeline setActive={setActive} />
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4">
          <Card eyebrow="System load" title="Compute throughput"
            right={<Badge tone="accent"><StatusDot tone="info" />live</Badge>}>
            <div className="flex items-center justify-between gap-3">
              <RadialGauge value={62} unit="%" label="CPU" color="#475569" size={104} stroke={7} />
              <RadialGauge value={78} unit="%" label="GPU-0" color={MODULES.axia.accent} size={104} stroke={7} />
              <RadialGauge value={41} unit="%" label="GPU-1" color={MODULES.picha.accent} size={104} stroke={7} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] t-muted whitespace-nowrap text-center">
              <div>32-core · 256 GB</div>
              <div>A6000 · 48 GB</div>
              <div>A6000 · 48 GB</div>
            </div>
          </Card>

          <Card eyebrow="Today" title="Module throughput · 24 h">
            <ThroughputBars />
          </Card>
        </div>
      </div>

      {/* Compliance & Audit */}
      <div className="grid grid-cols-1">
        <Card eyebrow="Compliance" title="HIPAA / PDPA Access Audit Trail" right={<Badge tone="ok"><Icon name="shield-check" size={11} /> Secured</Badge>}>
          <AuditTrail />
        </Card>
      </div>

      {/* Module shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(["axia", "smartliva", "picha"]).map((k) => (
          <ModuleCard key={k} m={MODULES[k]} onClick={() => setActive(k)} />
        ))}
      </div>
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
        <span className={`w-8 h-8 rounded-md grid place-items-center border ${tone}`}>
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
  { t: "06:42", mod: "axia", sev: "Critical", title: "Right MCA hemorrhage · 34.2 mL", who: "C-44211 · 74F", note: "Midline shift 4.8 mm — neurosurgery paged", tone: "danger" },
  { t: "07:08", mod: "smartliva", sev: "Urgent", title: "Hepatic nodule 28 mm · suspicious", who: "C-44208 · 58M", note: "Conformal set {F3, F4} · kPa 14.1", tone: "warn" },
  { t: "07:21", mod: "picha", sev: "Diagnostic", title: "Cholangiocarcinoma · grade 3", who: "C-44197 · 63M", note: "MARS report ready · confidence 0.94", tone: "info" },
  { t: "07:34", mod: "axia", sev: "Resolved", title: "Negative for ICH (ruled out)", who: "C-44190 · 22M", note: "Slice review complete · 32 / 32", tone: "ok" },
  { t: "07:52", mod: "smartliva", sev: "Routine", title: "Liver steatosis — mild", who: "C-44215 · 41F", note: "Conformal set {S1}", tone: "neutral" },
];

function Timeline({ setActive }) {
  return (
    <div className="relative">
      <div className="absolute left-[64px] top-1 bottom-1 w-px bg-slate-200" />
      <ul className="space-y-2.5">
        {TIMELINE.map((e, i) => {
          const m = MODULES[e.mod];
          return (
            <li key={i} className="flex items-start gap-3 group cursor-pointer" onClick={() => setActive && setActive(e.mod)}>
              <div className="w-[52px] shrink-0 text-right font-mono text-[12px] t-muted pt-2">{e.t}</div>
              <div className="relative shrink-0 mt-2.5">
                <span className="block w-2.5 h-2.5 rounded-full ring-4 ring-white" style={{ background: m.accent }} />
              </div>
              <div className="flex-1 surface-2 rounded-md px-3 py-2.5 min-w-0 group-hover:bg-slate-50 transition-colors border border-transparent group-hover:border-slate-200">
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

function ModuleCard({ m, onClick }) {
  const meta = {
    axia: { latency: "1.2 s", today: 42, conf: 0.93 },
    smartliva: { latency: "0.8 s", today: 28, conf: 0.95 },
    picha: { latency: "3.4 s", today: 19, conf: 0.94 },
  }[m.key];
  return (
    <button onClick={onClick} className="card card-elev p-4 text-left hover:bg-slate-50 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-md grid place-items-center" style={{ background: m.soft, color: m.text }}>
          <Icon name={m.icon} size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="label-eyebrow">{m.tag}</div>
          <div className="text-[14px] font-semibold t-primary leading-tight">{m.name}</div>
          <div className="text-[12px] t-muted leading-tight">{m.long}</div>
        </div>
        <Icon name="chevron-right" size={16} className="t-muted" />
      </div>
      <div className="mt-3 pt-3 border-t hairline grid grid-cols-3 gap-3 text-[12px]">
        <div>
          <div className="t-muted">Latency</div>
          <div className="font-mono font-semibold t-primary tabular-nums">{meta.latency}</div>
        </div>
        <div>
          <div className="t-muted">Today</div>
          <div className="font-mono font-semibold t-primary tabular-nums">{meta.today}</div>
        </div>
        <div>
          <div className="t-muted">Conf.</div>
          <div className="font-mono font-semibold t-primary tabular-nums">{meta.conf}</div>
        </div>
      </div>
    </button>
  );
}



function AuditTrail() {
  const logs = [
    { time: "07:54:12", user: "Dr. Niran S.", action: "Viewed DICOM (Axia)", mrn: "8472-119", ip: "10.4.12.9" },
    { time: "07:42:05", user: "Dr. Worawit", action: "Signed Pathology Report (Picha)", mrn: "3041-558", ip: "10.4.14.22" },
    { time: "07:34:55", user: "System", action: "Anonymized & uploaded DICOM", mrn: "8472-119", ip: "10.0.0.1" },
    { time: "07:22:10", user: "Dr. Niran S.", action: "Queried Ultrasound (SmartLiva)", mrn: "C-44208", ip: "10.4.12.9" },
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px] text-left border-collapse">
        <thead>
          <tr className="t-muted border-b hairline">
            <th className="pb-2 font-medium">Time (ICT)</th>
            <th className="pb-2 font-medium">User / Agent</th>
            <th className="pb-2 font-medium">Action</th>
            <th className="pb-2 font-medium">Patient MRN</th>
            <th className="pb-2 font-medium">Source IP</th>
          </tr>
        </thead>
        <tbody className="t-primary">
          {logs.map((l, i) => (
            <tr key={i} className="border-b hairline last:border-0 hover:bg-slate-50">
              <td className="py-2.5 font-mono t-secondary">{l.time}</td>
              <td className="py-2.5 font-medium">{l.user}</td>
              <td className="py-2.5">{l.action}</td>
              <td className="py-2.5 font-mono">{l.mrn}</td>
              <td className="py-2.5 font-mono t-muted">{l.ip}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Hub;