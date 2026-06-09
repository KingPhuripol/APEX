"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  FlaskConical,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  Loader2,
  TrendingUp,
  Activity,
  BarChart2,
  Cpu,
  RefreshCw,
  ArrowUpRight,
  Microscope,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

interface AnalysisRow {
  id: string;
  created_at: string;
  patient_hn: string | null;
  status: string;
  confidence: number | null;
}

interface AuditLog {
  id: string;
  created_at: string;
  user_name: string;
  action: string;
  patient_hn: string | null;
  confidence: number | null;
  status: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const s = status?.toLowerCase() ?? "";
  if (s === "completed" || s === "complete")
    return (
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-0.5" />
    );
  if (s === "error" || s === "failed")
    return (
      <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-0.5" />
    );
  return (
    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-0.5" />
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase() ?? "unknown";
  if (s === "completed" || s === "complete")
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap">
        <CheckCircle className="w-3 h-3" />
        Completed
      </span>
    );
  if (s === "error" || s === "failed")
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-600 border border-red-100 px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap">
        <XCircle className="w-3 h-3" />
        Failed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap">
      <Clock className="w-3 h-3" />
      {status ?? "Pending"}
    </span>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<AnalysisRow[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [analysisData, auditData] = await Promise.all([
        api.getJson<{ analyses: AnalysisRow[]; total: number }>(
          "/api/analysis?limit=20",
        ),
        api
          .getJson<{ logs: AuditLog[] }>("/api/audit?limit=8")
          .catch(() => ({ logs: [] as AuditLog[] })),
      ]);
      setAnalyses(analysisData.analyses ?? []);
      setTotal(analysisData.total ?? 0);
      setLogs(auditData.logs ?? []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Computed stats ─────────────────────────────────────────────────────
  const now = new Date();
  const todayStr = now.toDateString();
  const todayCases = analyses.filter(
    (a) => new Date(a.created_at).toDateString() === todayStr,
  ).length;
  const completedCases = analyses.filter((a) =>
    ["completed", "complete"].includes(a.status?.toLowerCase()),
  ).length;
  const confidences = analyses.filter(
    (a) => a.confidence !== null && a.confidence !== undefined,
  );
  const avgConf =
    confidences.length > 0
      ? Math.round(
          (confidences.reduce((s, a) => s + Number(a.confidence), 0) /
            confidences.length) *
            100,
        )
      : null;

  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const KPI_CARDS = [
    {
      label: "Total Cases",
      value: loading ? "—" : String(total),
      sub: `${todayCases} today`,
      icon: BarChart2,
      accent: "bg-blue-50 text-[#1d4ed8]",
    },
    {
      label: "Completed",
      value: loading ? "—" : String(completedCases),
      sub: `of last ${analyses.length}`,
      icon: CheckCircle,
      accent: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Avg Confidence",
      value: loading ? "—" : avgConf !== null ? `${avgConf}%` : "—",
      sub: "ML model output",
      icon: TrendingUp,
      accent: "bg-purple-50 text-purple-600",
    },
    {
      label: "AI Agents",
      value: "7 Active",
      sub: "MARS Pipeline",
      icon: Cpu,
      accent: "bg-amber-50 text-amber-600",
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="py-8 px-6 max-w-7xl mx-auto space-y-7">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-slate-400 text-sm font-medium">
            {greeting} —{" "}
            {now.toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <h1 className="text-[1.65rem] font-extrabold text-[#0a1628] tracking-tight leading-none mt-1">
            Pathology Workstation
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0a1628] border border-slate-200 hover:border-slate-300 px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
          </button>
          <button
            onClick={() => router.push("/analyze")}
            className="flex items-center gap-2 text-sm text-white font-semibold bg-[#1d4ed8] hover:bg-blue-700 px-4 py-2 rounded-xl transition-colors shadow-sm shadow-blue-200"
          >
            <FlaskConical className="w-4 h-4" />
            New Analysis
          </button>
        </div>
      </div>

      {/* ── KPI cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CARDS.map((s) => (
          <div
            key={s.label}
            className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-start gap-4"
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.accent}`}
            >
              <s.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                {s.label}
              </p>
              <p className="text-[#0a1628] text-2xl font-extrabold leading-none">
                {s.value}
              </p>
              {s.sub && (
                <p className="text-slate-400 text-xs mt-1 truncate">{s.sub}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Main grid ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* ── Recent Cases ──────────────────────────────────────────── */}
        <div className="xl:col-span-3 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-[#0a1628] font-bold text-sm">
                Recent Analyses
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Last {analyses.length} cases
              </p>
            </div>
            <button
              onClick={() => router.push("/cases")}
              className="flex items-center gap-1 text-xs text-[#1d4ed8] hover:text-blue-700 font-semibold transition-colors"
            >
              View all
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Column headers */}
          {analyses.length > 0 && (
            <div className="grid grid-cols-[2fr_1.2fr_1fr_1fr_auto] gap-x-4 px-5 py-2.5 border-b border-slate-50 bg-slate-50/60">
              {["Date", "Patient HN", "Confidence", "Status", ""].map((h) => (
                <p
                  key={h}
                  className="text-slate-400 text-[10px] uppercase tracking-widest font-bold"
                >
                  {h}
                </p>
              ))}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : analyses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center">
                <FlaskConical className="w-6 h-6 text-slate-300" />
              </div>
              <div className="text-center">
                <p className="text-slate-500 text-sm font-medium">
                  No analyses yet
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  Cases will appear here after your first analysis
                </p>
              </div>
              <button
                onClick={() => router.push("/analyze")}
                className="text-xs font-semibold text-white bg-[#1d4ed8] hover:bg-blue-700 px-4 py-2 rounded-xl transition-colors"
              >
                Run first analysis
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {analyses.slice(0, 8).map((row) => (
                <button
                  key={row.id}
                  onClick={() => router.push(`/cases/${row.id}`)}
                  className="w-full grid grid-cols-[2fr_1.2fr_1fr_1fr_auto] gap-x-4 px-5 py-3.5 hover:bg-slate-50 transition-colors text-left group items-center"
                >
                  {/* Date */}
                  <div>
                    <p className="text-[#0a1628] text-sm font-semibold">
                      {fmtDate(row.created_at)}
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {fmtTime(row.created_at)}
                    </p>
                  </div>
                  {/* HN */}
                  <p className="text-slate-600 text-sm font-mono truncate">
                    {row.patient_hn ?? (
                      <span className="text-slate-300">—</span>
                    )}
                  </p>
                  {/* Confidence */}
                  <div>
                    {row.confidence !== null && row.confidence !== undefined ? (
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#1d4ed8] rounded-full"
                            style={{
                              width: `${Math.round(row.confidence * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-[#0a1628]">
                          {Math.round(row.confidence * 100)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-300 text-sm">—</span>
                    )}
                  </div>
                  {/* Status */}
                  <StatusBadge status={row.status} />
                  {/* Arrow */}
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#1d4ed8] transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Right column ──────────────────────────────────────────── */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          {/* CTA — Start New Analysis */}
          <div className="relative bg-[#0a1628] rounded-2xl p-5 overflow-hidden">
            {/* Dot-grid texture */}
            <div
              className="absolute inset-0 opacity-[0.035]"
              style={{
                backgroundImage:
                  "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />
            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-[#1d4ed8] flex items-center justify-center shadow-lg shadow-blue-900/50">
                  <Microscope className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
                </div>
                <div>
                  <p className="text-white text-sm font-bold leading-none">
                    MARS Pipeline
                  </p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    7 specialist AI agents
                  </p>
                </div>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed mb-4">
                Patient lookup → H&E slide analysis → WHO grade + AJCC staging +
                survival prognosis
              </p>
              <button
                onClick={() => router.push("/analyze")}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1d4ed8] hover:bg-blue-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-blue-900/40"
              >
                <FlaskConical className="w-4 h-4" />
                Start New Analysis
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex-1">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-slate-400" />
              <p className="text-[#0a1628] text-sm font-semibold">
                Recent Activity
              </p>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : logs.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-8">
                No activity yet
              </p>
            ) : (
              <div className="divide-y divide-slate-50">
                {logs.slice(0, 6).map((log) => (
                  <div
                    key={log.id}
                    className="px-4 py-3 flex items-start gap-3"
                  >
                    <StatusDot
                      status={log.status === "ok" ? "completed" : "error"}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[#0a1628] text-xs font-medium leading-snug truncate">
                        {log.action}
                      </p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        {log.patient_hn ? `HN ${log.patient_hn} · ` : ""}
                        {fmtTime(log.created_at)}
                      </p>
                    </div>
                    {log.confidence !== null && Number(log.confidence) > 0 && (
                      <span className="text-[10px] font-bold text-[#1d4ed8] shrink-0 tabular-nums">
                        {Math.round(Number(log.confidence))}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Platform specs */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-3">
              Platform
            </p>
            <div className="space-y-2">
              {[
                {
                  label: "ConvNeXt-Base",
                  detail: "9-class · 77.5% acc",
                  dot: "bg-emerald-400",
                },
                {
                  label: "MARS Agents",
                  detail: "llama-4-scout · llama-3.3-70b",
                  dot: "bg-emerald-400",
                },
                {
                  label: "Evidence Base",
                  detail: "SEER 2010–2020",
                  dot: "bg-blue-400",
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.dot}`}
                  />
                  <span className="text-[#0a1628] text-xs font-semibold">
                    {item.label}
                  </span>
                  <span className="text-slate-400 text-xs ml-auto shrink-0">
                    {item.detail}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 pt-3 border-t border-slate-100 text-slate-400 text-[10px] leading-relaxed">
              For clinical decision support only. Final diagnosis must be
              confirmed by a licensed pathologist.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
