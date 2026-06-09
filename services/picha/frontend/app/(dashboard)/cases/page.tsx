"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  ChevronRight,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  FlaskConical,
} from "lucide-react";

interface AnalysisRow {
  id: string;
  created_at: string;
  patient_hn: string | null;
  status: string;
  confidence: number | null;
  user_name?: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase() ?? "unknown";
  if (s === "completed" || s === "complete")
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-0.5 rounded-full font-semibold">
        <CheckCircle className="w-3 h-3" />
        Completed
      </span>
    );
  if (s === "error" || s === "failed")
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-600 border border-red-100 px-2.5 py-0.5 rounded-full font-semibold">
        <XCircle className="w-3 h-3" />
        Failed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-0.5 rounded-full font-semibold">
      <Clock className="w-3 h-3" />
      {status ?? "Pending"}
    </span>
  );
}

export default function CasesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<AnalysisRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const LIMIT = 20;

  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const offset = (page - 1) * LIMIT;
      const data = await api.getJson<{
        analyses: AnalysisRow[];
        total: number;
      }>(`/api/analysis?limit=${LIMIT}&offset=${offset}`);
      setRows(data.analyses ?? []);
      setTotal(data.total ?? 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load cases");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="py-8 px-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0a1628] tracking-tight">
            Case History
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {total} total analyses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCases}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1d4ed8] border border-slate-200 hover:border-[#1d4ed8]/30 px-3 py-1.5 rounded-xl transition-colors font-medium"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <button
            onClick={() => router.push("/analyze")}
            className="flex items-center gap-1.5 text-sm text-white font-semibold bg-[#1d4ed8] hover:bg-blue-700 px-4 py-1.5 rounded-xl transition-colors shadow-sm shadow-blue-200"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            New Analysis
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {/* Head */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-x-4 px-5 py-3 border-b border-slate-100 bg-slate-50">
          {["Date / Time", "Patient HN", "Confidence", "Status", ""].map(
            (h) => (
              <p
                key={h}
                className="text-slate-400 text-[11px] uppercase tracking-widest font-bold"
              >
                {h}
              </p>
            ),
          )}
        </div>

        {loading && rows.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-14 text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading…
          </div>
        )}

        {!loading && rows.length === 0 && !error && (
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
        )}

        {rows.map((row, idx) => (
          <div
            key={row.id}
            onClick={() => router.push(`/cases/${row.id}`)}
            className={`grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-x-4 px-5 py-4 border-b border-slate-50 last:border-0 hover:bg-blue-50/40 cursor-pointer transition-colors group items-center ${idx % 2 === 0 ? "" : "bg-slate-50/30"}`}
          >
            <div>
              <p className="text-[#0a1628] text-sm font-medium">
                {new Date(row.created_at).toLocaleDateString("en-GB", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <p className="text-slate-400 text-xs mt-0.5">
                {new Date(row.created_at).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <p className="text-slate-600 text-sm font-mono">
              {row.patient_hn ?? <span className="text-slate-300">—</span>}
            </p>
            <div>
              {row.confidence !== null && row.confidence !== undefined ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 max-w-[60px] bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-[#1d4ed8] rounded-full"
                      style={{ width: `${Math.round(row.confidence * 100)}%` }}
                    />
                  </div>
                  <span className="text-[#0a1628] text-sm font-semibold">
                    {Math.round(row.confidence * 100)}%
                  </span>
                </div>
              ) : (
                <span className="text-slate-300 text-sm">—</span>
              )}
            </div>
            <StatusBadge status={row.status} />
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#1d4ed8] transition-colors" />
          </div>
        ))}

        {/* Table footer */}
        {rows.length > 0 && (
          <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50/60">
            <p className="text-slate-400 text-[11px]">
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)}{" "}
              of {total} total analyses
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-xl hover:border-[#1d4ed8]/30 hover:text-[#1d4ed8] disabled:opacity-30 transition-colors font-medium"
          >
            ← Previous
          </button>
          <span className="text-slate-400 text-xs px-2">
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-xl hover:border-[#1d4ed8]/30 hover:text-[#1d4ed8] disabled:opacity-30 transition-colors font-medium"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
