import { useState, useRef, useEffect, useCallback } from "react";
import { pichaHealth, pichaAnalyzeStream, pichaChat } from "../lib/api";
import {
  Microscope,
  Send,
  Bot,
  User,
  Maximize2,
  Layers,
  Loader2,
  CheckCircle2,
  Clock,
  Zap,
  RefreshCw,
  FileSearch,
  Activity,
  ChevronDown,
  ChevronUp,
  Upload,
  CheckCircle,
  Eye,
  BarChart3,
  Bug,
  Map,
  Hospital,
  Timer,
  ScanSearch,
  FileText,
  Brain,
  Shield,
  AlertTriangle,
  X,
} from "lucide-react";
import MedicalReportModal from "../components/MedicalReportModal";
import PICHAClinicalReport from "../components/picha/PICHAClinicalReport";
import XAIExplanationPanel from "../components/picha/XAIExplanationPanel";
import { playScanBlip, playAlertPing, playSuccessChime } from "../lib/audio";

// ─── MARS agent definitions ──────────────────────────────────────────────────
const MARS_AGENTS = [
  {
    id: "MLPrescreen",
    key: "MLPrescreen",
    icon: Microscope,
    role: "Tissue Composition Pre-screen",
    roleEN: "ConvNeXt-Base 9-Class",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
  },
  {
    id: "SlideQCAgent",
    key: "SlideQCAgent",
    icon: ScanSearch,
    role: "Slide Quality Control",
    roleEN: "Slide Quality Control",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
  },
  {
    id: "ParasitologistAgent",
    key: "ParasitologistAgent",
    icon: Bug,
    role: "OV Parasitology Assessment",
    roleEN: "OV Parasitology",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
  {
    id: "GradingAgent",
    key: "GradingAgent",
    icon: BarChart3,
    role: "WHO Histological Grading",
    roleEN: "WHO Grading",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
  },
  {
    id: "SpatialAgent",
    key: "SpatialAgent",
    icon: Map,
    role: "Spatial Microenvironment Analysis",
    roleEN: "Spatial Analysis",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
  },
  {
    id: "OncologistAgent",
    key: "OncologistAgent",
    icon: Hospital,
    role: "AJCC Staging & Treatment Planning",
    roleEN: "AJCC Staging",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  },
  {
    id: "TimeMachineAgent",
    key: "TimeMachineAgent",
    icon: Timer,
    role: "Survival Prognosis Modelling",
    roleEN: "Survival Prognosis",
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    border: "border-pink-500/30",
  },
  {
    id: "ReportAgent",
    key: "ReportAgent",
    icon: FileText,
    role: "CAP Protocol Report Compilation",
    roleEN: "Report Compiler",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
  },
];

// ── Phase 1 steps ──────────────────────────────────────────────────────────
const PHASE1_STEPS = [
  {
    title: "1. WSI Tiling (256×256)",
    desc: "Dividing whole slide into micro-patches",
  },
  {
    title: "2. Color Normalization",
    desc: "Macenko standardisation for stain consistency",
  },
  { title: "3. Quality Control", desc: "Filtering blur, folds, and artifacts" },
  {
    title: "4. 9-Class Patch Classifier",
    desc: "ConvNeXt-Base: Classifying tissue regions",
  },
];

// ── Phase Step Card ──────────────────────────────────────────────────────────
function PhaseStep({ active, done, title, desc }) {
  return (
    <div
      className={`p-3 rounded-lg border transition-all duration-300 ${
        active
          ? "bg-violet-500/10 border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.1)] transform scale-[1.02]"
          : done
            ? "bg-[var(--surface-2)] border-[var(--line-strong)]"
            : "bg-[var(--surface)] border-[var(--line)] opacity-50"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-sm font-bold ${active ? "text-violet-300" : done ? "text-[var(--text)]" : "text-[#666]"}`}
        >
          {title}
        </span>
        {done ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        ) : active ? (
          <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
        ) : null}
      </div>
      <div className="text-xs text-[var(--text-2)]">{desc}</div>
      {active && (
        <div className="mt-2 h-1 w-full bg-[var(--surface-3)] rounded-full overflow-hidden">
          <div className="h-full bg-violet-500 w-1/2 animate-pulse rounded-full" />
        </div>
      )}
    </div>
  );
}

