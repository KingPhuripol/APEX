"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Upload,
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  FileImage,
  FlaskConical,
  X,
  Printer,
  ClipboardCheck,
  PenLine,
  AlertTriangle,
  Maximize2,
} from "lucide-react";
import { api } from "@/lib/api";
import StepIndicator from "@/components/ui/StepIndicator";
import PatientCard from "@/components/clinical/PatientCard";
import AgentTimeline from "@/components/pipeline/AgentTimeline";
import ClinicalReport from "@/components/clinical/ClinicalReport";

// ── Types ────────────────────────────────────────────────────────────────────

interface PatientRecord {
  id?: string;
  patient_hn: string;
  patient_name?: string | null;
  age?: number | null;
  sex?: string | null;
  region?: string | null;
  chief_complaint?: string | null;
  lab_results?: Record<string, unknown> | null;
  source?: string;
}

interface AgentEvent {
  agent: string;
  type: string;
  message: string;
  is_final: boolean;
}

const STEPS = [
  { label: "Patient Lookup" },
  { label: "Upload Slide" },
  { label: "AI Analysis" },
  { label: "Report" },
];

// ── Demo slides ────────────────────────────────────────────────────────────

const DEMO_SLIDES = [
  {
    key: "colorectal_cancer",
    label: "Colorectal Cancer",
    labelTH: "มะเร็งลำไส้ใหญ่",
    color: "bg-red-50 border-red-200 text-red-700",
  },
  {
    key: "stroma",
    label: "Stroma",
    labelTH: "สโตรมา",
    color: "bg-orange-50 border-orange-200 text-orange-700",
  },
  {
    key: "lymphocytes",
    label: "Lymphocytes",
    labelTH: "เม็ดเลือดขาว",
    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
  },
  {
    key: "normal_colon",
    label: "Normal Colon",
    labelTH: "ลำไส้ใหญ่ปกติ",
    color: "bg-blue-50 border-blue-200 text-blue-700",
  },
  {
    key: "normal_colon_v2",
    label: "Normal Colon v2",
    labelTH: "ลำไส้ใหญ่ปกติ (Serrated)",
    color: "bg-cyan-50 border-cyan-200 text-cyan-700",
  },
  {
    key: "mucus",
    label: "Mucus",
    labelTH: "เมือก",
    color: "bg-yellow-50 border-yellow-200 text-yellow-700",
  },
  {
    key: "smooth_muscle",
    label: "Smooth Muscle",
    labelTH: "กล้ามเนื้อเรียบ",
    color: "bg-violet-50 border-violet-200 text-violet-700",
  },
  {
    key: "adipose",
    label: "Adipose",
    labelTH: "เนื้อเยื่อไขมัน",
    color: "bg-pink-50 border-pink-200 text-pink-700",
  },
  {
    key: "debris",
    label: "Debris",
    labelTH: "เศษเนื้อเยื่อ",
    color: "bg-slate-50 border-slate-200 text-slate-600",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function NextBtn({
  onClick,
  loading = false,
  disabled = false,
  children,
}: {
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="flex items-center gap-2 px-5 py-2.5 bg-[#1d4ed8] hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm shadow-blue-200"
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AnalyzePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Step 0 — patient
  const [hnInput, setHnInput] = useState("");
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [hnLoading, setHnLoading] = useState(false);
  const [hnError, setHnError] = useState("");
  const [patientNotFound, setPatientNotFound] = useState(false);
  // Patient registration (shown when HN not found)
  const [showRegForm, setShowRegForm] = useState(false);
  const [regName, setRegName] = useState("");
  const [regAge, setRegAge] = useState("");
  const [regSex, setRegSex] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");
  // Walk-in quick form (no HN)
  const [showWalkInForm, setShowWalkInForm] = useState(false);
  const [walkInName, setWalkInName] = useState("");
  const [walkInAge, setWalkInAge] = useState("");
  const [walkInSex, setWalkInSex] = useState("");

  // Step 1 — upload
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [specimenType, setSpecimenType] = useState("Bile duct biopsy");
  const [patientRegion, setPatientRegion] = useState("Southeast Asia");
  const [dragOver, setDragOver] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Image zoom
  const [zoomOpen, setZoomOpen] = useState(false);
  useEffect(() => {
    if (!zoomOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [zoomOpen]);

  // Step 2 — analysis
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [analysisId, setAnalysisId] = useState<string | null>(null);

  // Step 3 — report
  const [report, setReport] = useState<Record<string, unknown> | null>(null);

  // Step 3 — doctor sign-off
  const [doctorVerdict, setDoctorVerdict] = useState<
    "accept" | "accept_modified" | "review_needed" | ""
  >("");
  const [doctorComment, setDoctorComment] = useState("");
  const [signedOff, setSignedOff] = useState(false);
  const [signOffLoading, setSignOffLoading] = useState(false);
  const [signOffAt, setSignOffAt] = useState<string | null>(null);

  // ── Sign-off handler ─────────────────────────────────────────────────────
  const signOff = useCallback(async () => {
    if (!doctorVerdict || !analysisId || analysisId.startsWith("local-"))
      return;
    setSignOffLoading(true);
    try {
      const now = new Date().toISOString();
      await api
        .putJson(`/api/analysis/${analysisId}/result`, {
          result: {
            ...report,
            pathologist_verdict: doctorVerdict,
            pathologist_comment: doctorComment.trim() || null,
            signed_off_at: now,
          },
          status: "completed",
        })
        .catch(() => {});
      setSignedOff(true);
      setSignOffAt(now);
    } finally {
      setSignOffLoading(false);
    }
  }, [analysisId, report, doctorVerdict, doctorComment]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const lookupPatient = useCallback(async () => {
    if (!hnInput.trim()) return;
    setHnLoading(true);
    setHnError("");
    setPatient(null);
    setPatientNotFound(false);
    setShowRegForm(false);
    try {
      const data = await api.getJson<{ patients: PatientRecord[] }>(
        `/api/patients?hn=${encodeURIComponent(hnInput.trim())}`,
      );
      if (data.patients && data.patients.length > 0) {
        setPatient(data.patients[0]);
      } else {
        setPatientNotFound(true);
      }
    } catch {
      setPatientNotFound(true);
    } finally {
      setHnLoading(false);
    }
  }, [hnInput]);

  const registerPatient = useCallback(async () => {
    if (!hnInput.trim() || !regName.trim()) return;
    setRegLoading(true);
    setRegError("");
    try {
      await api.postJson("/api/patients", {
        patient_hn: hnInput.trim(),
        name: regName.trim(),
        age: regAge ? Number(regAge) : null,
        sex: regSex || null,
      });
      setPatient({
        patient_hn: hnInput.trim(),
        patient_name: regName.trim(),
        age: regAge ? Number(regAge) : null,
        sex: regSex || null,
      });
      setPatientNotFound(false);
      setShowRegForm(false);
    } catch (err: unknown) {
      setRegError(
        err instanceof Error ? err.message : "Failed to register patient",
      );
    } finally {
      setRegLoading(false);
    }
  }, [hnInput, regName, regAge, regSex]);

  const setFileWithPreview = useCallback(
    (f: File) => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
    },
    [previewUrl],
  );

  const clearFile = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl("");
  }, [previewUrl]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f && f.type.startsWith("image/")) setFileWithPreview(f);
    },
    [setFileWithPreview],
  );

  const selectDemoSlide = useCallback(
    async (key: string, label: string) => {
      setDemoLoading(key);
      try {
        const res = await fetch(`/samples/${key}.png`);
        const blob = await res.blob();
        const f = new File([blob], `demo_${key}.png`, { type: "image/png" });
        setFileWithPreview(f);
      } catch {
        // ignore
      } finally {
        setDemoLoading(null);
      }
    },
    [setFileWithPreview],
  );

  const startAnalysis = useCallback(async () => {
    if (!file) return;
    setIsRunning(true);
    setEvents([]);
    setAnalysisError("");
    setStep(2);

    try {
      // Convert image to base64
      const toBase64 = (f: File) =>
        new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onload = () => res((r.result as string).split(",")[1]);
          r.onerror = rej;
          r.readAsDataURL(f);
        });
      const imageB64 = await toBase64(file);

      // ── Step A: Create pending DB record → get analysisId ─────────────
      let newAnalysisId = `local-${Date.now()}`;
      try {
        const created = await api.postJson<{ analysisId: string }>(
          "/api/analysis",
          {
            imageBase64: imageB64,
            patientId: patient?.patient_hn ?? null,
            clinicalHistory: notes || null,
          },
        );
        newAnalysisId = created.analysisId;
        setAnalysisId(newAnalysisId);
      } catch {
        // Non-fatal — analysis still runs via SSE, just won't appear in case history
      }

      // ── Step B: SSE stream to ai-service for live agent display ───────
      // Body must match ai-service AnalyzeRequest schema exactly.
      const sseBody = {
        slide_description:
          notes?.trim() ||
          `H&E pathology slide — Patient ${patient?.patient_hn ?? "walk-in"}`,
        clinical_context: notes ?? "",
        patient_id: patient?.patient_hn ?? "UNKNOWN",
        image_base64: imageB64,
        slide_id: newAnalysisId,
        specimen_type: specimenType,
        patient_region: patientRegion,
      };

      const resp = await fetch("/api/analyze/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sseBody),
        credentials: "include",
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let finalReport: Record<string, unknown> | null = null;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n\n");
        buf = lines.pop() ?? "";
        for (const chunk of lines) {
          if (!chunk.startsWith("data: ")) continue;
          try {
            const ev: AgentEvent = JSON.parse(chunk.slice(6));
            setEvents((prev) => [...prev, ev]);
            if (ev.is_final) {
              try {
                // Strip optional "FINAL_REPORT: " prefix that the MARS agent
                // may prepend before the JSON payload.
                const raw = ev.message.replace(/^FINAL_REPORT:\s*/i, "").trim();
                finalReport = JSON.parse(raw);
              } catch {
                finalReport = { primary_diagnosis: ev.message };
              }
            }
          } catch {
            // skip malformed chunk
          }
        }
      }

      // ── Step C: Persist result + write audit log ─────────────────────
      if (finalReport && !newAnalysisId.startsWith("local-")) {
        api
          .putJson(`/api/analysis/${newAnalysisId}/result`, {
            result: finalReport,
            status: "completed",
          })
          .catch(() => {});
      }
      if (finalReport) {
        const grade = String((finalReport as any).who_grade ?? "");
        const stage = String(
          ((finalReport as any).staging as any)?.overall_stage ?? "",
        );
        api
          .post("/api/audit", {
            action: `AI Analysis Completed${grade ? ` — WHO ${grade}` : ""}${stage ? `, ${stage}` : ""}`,
            patientHn: patient?.patient_hn ?? null,
            result: String((finalReport as any).diagnosis ?? "See full report"),
            confidence: Math.round(
              Number((finalReport as any).overall_confidence ?? 0) * 100,
            ),
            status: "ok",
          })
          .catch(() => {});
      }

      setReport(
        finalReport ?? {
          primary_diagnosis:
            "Analysis complete — no structured report returned.",
        },
      );
      setStep(3);
    } catch (err: unknown) {
      setAnalysisError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsRunning(false);
    }
  }, [file, patient, notes]);

  // ── Render steps ─────────────────────────────────────────────────────────

  return (
    <div className="py-8 px-6 max-w-6xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0a1628] tracking-tight">
            New Analysis
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            PICHA MARS Agent Pipeline
          </p>
        </div>
        <span className="text-[11px] font-semibold text-[#1d4ed8] bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
          CCA · Bile Duct
        </span>
      </div>

      {/* ── Clinical Safety Banner ──────────────────────────────────────── */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <span className="text-amber-800 text-xs font-semibold">
            Research &amp; Decision Support Only · Not a Replacement for
            Pathologist Diagnosis
          </span>
          <span className="text-amber-600 text-[11px] ml-2">
            Tissue pre-screen model accuracy: 76.33% (colorectal domain) · CCA
            diagnosis requires MARS agent review + pathologist sign-off
          </span>
        </div>
      </div>

      <StepIndicator steps={STEPS} current={step} />

      {/* ─── Step 0: Patient Lookup ─────────────────────────────────────── */}
      {step === 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Left — search form */}
          <div className="lg:col-span-3 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-[#0a1628] font-bold text-base">
                  Patient Lookup
                </h2>
                <p className="text-slate-400 text-xs mt-0.5">
                  Search by HN number or proceed as walk-in
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <Search className="w-4 h-4 text-[#1d4ed8]" />
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                <input
                  value={hnInput}
                  onChange={(e) => setHnInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && lookupPatient()}
                  placeholder="Enter HN number (e.g. 10253)"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[#0a1628] text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/20 focus:border-[#1d4ed8] transition"
                />
                <button
                  onClick={lookupPatient}
                  disabled={hnLoading || !hnInput.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#1d4ed8] hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-blue-200"
                >
                  {hnLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Lookup
                </button>
              </div>

              {hnError && (
                <p className="text-red-500 text-xs bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                  {hnError}
                </p>
              )}

              {patient && (
                <div className="space-y-4">
                  <PatientCard patient={patient} />
                  <div className="flex justify-end">
                    <NextBtn onClick={() => setStep(1)}>
                      Continue to Upload →
                    </NextBtn>
                  </div>
                </div>
              )}

              {/* Patient not found — offer registration or walk-in */}
              {patientNotFound && !showRegForm && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <span className="text-amber-500 text-sm mt-0.5">⚠</span>
                    <div>
                      <p className="text-amber-800 text-sm font-semibold">
                        ไม่พบผู้ป่วย HN: {hnInput.trim()}
                      </p>
                      <p className="text-amber-600 text-xs mt-0.5">
                        HN นี้ยังไม่มีในระบบ —
                        ลงทะเบียนผู้ป่วยใหม่หรือดำเนินการแบบ Walk-in
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowRegForm(true)}
                      className="flex-1 py-2.5 bg-[#1d4ed8] hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                      + ลงทะเบียนผู้ป่วยใหม่
                    </button>
                    <button
                      onClick={() => {
                        setPatient({ patient_hn: hnInput.trim() });
                        setPatientNotFound(false);
                        setStep(1);
                      }}
                      className="flex-1 py-2.5 border border-slate-200 hover:border-[#1d4ed8] text-slate-600 hover:text-[#1d4ed8] text-sm font-medium rounded-xl transition-all"
                    >
                      ดำเนินการโดยไม่มีข้อมูล
                    </button>
                  </div>
                </div>
              )}

              {/* Patient registration form */}
              {showRegForm && (
                <div className="border border-blue-100 bg-blue-50/40 rounded-xl p-4 space-y-3">
                  <p className="text-[#0a1628] font-bold text-sm">
                    ลงทะเบียนผู้ป่วยใหม่ — HN: {hnInput.trim()}
                  </p>
                  <input
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="ชื่อ-นามสกุล ผู้ป่วย *"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[#0a1628] text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/20 focus:border-[#1d4ed8] transition"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={regAge}
                      onChange={(e) => setRegAge(e.target.value)}
                      placeholder="อายุ (ปี)"
                      type="number"
                      min={0}
                      max={150}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[#0a1628] text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/20 focus:border-[#1d4ed8] transition"
                    />
                    <select
                      value={regSex}
                      onChange={(e) => setRegSex(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#0a1628] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/20 focus:border-[#1d4ed8] transition"
                    >
                      <option value="">เพศ</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  {regError && (
                    <p className="text-red-500 text-xs bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                      {regError}
                    </p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={registerPatient}
                      disabled={regLoading || !regName.trim()}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#1d4ed8] hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                      {regLoading && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      บันทึกและดำเนินการต่อ
                    </button>
                    <button
                      onClick={() => setShowRegForm(false)}
                      className="px-4 py-2.5 border border-slate-200 text-slate-500 text-sm rounded-xl hover:bg-slate-50 transition"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              )}

              {!patient && !patientNotFound && !showWalkInForm && (
                <div className="pt-2 flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-100" />
                  <span className="text-slate-400 text-xs">or</span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>
              )}

              {!patient && !patientNotFound && !showWalkInForm && (
                <button
                  onClick={() => setShowWalkInForm(true)}
                  className="w-full py-2.5 border border-dashed border-slate-200 hover:border-[#1d4ed8] hover:bg-blue-50 text-slate-500 hover:text-[#1d4ed8] text-sm font-medium rounded-xl transition-all"
                >
                  Continue as walk-in patient
                </button>
              )}

              {/* Walk-in quick registration */}
              {showWalkInForm && (
                <div className="border border-slate-200 bg-slate-50/60 rounded-xl p-4 space-y-3">
                  <p className="text-[#0a1628] font-bold text-sm">
                    Walk-in Patient
                  </p>
                  <input
                    value={walkInName}
                    onChange={(e) => setWalkInName(e.target.value)}
                    placeholder="ชื่อ-นามสกุล ผู้ป่วย *"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[#0a1628] text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/20 focus:border-[#1d4ed8] transition"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={walkInAge}
                      onChange={(e) => setWalkInAge(e.target.value)}
                      placeholder="อายุ (ปี)"
                      type="number"
                      min={0}
                      max={150}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[#0a1628] text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/20 focus:border-[#1d4ed8] transition"
                    />
                    <select
                      value={walkInSex}
                      onChange={(e) => setWalkInSex(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#0a1628] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/20 focus:border-[#1d4ed8] transition"
                    >
                      <option value="">เพศ</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        if (!walkInName.trim()) return;
                        setPatient({
                          patient_hn: "WALK-IN",
                          patient_name: walkInName.trim(),
                          age: walkInAge ? Number(walkInAge) : null,
                          sex: walkInSex || null,
                          source: "walk-in",
                        });
                        setShowWalkInForm(false);
                        setStep(1);
                      }}
                      disabled={!walkInName.trim()}
                      className="flex-1 py-2.5 bg-[#1d4ed8] hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                      ดำเนินการต่อ →
                    </button>
                    <button
                      onClick={() => setShowWalkInForm(false)}
                      className="px-4 py-2.5 border border-slate-200 text-slate-500 text-sm rounded-xl hover:bg-slate-50 transition"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right — pipeline overview */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#0a1628] rounded-2xl p-5 text-white">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">
                Analysis Pipeline
              </p>
              <div className="space-y-3">
                {[
                  {
                    n: "01",
                    title: "Patient Context",
                    desc: "HN lookup, demographics, prior history",
                  },
                  {
                    n: "02",
                    title: "Slide Upload",
                    desc: "H&E whole-slide image, clinical notes",
                  },
                  {
                    n: "03",
                    title: "MARS Agents",
                    desc: "7 specialist agents run in sequence",
                  },
                  {
                    n: "04",
                    title: "Clinical Report",
                    desc: "WHO grade, pTNM, survival estimate",
                  },
                ].map((s) => (
                  <div key={s.n} className="flex gap-3 items-start">
                    <span className="text-[10px] font-mono font-bold text-[#1d4ed8] mt-0.5 w-5 shrink-0">
                      {s.n}
                    </span>
                    <div>
                      <p className="text-white text-xs font-semibold">
                        {s.title}
                      </p>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        {s.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Supported Specimens
              </p>
              {[
                { label: "Bile Duct / CCA", primary: true },
                { label: "Gastric Adenocarcinoma" },
                { label: "Colorectal Carcinoma" },
                { label: "Hepatocellular Carcinoma" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${s.primary ? "bg-[#1d4ed8]" : "bg-slate-300"}`}
                  />
                  <span
                    className={`text-xs ${s.primary ? "text-[#0a1628] font-semibold" : "text-slate-500"}`}
                  >
                    {s.label}
                  </span>
                  {s.primary && (
                    <span className="ml-auto text-[10px] bg-blue-50 text-[#1d4ed8] border border-blue-100 px-1.5 py-0.5 rounded font-semibold">
                      Primary
                    </span>
                  )}
                </div>
              ))}
              <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-slate-400 text-[11px]">
                <Loader2 className="w-3 h-3" />
                Avg. analysis time: ~90 sec
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Step 1: Upload ──────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-[#0a1628] font-bold text-base">
                  Upload Slide Image
                </h2>
                <p className="text-slate-400 text-xs mt-0.5">
                  H&amp;E stained whole-slide or region image
                </p>
              </div>
              <button
                onClick={() => setStep(0)}
                className="text-slate-400 hover:text-slate-600 text-xs transition-colors"
              >
                ← Back
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Drop zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${
                  dragOver
                    ? "border-[#1d4ed8] bg-blue-50"
                    : file
                      ? "border-[#1d4ed8]/40 bg-blue-50/50"
                      : "border-slate-200 hover:border-[#1d4ed8]/40 hover:bg-slate-50"
                }`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    e.target.files?.[0] && setFileWithPreview(e.target.files[0])
                  }
                />
                {file && previewUrl ? (
                  <div className="w-full flex flex-col items-center gap-3">
                    <div
                      className="relative w-full max-h-56 rounded-lg overflow-hidden border border-slate-200 group cursor-zoom-in"
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoomOpen(true);
                      }}
                    >
                      <Image
                        src={previewUrl}
                        alt={file.name}
                        width={512}
                        height={224}
                        className="w-full h-56 object-cover"
                        unoptimized
                      />
                      {/* Zoom hint overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-2 shadow-md">
                          <Maximize2 className="w-4 h-4 text-[#0a1628]" />
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearFile();
                        }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 hover:bg-white border border-slate-200 flex items-center justify-center shadow-sm transition z-10"
                      >
                        <X className="w-3.5 h-3.5 text-slate-600" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-center">
                      <FileImage className="w-4 h-4 text-[#1d4ed8] shrink-0" />
                      <p className="text-[#0a1628] text-sm font-semibold truncate max-w-[220px]">
                        {file.name}
                      </p>
                      <span className="text-slate-400 text-xs shrink-0">
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs">
                      คลิกเพื่อเปลี่ยนภาพ
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">
                      Drag &amp; drop or click to select
                    </p>
                    <p className="text-slate-400 text-xs mt-1">
                      PNG, JPEG, TIFF — H&amp;E stained whole slide
                    </p>
                  </div>
                )}
              </div>

              {/* Demo slides */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <FlaskConical className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">
                    ตัวอย่างสไลด์ — คลิกเพื่อทดลองใช้
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {DEMO_SLIDES.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => selectDemoSlide(s.key, s.label)}
                      disabled={demoLoading === s.key}
                      className={`relative group rounded-xl border overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5 ${
                        file?.name === `demo_${s.key}.png`
                          ? "ring-2 ring-[#1d4ed8] ring-offset-1"
                          : "hover:border-[#1d4ed8]/40"
                      } ${s.color}`}
                    >
                      <div className="relative w-full aspect-square overflow-hidden">
                        <Image
                          src={`/samples/${s.key}.png`}
                          alt={s.label}
                          width={112}
                          height={112}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          unoptimized
                        />
                        {demoLoading === s.key && (
                          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                            <Loader2 className="w-4 h-4 animate-spin text-[#1d4ed8]" />
                          </div>
                        )}
                        {file?.name === `demo_${s.key}.png` && (
                          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#1d4ed8] flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="px-2 py-1.5">
                        <p className="text-[10px] font-bold truncate">
                          {s.labelTH}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Specimen type + Region */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 text-[11px] font-bold uppercase tracking-widest block mb-1.5">
                    Specimen Type
                  </label>
                  <select
                    value={specimenType}
                    onChange={(e) => setSpecimenType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[#0a1628] text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/20 focus:border-[#1d4ed8] transition appearance-none cursor-pointer"
                  >
                    {[
                      "Bile duct biopsy",
                      "Gastric biopsy",
                      "Colorectal biopsy",
                      "Liver biopsy",
                      "Other",
                    ].map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-500 text-[11px] font-bold uppercase tracking-widest block mb-1.5">
                    Patient Region
                  </label>
                  <select
                    value={patientRegion}
                    onChange={(e) => setPatientRegion(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[#0a1628] text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/20 focus:border-[#1d4ed8] transition appearance-none cursor-pointer"
                  >
                    {["Southeast Asia", "East Asia", "South Asia", "Other"].map(
                      (v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>

              {/* Clinical notes */}
              <div>
                <label className="text-slate-500 text-[11px] font-bold uppercase tracking-widest block mb-1.5">
                  Clinical Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Chief complaint, relevant history, prior biopsy results…"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[#0a1628] text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/20 focus:border-[#1d4ed8] resize-none transition"
                />
              </div>

              <div className="flex justify-end">
                <NextBtn onClick={startAnalysis} disabled={!file}>
                  Start Analysis →
                </NextBtn>
              </div>
            </div>
          </div>

          {/* Right — patient summary */}
          <div className="lg:col-span-2 space-y-4">
            {patient && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">
                  Selected Patient
                </p>
                <PatientCard patient={patient} />
              </div>
            )}
            <div className="bg-[#0a1628] rounded-2xl p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">
                Upload Requirements
              </p>
              <div className="space-y-2">
                {[
                  "H&E stained tissue section",
                  "Minimum 512 × 512 px",
                  "PNG, JPEG, or TIFF format",
                  "Max file size 50 MB",
                  "Single region of interest",
                ].map((r) => (
                  <div key={r} className="flex items-start gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-[#1d4ed8] mt-0.5 shrink-0" />
                    <span className="text-slate-400 text-xs">{r}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Step 2: Analysis running ────────────────────────────────────── */}
      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Main timeline */}
          <div className="lg:col-span-3 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="flex-1">
                <h2 className="text-[#0a1628] font-bold text-base">
                  MARS Pipeline — การวิเคราะห์ทีละขั้นตอน
                </h2>
                <p className="text-slate-400 text-xs mt-0.5">
                  ผู้เชี่ยวชาญ AI ทั้ง 8 ท่านทำงานต่อกันตามลำดับ
                </p>
              </div>
              {isRunning && (
                <div className="flex items-center gap-2 text-[#1d4ed8] text-xs font-medium bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  กำลังวิเคราะห์
                </div>
              )}
            </div>
            <div className="p-6">
              {analysisError && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
                  <XCircle className="w-4 h-4 shrink-0" />
                  {analysisError}
                </div>
              )}
              <AgentTimeline events={events} isRunning={isRunning} />
              {!isRunning && !analysisError && events.length > 0 && (
                <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm py-4 mt-2 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-semibold">
                    Pipeline เสร็จสมบูรณ์ — กำลังสร้างรายงาน…
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right panel: patient summary + pipeline legend */}
          <div className="lg:col-span-2 space-y-4">
            {patient && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">
                  ผู้ป่วย
                </p>
                <PatientCard patient={patient} />
              </div>
            )}

            <div className="bg-[#0a1628] rounded-2xl p-5 text-white">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">
                เกี่ยวกับ MARS Pipeline
              </p>
              <div className="space-y-3">
                {[
                  { n: "01–02", desc: "ตรวจสอบคุณภาพและคัดกรองภาพสไลด์" },
                  {
                    n: "03",
                    desc: "ตรวจหาพยาธิใบไม้ตับ (OV) ซึ่งเป็น risk factor หลัก",
                  },
                  { n: "04", desc: "จัดระดับ WHO Grade G1–G3 จาก histology" },
                  {
                    n: "05",
                    desc: "วิเคราะห์ TIL, LVI, PNI ใน microenvironment",
                  },
                  {
                    n: "06",
                    desc: "Staging AJCC 8th Edition และ treatment plan",
                  },
                  { n: "07", desc: "พยากรณ์อัตรารอดชีวิต 30–365 วัน" },
                  { n: "08", desc: "จัดทำ CAP Synoptic Report สมบูรณ์" },
                ].map((s) => (
                  <div key={s.n} className="flex gap-3 items-start">
                    <span className="text-[10px] font-mono font-bold text-[#1d4ed8] mt-0.5 w-8 shrink-0">
                      {s.n}
                    </span>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {s.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
              <p className="text-amber-800 text-[11px] font-bold uppercase tracking-widest mb-1.5">
                ข้อควรทราบ
              </p>
              <p className="text-amber-700 text-xs leading-relaxed">
                ผลลัพธ์จาก AI ทุกขั้นตอนจะแสดงทันทีเมื่อเสร็จสิ้น คลิก "ดู raw
                JSON output" เพื่อดูข้อมูลฉบับสมบูรณ์
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Step 3: Report ──────────────────────────────────────────────── */}
      {step === 3 && report && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[#0a1628] font-bold text-lg">
              Clinical Report
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#0a1628] border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-xl transition-colors print:hidden"
              >
                <Printer className="w-3.5 h-3.5" /> Print Report
              </button>
              <button
                onClick={() => {
                  setStep(0);
                  setPatient(null);
                  clearFile();
                  setEvents([]);
                  setReport(null);
                  setHnInput("");
                  setNotes("");
                  setDoctorVerdict("");
                  setDoctorComment("");
                  setSignedOff(false);
                  setSignOffAt(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-xl transition-colors"
              >
                New Analysis
              </button>
              {analysisId && (
                <button
                  onClick={() => router.push(`/cases/${analysisId}`)}
                  className="text-xs text-[#1d4ed8] hover:text-blue-700 border border-blue-200 hover:border-blue-300 px-3 py-1.5 rounded-xl transition-colors"
                >
                  View Full Record
                </button>
              )}
            </div>
          </div>

          {patient && <PatientCard patient={patient} />}

          <ClinicalReport report={report} events={events} />

          {/* ── Doctor Sign-off Panel ──────────────────────────────────── */}
          {signedOff ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4 print:border-emerald-300">
              <ClipboardCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-emerald-700 font-bold text-sm">
                  รายงานผ่านการ Sign-off แล้ว
                </p>
                <p className="text-emerald-600 text-xs mt-0.5">
                  {signOffAt &&
                    new Date(signOffAt).toLocaleString("th-TH", {
                      dateStyle: "long",
                      timeStyle: "short",
                    })}
                  {" · "}
                  {doctorVerdict === "accept" && "ยืนยันผล AI"}
                  {doctorVerdict === "accept_modified" && "ยืนยันพร้อมแก้ไข"}
                  {doctorVerdict === "review_needed" && "ต้องตรวจสอบเพิ่มเติม"}
                </p>
                {doctorComment && (
                  <p className="text-emerald-700 text-xs mt-2 italic">
                    "{doctorComment}"
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 print:hidden">
              <div className="flex items-center gap-2">
                <PenLine className="w-4 h-4 text-[#1d4ed8]" />
                <h3 className="text-[#0a1628] font-bold text-sm">
                  Pathologist Sign-off
                </h3>
                <span className="text-red-500 text-xs ml-auto">
                  * จำเป็นก่อนส่งรายงาน
                </span>
              </div>

              {/* Verdict selector */}
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    value: "accept" as const,
                    icon: CheckCircle,
                    label: "ยืนยันผล AI",
                    desc: "Accept AI Diagnosis",
                    active: "bg-emerald-600 text-white border-emerald-600",
                    inactive:
                      "text-slate-600 border-slate-200 hover:border-emerald-400 hover:text-emerald-700",
                  },
                  {
                    value: "accept_modified" as const,
                    icon: PenLine,
                    label: "ยืนยันพร้อมแก้ไข",
                    desc: "Accept + Modifications",
                    active: "bg-blue-600 text-white border-blue-600",
                    inactive:
                      "text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-700",
                  },
                  {
                    value: "review_needed" as const,
                    icon: AlertTriangle,
                    label: "ต้องตรวจสอบเพิ่ม",
                    desc: "Requires Further Review",
                    active: "bg-amber-500 text-white border-amber-500",
                    inactive:
                      "text-slate-600 border-slate-200 hover:border-amber-400 hover:text-amber-700",
                  },
                ].map(
                  ({ value, icon: Icon, label, desc, active, inactive }) => (
                    <button
                      key={value}
                      onClick={() => setDoctorVerdict(value)}
                      className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-medium transition-all ${
                        doctorVerdict === value ? active : inactive
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{label}</span>
                      <span
                        className={`text-xs ${doctorVerdict === value ? "opacity-80" : "text-slate-400"}`}
                      >
                        {desc}
                      </span>
                    </button>
                  ),
                )}
              </div>

              {/* Comment */}
              <div>
                <label className="text-slate-500 text-[11px] font-bold uppercase tracking-widest block mb-1.5">
                  Clinical Comment (optional)
                </label>
                <textarea
                  value={doctorComment}
                  onChange={(e) => setDoctorComment(e.target.value)}
                  rows={3}
                  placeholder="เพิ่ม comment ทางคลินิก, การวินิจฉัยแยกโรค, หรือคำแนะนำเพิ่มเติม…"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[#0a1628] text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/20 focus:border-[#1d4ed8] resize-none transition"
                />
              </div>

              {/* Sign button */}
              <div className="flex items-center justify-between">
                {!doctorVerdict && (
                  <p className="text-amber-600 text-xs flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> กรุณาเลือก verdict
                    ก่อน sign-off
                  </p>
                )}
                <div className="ml-auto">
                  <button
                    onClick={signOff}
                    disabled={
                      !doctorVerdict ||
                      signOffLoading ||
                      !analysisId ||
                      analysisId.startsWith("local-")
                    }
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#1d4ed8] hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm shadow-blue-200"
                  >
                    {signOffLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ClipboardCheck className="w-4 h-4" />
                    )}
                    Sign &amp; Finalize Report
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Image Zoom Lightbox ─────────────────────────────────────────── */}
      {zoomOpen && previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 print:hidden"
          onClick={() => setZoomOpen(false)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setZoomOpen(false)}
              className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center hover:bg-slate-50 transition"
            >
              <X className="w-4 h-4 text-[#0a1628]" />
            </button>
            {/* Image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Slide preview — full size"
              className="w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            />
            {/* Filename bar */}
            {file && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 rounded-b-xl px-4 py-2 flex items-center gap-2">
                <FileImage className="w-3.5 h-3.5 text-white/70 shrink-0" />
                <span className="text-white/90 text-xs font-medium truncate">
                  {file.name}
                </span>
                <span className="text-white/50 text-xs ml-auto shrink-0">
                  ESC to close
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
