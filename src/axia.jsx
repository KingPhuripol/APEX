// ============================================================
// AXIA — Emergency Brain CT · keyboard shortcuts · ASPECTS click · calipers · AIOverride
// ============================================================

const WINDOW_PRESETS = ["Brain", "Stroke", "Bone", "Soft"];

// ASPECTS region approximate SVG positions (400×400 viewBox)
const ASPECTS_POSITIONS = {
  M1: { cx: 270, cy: 115, rx: 28, ry: 22 },
  M2: { cx: 310, cy: 155, rx: 30, ry: 24 },
  M3: { cx: 315, cy: 235, rx: 28, ry: 22 },
  M4: { cx: 255, cy: 100, rx: 24, ry: 20 },
  M5: { cx: 290, cy: 165, rx: 26, ry: 20 },
  M6: { cx: 310, cy: 265, rx: 26, ry: 20 },
  C:  { cx: 228, cy: 178, rx: 14, ry: 12 },
  L:  { cx: 244, cy: 200, rx: 18, ry: 14 },
  IC: { cx: 228, cy: 196, rx: 12, ry: 14 },
  I:  { cx: 264, cy: 183, rx: 16, ry: 12 },
};

const ASPECTS_REASONS = {
  M1: "Anterior MCA territory — early ischemic change (cortical swelling, sulcal effacement)",
  M2: "Lateral MCA territory at level of basal ganglia",
  M3: "Posterior MCA territory — watershed zone involvement",
  M4: "Superior frontal MCA territory (above basal ganglia level)",
  M5: "Superior parietal MCA territory",
  M6: "Superior posterior MCA territory",
  C:  "Caudate nucleus — hypodensity suggests basal ganglia ischemia",
  L:  "Lenticular nucleus (putamen + globus pallidus) — involved in right MCA hemorrhage",
  IC: "Internal capsule — involvement implies severe motor deficit",
  I:  "Insular ribbon sign — loss of insular cortex gray-white differentiation",
};

