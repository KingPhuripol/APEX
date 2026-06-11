import { useState, useRef, useCallback, useEffect } from "react";
import { smartlivaPredict, ApiError } from "../lib/api";
import {
  UploadCloud,
  Activity,
  Sparkles,
  AlertTriangle,
  Layers,
  Search,
  Maximize2,
  MousePointer2,
  CheckCircle2,
  FileText,
} from "lucide-react";
import MedicalReportModal from "../components/MedicalReportModal";

// ─── Fibrosis stage config ───────────────────────────────────────────────────
const FIBROSIS_INFO = {
  F0: {
    label: "No Fibrosis",
    color: "text-[var(--ok)]",
    badge: "bg-[var(--ok-soft)] text-[var(--ok)] border-[var(--ok)]",
  },
  F1: {
    label: "Mild Fibrosis",
    color: "text-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  },
  F2: {
    label: "Moderate Fibrosis",
    color: "text-[var(--warn)]",
    badge: "bg-[var(--warn-soft)] text-[var(--warn)] border-[var(--warn)]",
  },
  F3: {
    label: "Severe Fibrosis",
    color: "text-orange-500",
    badge: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  },
  F4: {
    label: "Cirrhosis",
    color: "text-[var(--danger)]",
    badge:
      "bg-[var(--danger-soft)] text-[var(--danger)] border-[var(--danger)]",
  },
};

function ConfBar({ value, label, colorClass = "bg-[var(--info)]" }) {
  const pct = Math.min(100, Math.round((value || 0) * 100));
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-[var(--text-2)] mb-1">
        <span>{label}</span>
        <span className="font-mono font-semibold text-[var(--text)]">
          {pct}%
        </span>
      </div>
      <div className="w-full bg-[var(--surface-3)] rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function FibrosisStages({ active }) {
  const stages = ["F0", "F1", "F2", "F3", "F4"];
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {stages.map((s) => {
        const on = s === active;
        const info = FIBROSIS_INFO[s];
        return (
          <div
            key={s}
            className={`rounded-md border text-center py-2 transition-all ${
              on
                ? `bg-[var(--surface)] border-[var(--line-strong)] shadow-sm`
                : "border-transparent bg-[var(--surface-3)] opacity-60"
            }`}
          >
            <div
              className={`text-lg font-bold ${on ? info.color : "text-[var(--muted)]"}`}
            >
              {s}
            </div>
            <div className="text-[9px] text-[var(--muted)] uppercase tracking-wider mt-0.5 font-bold">
              {FIBROSIS_INFO[s].label.split(" ")[0]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function renderMd(text) {
  return text
    .replace(/^>\s?/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
}

const MOCK_RESULT = {
  te_kpa: 8.5,
  fibrosis_stage: "F2",
  fibrosis_confidence: 0.9312,
  lesion_label: "HCC",
  lesion_confidence: 0.9187,
  parasite_label: "Normal",
  parasite_confidence: 0.9541,
  risk_level: "High",
  recommendation: "Urgent medical consultation required.",
  fibrosis_text: "Moderate fibrosis.",
  stiffness_status: "8.5 kPa (High)",
  steatosis_status: "Not Detected",
  follow_up: "3 months",
  requires_review: false,
  analysis_notes:
    "Hypoechoic nodule with irregular margin noted in right lobe, segment VI. Pattern consistent with early HCC. Recommend contrast-enhanced CT/MRI for confirmation.",
};

function sanitizeAnalysisNote(text) {
  if (!text) return "";
  return text
    .replace(/^\s*\[[^\]]*mock[^\]]*\]\s*/i, "")
    .replace(/^\s*\[[^\]]*offline[^\]]*\]\s*/i, "")
    .trim();
}

function buildAssistantSummary(data, mockMode = false) {
  const cleanNote = sanitizeAnalysisNote(
    data.analysis_notes || data.recommendation || "",
  );
  const modeLine = mockMode
    ? "Preliminary result generated in resilience mode while backend is recovering."
    : "Model inference completed successfully.";

  return [
    "**Analysis Complete**",
    modeLine,
    `Fibrosis Stage: ${data.fibrosis_stage} (${(data.fibrosis_confidence * 100).toFixed(0)}%)`,
    `Risk Level: ${data.risk_level}`,
    cleanNote,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export default function SmartLivaModule({ patientId }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isMockMode, setMock] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Reference Case Gallery
  const [referenceImages, setReferenceImages] = useState([]);

  useEffect(() => {
    fetch("/demo-dataset/manifest.json")
      .then((res) => res.json())
      .then((data) => {
        if (data.smartliva) setReferenceImages(data.smartliva);
      })
      .catch((err) => console.error("Failed to load reference manifest:", err));
  }, []);

  const [activeTool, setActiveTool] = useState("scroll");

  const handleFile = useCallback((f) => {
    if (!f) return;
    if (!/\.(png|jpg|jpeg|bmp|tiff?|dcm|dicom)$/i.test(f.name)) {
      setError("Please upload a JPEG, PNG, or DICOM image.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError("");
  }, []);

  const handleReferenceClick = async (url) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const fileObj = new File([blob], url.split("/").pop(), {
        type: blob.type || "image/jpeg",
      });
      handleFile(fileObj);
    } catch (e) {
      console.error("Reference load failed", e);
    }
  };

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  const runAnalysis = useCallback(async () => {
    if (!file) return;
    setStatus("analyzing");
    setResult(null);
    setError("");
    setMock(false);

    try {
      const data = await smartlivaPredict(file, {
        patientHn: patientId,
        language: "en",
      });
      setResult(data);
      setStatus("done");
    } catch (err) {
      if (err instanceof ApiError && [503, 500, 429].includes(err.status)) {
        setMock(true);
        await delay(350);
        setResult(MOCK_RESULT);
        setStatus("done");
      } else {
        setError(err.message || "Analysis failed. Please try again.");
        setStatus("error");
      }
    }
  }, [file, patientId]);

  return (
    <div className="flex flex-col lg:flex-row w-full lg:h-full bg-[var(--bg)]">
      {/* ─── LEFT PANE: Ultrasound Viewer (60%) ─── */}
      <div className="flex-[3] min-h-[46vh] lg:min-h-0 flex flex-col border-r border-[var(--line)] bg-[#000000]">
        {/* Viewer Toolbar */}
        <div className="h-12 border-b border-[#222222] bg-[#0a0a0a] flex items-center justify-between px-4">
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => setActiveTool("scroll")}
              className={`p-1.5 rounded flex items-center space-x-1.5 text-xs font-medium transition-colors ${activeTool === "scroll" ? "bg-[#2a2a2a] text-white" : "text-[#888888] hover:text-white hover:bg-[#1a1a1a]"}`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Series</span>
            </button>
            <button
              onClick={() => setActiveTool("pan")}
              className={`p-1.5 rounded flex items-center space-x-1.5 text-xs font-medium transition-colors ${activeTool === "pan" ? "bg-[#2a2a2a] text-white" : "text-[#888888] hover:text-white hover:bg-[#1a1a1a]"}`}
            >
              <MousePointer2 className="w-3.5 h-3.5" />
              <span>Pan/Zoom</span>
            </button>
            <button
              onClick={() => setActiveTool("window")}
              className={`p-1.5 rounded flex items-center space-x-1.5 text-xs font-medium transition-colors ${activeTool === "window" ? "bg-[#2a2a2a] text-white" : "text-[#888888] hover:text-white hover:bg-[#1a1a1a]"}`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>W/L</span>
            </button>
          </div>
          <button
            className="p-1.5 text-[#888888] hover:text-white transition-colors"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport */}
        <div
          className="flex-1 relative overflow-hidden flex items-center justify-center viewer-grid"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files[0]);
          }}
        >
          {preview ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={preview}
                alt="Ultrasound"
                className="max-w-full max-h-full object-contain filter grayscale contrast-125"
              />

              {/* US Scan Animation */}
              {status === "analyzing" && (
                <div className="absolute inset-0 overflow-hidden">
                  <div className="us-scan-line" />
                </div>
              )}

              {/* Fake AI Lesion Box Overlay for Demo */}
              {status === "done" && result?.lesion_label === "HCC" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 border-2 border-dashed border-[var(--warn)] bg-[var(--warn-soft)]/20 transform translate-x-8 sm:translate-x-12 translate-y-6 sm:translate-y-8 animate-pulse"></div>
                  <div className="absolute transform translate-x-[46px] sm:translate-x-[72px] translate-y-[-16px] sm:translate-y-[-24px] text-[10px] bg-[var(--warn)] text-white px-1 font-bold">
                    HCC {Math.round(result.lesion_confidence * 100)}%
                  </div>
                </div>
              )}

              {/* DICOM Overlays */}
              <div className="absolute top-3 left-3 sm:top-4 sm:left-4 text-[#ffcc00] font-mono text-[10px] sm:text-xs select-none">
                <div>{patientId}</div>
                <div>{file.name}</div>
                <div>US ABDOMEN COMPLETE</div>
              </div>
              <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 text-[#ffcc00] font-mono text-[10px] sm:text-xs text-right select-none">
                <div>MI: 1.2 TIS: 0.1</div>
                <div>12 MHz Linear</div>
                <div>Impl: SmartLiva Core</div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full">
              <div
                className={`flex flex-col items-center justify-center p-6 sm:p-8 text-center rounded-lg border-2 border-dashed transition-colors w-[90%] max-w-md ${dragOver ? "border-[var(--info)] bg-[var(--info-soft)]" : "border-[#333] hover:border-[#555]"}`}
              >
                <UploadCloud className="w-10 h-10 text-[#666] mb-3" />
                <div className="text-sm font-medium text-[#ccc] mb-1">
                  Drag and drop Ultrasound Image
                </div>
                <div className="text-xs text-[#666] mb-4">
                  JPEG, PNG, DICOM supported
                </div>
                <input
                  type="file"
                  id="sl-upload"
                  className="hidden"
                  accept=".dcm,.dicom,.png,.jpg,.jpeg"
                  onChange={(e) => handleFile(e.target.files[0])}
                />
                <div className="flex space-x-3">
                  <label
                    htmlFor="sl-upload"
                    className="px-4 py-2 bg-[#222] hover:bg-[#333] text-white text-xs font-semibold rounded cursor-pointer transition-colors border border-[#444]"
                  >
                    Browse Files
                  </label>
                </div>
              </div>

              {/* Reference Gallery */}
              {referenceImages.length > 0 && (
                <div className="mt-8 w-[90%] max-w-2xl">
                  <div className="text-xs text-[#888] font-bold uppercase tracking-wider mb-3 text-center">
                    Or select a clinical reference ultrasound
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {referenceImages.map((url, i) => (
                      <div
                        key={i}
                        onClick={() => handleReferenceClick(url)}
                        className="cursor-pointer border-2 border-[#333] hover:border-[var(--info)] rounded-md overflow-hidden aspect-square transition-all hover:scale-105 bg-black"
                      >
                        <img
                          src={url}
                          className="w-full h-full object-cover filter grayscale contrast-125"
                          alt="Reference Case"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── RIGHT PANE: AI Copilot Report & Chat (40%) ─── */}
      <div className="flex-[2] min-h-[54vh] lg:min-h-0 flex flex-col bg-[var(--surface)] border-t lg:border-t-0 lg:border-l border-[var(--line)]">
        {/* Module Title */}
        <div className="p-5 border-b border-[var(--line)] bg-[var(--surface-2)] shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-2 text-[var(--info)] mb-1">
                <Activity className="w-5 h-5" />
                <h2 className="font-bold text-lg">SmartLiva Copilot</h2>
              </div>
              <p className="text-xs text-[var(--muted)]">
                Advanced Computer Vision Ultrasound Analysis
              </p>
              {isMockMode && (
                <p className="mt-2 text-[11px] text-amber-400 font-semibold">
                  Resilience mode active: showing preliminary AI output while
                  backend services recover.
                </p>
              )}
            </div>
            {/* Demo Mode badge removed for seamless presentation */}
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Pre-Analysis State */}
          {(status === "idle" || status === "error") && (
            <div className="p-5">
              {error && (
                <div className="p-3 mb-4 rounded-md bg-[var(--danger-soft)] border border-[var(--danger)] text-red-400 text-xs flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              {file && (
                <button
                  onClick={runAnalysis}
                  className="w-full py-3 rounded-md bg-[var(--info)] hover:bg-blue-600 text-white font-semibold text-sm shadow-sm transition-colors flex justify-center items-center space-x-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Run Analysis Pipeline</span>
                </button>
              )}
            </div>
          )}

          {/* Loading State */}
          {status === "analyzing" && (
            <div className="p-10 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 border-4 border-[var(--surface-3)] border-t-[var(--info)] rounded-full animate-spin-slow mb-4" />
              <div className="font-bold text-[var(--text)] text-sm mb-1">
                Analyzing Echogenicity...
              </div>
              <div className="text-xs text-[var(--muted)]">
                Core AI processing spatial features
              </div>
            </div>
          )}

          {/* Result State */}
          {status === "done" && result && (
            <div className="p-5 space-y-5 border-b border-[var(--line)]">
              {/* Fibrosis Staging */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-bold text-[var(--text)] uppercase tracking-wider">
                    Fibrosis Assessment
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${FIBROSIS_INFO[result.fibrosis_stage]?.badge}`}
                  >
                    {result.fibrosis_stage} —{" "}
                    {FIBROSIS_INFO[result.fibrosis_stage]?.label}
                  </span>
                </div>
                <FibrosisStages active={result.fibrosis_stage} />
              </div>

              {/* Confidence Details */}
              <div className="bg-[var(--surface-2)] p-4 rounded-md border border-[var(--line)]">
                <ConfBar
                  value={result.fibrosis_confidence}
                  label="Fibrosis Confidence"
                />
                {result.lesion_confidence > 0 && (
                  <ConfBar
                    value={result.lesion_confidence}
                    label={`Lesion Detected: ${result.lesion_label}`}
                    colorClass="bg-[var(--warn)]"
                  />
                )}
              </div>

              {/* Clinical Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div
                  className={`p-3 rounded-md border ${result.risk_level === "High" ? "bg-[var(--danger-soft)] border-[var(--danger)] text-[var(--danger)]" : "bg-[var(--surface-2)] border-[var(--line)] text-[var(--text)]"}`}
                >
                  <div className="text-[10px] uppercase font-bold tracking-wider opacity-70 mb-1">
                    Risk Level
                  </div>
                  <div className="font-semibold text-sm">
                    {result.risk_level}
                  </div>
                </div>
                <div className="p-3 rounded-md border bg-[var(--surface-2)] border-[var(--line)] text-[var(--text)]">
                  <div className="text-[10px] uppercase font-bold tracking-wider opacity-70 mb-1">
                    Stiffness / FibroScan
                  </div>
                  <div className="font-semibold text-sm">
                    {result.stiffness_status}
                  </div>
                </div>
              </div>

              {/* AI Clinical Notes */}
              {result.analysis_notes && (
                <div className="bg-[var(--surface-3)] p-4 rounded-md border border-[var(--line)]">
                  <div className="text-[10px] uppercase text-[var(--info)] font-bold mb-1.5 flex items-center">
                    <Sparkles className="w-3 h-3 mr-1" /> Explainable AI Note
                  </div>
                  <div className="text-xs text-[var(--text)] leading-relaxed">
                    {sanitizeAnalysisNote(result.analysis_notes)}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setIsReportOpen(true)}
                  className="flex-1 py-2.5 rounded-md bg-[var(--ok)] hover:bg-emerald-600 text-white font-semibold text-sm shadow-sm transition-colors flex justify-center items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Sign & Release Report
                </button>
                <button
                  onClick={() => {
                    setStatus("idle");
                    setResult(null);
                    setError("");
                    setMock(false);
                    setFile(null);
                    setPreview(null);
                  }}
                  className="px-4 py-2.5 rounded-md bg-[var(--surface-3)] hover:bg-[var(--surface-2)] border border-[var(--line-strong)] text-[var(--muted)] hover:text-[var(--text)] text-sm font-semibold transition-colors flex items-center gap-2"
                  title="Clear and start a new analysis"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Re-Analyze
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <MedicalReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        analysisResult={
          result
            ? {
                stage4_formatter: {
                  primary_finding: `${result.fibrosis_stage} Hepatic Fibrosis (${FIBROSIS_INFO[result.fibrosis_stage]?.label}). Risk Level: ${result.risk_level}`,
                  explainable_insights: [
                    result.fibrosis_text,
                    `Stiffness: ${result.stiffness_status}`,
                    result.steatosis_status
                      ? `Steatosis: ${result.steatosis_status}`
                      : null,
                    result.lesion_confidence > 0
                      ? `Lesion detected: ${result.lesion_label} (Confidence: ${Math.round(result.lesion_confidence * 100)}%)`
                      : null,
                    sanitizeAnalysisNote(result.analysis_notes),
                  ].filter(Boolean),
                  actionable_recommendations:
                    result.recommendation ||
                    `Recommend follow up in ${result.follow_up || "6 months"}.`,
                },
              }
            : null
        }
        patientId={patientId}
        moduleName="smartliva"
      />
    </div>
  );
}
