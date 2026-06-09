// ============================================================
// Worklist — Patient-centric primary view
// ============================================================

// Patient roster (mock data) — each patient may have multiple studies across modalities
const PATIENTS = [
  {
    id: "C-44211",
    name: "Suriyatat, Niran",
    age: 74, sex: "F",
    mrn: "8472-119",
    location: "ED-3",
    photo: null,
    flags: [
      { k: "allergy", note: "Penicillin · severe (anaphylaxis)" },
      { k: "fall", note: "Falls history × 2 in last 12 mo" },
    ],
    severity: "critical",
    arrivedAt: "06:38",
    studies: [
      { mod: "axia", title: "Non-contrast CT brain", id: "STDY-9120", at: "06:38", finding: "ICH 34.2 mL · right MCA · midline shift 4.8 mm", confidence: 0.93, ack: false, sla: 15 },
    ],
    notes: "Code Stroke · onset T+22 min · neurosurgery paged",
  },
  {
    id: "C-44208",
    name: "Chaikum, Anong",
    age: 58, sex: "M",
    mrn: "6112-307",
    location: "GI-OPD",
    photo: null,
    flags: [{ k: "isolation", note: "HBV positive · standard precautions" }],
    severity: "urgent",
    arrivedAt: "07:08",
    studies: [
      { mod: "smartliva", title: "Hepatic ultrasound", id: "STDY-9128", at: "07:08", finding: "Hypoechoic nodule 28 mm Seg VI · suspicious", confidence: 0.94, ack: false, sla: 60 },
    ],
    notes: "Follow-up chronic HBV · ALT 78",
  },
  {
    id: "C-44197",
    name: "Pongsakorn, Thanawat",
    age: 63, sex: "M",
    mrn: "3041-558",
    location: "Path-Lab",
    photo: null,
    flags: [{ k: "dnr", note: "DNR + DNI on file (2024-11)" }],
    severity: "diagnostic",
    arrivedAt: "07:21",
    studies: [
      { mod: "picha", title: "H&E pathology · CCA-0142", id: "STDY-9114", at: "07:21", finding: "Intrahepatic CCA G3 · pT3 N1 · R1 anterior", confidence: 0.94, ack: false, sla: 240 },
    ],
    notes: "R-lobectomy specimen · perineural+",
  },
  {
    id: "C-44193",
    name: "Wongthep, Suchada",
    age: 81, sex: "F",
    mrn: "5520-441",
    location: "ICU-7",
    photo: null,
    flags: [
      { k: "dnr", note: "DNR-A on file" },
      { k: "npo", note: "NPO since 22:00 yesterday" },
    ],
    severity: "urgent",
    arrivedAt: "05:14",
    studies: [
      { mod: "axia", title: "Non-contrast CT brain (follow-up)", id: "STDY-9098", at: "05:14", finding: "Stable midline shift 2.1 mm · resolving", confidence: 0.88, ack: true, sla: 30 },
    ],
    notes: "Post-op craniotomy day 3",
  },
  {
    id: "C-44190",
    name: "Sirithong, Phongphan",
    age: 22, sex: "M",
    mrn: "9971-128",
    location: "ED-1",
    photo: null,
    flags: [],
    severity: "resolved",
    arrivedAt: "07:34",
    studies: [
      { mod: "axia", title: "Non-contrast CT brain", id: "STDY-9132", at: "07:34", finding: "No acute ICH · no fracture", confidence: 0.97, ack: true, sla: 15 },
    ],
    notes: "MVA · GCS 15 · cleared",
  },
  {
    id: "C-44215",
    name: "Tantasakool, Mali",
    age: 41, sex: "F",
    mrn: "4408-019",
    location: "GI-OPD",
    photo: null,
    flags: [{ k: "pregnancy", note: "G2P1 · 14 weeks GA" }],
    severity: "routine",
    arrivedAt: "07:52",
    studies: [
      { mod: "smartliva", title: "Hepatic ultrasound · screening", id: "STDY-9140", at: "07:52", finding: "Mild steatosis · conformal set {S1}", confidence: 0.92, ack: false, sla: 120 },
    ],
    notes: "Routine f/u",
  },
];

