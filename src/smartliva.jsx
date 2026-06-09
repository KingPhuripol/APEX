// ============================================================
// SmartLiva — Hepatic Ultrasound (light chrome, dark viewer)
// ============================================================

function SmartLiva({ running }) {
  const [stiffness, setStiffness] = useState(11.2);
  const [annotateOn, setAnnotateOn] = useState(true);
  const [coverage, setCoverage] = useState(95);
  const [chat, setChat] = useState(INITIAL_CHAT);
  const [draft, setDraft] = useState("");
  const chatScroll = useRef(null);

  useEffect(() => {
    if (chatScroll.current) chatScroll.current.scrollTop = chatScroll.current.scrollHeight;
  }, [chat]);

  const sendChat = () => {
    if (!draft.trim()) return;
    const q = draft.trim();
    setChat((c) => [...c, { who: "user", text: q }]);
    setDraft("");
    setTimeout(() => setChat((c) => [...c, { who: "ai", typing: true }]), 200);
    setTimeout(() => setChat((c) => { const next = c.slice(0, -1); next.push({ who: "ai", text: pickReply(q) }); return next; }), 1400);
  };

  const cset = useMemo(() => {
    if (stiffness < 7) return ["F0", "F1"];
    if (stiffness < 9.5) return ["F1", "F2"];
    if (stiffness < 12.5) return ["F2", "F3"];
    if (stiffness < 16) return ["F3", "F4"];
    return ["F4"];
  }, [stiffness]);

  return (
    <div className="fade-up space-y-4">
      <PageHeader
        eyebrow="SmartLiva · Hepatic Ultrasound"
        title={<>Liver lesion characterization with <span className="accent-text">conformal prediction</span></>}
        subtitle="CLAHE-enhanced B-mode imaging combined with statistically-calibrated fibrosis staging. Coverage is certified on a held-out validation cohort."
        right={
          <>
            <Badge tone="ok"><Icon name="shield-check" size={11} /> {coverage}% coverage certified</Badge>
            <Btn variant="secondary" icon="ruler" size="sm">Calipers</Btn>
            <Btn icon={running ? "loader" : "refresh-cw"} size="sm">{running ? "Inferring…" : "Re-classify"}</Btn>
          </>
        }
      />

      <PatientStrip items={[
        { k: "Patient", v: "Chaikum, Anong · 58M" },
        { k: "MRN", v: "6112-307" },
        { k: "Probe", v: "C5-1 curved · 3.5 MHz" },
        { k: "Depth", v: "14 cm" },
        { k: "Indication", v: "Follow-up chronic HBV · ALT 78" },
        { k: "Examiner", v: "Dr. Phuripol T." },
      ]} />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* viewer */}
        <Card className="xl:col-span-7" padded={false}>
          <div className="px-4 py-3 border-b hairline flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge tone="accent"><Icon name="audio-waveform" size={11} /> B-mode · CLAHE</Badge>
              <Badge tone="neutral">Gain 64</Badge>
            </div>
            <div className="flex items-center gap-1">
              {["B-mode", "Color", "Elasto"].map((w, i) => (
                <button
                  key={w}
                  className={`px-2.5 h-7 rounded-md text-[12px] border accent-transition font-medium whitespace-nowrap
                    ${i === 0 ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent-text)]" : "border-slate-200 t-secondary bg-white hover:bg-slate-50"}`}
                >
                  {w}
                </button>
              ))}
              <div className="w-px h-5 bg-slate-200 mx-1.5" />
              <button
                onClick={() => setAnnotateOn(!annotateOn)}
                className={`px-2.5 h-7 rounded-md text-[12px] border accent-transition font-medium whitespace-nowrap inline-flex items-center gap-1.5
                  ${annotateOn ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent-text)]" : "border-slate-200 t-secondary bg-white hover:bg-slate-50"}`}
              >
                <Icon name="square-dashed" size={12} /> Annotations
              </button>
            </div>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden viewer-dark">
            <UltrasoundView annotateOn={annotateOn} />
            <div className="absolute top-3 left-3 font-mono whitespace-nowrap text-[10.5px] text-teal-200/90 space-y-0.5 pointer-events-none">
              <div className="text-[12px] font-semibold">Liver · Right Lobe · Seg VI</div>
              <div>CLAHE clip 2.0 · grid 8 × 8</div>
              <div>FR 28 Hz · MI 0.8 · TIs 0.3</div>
            </div>
            <div className="absolute top-3 right-3 font-mono whitespace-nowrap text-[10.5px] text-teal-200/90 text-right space-y-0.5 pointer-events-none">
              <div className="text-[12px] font-semibold">SmartLiva v3.1.2</div>
              <div>confidence 0.94 · IoU 0.87</div>
            </div>
            <div className="absolute bottom-3 left-3 font-mono whitespace-nowrap text-[10.5px] text-teal-100/80 pointer-events-none">C-44208 · 07:08 ICT</div>
            <div className="absolute bottom-3 right-3 font-mono whitespace-nowrap text-[10.5px] text-teal-100/80 pointer-events-none text-right">Lesion 28.4 × 24.1 mm · hypoechoic</div>
            {running && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute left-0 right-0 h-px bg-teal-300 scan-line" />
              </div>
            )}
          </div>
        </Card>

        {/* right column */}
        <div className="xl:col-span-5 space-y-4">
          <Card eyebrow="Statistical safety" title="Conformal fibrosis staging"
            titleTip="Conformal prediction is a statistical framework that outputs a SET of possible labels rather than a single point estimate. With 95% coverage, the true fibrosis stage is guaranteed to be in the predicted set in ≥95% of cases on the validation cohort. Smaller sets mean higher certainty."
            right={<Badge tone="accent"><Icon name="shield-check" size={11} /> {coverage}% certified</Badge>}>
            <ConformalSet active={cset} />
            <div className="mt-3 text-[12.5px] t-secondary leading-relaxed">
              The model emits a <span className="font-semibold accent-text">set</span>, not a single label. With {coverage}% probability, the true stage is contained in <span className="font-mono text-[color:var(--accent-text)] font-semibold">{`{${cset.join(", ")}}`}</span>. Set size shrinks as imaging quality improves.
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <Stat label="Set size" value={cset.length} sub="lower is better" size="sm" />
              <Stat label="Top-1 prob" value={cset.length === 1 ? "0.91" : "0.62"} sub={cset[0]} size="sm" />
              <Stat label="Coverage α" value={`${100 - coverage}%`} sub="held-out" size="sm" />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="label-eyebrow">Coverage</div>
              <div className="flex-1"><input type="range" className="clinical" min={80} max={99} value={coverage} onChange={(e) => setCoverage(+e.target.value)} /></div>
              <div className="font-mono text-[12px] t-primary w-10 text-right font-semibold">{coverage}%</div>
            </div>
          </Card>

          <Card eyebrow="Transient elastography" title="Liver stiffness · kPa" right={<Badge tone="warn">F2–F3 range</Badge>}>
            <div className="grid grid-cols-[180px_1fr] gap-4 items-center">
              <KpaDial value={stiffness} />
              <div>
                <div className="text-[12px] t-secondary leading-relaxed">
                  Median of 10 measurements. IQR / median <span className="font-mono font-semibold t-primary">8.4%</span> — reliable per Boursier criteria.
                </div>
                <div className="mt-3 space-y-1.5 text-[12px]">
                  <Threshold label="F0–F1" range="≤ 7.0" active={stiffness <= 7} />
                  <Threshold label="F2" range="7.1 – 9.5" active={stiffness > 7 && stiffness <= 9.5} />
                  <Threshold label="F3" range="9.6 – 12.5" active={stiffness > 9.5 && stiffness <= 12.5} />
                  <Threshold label="F4 cirrhosis" range="≥ 12.5" active={stiffness > 12.5} />
                </div>
                <div className="mt-3">
                  <input type="range" className="clinical" min={3} max={25} step={0.1} value={stiffness} onChange={(e) => setStiffness(+e.target.value)} />
                </div>
              </div>
            </div>
          </Card>

          <Card eyebrow="HepaSage AI" title="Clinical reasoning chat" padded={false}>
            <div ref={chatScroll} className="px-4 py-3 max-h-[220px] overflow-y-auto space-y-3">
              {chat.map((m, i) => <ChatMsg key={i} m={m} />)}
            </div>
            <div className="border-t hairline px-3 py-2.5 flex items-center gap-2 bg-slate-50">
              <Icon name="sparkles" size={14} className="text-[color:var(--accent-text)]" />
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                placeholder="Ask about MELD, surveillance, biopsy criteria…"
                className="flex-1 bg-transparent outline-none text-[13px] placeholder:t-muted"
              />
              <Btn size="sm" icon="send" onClick={sendChat}>Send</Btn>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ConformalSet({ active }) {
  const all = ["F0", "F1", "F2", "F3", "F4"];
  const labels = { F0: "No fibrosis", F1: "Portal", F2: "Few septa", F3: "Many septa", F4: "Cirrhosis" };
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {all.map((k) => {
        const on = active.includes(k);
        return (
          <div
            key={k}
            className="rounded-md border px-2 py-2 text-center accent-transition"
            style={{
              background: on ? "var(--accent-soft)" : "var(--surface-2)",
              borderColor: on ? "var(--accent)" : "var(--line)",
              color: on ? "var(--accent-text)" : "var(--text-2)",
            }}
          >
            <div className="text-[15px] font-bold tracking-tight">{k}</div>
            <div className="text-[9.5px] uppercase tracking-wider opacity-80 mt-0.5">{labels[k]}</div>
          </div>
        );
      })}
    </div>
  );
}