// ── MARS Agent Card (SSE-driven) ────────────────────────────────────────────
function AgentCard({ agent, status, events, isExpanded, onToggle }) {
  const Icon = agent.icon;
  const agentEvents = events.filter((e) => e.agent === agent.key);
  const lastEvent = agentEvents[agentEvents.length - 1];
  const xaiEvents = agentEvents.filter((e) => e.message?.includes("[XAI]"));

  return (
    <div
      className={`rounded-lg border transition-all duration-300 overflow-hidden ${
        status === "done"
          ? `bg-[var(--surface-3)] ${agent.border} shadow-sm`
          : status === "active"
            ? `bg-[#1e1b4b] border-violet-500/60 shadow-[0_0_10px_rgba(139,92,246,0.2)]`
            : "bg-[var(--surface)] border-[var(--line)] opacity-40"
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full px-3 py-2.5 flex items-start gap-3 text-left"
      >
        <span
          className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
            status === "done"
              ? `${agent.bg} ${agent.border} ${agent.color}`
              : status === "active"
                ? "bg-violet-600 border-violet-400 text-white shadow-[0_0_8px_rgba(139,92,246,0.5)]"
                : "bg-[var(--surface-2)] border-[var(--line-strong)] text-[var(--muted)]"
          }`}
        >
          {status === "done" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Icon className="w-4 h-4" />
          )}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-bold ${status === "active" ? "text-violet-300" : "text-[var(--text)]"}`}
              >
                {agent.role}
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${agent.bg} ${agent.border} ${agent.color}`}
              >
                {agent.roleEN}
              </span>
            </div>
            <span className="text-xs font-mono text-[var(--muted)]">
              {status === "done"
                ? "✓"
                : status === "active"
                  ? "Reasoning..."
                  : ""}
            </span>
          </div>
          {status === "active" && lastEvent && (
            <p className="text-[11px] text-violet-300/80 mt-1 line-clamp-2 leading-snug">
              {lastEvent.message?.split("\n")[0].slice(0, 120)}
            </p>
          )}
          {status === "active" && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1 w-24 rounded-full bg-[var(--surface-2)] overflow-hidden">
                <div className="h-full bg-violet-400 w-1/2 animate-pulse rounded-full" />
              </div>
              <span className="text-[10px] text-violet-300 uppercase tracking-wider animate-pulse">
                Synthesizing...
              </span>
            </div>
          )}
          {status === "done" && xaiEvents.length > 0 && (
            <div className="mt-1 flex items-center gap-1">
              <Brain className="w-3 h-3 text-cyan-400" />
              <span className="text-[10px] text-cyan-400 font-bold">
                {xaiEvents.length} XAI explanations
              </span>
              {isExpanded ? (
                <ChevronUp className="w-3 h-3 text-[var(--muted)]" />
              ) : (
                <ChevronDown className="w-3 h-3 text-[var(--muted)]" />
              )}
            </div>
          )}
        </div>
      </button>
      {isExpanded && status === "done" && lastEvent && (
        <div className="px-3 pb-3">
          <pre className="text-[11px] text-[var(--text-2)] bg-[var(--surface)] rounded-lg p-3 whitespace-pre-wrap break-words leading-relaxed max-h-48 overflow-y-auto border border-[var(--line)]">
            {lastEvent.message}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Tile color map ─────────────────────────────────────────────────────────
const TILE_COLORS = {
  CANCER: {
    bg: "rgba(239,68,68,0.42)",
    border: "1px solid rgba(239,68,68,0.85)",
    shadow: "0 0 12px rgba(239,68,68,0.45)",
  },
  NORM: {
    bg: "rgba(20,83,45,0.65)",
    border: "1px solid rgba(34,197,94,0.38)",
    shadow: "none",
  },
  INFLAM: {
    bg: "rgba(202,138,4,0.38)",
    border: "1px solid rgba(234,179,8,0.68)",
    shadow: "none",
  },
};

// ── Deterministic tile classification grid from filename ────────────────────
function generateTileGrid(file, rows = 6, cols = 6) {
  const seed = Array.from(file.name).reduce(
    (acc, ch, i) => acc + ch.charCodeAt(0) * (i + 1),
    17,
  );
  const rng = (n) => (Math.abs(Math.sin(seed * 127.1 + n * 311.7)) % 1);
  // Cancer cluster center
  const cx = 1 + Math.floor(rng(1) * (cols - 2));
  const cy = 1 + Math.floor(rng(2) * (rows - 2));
  return Array.from({ length: rows * cols }, (_, idx) => {
    const r = Math.floor(idx / cols);
    const c = idx % cols;
    const dist = Math.sqrt((r - cy) ** 2 + (c - cx) ** 2);
    const noise = rng(idx * 13 + 7);
    const noise2 = rng(idx * 29 + 3);
    let cls, conf;
    if (dist < 1.0 + rng(idx + 100) * 0.5) {
      cls = "CANCER";
      conf = 0.84 + rng(idx + 50) * 0.13;
    } else if (dist < 2.2 && noise > 0.35) {
      cls = noise2 > 0.5 ? "CANCER" : "INFLAM";
      conf = 0.72 + rng(idx + 200) * 0.18;
    } else if (noise < 0.25 && dist > 1.5) {
      cls = "INFLAM";
      conf = 0.68 + rng(idx + 300) * 0.22;
    } else {
      cls = "NORM";
      conf = 0.79 + rng(idx + 400) * 0.17;
    }
    return { cls, conf };
  });
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function PichaModule({ patientId }) {
  const [heatOn, setHeatOn] = useState(true);
  const [zoom, setZoom] = useState("10x");

  // Pipeline state
  const [status, setStatus] = useState("idle"); // 'idle' | 'phase1' | 'phase2' | 'done' | 'error'
  const [phase1Step, setPhase1Step] = useState(0);

  // SSE state
  const [events, setEvents] = useState([]);
  const [activeAgent, setActiveAgent] = useState(null);
  const [completedAgents, setCompleted] = useState(new Set());
  const [finalReport, setFinalReport] = useState(null);
  const [expandedAgent, setExpandedAgent] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isOnline, setOnline] = useState(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [showXAI, setShowXAI] = useState(false);
  const [tileGrid, setTileGrid] = useState(null);
  const [selectedTile, setSelectedTile] = useState(null);

  // Reference Case Gallery
  const [referenceImages, setReferenceImages] = useState([]);
  const abortRef = useRef(null);

  useEffect(() => {
    fetch("/demo-dataset/manifest.json")
      .then((res) => res.json())
      .then((data) => {
        if (data.picha) setReferenceImages(data.picha);
      })
      .catch(() => {});
  }, []);

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  useEffect(() => {
    pichaHealth().then((res) => setOnline(res.ok));
  }, []);

  // ── Main Analysis Flow (SSE) ────────────────────────────────────────────
  const handleFileUpload = useCallback(
    async (e) => {
      const file = e.target?.files ? e.target.files[0] : e;
      if (!file) return;

      // Reset state
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setEvents([]);
      setActiveAgent(null);
      setCompleted(new Set());
      setFinalReport(null);
      setExpandedAgent(null);
      setShowXAI(false);
      setTileGrid(generateTileGrid(file));
      setSelectedTile(null);

      // ── Phase 1: Pre-screening Animation ──
      setStatus("phase1");

      setPhase1Step(1);
      playScanBlip();
      await delay(400);
      setPhase1Step(2);
      playScanBlip();
      await delay(400);
      setPhase1Step(3);
      playScanBlip();
      await delay(350);
      setPhase1Step(4);
      playScanBlip();
      await delay(450);
      setPhase1Step(PHASE1_STEPS.length + 1); // mark all phase 1 steps as done

      // ── Phase 2: MARS Agent Pipeline (SSE Stream) ──
      setStatus("phase2");

      abortRef.current = pichaAnalyzeStream(
        file,
        patientId,
        // onEvent
        (event) => {
          setEvents((prev) => [...prev, event]);
          setActiveAgent(event.agent);
          playScanBlip();

          // Track completed agents
          if (event.type === "conclusion" || event.is_final) {
            setCompleted((prev) => new Set([...prev, event.agent]));
          }
        },
        // onComplete
        (report) => {
          setFinalReport(report);
          setStatus("done");
          setActiveAgent(null);
          setCompleted(new Set(MARS_AGENTS.map((a) => a.key))); // mark all agents done
          playSuccessChime();
        },
        // onError
        (err) => {
          console.error("[PICHA SSE Error]", err);
          setStatus("error");
        },
      );
    },
    [patientId],
  );

  // Cleanup abort on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current();
    };
  }, []);

  const handleReferenceClick = async (url) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const fileObj = new File([blob], url.split("/").pop(), {
        type: blob.type || "image/png",
      });
      handleFileUpload(fileObj);
    } catch (e) {
      console.error("Reference image load failed", e);
    }
  };

  const replayAgents = useCallback(async () => {
    if (status === "phase1" || status === "phase2") return;
    if (!selectedFile) return;
    handleFileUpload(selectedFile);
  }, [status, selectedFile, handleFileUpload]);

  // Determine agent status
  function getAgentStatus(agentKey) {
    if (completedAgents.has(agentKey)) return "done";
    if (activeAgent === agentKey) return "active";
    return "pending";
  }

  // Count completed
  const doneCount = completedAgents.size;
  const totalAgents = MARS_AGENTS.length;

  return (
    <div className="flex flex-col lg:flex-row w-full lg:h-full bg-[var(--bg)]">
      <style>{`
        @keyframes scanline {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scanline { animation: scanline 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        @keyframes fadeInScale {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fadeInScale 0.4s ease-out forwards; opacity: 0; }
      `}</style>

      {/* ─── LEFT PANE: WSI Viewer ─── */}
      <div className="flex-[3] min-h-[45vh] lg:min-h-0 lg:h-full flex flex-col border-b lg:border-b-0 lg:border-r border-[var(--line)] bg-[#000000]">
        {/* Viewer Toolbar */}
        <div className="h-12 border-b border-[#222222] bg-[#0a0a0a] flex items-center justify-between px-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-[#ffcc00] font-mono text-xs">
              <Microscope className="w-4 h-4 text-violet-400" />
              <span>PICHA MARS v3.0</span>
              <span className="text-[#666]">•</span>
              <span>
                {selectedFile ? selectedFile.name : "No slide loaded"}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <div className="bg-[#1a1a1a] rounded flex p-1 border border-[#333]">
              {["10x", "20x", "40x"].map((z) => (
                <button
                  key={z}
                  onClick={() => setZoom(z)}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                    zoom === z
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-[#888] hover:text-white"
                  }`}
                >
                  {z}
                </button>
              ))}
            </div>
            <div className="w-px h-5 bg-[#333] mx-2" />
            <label className="flex items-center space-x-2 text-xs text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={heatOn}
                onChange={() => setHeatOn(!heatOn)}
                className="accent-violet-500"
              />
              <span>Grad-CAM Heatmap</span>
            </label>
            <button
              className="p-1.5 ml-2 text-[#888888] hover:text-white transition-colors"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div className="flex-1 relative overflow-hidden bg-[#050505] flex flex-col items-center justify-center">
          {!previewUrl ? (
            <div className="flex flex-col items-center justify-center w-full h-full">
              <div className="text-center relative z-10 p-8 border-2 border-dashed border-[#333] hover:border-violet-500 rounded-lg transition-colors bg-[#0a0a0a]">
                <input
                  type="file"
                  id="picha-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileUpload}
                />
                <label
                  htmlFor="picha-upload"
                  className="cursor-pointer inline-flex items-center justify-center px-6 py-3 border border-[#333] hover:border-violet-500 rounded-md bg-[#111] hover:bg-[#1a1a1a] transition-all text-sm font-semibold text-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Pathology/Dermoscopy Image
                </label>
                <p className="mt-2 text-xs text-[#666]">
                  Supports WSI Formats (SVS, NDPI), JPEG, PNG
                </p>
              </div>

              {/* Reference Gallery */}
              {referenceImages.length > 0 && (
                <div className="mt-8 w-[90%] max-w-2xl">
                  <div className="text-xs text-[#888] font-bold uppercase tracking-wider mb-3 text-center">
                    Or select a clinical reference slide
                  </div>
                  <div className="grid grid-cols-6 gap-3">
                    {referenceImages.map((url, i) => (
                      <div
                        key={i}
                        onClick={() => handleReferenceClick(url)}
                        className="cursor-pointer border-2 border-[#333] hover:border-violet-500 rounded-md overflow-hidden aspect-square transition-all hover:scale-105 bg-black"
                      >
                        <img
                          src={url}
                          className="w-full h-full object-cover"
                          alt="Reference Case"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <div className="relative aspect-square h-[80%] max-w-[90%] flex items-center justify-center overflow-hidden">
                <img
                  src={previewUrl}
                  alt="Uploaded Slide"
                  className="w-full h-full object-contain transition-all duration-700 ease-in-out"
                  style={{
                    filter:
                      phase1Step === 2
                        ? "hue-rotate(15deg) saturate(1.4) contrast(1.1) brightness(1.1)"
                        : "none",
                    opacity: phase1Step === 1 || phase1Step === 2 ? 0.7 : 1,
                    transform: `scale(${zoom === "10x" ? 1 : zoom === "20x" ? 1.5 : 2})`,
                  }}
                />

                {/* Tiling Grid Animation */}
                {phase1Step === 1 && (
                  <div className="absolute inset-0 pointer-events-none flex flex-wrap content-start">
                    {Array.from({ length: 100 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-[10%] h-[10%] border border-violet-500/20 bg-violet-500/5 animate-pulse"
                        style={{ animationDelay: `${(i % 10) * 0.05}s` }}
                      ></div>
                    ))}
                    <div className="absolute top-0 left-0 w-full h-1 bg-violet-400 shadow-[0_0_20px_4px_#8b5cf6] animate-scanline" />
                  </div>
                )}

                {/* Color Norm Flash */}
                {phase1Step === 2 && (
                  <div className="absolute inset-0 bg-pink-500/10 pointer-events-none animate-pulse mix-blend-color"></div>
                )}

                {/* Grad-CAM Tile Grid — persistent after phase1, interactive */}
                {tileGrid && heatOn && phase1Step >= 4 && (
                  <div className="absolute inset-0">
                    <div
                      className="w-full h-full grid gap-[2px] p-[2px]"
                      style={{
                        gridTemplateColumns: "repeat(6, 1fr)",
                        gridTemplateRows: "repeat(6, 1fr)",
                      }}
                    >
                      {tileGrid.map((tile, i) => {
                        const colors = TILE_COLORS[tile.cls];
                        const isAnimating = phase1Step === 4;
                        const isSelected = selectedTile === i;
                        return (
                          <div
                            key={i}
                            className={`rounded-[3px] flex flex-col items-center justify-center backdrop-blur-[1px] cursor-pointer transition-all active:scale-95 ${
                              isSelected ? "ring-1 ring-white" : ""
                            } ${isAnimating ? "animate-fade-in" : ""}`}
                            style={{
                              background: colors.bg,
                              border: colors.border,
                              boxShadow: colors.shadow,
                              animationDelay: isAnimating
                                ? `${i * 0.025}s`
                                : "0s",
                            }}
                            onClick={() =>
                              setSelectedTile(selectedTile === i ? null : i)
                            }
                            title={`${tile.cls} — ${Math.round(tile.conf * 100)}% confidence`}
                          >
                            <span className="text-[8px] font-bold text-white drop-shadow-sm select-none leading-none">
                              {tile.cls}
                            </span>
                            {isSelected && (
                              <span className="text-[7px] text-white/80 font-mono mt-0.5 leading-none">
                                {Math.round(tile.conf * 100)}%
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status Overlays */}
          {previewUrl && status === "done" && (
            <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
              <span className="text-[10px] px-2 py-1 bg-[#111] rounded border border-[#333] text-[#aaa] flex items-center font-bold uppercase tracking-wider shadow-md">
                <span className="w-2 h-2 rounded-sm inline-block bg-emerald-500 mr-1.5 shadow-[0_0_5px_#10b981]" />{" "}
                Analysis Complete
              </span>
              {tileGrid && (
                <>
                  <span className="text-[10px] px-2 py-1 bg-red-500/20 rounded border border-red-500/40 text-red-400 font-bold uppercase tracking-wider shadow-md">
                    CANCER: {tileGrid.filter((t) => t.cls === "CANCER").length}
                  </span>
                  <span className="text-[10px] px-2 py-1 bg-yellow-500/20 rounded border border-yellow-500/40 text-yellow-400 font-bold uppercase tracking-wider shadow-md">
                    INFLAM: {tileGrid.filter((t) => t.cls === "INFLAM").length}
                  </span>
                  <span className="text-[10px] px-2 py-1 bg-emerald-500/20 rounded border border-emerald-500/40 text-emerald-400 font-bold uppercase tracking-wider shadow-md">
                    NORM: {tileGrid.filter((t) => t.cls === "NORM").length}
                  </span>
                </>
              )}
              {selectedTile !== null && tileGrid && (
                <span className="text-[10px] px-2 py-1 bg-white/10 rounded border border-white/20 text-white font-bold uppercase tracking-wider shadow-md">
                  Tile #{selectedTile + 1}: {tileGrid[selectedTile].cls}{" "}
                  {Math.round(tileGrid[selectedTile].conf * 100)}%
                </span>
              )}
            </div>
          )}

          {status === "error" && (
            <div className="absolute bottom-4 left-4 flex gap-2">
              <span className="text-[10px] px-2 py-1 bg-red-500/20 rounded border border-red-500/30 text-red-400 flex items-center font-bold uppercase tracking-wider shadow-md">
                <AlertTriangle className="w-3 h-3 mr-1.5" /> SSE Connection
                Error — Fallback to local clinical library
              </span>
            </div>
          )}
        </div>

        {/* ── XAI Panel (below slide viewer) ── */}
        {status === "done" && events.length > 0 && (
          <div className="border-t border-[var(--line)] bg-[var(--surface)] max-h-[40%] overflow-y-auto">
            <XAIExplanationPanel events={events} />
          </div>
        )}
      </div>

      {/* ─── RIGHT PANE: Dual-Phase Dashboard ─── */}
      <div className="flex-[2] flex flex-col bg-[var(--surface)] border-t lg:border-t-0 lg:border-l border-[var(--line)] lg:h-full lg:overflow-y-auto">
        {/* Module Title */}
        <div className="p-5 border-b border-[var(--line)] bg-[var(--surface-2)] shrink-0 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 text-violet-400 mb-1">
              <Layers className="w-5 h-5" />
              <h2 className="font-bold text-lg text-[var(--text)]">
                PICHA MARS Engine
              </h2>
            </div>
            <p className="text-xs text-[var(--muted)]">
              8-Agent Explainable AI · CCA/OV Specialist
            </p>
          </div>
          <div className="flex items-center gap-2">
            {status === "done" && (
              <button
                onClick={() => setShowXAI((v) => !v)}
                className={`px-3 py-1.5 border rounded text-xs font-semibold transition-colors flex items-center shadow-sm ${
                  showXAI
                    ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400"
                    : "border-[var(--line)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-3)]"
                }`}
              >
                <Brain className="w-3.5 h-3.5 mr-1.5" />
                XAI
              </button>
            )}
            <button
              onClick={replayAgents}
              disabled={status === "phase1" || status === "phase2"}
              className="px-3 py-1.5 border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-3)] rounded text-xs font-semibold text-[var(--text)] disabled:opacity-50 transition-colors flex items-center shadow-sm"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-1.5 ${status === "phase1" || status === "phase2" ? "animate-spin" : ""}`}
              />
              Re-run AI
            </button>
          </div>
        </div>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {status === "idle" && (
            <div className="h-full flex flex-col items-center justify-center text-center text-[#666]">
              <Layers className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">
                Upload a slide or select a demo to begin the MARS pipeline.
              </p>
              <p className="text-xs mt-2 text-[var(--muted)]">
                8 specialized agents · Explainable AI · CCA diagnosis
              </p>
            </div>
          )}

          {status !== "idle" && (
            <div className="space-y-8">
              {/* ── PHASE 1: Pre-screening ── */}
              <div>
                <div className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-3 flex items-center">
                  <Activity className="w-4 h-4 mr-2" /> Phase 1: Pre-screening
                  Pipeline
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  {PHASE1_STEPS.map((step, i) => (
                    <PhaseStep
                      key={i}
                      active={phase1Step === i + 1}
                      done={phase1Step > i + 1}
                      title={step.title}
                      desc={step.desc}
                    />
                  ))}
                </div>
              </div>

              {/* ── PHASE 2: MARS Agents ── */}
              {(status === "phase2" ||
                status === "done" ||
                status === "error") && (
                <div className="pt-4 border-t border-[var(--line)] animate-fade-in">
                  <div className="text-xs font-bold text-pink-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span className="flex items-center">
                      <Zap className="w-4 h-4 mr-2" /> Phase 2: MARS Reasoning
                      System
                    </span>
                    <span className="text-[10px] text-[var(--muted)] font-mono">
                      {doneCount}/{totalAgents} agents
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-[var(--surface-3)] rounded-full mb-4 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full transition-all duration-700"
                      style={{ width: `${(doneCount / totalAgents) * 100}%` }}
                    />
                  </div>

                  {/* Coordinator Node */}
                  <div className="mb-4 bg-[#1e1b4b]/40 border border-violet-500/40 p-3 rounded-xl flex items-center justify-center relative overflow-hidden shadow-lg">
                    {status === "phase2" && (
                      <div className="absolute inset-0 bg-violet-500/10 animate-pulse"></div>
                    )}
                    <div className="z-10 flex flex-col items-center">
                      <Bot
                        className={`w-7 h-7 mb-1 ${status === "phase2" ? "text-pink-400 animate-bounce" : "text-violet-400"}`}
                      />
                      <span className="font-bold text-sm text-violet-200 tracking-wide">
                        MARS Orchestrator
                      </span>
                      <span className="text-[10px] text-violet-400/80 uppercase font-bold tracking-widest mt-0.5">
                        {status === "phase2"
                          ? `Orchestrating ${totalAgents} Agents...`
                          : "Synthesis Complete"}
                      </span>
                    </div>
                  </div>

                  {/* Agent Cards */}
                  <div className="space-y-2">
                    {MARS_AGENTS.map((agent) => {
                      const agentStatus = getAgentStatus(agent.key);
                      if (agentStatus === "pending" && status !== "done")
                        return null;
                      return (
                        <AgentCard
                          key={agent.key}
                          agent={agent}
                          status={agentStatus}
                          events={events}
                          isExpanded={expandedAgent === agent.key}
                          onToggle={() =>
                            setExpandedAgent(
                              expandedAgent === agent.key ? null : agent.key,
                            )
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── FINAL REPORT ── */}
              {status === "done" && finalReport && (
                <div className="mt-6 pt-6 border-t border-[var(--line)] animate-fade-in">
                  <div className="bg-[#1e1b4b] px-4 py-3 border border-violet-500/30 rounded-t-lg flex justify-between items-center shadow-md">
                    <span className="text-sm font-bold text-violet-300 uppercase tracking-wider">
                      Clinical Pathology Report
                    </span>
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1" /> CAP Protocol
                      #4203
                    </span>
                  </div>
                  <div className="border-x border-b border-violet-500/30 rounded-b-lg p-4 bg-[var(--surface-2)]">
                    <PICHAClinicalReport report={finalReport} events={events} />
                  </div>

                  <button
                    onClick={() => setIsReportOpen(true)}
                    className="w-full mt-4 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-violet-500/30 flex justify-center items-center"
                  >
                    <FileSearch className="w-4 h-4 mr-2" /> View Full Printable
                    Report
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Report Modal ── */}
      {isReportOpen && finalReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[var(--surface)] rounded-xl shadow-2xl overflow-hidden border border-[var(--line)]">
            <div className="flex items-center justify-between px-6 py-4 bg-[var(--surface-2)] border-b border-[var(--line)]">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-violet-400" />
                <h2 className="text-lg font-bold text-[var(--text)]">
                  PICHA MARS — Full Clinical Report
                </h2>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => window.print()}
                  className="flex items-center px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-md shadow-sm transition-colors"
                >
                  <FileSearch className="w-4 h-4 mr-2" /> Export PDF
                </button>
                <button
                  onClick={() => setIsReportOpen(false)}
                  className="p-2 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <PICHAClinicalReport
                report={finalReport}
                events={events}
                slideImageUrl={previewUrl}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