function Worklist({ onOpenPatient }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("severity");
  const toasts = useToasts();

  // simulate live updates — fire a toast for a new case after mount
  useEffect(() => {
    const id = setTimeout(() => {
      toasts.push({
        tone: "warn",
        title: "New case · AXIA",
        body: "STDY-9145 · 67F · ED-4 — possible SDH, ETA 4 min",
        icon: "siren",
        action: { label: "Open case", onClick: () => onOpenPatient("C-44215") },
        ttl: 8000,
      });
    }, 2500);
    return () => clearTimeout(id);
  }, []);

  const counts = {
    all: PATIENTS.length,
    critical: PATIENTS.filter((p) => p.severity === "critical").length,
    urgent: PATIENTS.filter((p) => p.severity === "urgent").length,
    routine: PATIENTS.filter((p) => p.severity === "routine" || p.severity === "diagnostic").length,
    pending: PATIENTS.filter((p) => p.studies.some((s) => !s.ack)).length,
  };

  const sevRank = { critical: 0, urgent: 1, diagnostic: 2, routine: 3, resolved: 4 };
  const filtered = PATIENTS
    .filter((p) => {
      if (filter === "all") return true;
      if (filter === "pending") return p.studies.some((s) => !s.ack);
      return p.severity === filter || (filter === "routine" && p.severity === "diagnostic");
    })
    .filter((p) => !search || (p.name + p.mrn + p.id).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "severity") return (sevRank[a.severity] ?? 9) - (sevRank[b.severity] ?? 9);
      if (sort === "time") return a.arrivedAt.localeCompare(b.arrivedAt);
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="fade-up space-y-4">
      <PageHeader
        eyebrow="My shift · King Chulalongkorn Memorial Hospital"
        title="Active worklist"
        subtitle="Cases assigned to you across AXIA, SmartLiva and PICHA. Sorted by severity. Click a patient to review their AI findings."
        right={
          <>
            <Badge tone="ok"><StatusDot tone="ok" />Auto-run enabled</Badge>
            <Btn variant="secondary" icon="filter" size="sm">Filters</Btn>
            <Btn variant="secondary" icon="download" size="sm">Shift report</Btn>
          </>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ShiftStat label="Critical" value={counts.critical} tone="danger" icon="siren" />
        <ShiftStat label="Urgent" value={counts.urgent} tone="warn" icon="alert-triangle" />
        <ShiftStat label="Diagnostic / routine" value={counts.routine} tone="info" icon="clipboard-list" />
        <ShiftStat label="Pending sign-out" value={counts.pending} tone="accent" icon="signature" />
      </div>

      {/* Filter bar */}
      <div className="card card-elev px-4 py-2.5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          {[
            { k: "all", label: "All" },
            { k: "critical", label: "Critical" },
            { k: "urgent", label: "Urgent" },
            { k: "routine", label: "Routine" },
            { k: "pending", label: "Pending me" },
          ].map((f) => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k)}
              className={`px-3 h-9 rounded-md text-[12.5px] font-medium border accent-transition whitespace-nowrap
                ${filter === f.k ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent-text)]" : "border-transparent t-secondary hover:bg-slate-50"}`}
            >
              {f.label}
              <span className="ml-1.5 text-[11px] t-muted">({f.k === "all" ? counts.all : counts[f.k] ?? 0})</span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-2 px-2.5 h-9 rounded-md border hairline" style={{ background: "var(--surface)" }}>
            <Icon name="search" size={14} className="t-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search MRN, name…"
              className="bg-transparent outline-none text-[12.5px] w-44"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="input h-9 text-[12.5px] pr-7"
            title="Sort"
          >
            <option value="severity">Severity</option>
            <option value="time">Arrival time</option>
            <option value="name">Patient name</option>
          </select>
        </div>
      </div>

      {/* Worklist table */}
      <div className="card card-elev overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[920px]">
            <thead>
              <tr className="text-left label-eyebrow border-b hairline">
                <th className="px-4 py-2.5 font-semibold">Patient</th>
                <th className="px-3 py-2.5 font-semibold">Flags</th>
                <th className="px-3 py-2.5 font-semibold">Module · Study</th>
                <th className="px-3 py-2.5 font-semibold">AI finding</th>
                <th className="px-3 py-2.5 font-semibold">Conf.</th>
                <th className="px-3 py-2.5 font-semibold">SLA</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => p.studies.map((s, si) => (
                <WorklistRow key={p.id + ":" + si} patient={p} study={s} isFirst={si === 0} onOpen={() => onOpenPatient(p.id, s.mod)} />
              )))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function WorklistRow({ patient, study, isFirst, onOpen }) {
  const mod = MODULES[study.mod];
  const sev = SEV_DEF[patient.severity];
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer align-top" onClick={onOpen}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <PatientPhoto patient={patient} />
          <div className="min-w-0">
            <div className="font-semibold t-primary truncate whitespace-nowrap">{patient.name}</div>
            <div className="text-[11.5px] t-muted whitespace-nowrap">{patient.sex} · {patient.age} y · MRN {patient.mrn}</div>
            <div className="text-[11.5px] t-muted whitespace-nowrap">{patient.id} · {patient.location} · arr. {patient.arrivedAt}</div>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-1 max-w-[140px]">
          {patient.flags.length === 0 && <span className="text-[11.5px] t-muted">—</span>}
          {patient.flags.map((f) => {
            const d = FLAG_DEFS[f.k] || { tone: "neutral", icon: "circle-alert", label: f.k.toUpperCase() };
            return (
              <Tip key={f.k} text={f.note}>
                <Badge tone={d.tone} className="!px-1.5"><Icon name={d.icon} size={10} /></Badge>
              </Tip>
            );
          })}
        </div>
      </td>
      <td className="px-3 py-3">
        <Badge tone="neutral" style={{ background: mod.soft, color: mod.text, borderColor: mod.accent + "33" }}>
          <Icon name={mod.icon} size={10} />{mod.short}
        </Badge>
        <div className="text-[12px] t-primary mt-1 whitespace-nowrap">{study.title}</div>
        <div className="text-[11px] t-muted font-mono">{study.id} · {study.at}</div>
      </td>
      <td className="px-3 py-3 max-w-[280px]">
        <div className="text-[12.5px] t-primary leading-snug">{study.finding}</div>
      </td>
      <td className="px-3 py-3">
        <div className="font-mono font-semibold tabular-nums t-primary">{study.confidence.toFixed(2)}</div>
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <SLAchip arrivedAt={study.at} slaMin={study.sla} />
      </td>
      <td className="px-3 py-3">
        <Badge tone={sev.tone}>{sev.label}</Badge>
        {study.ack && <div className="text-[11px] t-muted mt-1">Acknowledged</div>}
      </td>
      <td className="px-3 py-3 text-right">
        <Btn size="sm" variant="secondary" icon="arrow-right">Review</Btn>
      </td>
    </tr>
  );
}