function Threshold({ label, range, active }) {
  return (
    <div className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border accent-transition whitespace-nowrap
      ${active ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)]" : "border-transparent bg-slate-50"}`}>
      <span className={active ? "font-semibold accent-text" : "t-primary"}>{label}</span>
      <span className="font-mono text-[11px] t-muted">{range} kPa</span>
    </div>
  );
}

// kPa dial
function KpaDial({ value }) {
  const min = 3, max = 25;
  const pct = (value - min) / (max - min);
  const sweep = -135 + pct * 270;
  const size = 180;
  const cx = size / 2, cy = size / 2;
  const r = 70;
  const segs = [
    { from: -135, to: -75, color: "#10b981" },
    { from: -75, to: -25, color: "#d97706" },
    { from: -25, to: 35, color: "#ea580c" },
    { from: 35, to: 135, color: "#c1272d" },
  ];
  const tone =
    value <= 7 ? "#10b981" :
    value <= 9.5 ? "#d97706" :
    value <= 12.5 ? "#ea580c" :
    "#c1272d";

  const polar = (a, rad) => {
    const ar = (a * Math.PI) / 180;
    return [cx + rad * Math.sin(ar), cy - rad * Math.cos(ar)];
  };
  const arc = (from, to, rad) => {
    const [x1, y1] = polar(from, rad);
    const [x2, y2] = polar(to, rad);
    const large = Math.abs(to - from) > 180 ? 1 : 0;
    return `M${x1},${y1} A${rad},${rad} 0 ${large} 1 ${x2},${y2}`;
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        {segs.map((s, i) => (
          <path key={i} d={arc(s.from, s.to, r)} stroke={s.color} strokeOpacity="0.20" strokeWidth="12" fill="none" />
        ))}
        <path d={arc(-135, sweep, r)} stroke={tone} strokeWidth="12" fill="none" strokeLinecap="round" style={{ transition: "all 600ms ease" }} />
        {Array.from({ length: 11 }, (_, i) => {
          const a = -135 + (i / 10) * 270;
          const [x1, y1] = polar(a, r - 16);
          const [x2, y2] = polar(a, r - 8);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#cbd5e1" strokeWidth="1" />;
        })}
        {(() => {
          const [x, y] = polar(sweep, r - 22);
          return (
            <g style={{ transition: "all 600ms ease" }}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke={tone} strokeWidth="2.5" strokeLinecap="round" />
              <circle cx={cx} cy={cy} r="5" fill="white" stroke={tone} strokeWidth="2" />
            </g>
          );
        })()}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-5">
        <div className="text-[26px] font-semibold tabular-nums" style={{ color: tone }}>{value.toFixed(1)}</div>
        <div className="label-eyebrow -mt-1">kPa</div>
      </div>
    </div>
  );
}

