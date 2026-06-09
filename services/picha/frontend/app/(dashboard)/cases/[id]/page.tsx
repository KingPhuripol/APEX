"use client";
import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  ArrowLeft,
  Loader2,
  Printer,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  History,
} from "lucide-react";
import PatientCard from "@/components/clinical/PatientCard";
import ClinicalReport from "@/components/clinical/ClinicalReport";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AnalysisRecord {
  id: string;
  created_at: string;
  patient_hn: string | null;
  status: string;
  confidence: number | null;
  result: Record<string, unknown> | null;
  user_name?: string | null;
  image_url?: string | null;
}

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

// ── Status badge (reuse pattern from cases/page.tsx) ─────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase() ?? "";
  if (s === "completed" || s === "complete")
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-medium">
        <CheckCircle className="w-3 h-3" /> Completed
      </span>
    );
  if (s === "error" || s === "failed")
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-600 border border-red-200 px-2.5 py-0.5 rounded-full font-medium">
        <XCircle className="w-3 h-3" /> Failed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full font-medium">
      <Clock className="w-3 h-3" /> {status}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null);
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [prevCases, setPrevCases] = useState<AnalysisRecord[]>([]);
  const [prevCasesLoading, setPrevCasesLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getJson<
        { analysis?: AnalysisRecord } & AnalysisRecord
      >(`/api/analysis/${id}`);
      const rec = data.analysis ?? data;
      setAnalysis(rec);

      // Try to fetch patient if HN is available
      const hn = rec.patient_hn;
      if (hn) {
        try {
          const pData = await api.getJson<{ patients: PatientRecord[] }>(
            `/api/patients?hn=${encodeURIComponent(hn)}`,
          );
          if (pData.patients?.[0]) setPatient(pData.patients[0]);
          else setPatient({ patient_hn: hn });
        } catch {
          setPatient({ patient_hn: hn });
        }

        // Fetch previous analyses for same patient (background)
        setPrevCasesLoading(true);
        api
          .getJson<{ analyses: AnalysisRecord[] }>(
            `/api/analysis?patient_hn=${encodeURIComponent(hn)}&limit=10`,
          )
          .then((d) => {
            setPrevCases(
              (d.analyses ?? []).filter((a) => a.id !== rec.id).slice(0, 5),
            );
          })
          .catch(() => {})
          .finally(() => setPrevCasesLoading(false));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load case");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Loading / error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Loading case…</span>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
          {error || "Case not found"}
        </div>
        <button
          onClick={() => router.push("/cases")}
          className="flex items-center gap-1 text-slate-500 hover:text-[#0a1628] text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to cases
        </button>
      </div>
    );
  }

  // ── Parse result JSONB ────────────────────────────────────────────────────

  let parsedResult: Record<string, unknown> = {};
  if (analysis.result) {
    if (typeof analysis.result === "string") {
      try {
        parsedResult = JSON.parse(analysis.result);
      } catch {
        parsedResult = { raw: analysis.result };
      }
    } else {
      parsedResult = analysis.result as Record<string, unknown>;
    }
  }

  const hasReport = Object.keys(parsedResult).length > 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-5">
      {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-1 text-slate-400 text-xs">
        <button
          onClick={() => router.push("/cases")}
          className="hover:text-[#0a1628] transition-colors"
        >
          Case History
        </button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-500 truncate max-w-xs font-mono">{id}</span>
      </nav>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0a1628]">Case Report</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-slate-500 text-sm">
              {new Date(analysis.created_at).toLocaleString("th-TH", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <StatusBadge status={analysis.status} />
            {analysis.confidence !== null &&
              analysis.confidence !== undefined && (
                <span className="text-xs text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                  {Math.round(analysis.confidence * 100)}% conf.
                </span>
              )}
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0a1628] border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-xl transition-colors print:hidden"
        >
          <Printer className="w-4 h-4" />
          Print
        </button>
      </div>

      {/* ── Patient card ───────────────────────────────────────────────── */}
      {patient && <PatientCard patient={patient} />}

      {/* ── Slide image thumbnail (if available) ───────────────────────── */}
      {analysis.image_url && (
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
              Input Slide
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={analysis.image_url}
            alt="WSI slide thumbnail"
            className="max-h-64 w-full object-contain bg-slate-50"
          />
        </div>
      )}

      {/* ── Clinical report ────────────────────────────────────────────── */}
      {hasReport ? (
        <ClinicalReport report={parsedResult} />
      ) : (
        <div className="bg-white border border-slate-100 rounded-xl px-4 py-12 text-center shadow-sm">
          <p className="text-slate-400 text-sm">
            No structured report available for this case.
          </p>
          {analysis.status === "error" && (
            <p className="text-red-600 text-xs mt-2">
              Analysis failed. Please re-run from New Analysis.
            </p>
          )}
        </div>
      )}

      {/* ── Previous Visits ─────────────────────────────────────────────── */}
      {analysis.patient_hn && analysis.patient_hn !== "WALK-IN" && (
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden print:hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            <p className="text-slate-600 text-sm font-semibold">
              Previous Visits
            </p>
            <span className="text-slate-400 text-xs ml-1">
              — HN: {analysis.patient_hn}
            </span>
          </div>
          {prevCasesLoading ? (
            <div className="flex items-center justify-center gap-2 text-slate-400 text-xs py-6">
              <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลด…
            </div>
          ) : prevCases.length === 0 ? (
            <p className="text-slate-400 text-xs text-center py-6">
              ไม่มี case ก่อนหน้าของผู้ป่วยรายนี้
            </p>
          ) : (
            <div className="divide-y divide-slate-50">
              {prevCases.map((c) => {
                const cResult =
                  c.result && typeof c.result === "object"
                    ? (c.result as Record<string, unknown>)
                    : {};
                const grade = cResult.who_grade
                  ? `WHO ${cResult.who_grade}`
                  : null;
                const diag =
                  typeof cResult.primary_diagnosis === "string"
                    ? cResult.primary_diagnosis.slice(0, 60)
                    : null;
                return (
                  <button
                    key={c.id}
                    onClick={() => router.push(`/cases/${c.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left group"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-[#1d4ed8] transition-colors shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[#0a1628] text-xs font-semibold">
                        {new Date(c.created_at).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                        {grade && (
                          <span className="ml-2 text-[#1d4ed8]">{grade}</span>
                        )}
                      </p>
                      {diag && (
                        <p className="text-slate-500 text-[11px] mt-0.5 truncate">
                          {diag}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={c.status} />
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#1d4ed8] transition-colors shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Footer nav ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 print:hidden">
        <button
          onClick={() => router.push("/cases")}
          className="flex items-center gap-1 text-slate-500 hover:text-[#0a1628] text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> All Cases
        </button>
        <button
          onClick={() => router.push("/analyze")}
          className="text-xs text-white font-semibold bg-[#1d4ed8] hover:bg-blue-700 px-4 py-1.5 rounded-xl transition-colors shadow-sm shadow-blue-200"
        >
          New Analysis
        </button>
      </div>
    </div>
  );
}