function Axia({ running }) {
  const [slice, setSlice] = useState(16);
  const [windowing, setWindowing] = useState("Brain");
  const [overlay, setOverlay] = useState(true);
  const [inverted, setInverted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [measureMode, setMeasureMode] = useState(false);
  const [measurePts, setMeasurePts] = useState([]);
  const [selectedAspect, setSelectedAspect] = useState(null);
  const [overrideLog, setOverrideLog] = useState([]);
  const total = 32;
  const viewerRef = useRef(null);
  const toasts = useToasts();

  const inHemo = slice >= 12 && slice <= 22;
  const hemoVol = useMemo(() => {
    if (!inHemo) return 0;
    const peak = 34.2;
    return Math.max(0, +(peak - Math.abs(slice - 17) * 4.2).toFixed(1));
  }, [slice, inHemo]);

  const midline = useMemo(() => {
    if (!inHemo) return 0.3;
    return +(4.8 - Math.abs(slice - 17) * 0.4).toFixed(1);
  }, [slice, inHemo]);

  // ---- Cine play ----
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setSlice((s) => {
        if (s >= total) { setPlaying(false); return 1; }
        return s + 1;
      });
    }, 120);
    return () => clearInterval(id);
  }, [playing]);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e) => {
      // Don't trigger if focus is in an input/textarea
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
      switch (e.key) {
        case "j": case "ArrowDown":
          e.preventDefault();
          setSlice((s) => Math.min(total, s + 1));
          break;
        case "k": case "ArrowUp":
          e.preventDefault();
          setSlice((s) => Math.max(1, s - 1));
          break;
        case "w": case "W":
          setWindowing((w) => {
            const idx = WINDOW_PRESETS.indexOf(w);
            return WINDOW_PRESETS[(idx + 1) % WINDOW_PRESETS.length];
          });
          break;
        case "i": case "I":
          setInverted((v) => !v);
          break;
        case "1":
          setWindowing("Brain"); break;
        case "2":
          setWindowing("Stroke"); break;
        case "3":
          setWindowing("Bone"); break;
        case "4":
          setWindowing("Soft"); break;
        case " ":
          e.preventDefault();
          setPlaying((v) => !v);
          break;
        case "m": case "M":
          setMeasureMode((v) => { if (v) setMeasurePts([]); return !v; });
          break;
        case "Escape":
          setMeasureMode(false);
          setMeasurePts([]);
          setSelectedAspect(null);
          break;
        default: break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleViewerClick = (e) => {
    if (!measureMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    // Map to SVG 400×400 space
    const x = ((e.clientX - rect.left) / rect.width) * 400;
    const y = ((e.clientY - rect.top) / rect.height) * 400;
    setMeasurePts((pts) => {
      if (pts.length >= 2) return [{ x, y }];
      return [...pts, { x, y }];
    });
  };

  const measureDist = useMemo(() => {
    if (measurePts.length < 2) return null;
    const dx = measurePts[1].x - measurePts[0].x;
    const dy = measurePts[1].y - measurePts[0].y;
    const px = Math.sqrt(dx * dx + dy * dy);
    return (px * 0.5).toFixed(1); // 0.5 mm per SVG unit (scale bar: 20 units = 10 mm)
  }, [measurePts]);

  const handleOverride = ({ finding, reason }) => {
    const entry = {
      finding,
      reason,
      at: fmtTime(new Date(), true) + " ICT",
      by: "Dr. Phuripol T.",
      case: "C-44211",
    };
    setOverrideLog((prev) => [...prev, entry]);
    toasts.push({
      tone: "warn",
      title: "AI override recorded",
      body: `${finding} · "${reason}" → audit trail logged`,
      icon: "shield-alert",
      ttl: 5000,
    });
  };

  const handleAspectClick = (regionKey) => {
    setSelectedAspect((k) => (k === regionKey ? null : regionKey));
  };

  // Window level display
  const WL_MAP = { Brain: "WL 40 / WW 80", Stroke: "WL 35 / WW 35", Bone: "WL 400 / WW 2000", Soft: "WL 60 / WW 400" };

  return (
    <div className="fade-up space-y-4">
      <PageHeader
        eyebrow="AXIA · Emergency Brain CT"
        title={<>Acute intracranial hemorrhage — <span className="accent-text">right MCA territory</span></>}
        subtitle="Voxel-wise nnU-Net segmentation, ASPECTS scoring and midline-shift detection on non-contrast CT."
        right={
          <>
            <Badge tone="danger" className="flash-warn"><Icon name="siren" size={11} /> Critical · Code Stroke</Badge>
            <Btn variant="secondary" icon="share-2" size="sm">Page neuro</Btn>
            <Btn icon="refresh-cw" size="sm">Re-segment</Btn>
          </>
        }
      />

      {/* Patient strip — full with photo + flags + seconds */}
      <PatientStrip
        patient={{
          name: "Suriyatat, Niran",
          sex: "F", age: 74,
          mrn: "8472-119",
          flags: [
            { k: "allergy", note: "Penicillin · severe (anaphylaxis)" },
            { k: "fall", note: "Falls history × 2 in last 12 mo" },
          ],
        }}
        items={[
          { k: "Case ID", v: "C-44211" },
          { k: "Study", v: "CT · non-contrast" },
          { k: "Acquired", v: <span className="font-mono">06:38:42 ICT</span> },
          { k: "Symptom onset", v: <span className="text-[#c1272d] font-semibold">T + 22 min</span> },
          { k: "Series", v: "512 × 512 · 32 slices · 5.0 mm" },
          { k: "Location", v: "ED-3" },
        ]}
      />

      {/* Keyboard shortcut legend */}
      <div className="flex items-center gap-2 flex-wrap text-[11.5px] t-muted">
        <Icon name="keyboard" size={13} className="shrink-0" />
        <span>Shortcuts:</span>
        {[
          ["J / K", "slice ↑↓"],
          ["W", "window cycle"],
          ["1-4", "presets"],
          ["I", "invert"],
          ["Space", playing ? "pause cine" : "play cine"],
          ["M", measureMode ? "exit caliper" : "caliper"],
          ["Esc", "clear"],
        ].map(([k, v]) => (
          <span key={k} className="inline-flex items-center gap-1">
            <Kbd>{k}</Kbd>
            <span>{v}</span>
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left: viewer */}
        <Card className="xl:col-span-7" padded={false}>
          <div className="px-4 py-3 border-b hairline flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge tone="accent"><Icon name="layers" size={11} /> Axial</Badge>
              <Badge tone="neutral">{WL_MAP[windowing]}</Badge>
              {inverted && <Badge tone="warn"><Icon name="contrast" size={11} /> Inverted</Badge>}
              {playing && <Badge tone="ok"><StatusDot tone="ok" /> Cine</Badge>}
              {measureMode && <Badge tone="info"><Icon name="ruler" size={11} /> Caliper active</Badge>}
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {WINDOW_PRESETS.map((w, idx) => (
                <Tip key={w} text={`${w} preset · press ${idx + 1}`}>
                  <button
                    onClick={() => setWindowing(w)}
                    className={`px-2.5 h-9 rounded-md text-[12px] border accent-transition font-medium whitespace-nowrap
                      ${windowing === w
                        ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent-text)]"
                        : "border-slate-200 t-secondary bg-white hover:bg-slate-50"}`}
                  >
                    {w}
                  </button>
                </Tip>
              ))}
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <Tip text="Toggle hemorrhage mask overlay (AI segmentation)">
                <button
                  onClick={() => setOverlay(!overlay)}
                  className={`px-2.5 h-9 rounded-md text-[12px] border accent-transition font-medium whitespace-nowrap inline-flex items-center gap-1.5
                    ${overlay ? "border-[#c1272d]/40 bg-[#fde8e9] text-[#8b1a1f]" : "border-slate-200 t-secondary bg-white hover:bg-slate-50"}`}
                >
                  <Icon name="eye" size={12} /> Mask
                </button>
              </Tip>
              <Tip text="Invert display (I)">
                <button
                  onClick={() => setInverted(!inverted)}
                  className={`px-2.5 h-9 rounded-md text-[12px] border accent-transition font-medium whitespace-nowrap inline-flex items-center gap-1.5
                    ${inverted ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent-text)]" : "border-slate-200 t-secondary bg-white hover:bg-slate-50"}`}
                >
                  <Icon name="contrast" size={12} />
                </button>
              </Tip>
              <Tip text="Caliper / measure tool (M)">
                <button
                  onClick={() => { setMeasureMode(!measureMode); if (measureMode) setMeasurePts([]); }}
                  className={`px-2.5 h-9 rounded-md text-[12px] border accent-transition font-medium whitespace-nowrap inline-flex items-center gap-1.5
                    ${measureMode ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent-text)]" : "border-slate-200 t-secondary bg-white hover:bg-slate-50"}`}
                >
                  <Icon name="ruler" size={12} />
                </button>
              </Tip>
              <Tip text="Play / pause cine (Space)">
                <button
                  onClick={() => setPlaying(!playing)}
                  className={`px-2.5 h-9 rounded-md text-[12px] border accent-transition font-medium whitespace-nowrap inline-flex items-center gap-1.5
                    ${playing ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent-text)]" : "border-slate-200 t-secondary bg-white hover:bg-slate-50"}`}
                >
                  <Icon name={playing ? "pause" : "play"} size={12} />
                </button>
              </Tip>
            </div>
          </div>

          {/* Viewer body */}
          <div
            className="relative grid grid-cols-[1fr_64px] viewer-dark"
            style={inverted ? { filter: "invert(1)" } : {}}
          >
            <div
              ref={viewerRef}
              className={`relative aspect-square viewer-grid ${measureMode ? "cursor-crosshair" : "cursor-default"}`}
              style={{ background: "radial-gradient(circle at center, #131c2c 0%, #07101b 80%)" }}
              onClick={handleViewerClick}
            >
              <BrainCT
                slice={slice}
                total={total}
                overlay={overlay}
                window={windowing}
                selectedAspect={selectedAspect}
                measurePts={measurePts}
                measureDist={measureDist}
              />

              {/* Corner overlays */}
              <div className="absolute top-3 left-3 font-mono whitespace-nowrap text-[10.5px] text-slate-300 space-y-0.5 pointer-events-none">
                <div className="text-[12px] font-semibold">L</div>
                <div>{windowing.toUpperCase()} · {WL_MAP[windowing]}</div>
                <div>{(slice * 5).toString().padStart(3, "0")} mm</div>
              </div>
              <div className="absolute top-3 right-3 font-mono whitespace-nowrap text-[10.5px] text-slate-300 text-right space-y-0.5 pointer-events-none">
                <div className="text-[12px] font-semibold">R</div>
                <div>SLICE {slice} / {total}</div>
                <div>nnU-Net v4.2.1</div>
              </div>
              <div className="absolute bottom-3 left-3 font-mono whitespace-nowrap text-[10.5px] text-slate-400 pointer-events-none">
                C-44211 · 06:38:42 ICT
              </div>
              <div className="absolute bottom-3 right-3 font-mono whitespace-nowrap text-[10.5px] text-slate-400 text-right pointer-events-none">
                512 × 512 · 0.85 mm/px
              </div>

              {/* Measure distance readout */}
              {measureDist && (
                <div className="absolute bottom-10 left-3 bg-[#0a1322]/80 text-sky-300 font-mono text-[11px] px-2 py-1 rounded pointer-events-none">
                  {measureDist} mm
                </div>
              )}

              {running && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute left-0 right-0 h-px bg-rose-400 scan-line" />
                </div>
              )}
            </div>

            {/* Slice thumbnails */}
            <div className="border-l border-slate-800 overflow-y-auto" style={{ maxHeight: 520 }}>
              {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
                const isActive = n === slice;
                const hot = n >= 14 && n <= 20;
                return (
                  <button
                    key={n}
                    onClick={() => setSlice(n)}
                    className={`relative block w-full h-[60px] border-b border-slate-800 ${isActive ? "bg-rose-500/15" : "hover:bg-white/[0.04]"}`}
                  >
                    <BrainCTThumb slice={n} overlay={overlay && hot} />
                    <span className={`absolute top-1 left-1 font-mono text-[9.5px] ${isActive ? "text-rose-300 font-bold" : "text-slate-500"}`}>{n}</span>
                    {hot && overlay && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: "#fb7185" }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slice slider */}
          <div className="px-4 py-3 border-t hairline bg-white">
            <div className="flex items-center gap-3">
              <button onClick={() => setSlice(Math.max(1, slice - 1))} className="w-9 h-9 rounded-md grid place-items-center border hairline-strong hover:bg-slate-50 t-secondary">
                <Icon name="chevron-left" size={14} />
              </button>
              <input
                type="range"
                className="clinical flex-1"
                min={1}
                max={total}
                value={slice}
                onChange={(e) => setSlice(+e.target.value)}
              />
              <button onClick={() => setSlice(Math.min(total, slice + 1))} className="w-9 h-9 rounded-md grid place-items-center border hairline-strong hover:bg-slate-50 t-secondary">
                <Icon name="chevron-right" size={14} />
              </button>
              <div className="font-mono text-[13px] t-primary tabular-nums w-16 text-right font-semibold">
                {slice}<span className="t-muted"> / {total}</span>
              </div>
            </div>
            <div className="mt-2 relative h-4">
              {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
                <div
                  key={n}
                  className={`absolute top-1 w-px h-1.5 ${n >= 14 && n <= 20 ? "bg-[#c1272d]" : "bg-slate-300"}`}
                  style={{ left: `calc(${((n - 1) / (total - 1)) * 100}% - 0.5px)` }}
                />
              ))}
              <div
                className="absolute -top-0.5 text-[10px] font-mono text-[#8b1a1f] font-semibold whitespace-nowrap"
                style={{ left: `calc(${((17 - 1) / (total - 1)) * 100}% - 24px)` }}
              >
                hemorrhage band
              </div>
            </div>
          </div>
        </Card>

        {/* Right: metrics + ASPECTS */}
        <div className="xl:col-span-5 space-y-4">
          <Card eyebrow="Quantification" title="Automated clinical metrics">
            <div className="grid grid-cols-2 gap-3">
              <MetricBlock label="Hemorrhage volume" value={hemoVol} unit="mL" tone={hemoVol >= 30 ? "danger" : hemoVol >= 10 ? "warn" : "ok"} max={60} note={hemoVol >= 30 ? "Severe — surgical threshold" : hemoVol > 0 ? "Moderate" : "No bleed"} />
              <MetricBlock label="Midline shift" value={midline} unit="mm" tone={midline >= 5 ? "danger" : midline >= 2 ? "warn" : "ok"} max={10} note={midline >= 5 ? "Significant mass effect" : midline >= 2 ? "Mild" : "Within normal"} />
              <MetricBlock label="IVH extension" value={0.0} unit="mL" tone="ok" max={20} note="None detected" />
              <MetricBlock label="ICH score" value={3} unit="/ 6" tone="warn" max={6} note="30-day mortality ≈ 72%" />
            </div>
            {/* AI Override buttons for critical findings */}
            <div className="mt-3 pt-3 border-t hairline flex items-center gap-2 flex-wrap">
              <span className="text-[11.5px] t-muted">Disagree with AI?</span>
              <AIOverride
                finding="Hemorrhage volume"
                value={`${hemoVol} mL`}
                onOverride={handleOverride}
              />
              <AIOverride
                finding="Midline shift"
                value={`${midline} mm`}
                onOverride={handleOverride}
              />
            </div>
            {overrideLog.length > 0 && (
              <div className="mt-2 space-y-1">
                {overrideLog.map((o, i) => (
                  <div key={i} className="text-[11px] t-muted font-mono bg-slate-50 px-2 py-1 rounded">
                    <Icon name="shield" size={10} className="inline mr-1" />
                    Override: {o.finding} · "{o.reason}" · {o.at} · {o.by}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card eyebrow="Imaging" title="ASPECTS · 10-point score"
            right={<Badge tone="danger">7 / 10</Badge>}
            titleTip="Alberta Stroke Program Early CT Score. Each of 10 regions = 1 point. Score ≤ 7 predicts poor functional outcome. Click a region to highlight it on the CT viewer.">
            <Aspects selectedAspect={selectedAspect} onSelect={handleAspectClick} />
            {selectedAspect && (
              <div className="mt-2 p-2.5 rounded-md bg-[#fde8e9] border border-[#f4c5c8] text-[12px] text-[#8b1a1f] leading-relaxed">
                <span className="font-semibold">{selectedAspect}:</span> {ASPECTS_REASONS[selectedAspect]}
              </div>
            )}
            {!selectedAspect && (
              <div className="mt-3 text-[12.5px] t-secondary leading-relaxed">
                <span className="text-[#8b1a1f] font-semibold">Hypodense:</span> M3, lentiform, insular ribbon. Remaining regions preserved — consistent with right MCA ischemic penumbra adjacent to active hemorrhage.
              </div>
            )}
          </Card>

          <div className="rounded-md border flash-warn px-4 py-3 flex items-start gap-3">
            <span className="w-10 h-10 rounded-md grid place-items-center bg-[#fcd2d5] text-[#8b1a1f] border border-[#f4c5c8] shrink-0">
              <Icon name="ambulance" size={18} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-[#8b1a1f]">Immediate neurosurgical consultation advised</div>
              <div className="text-[12.5px] text-[#7a1b1f] leading-relaxed mt-0.5">
                Hemorrhage volume 34.2 mL with 4.8 mm midline shift exceeds operative threshold. Suggest urgent decompressive craniectomy review.
              </div>
              <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                <Btn variant="danger" size="sm" icon="phone">Page Dr. Worawit</Btn>
                <Btn variant="secondary" size="sm" icon="check">Acknowledge</Btn>
                <AIOverride
                  finding="ASPECTS Score"
                  value="7 / 10"
                  onOverride={handleOverride}
                  compact
                />
              </div>
            </div>
            <div className="text-[11px] font-mono text-[#8b1a1f]/80 shrink-0">ETA 3m</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricBlock({ label, value, unit, tone = "primary", max = 100, note }) {
  const colors = { danger: "#c1272d", warn: "#b15c00", ok: "#066c44", primary: "var(--text)" };
  return (
    <div className="surface-2 rounded-md p-3">
      <div className="flex items-center justify-between">
        <div className="label-eyebrow">{label}</div>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: colors[tone] }} />
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <div className="text-[22px] font-semibold tabular-nums" style={{ color: colors[tone] }}>{value}</div>
        <div className="text-[12px] t-muted">{unit}</div>
      </div>
      <div className="mt-2"><ProgressBar value={value} max={max} tone={tone === "primary" ? "accent" : tone} /></div>
      {note && <div className="mt-2 text-[11.5px] t-muted">{note}</div>}
    </div>
  );
}

const ASPECTS_REGIONS = [
  { k: "M1", aff: false, gang: false },
  { k: "M2", aff: false, gang: false },
  { k: "M3", aff: true,  gang: false },
  { k: "M4", aff: false, gang: true  },
  { k: "M5", aff: false, gang: true  },
  { k: "M6", aff: false, gang: true  },
  { k: "C",  aff: false, gang: true  },
  { k: "L",  aff: true,  gang: true  },
  { k: "IC", aff: false, gang: true  },
  { k: "I",  aff: true,  gang: true  },
];

function Aspects({ selectedAspect, onSelect }) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {ASPECTS_REGIONS.map((r) => {
        const sel = selectedAspect === r.k;
        return (
          <Tip key={r.k} text={`${r.k}: ${ASPECTS_REASONS[r.k]?.slice(0, 60)}… — click to highlight on CT`}>
            <button
              onClick={() => onSelect(r.k)}
              className={`w-full aspect-square rounded-md border flex flex-col items-center justify-center transition-all cursor-pointer
                ${sel ? "ring-2 ring-offset-1 ring-[color:var(--accent)] scale-105" : "hover:scale-105"}`}
              style={{
                background: sel ? "var(--accent-soft)" : r.aff ? "#fde8e9" : "var(--surface-2)",
                borderColor: sel ? "var(--accent)" : r.aff ? "#f4c5c8" : "var(--line)",
                color: sel ? "var(--accent-text)" : r.aff ? "#8b1a1f" : "var(--text-2)",
              }}
            >
              <span className="text-[13px] font-semibold">{r.k}</span>
              <span className="text-[9.5px] opacity-70 uppercase tracking-wider">{r.gang ? "gangl." : "supra."}</span>
            </button>
          </Tip>
        );
      })}
    </div>
  );
}

// ---- Brain CT SVG ----
function BrainCT({ slice, total, overlay, window: w, selectedAspect, measurePts, measureDist }) {
  const inHemo = slice >= 12 && slice <= 22;
  const dist = Math.abs(slice - 17);
  const amt = Math.max(0, 1 - dist / 7);
  const pos = selectedAspect ? ASPECTS_POSITIONS[selectedAspect] : null;

  return (
    <svg viewBox="0 0 400 400" className="w-full h-full" style={{ userSelect: "none" }}>
      <defs>
        <radialGradient id="brainGrad" cx="50%" cy="48%" r="55%">
          <stop offset="0%" stopColor="#647489" />
          <stop offset="60%" stopColor="#3d4a5e" />
          <stop offset="100%" stopColor="#1e2734" />
        </radialGradient>
        <radialGradient id="hemoGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fecdd3" stopOpacity="0.98" />
          <stop offset="45%" stopColor="#fb7185" stopOpacity="0.88" />
          <stop offset="100%" stopColor="#9f1239" stopOpacity="0" />
        </radialGradient>
        <filter id="bcBlur"><feGaussianBlur stdDeviation="2.2" /></filter>
        <filter id="hemoBlur"><feGaussianBlur stdDeviation="3" /></filter>
        <clipPath id="brainClip">
          <ellipse cx="200" cy="205" rx="148" ry="158" />
        </clipPath>
      </defs>

      <ellipse cx="200" cy="205" rx="158" ry="168" fill="#0d1622" stroke="#cbd5e1" strokeWidth="3" opacity="0.92" />
      <ellipse cx="200" cy="205" rx="152" ry="162" fill="none" stroke="#94a3b8" strokeWidth="1" opacity="0.45" />

      <g clipPath="url(#brainClip)">
        <ellipse cx="200" cy="208" rx="148" ry="156" fill="url(#brainGrad)" />
        <line x1="200" y1="55" x2="200" y2="362" stroke="#0f172a" strokeWidth="2" />
        <g stroke="#1e293b" strokeWidth="1.4" fill="none" opacity="0.85" filter="url(#bcBlur)">
          <path d="M90,150 Q120,140 150,160 T210,150" />
          <path d="M80,200 Q120,190 160,210 T220,200" />
          <path d="M90,260 Q130,250 170,270 T230,260" />
          <path d="M200,80 Q230,100 250,140 T290,200" />
          <path d="M200,330 Q235,310 260,280 T300,230" />
        </g>
        <g fill="#020617" opacity="0.85">
          <path d="M170,180 Q188,170 196,190 Q194,225 178,232 Q160,224 168,196 Z" />
          <path d="M230,180 Q212,170 204,190 Q206,225 222,232 Q240,224 232,196 Z" />
          <ellipse cx="200" cy="244" rx="6" ry="14" />
        </g>

        {/* ASPECTS region highlight */}
        {pos && (
          <ellipse
            cx={pos.cx}
            cy={pos.cy}
            rx={pos.rx}
            ry={pos.ry}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeDasharray="5 3"
            opacity="0.9"
          >
            <animate attributeName="stroke-opacity" values="0.9;0.3;0.9" dur="1.2s" repeatCount="indefinite" />
          </ellipse>
        )}

        {inHemo && overlay && (
          <g>
            <g filter="url(#hemoBlur)" opacity={0.45 + 0.5 * amt}>
              <ellipse cx={244 + (slice - 17) * 1.4} cy="200" rx={28 + 16 * amt} ry={22 + 12 * amt} fill="url(#hemoGrad)" />
            </g>
            <ellipse cx="244" cy="200" rx={48 + 10 * amt} ry={36 + 8 * amt} fill="none" stroke="#fb7185" strokeWidth="1" strokeDasharray="3 3" opacity={0.4 + 0.4 * amt} />
            <line x1="200" y1="55" x2={200 - 4 * amt} y2="362" stroke="#fbbf24" strokeWidth="1" strokeDasharray="4 4" opacity={0.7 * amt} />
            <g fontFamily="ui-monospace, monospace" fontSize="10" fill="#fda4af">
              <line x1="244" y1="200" x2="320" y2="160" stroke="#fda4af" strokeWidth="0.8" />
              <circle cx="244" cy="200" r="2.5" fill="#fda4af" />
              <text x="323" y="160" fontWeight="600">IPH · right basal ganglia</text>
              <text x="323" y="173" fill="#fcd34d">vol {(34.2 - Math.abs(slice - 17) * 4.2).toFixed(1)} mL</text>
            </g>
          </g>
        )}

        {/* Caliper measurement overlay */}
        {measurePts.length >= 1 && (
          <g>
            <circle cx={measurePts[0].x} cy={measurePts[0].y} r="4" fill="#38bdf8" stroke="white" strokeWidth="1.5" />
            {measurePts.length >= 2 && (
              <>
                <circle cx={measurePts[1].x} cy={measurePts[1].y} r="4" fill="#38bdf8" stroke="white" strokeWidth="1.5" />
                <line
                  x1={measurePts[0].x} y1={measurePts[0].y}
                  x2={measurePts[1].x} y2={measurePts[1].y}
                  stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 3"
                />
                {measureDist && (
                  <text
                    x={(measurePts[0].x + measurePts[1].x) / 2 + 6}
                    y={(measurePts[0].y + measurePts[1].y) / 2 - 6}
                    fontFamily="ui-monospace, monospace"
                    fontSize="12"
                    fill="#38bdf8"
                    fontWeight="600"
                  >
                    {measureDist} mm
                  </text>
                )}
              </>
            )}
          </g>
        )}
      </g>

      {/* Scale bar */}
      <g stroke="#94a3b8" strokeWidth="0.6" opacity="0.55">
        <line x1="20" y1="200" x2="40" y2="200" />
        <line x1="20" y1="200" x2="20" y2="220" />
        <text x="22" y="216" fontFamily="ui-monospace" fontSize="9" fill="#cbd5e1">10 mm</text>
      </g>
    </svg>
  );
}

function BrainCTThumb({ slice, overlay }) {
  return (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      <ellipse cx="30" cy="32" rx="22" ry="24" fill="#0b1120" stroke="#475569" strokeWidth="0.8" />
      <ellipse cx="30" cy="33" rx="19" ry="21" fill="#3d4a5e" />
      <line x1="30" y1="12" x2="30" y2="54" stroke="#0f172a" strokeWidth="0.5" />
      <ellipse cx="26" cy="33" rx="4" ry="6" fill="#020617" />
      <ellipse cx="34" cy="33" rx="4" ry="6" fill="#020617" />
      {overlay && <ellipse cx="38" cy="32" rx="5" ry="4" fill="#fb7185" opacity="0.9" />}
    </svg>
  );
}

Object.assign(window, { Axia });