const INITIAL_CHAT = [
  { who: "ai", text: "Reviewed C-44208. Mr. Chaikum's stiffness is 11.2 kPa, consistent with F2–F3 fibrosis. Note the 28 mm hypoechoic lesion in segment VI." },
  { who: "user", text: "Surveillance schedule given his HBV history?" },
  { who: "ai", text: "Per AASLD, biannual US + AFP. Given the indeterminate nodule (LR-3 pattern), I'd shorten to a 3-month repeat US and obtain multiphasic MRI within 2 weeks." },
];
function pickReply(q) {
  const s = q.toLowerCase();
  if (s.includes("meld")) return "MELD-Na approximation: bilirubin 1.8, INR 1.3, creatinine 1.0, Na 137 → MELD-Na ≈ 13. Compensated cirrhosis pathway.";
  if (s.includes("biopsy")) return "Liver biopsy is reasonable for indeterminate lesion (LR-3) when contrast MRI is contraindicated. Check platelet count and INR pre-procedure.";
  if (s.includes("cirrhosis")) return "Findings support advanced fibrosis: kPa 11.2, surface nodularity grade 1, splenomegaly 13 cm. Conformal set {F2, F3} — biopsy only if reclassification would change management.";
  return "Acknowledged. Based on imaging plus clinical context, I'd recommend the EASL pathway — repeat surveillance, contrast MRI, and a hepatology referral.";
}
function ChatMsg({ m }) {
  if (m.who === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-md px-3 py-2 bg-slate-100 text-[13px] t-primary">
          {m.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2">
      <span className="w-7 h-7 rounded-md grid place-items-center bg-[color:var(--accent-soft)] text-[color:var(--accent-text)] border border-[color:var(--accent)]/30 shrink-0">
        <Icon name="sparkles" size={13} />
      </span>
      <div className="max-w-[82%] rounded-md px-3 py-2 bg-[color:var(--accent-soft)]/60 text-[13px] t-primary border border-[color:var(--accent)]/20 leading-relaxed">
        {m.typing ? (
          <span className="inline-flex items-center gap-1 t-secondary">
            HepaSage is thinking
            <span className="inline-flex gap-0.5">
              <span className="w-1 h-1 rounded-full bg-[color:var(--accent)] pulse-soft" />
              <span className="w-1 h-1 rounded-full bg-[color:var(--accent)] pulse-soft" style={{ animationDelay: "200ms" }} />
              <span className="w-1 h-1 rounded-full bg-[color:var(--accent)] pulse-soft" style={{ animationDelay: "400ms" }} />
            </span>
          </span>
        ) : m.text}
      </div>
    </div>
  );
}

// Ultrasound view — kept similar (it's a dark viewer)
function UltrasoundView({ annotateOn }) {
  return (
    <svg viewBox="0 0 800 600" className="w-full h-full">
      <defs>
        <radialGradient id="usWedge" cx="50%" cy="0%" r="100%">
          <stop offset="0%" stopColor="#172033" />
          <stop offset="40%" stopColor="#0f1929" />
          <stop offset="100%" stopColor="#04080f" />
        </radialGradient>
        <pattern id="speckle" width="3" height="3" patternUnits="userSpaceOnUse">
          <rect width="3" height="3" fill="transparent" />
          <circle cx="1.5" cy="1.5" r="0.6" fill="#94a3b8" opacity="0.20" />
        </pattern>
        <radialGradient id="lesion" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#020617" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#0b1120" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#1e293b" stopOpacity="0" />
        </radialGradient>
        <filter id="usBlur"><feGaussianBlur stdDeviation="1.6" /></filter>
        <clipPath id="usFan"><polygon points="400,0 760,580 40,580" /></clipPath>
      </defs>

      <g clipPath="url(#usFan)">
        <rect x="0" y="0" width="800" height="600" fill="url(#usWedge)" />
        <rect x="0" y="0" width="800" height="600" fill="url(#speckle)" />
        <g filter="url(#usBlur)" opacity="0.65">
          <path d="M40,180 Q400,140 760,180" stroke="#cbd5e1" strokeWidth="2" fill="none" opacity="0.25" />
          <path d="M40,260 Q400,210 760,260" stroke="#cbd5e1" strokeWidth="2" fill="none" opacity="0.20" />
          <path d="M40,360 Q400,300 760,360" stroke="#cbd5e1" strokeWidth="2" fill="none" opacity="0.18" />
          <path d="M40,450 Q400,400 760,450" stroke="#cbd5e1" strokeWidth="2" fill="none" opacity="0.16" />
        </g>
        <g opacity="0.9">
          <path d="M150,260 Q300,290 540,330 Q610,345 700,340" stroke="#0b1f2e" strokeWidth="14" fill="none" strokeLinecap="round" />
          <path d="M150,260 Q300,290 540,330 Q610,345 700,340" stroke="#1e3a5f" strokeWidth="11" fill="none" strokeLinecap="round" />
        </g>
        <g opacity="0.9">
          <path d="M250,180 Q380,260 470,360" stroke="#0b1f2e" strokeWidth="10" fill="none" strokeLinecap="round" />
          <path d="M250,180 Q380,260 470,360" stroke="#1e3a5f" strokeWidth="7" fill="none" strokeLinecap="round" />
        </g>
        <g>
          <ellipse cx="510" cy="260" rx="78" ry="62" fill="url(#lesion)" />
          <ellipse cx="510" cy="260" rx="78" ry="62" fill="none" stroke="#0b1120" strokeWidth="1" opacity="0.6" />
        </g>
        <g opacity="0.35"><path d="M450,322 Q510,560 570,322" fill="#cbd5e1" filter="url(#usBlur)" /></g>
      </g>

      {annotateOn && (
        <g>
          <rect x="420" y="186" width="180" height="148" fill="none" stroke="#2dd4bf" strokeWidth="1.5" strokeDasharray="6 4" />
          <g stroke="#2dd4bf" strokeWidth="2">
            <path d="M420,186 L420,200 M420,186 L434,186" />
            <path d="M600,186 L600,200 M600,186 L586,186" />
            <path d="M420,334 L420,320 M420,334 L434,334" />
            <path d="M600,334 L600,320 M600,334 L586,334" />
          </g>
          <circle cx="510" cy="260" r="3" fill="#2dd4bf" />
          <line x1="420" y1="260" x2="600" y2="260" stroke="#2dd4bf" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.7" />
          <g transform="translate(610,168)">
            <rect x="0" y="0" width="170" height="60" rx="6" fill="#0b1120" stroke="#2dd4bf" strokeOpacity="0.5" />
            <text x="10" y="19" fontFamily="ui-monospace" fontSize="11.5" fontWeight="600" fill="#5eead4">L-1 · Suspicious</text>
            <text x="10" y="35" fontFamily="ui-monospace" fontSize="10.5" fill="#cbd5e1">28.4 × 24.1 mm</text>
            <text x="10" y="50" fontFamily="ui-monospace" fontSize="10.5" fill="#cbd5e1">conf 0.94 · hypoechoic</text>
          </g>
        </g>
      )}

      <g fontFamily="ui-monospace" fontSize="10" fill="#5eead4" opacity="0.75">
        {Array.from({ length: 14 }, (_, i) => {
          const y = 30 + i * 40;
          return (
            <g key={i}>
              <line x1="772" y1={y} x2={i % 2 === 0 ? 762 : 768} y2={y} stroke="#2dd4bf" strokeOpacity="0.5" strokeWidth="0.6" />
              {i % 2 === 0 && i > 0 && <text x="754" y={y + 3} textAnchor="end">{i} cm</text>}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

Object.assign(window, { SmartLiva });