const SEV_DEF = {
  critical: { tone: "danger", label: "Critical" },
  urgent: { tone: "warn", label: "Urgent" },
  diagnostic: { tone: "info", label: "Diagnostic" },
  routine: { tone: "neutral", label: "Routine" },
  resolved: { tone: "ok", label: "Resolved" },
};

function ShiftStat({ label, value, tone, icon }) {
  const tones = {
    danger: "bg-[#fde8e9] border-[#f4c5c8] text-[#8b1a1f]",
    warn: "bg-[#fdf1de] border-[#f3d9b1] text-[#7a3a08]",
    info: "bg-[#e0eaf6] border-[#bfd2ec] text-[#154f8a]",
    accent: "bg-[color:var(--accent-soft)] border-[color:var(--accent)]/30 text-[color:var(--accent-text)]",
  };
  return (
    <div className="card card-elev p-3 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="label-eyebrow">{label}</div>
          <div className="mt-1 text-[28px] font-semibold tabular-nums t-primary leading-none">{value}</div>
        </div>
        <span className={`w-9 h-9 rounded-md grid place-items-center border ${tones[tone]}`}>
          <Icon name={icon} size={16} />
        </span>
      </div>
    </div>
  );
}

// Time-based SLA chip
function SLAchip({ arrivedAt, slaMin }) {
  // mock — assume current time 08:00
  const [h, m] = arrivedAt.split(":").map(Number);
  const elapsed = (8 * 60) - (h * 60 + m); // mins
  const remaining = slaMin - elapsed;
  const pct = Math.max(0, Math.min(1, remaining / slaMin));
  const tone = remaining < 0 ? "danger" : pct < 0.25 ? "warn" : "ok";
  const label = remaining < 0 ? `${-remaining}m over` : `${remaining}m left`;
  return (
    <div>
      <Badge tone={tone}><Icon name="clock" size={10} />{label}</Badge>
      <div className="text-[10.5px] t-muted mt-0.5 font-mono">SLA {slaMin}m</div>
    </div>
  );
}

Object.assign(window, { Worklist, PATIENTS, SEV_DEF, SLAchip, ShiftStat });
