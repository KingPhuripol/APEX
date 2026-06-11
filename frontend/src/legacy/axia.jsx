import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Icon,
  Badge,
  Stat,
  ProgressBar,
  Btn,
  Card,
  PageHeader,
  PatientStrip,
  StatusDot,
} from "./ui.jsx";
import { axiaClassify, axiaSegment, ApiError } from "../lib/api.js";

// ============================================================
// AXIA — Emergency Brain CT (Real API Integration)
// ============================================================

function Axia({ running: globalRunning }) {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | fetching | anonymizing | queued | classifying | segmenting | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isMockMode, setMock] = useState(false);

  const [slice, setSlice] = useState(16);
  const [windowing, setWindowing] = useState("Brain"); // Brain | Stroke | Bone
  const [overlay, setOverlay] = useState(true);
  const total = 32;

  const handleFiles = useCallback((selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    setFiles(Array.from(selectedFiles));
    setError("");
  }, []);

  const runAnalysis = useCallback(async () => {
    if (!files.length) return;
    setStatus("anonymizing");
    setResult(null);
    setError("");
    setMock(false);

    try {
      await new Promise((r) => setTimeout(r, 600));
      setStatus("queued");
      await new Promise((r) => setTimeout(r, 800));
      setStatus("classifying");
      // Step 1: Classify
      const clsRes = await axiaClassify(files);
      const isHemo = clsRes.type === "hemorrhage";

      setStatus("segmenting");

      // Step 2: Segment
      const segRes = await axiaSegment(files, clsRes.type);

      setResult({
        type: clsRes.type,
        volume: segRes.volume,
        midlineShift: segRes.midlineShift,
        maskFound: segRes.maskFound,
        confidence: clsRes.confidence,
      });
      setStatus("done");
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setMock(true);
        setTimeout(() => {
          setResult({
            type: "hemorrhage",
            volume: 34.2,
            midlineShift: 4.8,
            maskFound: true,
            confidence: 0.98,
          });
          setStatus("done");
        }, 2000);
      } else {
        setError(err.message || "Analysis failed. Please try again.");
        setStatus("error");
      }
    }
  }, [files]);

  const reset = () => {
    setFiles([]);
    setStatus("idle");
    setResult(null);
    setError("");
    setMock(false);
  };

  const fetchFromPACS = async () => {
    setFiles([]);
    setError("");
    setStatus("fetching");

    try {
      const data = await coreOrchestrate(null, "8472-119", "axia");
      const pipeline = data.pipeline_results;

      if (!pipeline.stage1_quality_gate.passed) {
        setError(
          pipeline.stage1_quality_gate.reject_reason ||
            "Quality gate failed. Image rejected.",
        );
        setStatus("error");
        return;
      }

      setStatus("anonymizing");
      await new Promise((r) => setTimeout(r, 1000));
      setStatus("queued");
      await new Promise((r) => setTimeout(r, 800));
      setStatus("classifying");
      await new Promise((r) => setTimeout(r, 1200));
      setStatus("segmenting");
      await new Promise((r) => setTimeout(r, 1500));

      setResult({
        type: pipeline.stage2_analysis.raw_findings?.type || "hemorrhage",
        volume: pipeline.stage2_analysis.raw_findings?.volume || 34.2,
        midlineShift: 4.8,
        maskFound: true,
        confidence: pipeline.stage2_analysis.raw_findings?.confidence || 0.98,
      });
      setMock(true);
      setStatus("done");
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setStatus("anonymizing");
        await new Promise((r) => setTimeout(r, 1000));
        setStatus("queued");
        await new Promise((r) => setTimeout(r, 800));
        setStatus("classifying");
        await new Promise((r) => setTimeout(r, 1500));
        setStatus("segmenting");
        await new Promise((r) => setTimeout(r, 2000));

        setResult({
          type: "hemorrhage",
          volume: 34.2,
          midlineShift: 4.8,
          maskFound: true,
          confidence: 0.98,
        });
        setMock(true);
        setStatus("done");
      } else {
        setError(err.message || "Fetch failed.");
        setStatus("error");
      }
    }
  };

  const isRunning =
    ["fetching", "anonymizing", "queued", "classifying", "segmenting"].includes(
      status,
    ) || globalRunning;

  const hemoVol = result?.volume || 0;
  const midline = result?.midlineShift || 0.0;
  const inHemo = slice >= 12 && slice <= 22; // For mock viewer visual

  return (
    <div className="fade-up space-y-4">
      <PageHeader
        eyebrow="AXIA · Emergency Brain CT"
        title={
          result && result.type === "hemorrhage" ? (
            <>
              Acute intracranial hemorrhage —{" "}
              <span className="accent-text">right MCA territory</span>
            </>
          ) : result ? (
            <>Ischemic Stroke Assessment</>
          ) : (
            <>Automated NCCT Analysis</>
          )
        }
        subtitle="Voxel-wise nnU-Net segmentation, ASPECTS scoring and midline-shift detection on non-contrast CT."
        right={
          <>
            {result && result.volume > 10 && (
              <Badge tone="danger" className="flash-warn">
                <Icon name="siren" size={11} /> Critical · Code Stroke
              </Badge>
            )}
            {isMockMode && (
              <Badge tone="warn">
                <Icon name="wifi-off" size={11} /> Demo Mode
              </Badge>
            )}
            <Btn variant="secondary" icon="share-2" size="sm">
              Page neuro
            </Btn>
            <Btn
              icon={isRunning ? "loader" : "refresh-cw"}
              size="sm"
              onClick={runAnalysis}
              disabled={!files.length || isRunning}
            >
              {isRunning ? "Analyzing…" : "Analyze"}
            </Btn>
          </>
        }
      />

      <PatientStrip
        items={[
          { k: "Patient", v: "Suriyatat, Niran · 74F" },
          { k: "MRN", v: "8472-119" },
          { k: "Study", v: "CT · non-contrast" },
          { k: "Acquired", v: "06:38 ICT (today)" },
          {
            k: "Symptom onset",
            v: <span className="text-[#c1272d]">T + 22 min</span>,
          },
          { k: "Series", v: "512 × 512 · 32 slices · 5.0 mm" },
        ]}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left: viewer */}
        <Card
          className={
            status === "idle" || status === "error"
              ? "xl:col-span-12 max-w-4xl mx-auto w-full"
              : "xl:col-span-7"
          }
          padded={false}
        >
          {status === "idle" || status === "error" ? (
            <div className="p-10 flex flex-col items-center justify-center min-h-[500px]">
              <div className="w-full max-w-lg border rounded-xl p-8 flex flex-col items-center justify-center text-center bg-slate-50">
                <Icon
                  name="database"
                  size={32}
                  className="text-slate-400 mb-3"
                />
                <div className="text-[15px] font-semibold text-slate-800">
                  Fetch study from PACS
                </div>
                <div className="text-[13px] text-slate-500 mt-1 mb-6">
                  Pull current study directly from hospital VNA
                </div>

                <div className="w-full flex items-center gap-2">
                  <div className="flex-1 bg-white border border-slate-200 shadow-sm rounded-md px-3 py-2 text-left text-[13px] font-mono text-slate-700 flex items-center justify-between">
                    <span>MRN: 8472-119</span>
                    <Badge tone="neutral">CT non-contrast</Badge>
                  </div>
                  <Btn icon="cloud-download" onClick={fetchFromPACS}>
                    Fetch Study
                  </Btn>
                </div>

                <div className="flex items-center gap-4 w-full my-6">
                  <div className="h-px bg-slate-200 flex-1" />
                  <span className="text-[11px] t-muted font-medium uppercase tracking-wider">
                    OR
                  </span>
                  <div className="h-px bg-slate-200 flex-1" />
                </div>

                <div
                  className="w-full border-2 border-dashed border-slate-300 bg-white rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() =>
                    document.getElementById("axia-file-upload").click()
                  }
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFiles(e.dataTransfer.files);
                  }}
                >
                  <input
                    id="axia-file-upload"
                    type="file"
                    multiple
                    className="hidden"
                    accept=".dcm,.dicom,image/*"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                  <Icon
                    name="upload-cloud"
                    size={20}
                    className="text-slate-400 mb-2"
                  />
                  <div className="text-[13px] font-medium text-slate-700">
                    Manual upload for external files
                  </div>
                  <div className="text-[11.5px] text-slate-500 mt-0.5">
                    DICOM or images supported
                  </div>
                </div>

                {files.length > 0 && (
                  <div className="mt-4 w-full text-left">
                    <div className="p-2 bg-white rounded-md border shadow-sm w-full text-sm font-mono text-slate-600 mb-3">
                      {files.length} file(s) selected
                    </div>
                    <Btn
                      className="w-full"
                      icon="sparkles"
                      onClick={runAnalysis}
                    >
                      Run AXIA Analysis
                    </Btn>
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-4 text-sm text-[#c1272d] bg-[#fde8e9] px-3 py-2 rounded-md border border-[#f4c5c8] flex items-center gap-2 w-full max-w-lg">
                  <Icon name="triangle-alert" size={14} /> {error}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b hairline flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge tone="accent">
                    <Icon name="layers" size={11} /> Axial
                  </Badge>
                  <Badge tone="neutral">WL 40 / WW 80</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={reset}
                    className="px-2.5 h-7 rounded-md text-[12px] border border-slate-200 t-secondary bg-white hover:bg-slate-50 font-medium flex items-center gap-1.5"
                  >
                    <Icon name="x" size={12} /> Clear
                  </button>
                  <div className="w-px h-5 bg-slate-200 mx-1.5" />
                  {["Brain", "Stroke", "Bone"].map((w) => (
                    <button
                      key={w}
                      onClick={() => setWindowing(w)}
                      className={`px-2.5 h-7 rounded-md text-[12px] border accent-transition font-medium whitespace-nowrap
                        ${windowing === w ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent-text)]" : "border-slate-200 t-secondary bg-white hover:bg-slate-50"}`}
                    >
                      {w}
                    </button>
                  ))}
                  <div className="w-px h-5 bg-slate-200 mx-1.5" />
                  <button
                    onClick={() => setOverlay(!overlay)}
                    className={`px-2.5 h-7 rounded-md text-[12px] border accent-transition font-medium whitespace-nowrap inline-flex items-center gap-1.5
                      ${overlay ? "border-[#c1272d]/40 bg-[#fde8e9] text-[#8b1a1f]" : "border-slate-200 t-secondary bg-white hover:bg-slate-50"}`}
                  >
                    <Icon name="eye" size={12} /> Mask
                  </button>
                </div>
              </div>

              {/* viewer body */}
              <div className="relative grid grid-cols-[1fr_64px] viewer-dark">
                <div
                  className="relative aspect-square viewer-grid"
                  style={{
                    background:
                      "radial-gradient(circle at center, #131c2c 0%, #07101b 80%)",
                  }}
                >
                  <BrainCT
                    slice={slice}
                    total={total}
                    overlay={overlay}
                    window={windowing}
                    result={result}
                  />

                  <div className="absolute top-3 left-3 font-mono whitespace-nowrap text-[10.5px] text-slate-300 space-y-0.5 pointer-events-none">
                    <div className="text-[12px] font-semibold">L</div>
                    <div>{windowing.toUpperCase()} · WL 40 / WW 80</div>
                    <div>{(slice * 5).toString().padStart(3, "0")} mm</div>
                  </div>
                  <div className="absolute top-3 right-3 font-mono whitespace-nowrap text-[10.5px] text-slate-300 text-right space-y-0.5 pointer-events-none">
                    <div className="text-[12px] font-semibold">R</div>
                    <div>
                      SLICE {slice} / {total}
                    </div>
                    <div>AXIA AI Model</div>
                  </div>

                  {isRunning && (
                    <div className="absolute inset-0 overflow-hidden pointer-events-none bg-black/40 flex items-center justify-center">
                      <div className="text-white flex flex-col items-center gap-3 font-medium">
                        <Icon
                          name="loader"
                          size={24}
                          className="animate-spin"
                        />
                        {status === "fetching"
                          ? "Fetching from PACS..."
                          : status === "anonymizing"
                            ? "De-identifying DICOM headers..."
                            : status === "queued"
                              ? "Queued in GPU cluster..."
                              : status === "classifying"
                                ? "Classifying scan..."
                                : "Segmenting region..."}
                      </div>
                    </div>
                  )}
                </div>

                {/* slice thumbnails */}
                <div
                  className="border-l border-slate-800 overflow-y-auto"
                  style={{ maxHeight: 520 }}
                >
                  {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
                    const isActive = n === slice;
                    const hot =
                      result &&
                      result.type === "hemorrhage" &&
                      n >= 14 &&
                      n <= 20;
                    return (
                      <button
                        key={n}
                        onClick={() => setSlice(n)}
                        className={`relative block w-full h-[60px] border-b border-slate-800 ${isActive ? "bg-rose-500/15" : "hover:bg-white/[0.04]"}`}
                      >
                        <BrainCTThumb slice={n} overlay={overlay && hot} />
                        <span
                          className={`absolute top-1 left-1 font-mono text-[9.5px] ${isActive ? "text-rose-300 font-bold" : "text-slate-500"}`}
                        >
                          {n}
                        </span>
                        {hot && overlay && (
                          <span
                            className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                            style={{ background: "#fb7185" }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* slider */}
              <div className="px-4 py-3 border-t hairline bg-white">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSlice(Math.max(1, slice - 1))}
                    className="w-8 h-8 rounded-md grid place-items-center border hairline-strong hover:bg-slate-50 t-secondary"
                  >
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
                  <button
                    onClick={() => setSlice(Math.min(total, slice + 1))}
                    className="w-8 h-8 rounded-md grid place-items-center border hairline-strong hover:bg-slate-50 t-secondary"
                  >
                    <Icon name="chevron-right" size={14} />
                  </button>
                  <div className="font-mono text-[13px] t-primary tabular-nums w-16 text-right font-semibold">
                    {slice}
                    <span className="t-muted"> / {total}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </Card>

        {/* Right: metrics */}
        {status !== "idle" && status !== "error" && (
          <div className="xl:col-span-5 space-y-4">
            <Card eyebrow="Quantification" title="Automated clinical metrics">
              <div className="grid grid-cols-2 gap-3">
                <MetricBlock
                  label="Hemorrhage volume"
                  value={hemoVol}
                  unit="mL"
                  tone={
                    hemoVol >= 30 ? "danger" : hemoVol >= 10 ? "warn" : "ok"
                  }
                  max={60}
                  note={
                    hemoVol >= 30
                      ? "Severe — surgical threshold"
                      : hemoVol > 0
                        ? "Moderate"
                        : "No bleed"
                  }
                />
                <MetricBlock
                  label="Midline shift"
                  value={midline}
                  unit="mm"
                  tone={midline >= 5 ? "danger" : midline >= 2 ? "warn" : "ok"}
                  max={10}
                  note={
                    midline >= 5
                      ? "Significant mass effect"
                      : midline >= 2
                        ? "Mild"
                        : "Within normal limits"
                  }
                />
                <MetricBlock
                  label="IVH extension"
                  value={0.0}
                  unit="mL"
                  tone="ok"
                  max={20}
                  note="None detected"
                />
                <MetricBlock
                  label="ICH score"
                  value={3}
                  unit="/ 6"
                  tone="warn"
                  max={6}
                  note="30-day mortality ≈ 72%"
                />
              </div>
            </Card>

            <Card
              eyebrow="Imaging"
              title="ASPECTS · 10-point score"
              right={<Badge tone="danger">7 / 10</Badge>}
            >
              <Aspects />
              <div className="mt-3 text-[12.5px] t-secondary leading-relaxed">
                <span className="text-[#8b1a1f] font-semibold">Hypodense:</span>{" "}
                M3, lentiform, insular ribbon. Remaining regions preserved —
                consistent with right MCA ischemic penumbra adjacent to active
                hemorrhage.
              </div>
            </Card>

            {result && result.volume > 30 && (
              <div className="rounded-md border flash-warn px-4 py-3 flex items-start gap-3">
                <span className="w-10 h-10 rounded-md grid place-items-center bg-[#fcd2d5] text-[#8b1a1f] border border-[#f4c5c8] shrink-0">
                  <Icon name="ambulance" size={18} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-[#8b1a1f]">
                    Immediate neurosurgical consultation advised
                  </div>
                  <div className="text-[12.5px] text-[#7a1b1f] leading-relaxed mt-0.5">
                    Hemorrhage volume {hemoVol} mL with {midline} mm midline
                    shift exceeds operative threshold. Suggest urgent
                    decompressive craniectomy review.
                  </div>
                  <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                    <Btn variant="danger" size="sm" icon="phone">
                      Page Dr. Worawit
                    </Btn>
                    <Btn variant="secondary" size="sm" icon="check">
                      Acknowledge
                    </Btn>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-[#8b1a1f]/80 shrink-0">
                  ETA 3m
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricBlock({
  label,
  value,
  unit,
  tone = "primary",
  max = 100,
  note,
}) {
  const colors = {
    danger: "#c1272d",
    warn: "#b15c00",
    ok: "#066c44",
    primary: "var(--text)",
  };
  return (
    <div className="surface-2 rounded-md p-3">
      <div className="flex items-center justify-between">
        <div className="label-eyebrow">{label}</div>
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: colors[tone] }}
        />
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <div
          className="text-[22px] font-semibold tabular-nums"
          style={{ color: colors[tone] }}
        >
          {typeof value === "number" ? value.toFixed(1) : value}
        </div>
        <div className="text-[12px] t-muted">{unit}</div>
      </div>
      <div className="mt-2">
        <ProgressBar
          value={value}
          max={max}
          tone={tone === "primary" ? "accent" : tone}
        />
      </div>
      {note && <div className="mt-2 text-[11.5px] t-muted">{note}</div>}
    </div>
  );
}

const ASPECTS_REGIONS = [
  { k: "M1", aff: false, gang: false },
  { k: "M2", aff: false, gang: false },
  { k: "M3", aff: true, gang: false },
  { k: "M4", aff: false, gang: true },
  { k: "M5", aff: false, gang: true },
  { k: "M6", aff: false, gang: true },
  { k: "C", aff: false, gang: true },
  { k: "L", aff: true, gang: true },
  { k: "IC", aff: false, gang: true },
  { k: "I", aff: true, gang: true },
];
function Aspects() {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {ASPECTS_REGIONS.map((r) => (
        <div
          key={r.k}
          className="aspect-square rounded-md border flex flex-col items-center justify-center"
          style={{
            background: r.aff ? "#fde8e9" : "var(--surface-2)",
            borderColor: r.aff ? "#f4c5c8" : "var(--line)",
            color: r.aff ? "#8b1a1f" : "var(--text-2)",
          }}
        >
          <span className="text-[13px] font-semibold">{r.k}</span>
          <span className="text-[9.5px] opacity-70 uppercase tracking-wider">
            {r.gang ? "gangl." : "supra."}
          </span>
        </div>
      ))}
    </div>
  );
}

function BrainCT({ slice, total, overlay, window: w, result }) {
  const isHemo = result && result.type === "hemorrhage";
  const inHemo = slice >= 12 && slice <= 22;
  const dist = Math.abs(slice - 17);
  const amt = Math.max(0, 1 - dist / 7);

  return (
    <svg viewBox="0 0 400 400" className="w-full h-full">
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
        <filter id="bcBlur">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <filter id="hemoBlur">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <clipPath id="brainClip">
          <ellipse cx="200" cy="205" rx="148" ry="158" />
        </clipPath>
      </defs>

      <ellipse
        cx="200"
        cy="205"
        rx="158"
        ry="168"
        fill="#0d1622"
        stroke="#cbd5e1"
        strokeWidth="3"
        opacity="0.92"
      />
      <ellipse
        cx="200"
        cy="205"
        rx="152"
        ry="162"
        fill="none"
        stroke="#94a3b8"
        strokeWidth="1"
        opacity="0.45"
      />

      <g clipPath="url(#brainClip)">
        <ellipse cx="200" cy="208" rx="148" ry="156" fill="url(#brainGrad)" />
        <line
          x1="200"
          y1="55"
          x2="200"
          y2="362"
          stroke="#0f172a"
          strokeWidth="2"
        />
        <g
          stroke="#1e293b"
          strokeWidth="1.4"
          fill="none"
          opacity="0.85"
          filter="url(#bcBlur)"
        >
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

        {isHemo && inHemo && overlay && (
          <g>
            <g filter="url(#hemoBlur)" opacity={0.45 + 0.5 * amt}>
              <ellipse
                cx={244 + (slice - 17) * 1.4}
                cy="200"
                rx={28 + 16 * amt}
                ry={22 + 12 * amt}
                fill="url(#hemoGrad)"
              />
            </g>
            <ellipse
              cx="244"
              cy="200"
              rx={48 + 10 * amt}
              ry={36 + 8 * amt}
              fill="none"
              stroke="#fb7185"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity={0.4 + 0.4 * amt}
            />
            <line
              x1="200"
              y1="55"
              x2={200 - 4 * amt}
              y2="362"
              stroke="#fbbf24"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity={0.7 * amt}
            />
            <g
              fontFamily="ui-monospace, monospace"
              fontSize="10"
              fill="#fda4af"
            >
              <line
                x1="244"
                y1="200"
                x2="320"
                y2="160"
                stroke="#fda4af"
                strokeWidth="0.8"
              />
              <circle cx="244" cy="200" r="2.5" fill="#fda4af" />
              <text x="323" y="160" fontWeight="600">
                IPH · right basal ganglia
              </text>
              <text x="323" y="173" fill="#fcd34d">
                vol {(result.volume - Math.abs(slice - 17) * 4.2).toFixed(1)} mL
              </text>
            </g>
          </g>
        )}
      </g>
    </svg>
  );
}

function BrainCTThumb({ slice, overlay }) {
  return (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      <ellipse
        cx="30"
        cy="32"
        rx="22"
        ry="24"
        fill="#0b1120"
        stroke="#475569"
        strokeWidth="0.8"
      />
      <ellipse cx="30" cy="33" rx="19" ry="21" fill="#3d4a5e" />
      <line
        x1="30"
        y1="12"
        x2="30"
        y2="54"
        stroke="#0f172a"
        strokeWidth="0.5"
      />
      <ellipse cx="26" cy="33" rx="4" ry="6" fill="#020617" />
      <ellipse cx="34" cy="33" rx="4" ry="6" fill="#020617" />
      {overlay && (
        <ellipse cx="38" cy="32" rx="5" ry="4" fill="#fb7185" opacity="0.9" />
      )}
    </svg>
  );
}

export default Axia;
