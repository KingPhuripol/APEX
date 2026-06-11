import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  ArrowRight,
  Brain,
  Activity as LiverIcon,
  Microscope,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Loader2,
  Building2,
  Users,
  BarChart3,
} from "lucide-react";
import { MOCK_PATIENTS, HOSPITAL } from "../lib/patients";

const TOOL_FIRST_MAP = {
  AXIA: "axia",
  SmartLiva: "smartliva",
  PICHA: "picha",
};

const PRIORITY_STYLE = {
  Critical: "text-red-400 bg-red-500/10 border-red-500/20",
  Stat: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  Urgent: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  Routine: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};

const STATUS_STYLE = {
  Pending: "text-[var(--warn)] bg-[var(--warn-soft)] border-[var(--warn)]",
  "In Progress": "text-blue-400 bg-blue-500/10 border-blue-500/30",
  Reviewed: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
};

function ToolChip({ tool }) {
  const cfg = {
    AXIA: { icon: Brain, cls: "text-violet-400 bg-violet-500/10 border-violet-500/30" },
    SmartLiva: { icon: LiverIcon, cls: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
    PICHA: { icon: Microscope, cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  };
  const { icon: Icon, cls } = cfg[tool] || {};
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold ${cls}`}>
      <Icon className="w-3 h-3" />
      {tool}
    </span>
  );
}

const FILTERS = ["All", "AXIA", "SmartLiva", "PICHA"];

export default function Worklist() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const counts = useMemo(() => ({
    total: MOCK_PATIENTS.length,
    pending: MOCK_PATIENTS.filter((p) => p.status === "Pending").length,
    critical: MOCK_PATIENTS.filter((p) => p.priority === "Critical").length,
    reviewed: MOCK_PATIENTS.filter((p) => p.status === "Reviewed").length,
  }), []);

  const filtered = useMemo(() => {
    return MOCK_PATIENTS.filter((p) => {
      const matchFilter = activeFilter === "All" || p.tools.includes(activeFilter);
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.id.toLowerCase().includes(q) ||
        p.nameEn.toLowerCase().includes(q) ||
        p.accession.toLowerCase().includes(q) ||
        p.ward.toLowerCase().includes(q) ||
        p.indication.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [search, activeFilter]);

  const openPatient = (patient) => {
    const firstTool = TOOL_FIRST_MAP[patient.tools[0]] || "axia";
    navigate(`/patient/${patient.id}/${firstTool}`);
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg)] overflow-hidden">
      {/* Hospital header */}
      <div className="shrink-0 px-4 sm:px-6 pt-4 pb-3 border-b border-[var(--line)] bg-[var(--surface)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--info-soft)] border border-[var(--info)] flex items-center justify-center shrink-0">
              <Building2 className="w-4.5 h-4.5 text-[var(--info)]" />
            </div>
            <div>
              <div className="font-bold text-[var(--text)] text-base leading-tight">
                {HOSPITAL.nameEn}
              </div>
              <div className="text-[11px] text-[var(--muted)] mt-0.5">
                {HOSPITAL.dept}
              </div>
            </div>
          </div>

          {/* Summary stats */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--surface-2)] border border-[var(--line)] rounded-md">
              <Users className="w-3.5 h-3.5 text-[var(--muted)]" />
              <span className="text-xs font-mono text-[var(--text)]">{counts.total} studies</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--warn-soft)] border border-[var(--warn)] rounded-md">
              <Clock className="w-3.5 h-3.5 text-[var(--warn)]" />
              <span className="text-xs font-mono text-[var(--warn)] font-semibold">{counts.pending} pending</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--danger-soft)] border border-[var(--danger)] rounded-md">
              <AlertTriangle className="w-3.5 h-3.5 text-[var(--danger)]" />
              <span className="text-xs font-mono text-[var(--danger)] font-semibold">{counts.critical} critical</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--ok-soft)] border border-[var(--ok)] rounded-md">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--ok)]" />
              <span className="text-xs font-mono text-[var(--ok)]">{counts.reviewed} reviewed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="shrink-0 px-4 sm:px-6 py-3 bg-[var(--surface-2)] border-b border-[var(--line)] flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Search HN, name, accession, ward..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[var(--surface)] border border-[var(--line-strong)] rounded-md text-sm text-[var(--text)] focus:outline-none focus:border-[var(--info)] placeholder:text-[var(--dim)] transition-colors"
          />
        </div>

        <div className="flex gap-1 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                activeFilter === f
                  ? "bg-[var(--info)] border-[var(--info)] text-white"
                  : "bg-[var(--surface)] border-[var(--line-strong)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--info)]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse text-sm min-w-[780px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[var(--surface-2)] border-b border-[var(--line)] text-[var(--muted)] text-[11px] uppercase tracking-wider">
              <th className="px-4 py-2.5 font-semibold">Priority</th>
              <th className="px-4 py-2.5 font-semibold">Patient (HN)</th>
              <th className="px-4 py-2.5 font-semibold hidden md:table-cell">Accession</th>
              <th className="px-4 py-2.5 font-semibold hidden lg:table-cell">Indication</th>
              <th className="px-4 py-2.5 font-semibold hidden sm:table-cell">Ward / Referrer</th>
              <th className="px-4 py-2.5 font-semibold">AI Module</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)] bg-[var(--surface)]">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-[var(--muted)] text-sm">
                  No studies match your search.
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr
                key={p.id}
                onClick={() => openPatient(p)}
                className="hover:bg-[var(--surface-2)] transition-colors cursor-pointer group"
              >
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold ${PRIORITY_STYLE[p.priority]}`}
                  >
                    {p.priority === "Critical" && (
                      <AlertTriangle className="w-2.5 h-2.5" />
                    )}
                    {p.priority}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <div className="font-medium text-[var(--text)] text-sm leading-tight">
                    {p.nameEn}
                  </div>
                  <div className="text-[10px] text-[var(--muted)] font-mono mt-0.5">
                    {p.id} · {p.age}/{p.gender}
                  </div>
                </td>

                <td className="px-4 py-3 hidden md:table-cell">
                  <div className="font-mono text-[11px] text-[var(--text-2)]">
                    {p.accession}
                  </div>
                  <div className="text-[10px] text-[var(--dim)] mt-0.5">{p.date}</div>
                </td>

                <td className="px-4 py-3 hidden lg:table-cell max-w-[200px]">
                  <div className="text-xs text-[var(--text-2)] line-clamp-2 leading-snug">
                    {p.indication}
                  </div>
                  {p.lastResult && (
                    <div className="mt-1 text-[10px] text-emerald-400 font-medium line-clamp-1">
                      {p.lastResult}
                    </div>
                  )}
                </td>

                <td className="px-4 py-3 hidden sm:table-cell">
                  <div className="text-xs text-[var(--text-2)] leading-tight">
                    {p.ward}
                  </div>
                  <div className="text-[10px] text-[var(--dim)] mt-0.5">
                    {p.referrer}
                  </div>
                </td>

                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {p.tools.map((t) => (
                      <ToolChip key={t} tool={t} />
                    ))}
                  </div>
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold ${STATUS_STYLE[p.status]}`}
                  >
                    {p.status === "In Progress" && (
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    )}
                    {p.status === "Reviewed" && (
                      <CheckCircle2 className="w-2.5 h-2.5" />
                    )}
                    {p.status}
                  </span>
                </td>

                <td className="px-4 py-3 text-right">
                  <button className="inline-flex items-center gap-1 text-[var(--info)] hover:text-blue-300 text-xs font-semibold uppercase tracking-wide group-hover:translate-x-0.5 transition-transform">
                    Open
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-6 py-2 border-t border-[var(--line)] bg-[var(--surface-2)] flex items-center justify-between text-[10px] font-mono text-[var(--dim)] uppercase tracking-wider">
        <span>{HOSPITAL.code} · APEX Clinical AI Platform v3.0</span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          All AI Services Online
        </span>
      </div>
    </div>
  );
}
