"use client";
import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  FileText,
} from "lucide-react";
import SurvivalChart from "./SurvivalChart";
import {
  AGENT_META,
  PIPELINE_ORDER,
  ResultCard,
  type AgentEventData,
} from "@/components/pipeline/AgentTimeline";

// ── Helpers ─────────────────────────────────────────────────────────────────

function safeStr(v: unknown, fallback = "—"): string {
  if (v === null || v === undefined) return fallback;
  return String(v);
}

function safeNum(v: unknown): number | null {
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
          {title}
        </p>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex justify-between items-start py-1 border-b border-slate-100 last:border-0">
      <span className="text-slate-500 text-xs">{label}</span>
      <span
        className={`text-xs font-medium text-right max-w-[60%] ${accent ?? "text-[#0a1628]"}`}
      >
        {value}
      </span>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

interface ClinicalReportProps {
  report: Record<string, unknown>;
  events?: AgentEventData[];
}

export default function ClinicalReport({
  report,
  events = [],
}: ClinicalReportProps) {
  const [agentExpanded, setAgentExpanded] = useState(false);
  const [pipelineExpanded, setPipelineExpanded] = useState(true);
  // Track which agent sections are open (all open by default)
  const [openAgents, setOpenAgents] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PIPELINE_ORDER.map((k) => [k, true])),
  );

  // ── Extract per-agent parsed data from events ───────────────────────────
  // ReportAgent only returns summary fields; full data lives in agent events.
  function getAgentData(agentName: string): Record<string, unknown> {
    const ev = [...events]
      .reverse()
      .find(
        (e) =>
          e.agent === agentName &&
          (e.type === "conclusion" || e.type === "ml_prescreen" || e.is_final),
      );
    if (!ev) return {};
    // Use the same parseMessage utility that ResultCard uses
    const raw = ev.message ?? "";
    // Simple Python-dict-aware parser (same logic as parseMessage in AgentTimeline)
    const tryParse = (s: string): Record<string, unknown> | null => {
      try {
        const r = JSON.parse(s);
        if (typeof r === "object" && r !== null)
          return r as Record<string, unknown>;
      } catch {}
      try {
        const r = JSON.parse(
          s
            .replace(/'/g, '"')
            .replace(/\bTrue\b/g, "true")
            .replace(/\bFalse\b/g, "false")
            .replace(/\bNone\b/g, "null"),
        );
        if (typeof r === "object" && r !== null)
          return r as Record<string, unknown>;
      } catch {}
      return null;
    };
    // Try full string
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const full = tryParse(raw.slice(start, end + 1));
      if (full) return full;
    }
    // Merge multiple {...} blocks
    const merged: Record<string, unknown> = {};
    let pos = 0;
    while (pos < raw.length) {
      const s = raw.indexOf("{", pos);
      if (s < 0) break;
      let depth = 0,
        e = -1;
      for (let i = s; i < raw.length; i++) {
        if (raw[i] === "{") depth++;
        else if (raw[i] === "}") {
          depth--;
          if (depth === 0) {
            e = i;
            break;
          }
        }
      }
      if (e < 0) break;
      const obj = tryParse(raw.slice(s, e + 1));
      if (obj) Object.assign(merged, obj);
      pos = e + 1;
    }
    return merged;
  }

  const timeMachineData = getAgentData("TimeMachineAgent");
  const slideQCData = getAgentData("SlideQCAgent");
  const spatialAgentData = getAgentData("SpatialAgent");
  const oncologistData = getAgentData("OncologistAgent");
  const parasitologistData = getAgentData("ParasitologistAgent");
  const gradingData = getAgentData("GradingAgent");

  // ── Parse report (defensive — LLM output varies) ────────────────────────

  // Primary diagnosis
  const diagnosis = safeStr(
    report.primary_diagnosis ??
      report.diagnosis ??
      (report.grading as any)?.who_grade ??
      (report.report as any)?.primary_diagnosis,
  );

  const confidence = safeNum(
    report.overall_confidence ??
      (report.ml_prescreen as any)?.confidence ??
      (report.grading as any)?.confidence,
  );

  const grade = safeStr(
    (report.grading as any)?.who_grade ?? report.who_grade ?? report.grade,
  );

  const isOv = Boolean(
    (report.ov_pathology as any)?.parasite_detected ??
    (report.parasitology as any)?.parasite_detected ??
    report.ov_associated ??
    report.ov_infection,
  );

  // Recommendations (flat array from MARS agent)
  const recommendations: string[] = Array.isArray(report.recommendations)
    ? (report.recommendations as string[])
    : [];

  // Summary text
  const summary = safeStr(report.summary ?? report.clinical_summary ?? "", "");

  // Staging — prefer OncologistAgent event data, fallback to report fields
  const stagingObj =
    (Object.keys(oncologistData).length > 0 ? oncologistData : null) ??
    (report.staging as any) ??
    (report.oncology as any) ??
    {};
  const stageRaw = safeStr(
    stagingObj.overall_stage ?? stagingObj.stage ?? report.stage,
  );
  const stage = stageRaw;

  // Try to parse T/N/M from a compound string like "T1N0M0" when not nested
  const tnmMatch = stageRaw.match(/^(T[^NM]*)(N[^M]*)(M.*)$/i);
  const tStage = safeStr(
    stagingObj.T ?? stagingObj.t_stage ?? tnmMatch?.[1] ?? "—",
  );
  const nStage = safeStr(
    stagingObj.N ?? stagingObj.n_stage ?? tnmMatch?.[2] ?? "—",
  );
  const mStage = safeStr(
    stagingObj.M ?? stagingObj.m_stage ?? tnmMatch?.[3] ?? "—",
  );
  const resectability = safeStr(
    stagingObj.resectability ?? stagingObj.resection_status ?? "—",
  );
  const recommendation = safeStr(
    stagingObj.treatment_recommendation ??
      stagingObj.recommendation ??
      report.recommendation ??
      "—",
  );

  // Survival — pull from TimeMachineAgent event, broad key aliases
  const survivalObj: Record<string, unknown> =
    Object.keys(timeMachineData).length > 0
      ? timeMachineData
      : ((report.survival as any) ??
        (report.prognosis as any) ??
        (report.time_machine as any) ??
        {});
  // The LLM may return probabilities as nested object, at top-level, or under various aliases
  const survivalNested: Record<string, unknown> =
    (survivalObj.survival_probabilities as any) ??
    (survivalObj.survival as any) ??
    survivalObj;
  const d30 = safeNum(
    survivalNested["30d"] ??
      survivalNested["30_days"] ??
      survivalNested.day_30 ??
      survivalNested["30_day"] ??
      survivalNested["day30"] ??
      survivalNested["survival_30d"] ??
      survivalNested["30"],
  );
  const d90 = safeNum(
    survivalNested["90d"] ??
      survivalNested["90_days"] ??
      survivalNested.day_90 ??
      survivalNested["90_day"] ??
      survivalNested["day90"] ??
      survivalNested["survival_90d"] ??
      survivalNested["90"],
  );
  const d180 = safeNum(
    survivalNested["180d"] ??
      survivalNested["180_days"] ??
      survivalNested.day_180 ??
      survivalNested["180_day"] ??
      survivalNested["day180"] ??
      survivalNested["survival_180d"] ??
      survivalNested["180"],
  );
  const d365 = safeNum(
    survivalNested["365d"] ??
      survivalNested["365_days"] ??
      survivalNested.day_365 ??
      survivalNested["365_day"] ??
      survivalNested["day365"] ??
      survivalNested["1_year"] ??
      survivalNested["1year"] ??
      survivalNested["survival_365d"] ??
      survivalNested["365"],
  );

  const survivalData = [
    ...(d30 !== null ? [{ label: "30d", probability: d30 }] : []),
    ...(d90 !== null ? [{ label: "90d", probability: d90 }] : []),
    ...(d180 !== null ? [{ label: "180d", probability: d180 }] : []),
    ...(d365 !== null ? [{ label: "365d", probability: d365 }] : []),
  ];

  // QC — pull from SlideQCAgent event, broad key aliases
  const qcObj: Record<string, unknown> =
    Object.keys(slideQCData).length > 0
      ? slideQCData
      : ((report.slide_qc as any) ?? {});
  const qcQuality = safeStr(
    qcObj.overall_quality ?? qcObj.quality ?? qcObj.slide_quality ?? "—",
  );
  const qcProceed = qcObj.proceed !== false;

  // Spatial — pull from SpatialAgent event
  const spatialObj: Record<string, unknown> =
    Object.keys(spatialAgentData).length > 0
      ? spatialAgentData
      : ((report.spatial as any) ?? {});
  const tilDensity = safeStr(
    spatialObj.til_density ?? spatialObj.til ?? spatialObj.tils ?? "—",
  );
  const lvi = safeStr(
    spatialObj.lymphovascular_invasion ?? spatialObj.lvi ?? "—",
  );
  const pni = safeStr(spatialObj.perineural_invasion ?? spatialObj.pni ?? "—");
  const growthPattern = safeStr(
    spatialObj.growth_pattern ?? spatialObj.tumor_growth_pattern ?? "—",
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* ── Patient Rights Notice (PDPA) — visible on screen + print ── */}
      <div className="border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 print:border-slate-300 print:bg-white">
        <div className="flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-slate-400 shrink-0 mt-0.5 print:text-slate-500" />
          <div className="flex-1 min-w-0">
            <p className="text-slate-600 text-[11px] font-semibold uppercase tracking-wider mb-1">
              แจ้งสิทธิ์ผู้ป่วย (PDPA) · Patient Rights Notice
            </p>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              รายงานนี้จัดทำโดยระบบ <strong>PICHA</strong>{" "}
              ซึ่งเป็นเครื่องมือสนับสนุนการวินิจฉัยด้วย AI
              ข้อมูลของท่านถูกประมวลผลตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ.
              2562 ท่านมีสิทธิ์เข้าถึง แก้ไข หรือขอลบข้อมูลของท่าน
              ผลการวิเคราะห์ทั้งหมด
              <strong>
                ต้องผ่านการตรวจสอบและลงนามโดยแพทย์ผู้เชี่ยวชาญ
              </strong>{" "}
              ก่อนนำไปใช้ทางคลินิก
            </p>
            <p className="text-slate-400 text-[10px] mt-1">
              This AI-assisted report requires pathologist review and sign-off
              before clinical use. · PICHA v1.0
            </p>
          </div>
          <FileText className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5 hidden print:block" />
        </div>
      </div>

      {/* ── Primary Diagnosis ── */}
      <div className="bg-gradient-to-r from-blue-50 to-transparent border border-blue-100 rounded-xl px-5 py-4">
        <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">
          Primary Diagnosis
        </p>
        <p className="text-[#0a1628] text-base font-bold leading-snug mb-1">
          {diagnosis}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {grade !== "—" && (
            <span className="text-xs bg-yellow-50 border border-yellow-200 text-yellow-700 px-2 py-0.5 rounded font-medium">
              {grade}
            </span>
          )}
          {isOv && (
            <span className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded font-medium">
              OV-associated
            </span>
          )}
          {confidence !== null && (
            <span
              className="text-xs bg-purple-50 border border-purple-200 text-purple-700 px-2 py-0.5 rounded font-medium"
              title="Tissue typing confidence (colorectal reference model). Not a CCA classifier."
            >
              Tissue QC {Math.round(confidence * 100)}%
            </span>
          )}
          {stage !== "—" && (
            <span className="text-xs bg-red-50 border border-red-200 text-red-700 px-2 py-0.5 rounded font-medium">
              {stage}
            </span>
          )}
        </div>
      </div>

      {/* ── Staging + Survival side by side ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Section title="pTNM Staging (AJCC 8th Ed.)">
          <Row label="T stage" value={tStage} />
          <Row label="N stage" value={nStage} />
          <Row label="M stage" value={mStage} />
          <Row label="Overall stage" value={stage} accent="text-red-400" />
          <Row label="Resectability" value={resectability} />
          <div className="mt-2 pt-2 border-t border-slate-100">
            <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">
              Recommendation
            </p>
            {recommendations.length > 0 ? (
              <ul className="space-y-1">
                {recommendations.map((rec, i) => (
                  <li
                    key={i}
                    className="text-slate-700 text-xs leading-relaxed flex gap-1.5"
                  >
                    <span className="text-blue-400 shrink-0">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-700 text-xs leading-relaxed">
                {recommendation}
              </p>
            )}
          </div>
        </Section>

        <Section title="Survival Prognosis (Population-based)">
          {survivalData.length > 0 ? (
            <>
              <SurvivalChart data={survivalData} />
              <p className="text-slate-400 text-[10px] mt-2 text-center">
                SEER 2010–2020, SEA-adjusted. Statistical estimate only.
              </p>
            </>
          ) : (
            <p className="text-slate-400 text-xs text-center py-6">
              Survival data not available
            </p>
          )}
        </Section>
      </div>

      {/* ── Slide QC + Spatial ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Section title="Slide Quality Control">
          <div className="flex items-center gap-2 mb-2">
            {qcProceed ? (
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            )}
            <span
              className={`text-sm font-semibold ${qcProceed ? "text-emerald-600" : "text-red-600"}`}
            >
              {qcQuality}
            </span>
          </div>
          {Array.isArray(qcObj.issues) &&
            (qcObj.issues as string[]).length > 0 && (
              <div className="space-y-0.5">
                {(qcObj.issues as string[]).map((issue, i) => (
                  <p key={i} className="text-amber-600 text-xs">
                    • {issue}
                  </p>
                ))}
              </div>
            )}
        </Section>

        <Section title="Spatial / Microenvironment">
          <Row label="Growth pattern" value={growthPattern} />
          <Row label="TIL density" value={tilDensity} />
          <Row
            label="Lymphovascular invasion"
            value={lvi}
            accent={
              lvi === "Present" ? "text-red-600 font-bold" : "text-[#0a1628]"
            }
          />
          <Row
            label="Perineural invasion"
            value={pni}
            accent={
              pni === "Present" ? "text-red-600 font-bold" : "text-[#0a1628]"
            }
          />
        </Section>
      </div>

      {/* ── Clinical Summary (from MARS agent) ── */}
      {summary && (
        <Section title="Clinical Summary">
          <p className="text-slate-700 text-xs leading-relaxed">{summary}</p>
        </Section>
      )}

      {/* ── Key Pathological Findings ── */}
      {(() => {
        // Build list of findings cards for each agent that returned a narrative
        type FindingCard = {
          agentKey: string;
          narrative: string;
          chips: { label: string; value: string; accent?: string }[];
        };
        const cards: FindingCard[] = [];

        const addCard = (
          agentKey: string,
          data: Record<string, unknown>,
          chipsFn: (
            d: Record<string, unknown>,
          ) => { label: string; value: string; accent?: string }[],
        ) => {
          const narrative = safeStr(
            data.narrative ?? data.clinical_note ?? "",
            "",
          );
          if (!narrative || narrative === "—") return;
          cards.push({ agentKey, narrative, chips: chipsFn(data) });
        };

        addCard("SlideQCAgent", slideQCData, (d) => [
          { label: "Quality", value: safeStr(d.overall_quality ?? d.quality) },
          {
            label: "Proceed",
            value: d.proceed === false ? "No" : "Yes",
            accent: d.proceed === false ? "text-red-600" : "text-emerald-600",
          },
        ]);
        addCard("ParasitologistAgent", parasitologistData, (d) => {
          const chips: { label: string; value: string; accent?: string }[] = [
            {
              label: "OV detected",
              value: d.parasite_detected ? "Yes" : "No",
              accent: d.parasite_detected ? "text-red-600" : "text-emerald-600",
            },
          ];
          const prob = safeNum(d.ov_infection_probability);
          if (prob !== null)
            chips.push({
              label: "Probability",
              value: `${Math.round(prob * 100)}%`,
            });
          return chips;
        });
        addCard("GradingAgent", gradingData, (d) => {
          const chips: { label: string; value: string; accent?: string }[] = [
            { label: "Grade", value: safeStr(d.who_grade ?? d.grade) },
          ];
          const conf = safeNum(d.confidence);
          if (conf !== null)
            chips.push({
              label: "Confidence",
              value: `${Math.round(conf * 100)}%`,
            });
          return chips;
        });
        addCard("SpatialAgent", spatialAgentData, (d) => [
          {
            label: "Growth",
            value: safeStr(d.growth_pattern ?? d.tumor_growth_pattern),
          },
          { label: "TIL", value: safeStr(d.til_density ?? d.tils) },
          {
            label: "LVI",
            value: safeStr(d.lymphovascular_invasion ?? d.lvi),
            accent:
              (d.lymphovascular_invasion ?? d.lvi) === "Present"
                ? "text-red-600"
                : undefined,
          },
          {
            label: "PNI",
            value: safeStr(d.perineural_invasion ?? d.pni),
            accent:
              (d.perineural_invasion ?? d.pni) === "Present"
                ? "text-red-600"
                : undefined,
          },
        ]);
        addCard("OncologistAgent", oncologistData, (d) => {
          const stg = safeStr(d.overall_stage ?? d.stage);
          const chips: { label: string; value: string; accent?: string }[] = [];
          if (stg !== "—")
            chips.push({ label: "Stage", value: stg, accent: "text-red-600" });
          chips.push({
            label: "Resectability",
            value: safeStr(d.resectability ?? d.resection_status),
          });
          return chips;
        });
        addCard("TimeMachineAgent", timeMachineData, (d) => {
          const nest = (d.survival_probabilities ?? d.survival ?? d) as Record<
            string,
            unknown
          >;
          const y1 = safeNum(
            nest["365d"] ?? nest["365_days"] ?? nest.day_365 ?? nest["365"],
          );
          const chips: { label: string; value: string; accent?: string }[] = [];
          if (y1 !== null)
            chips.push({
              label: "1-yr survival",
              value: `${Math.round(y1 * 100)}%`,
            });
          const drivers = d.key_prognostic_drivers;
          if (Array.isArray(drivers) && drivers.length > 0)
            chips.push({ label: "Key factor", value: String(drivers[0]) });
          return chips;
        });

        if (cards.length === 0) return null;

        return (
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                Key Pathological Findings
              </p>
              <p className="text-slate-400 text-[10px] mt-0.5">
                Evidence supporting the diagnosis — for pathologist review
              </p>
            </div>
            <div className="divide-y divide-slate-50">
              {cards.map(({ agentKey, narrative, chips }) => {
                const meta = AGENT_META[agentKey];
                if (!meta) return null;
                const Icon = meta.icon;
                return (
                  <div key={agentKey} className="px-4 py-3 flex gap-3">
                    <div
                      className={`w-7 h-7 rounded-full ${meta.iconBg} flex items-center justify-center shrink-0 mt-0.5`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${meta.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[#0a1628] text-xs font-semibold">
                          {meta.label}
                        </span>
                        {chips
                          .filter((c) => c.value && c.value !== "—")
                          .map((c) => (
                            <span
                              key={c.label}
                              className={`text-[10px] px-1.5 py-0.5 rounded border ${meta.badgeBg} ${c.accent ?? meta.badgeText} font-medium`}
                            >
                              {c.label}: {c.value}
                            </span>
                          ))}
                      </div>
                      <p className="text-slate-600 text-xs leading-relaxed">
                        {narrative}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Agent Pipeline Results ── */}
      {events.some(
        (e) =>
          e.type === "conclusion" || e.type === "ml_prescreen" || e.is_final,
      ) && (
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
          <button
            onClick={() => setPipelineExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                MARS Pipeline Results
              </p>
              <span className="text-[10px] bg-blue-50 border border-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-semibold">
                {
                  events.filter(
                    (e) =>
                      e.type === "conclusion" ||
                      e.type === "ml_prescreen" ||
                      e.is_final,
                  ).length
                }
                /{PIPELINE_ORDER.length} agents
              </span>
            </div>
            {pipelineExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {pipelineExpanded && (
            <div className="divide-y divide-slate-100">
              {/* Build map of last conclusion event per agent to avoid duplicates */}
              {(() => {
                const lastByAgent = new Map<string, AgentEventData>();
                for (const e of events) {
                  if (
                    e.type === "conclusion" ||
                    e.type === "ml_prescreen" ||
                    e.is_final
                  ) {
                    lastByAgent.set(e.agent, e);
                  }
                }
                return PIPELINE_ORDER.map((agentKey) => {
                  const meta = AGENT_META[agentKey];
                  if (!meta) return null;
                  const finalEvent = lastByAgent.get(agentKey);
                  if (!finalEvent) return null;
                  const AgentIcon = meta.icon;
                  const isOpen = openAgents[agentKey] ?? true;
                  return (
                    <div key={agentKey}>
                      <button
                        onClick={() =>
                          setOpenAgents((prev) => ({
                            ...prev,
                            [agentKey]: !prev[agentKey],
                          }))
                        }
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full ${meta.iconBg} flex items-center justify-center shrink-0`}
                          >
                            <AgentIcon
                              className={`w-4 h-4 ${meta.iconColor}`}
                            />
                          </div>
                          <div>
                            <p className="text-[#0a1628] text-sm font-semibold">
                              {meta.labelTH}
                            </p>
                            <p className="text-slate-400 text-[11px]">
                              {meta.label}
                            </p>
                          </div>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4">
                          <ResultCard
                            message={finalEvent.message}
                            meta={meta}
                          />
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      )}

      {/* ── Agent Reasoning (collapsible) ── */}
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
        <button
          onClick={() => setAgentExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
              Agent Reasoning Trace
            </p>
          </div>
          {agentExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>
        {agentExpanded && (
          <div className="px-4 py-3">
            <pre className="text-[11px] text-slate-500 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap break-words leading-relaxed max-h-96 overflow-y-auto">
              {JSON.stringify(report, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* ── Clinical Validation Disclaimer ── */}
      <div className="border border-amber-200 bg-amber-50 rounded-xl px-4 py-3 space-y-2">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-800 text-xs font-semibold">
              Clinical Decision Support Only — Requires Pathologist Sign-off
            </p>
            <p className="text-amber-700 text-[11px] mt-0.5 leading-relaxed">
              PICHA generates AI-assisted analysis reports. All findings must be
              reviewed and confirmed by a licensed pathologist before clinical
              use. This tool does not replace professional medical judgment.
            </p>
          </div>
        </div>
        <div className="border-t border-amber-200 pt-2 grid grid-cols-2 gap-x-4 gap-y-1">
          <div>
            <p className="text-amber-600 text-[10px] uppercase tracking-wider font-semibold">
              Tissue Pre-screen Model
            </p>
            <p className="text-amber-700 text-[11px]">
              ConvNeXt-Base · 76.33% accuracy
            </p>
            <p className="text-amber-600 text-[10px]">
              Colorectal tissue typing · CRC-NCT-HE-555K · Not CCA-validated
            </p>
          </div>
          <div>
            <p className="text-amber-600 text-[10px] uppercase tracking-wider font-semibold">
              CCA Diagnosis Pipeline
            </p>
            <p className="text-amber-700 text-[11px]">
              MARS 7-Agent AI (Groq LLM)
            </p>
            <p className="text-amber-600 text-[10px]">
              Research use only · Not clinically validated for CCA
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
