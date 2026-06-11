/**
 * PICHAClinicalReport — Full clinical pathology report
 * Ported from Picha standalone ClinicalReport.tsx (827 LOC) → JSX
 * Integrated into APEX Dashboard dark theme.
 */
import { useState } from 'react';
import {
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle,
  Shield, FileText, Clock, Microscope, Bug, BarChart3,
  Map, Hospital, Timer, ScanSearch, Info
} from 'lucide-react';
import SurvivalChart from './SurvivalChart';

// ── Agent metadata (from standalone AgentTimeline) ────────────────────────
const AGENT_META = {
  MLPrescreen: { icon: Microscope, label: 'ML Pre-screen', labelTH: 'Tissue Composition Pre-screen', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', note: 'Model trained on CRC-NCT-HE-555K (colorectal), not a CCA-specific dataset · accuracy 76.33%' },
  SlideQCAgent: { icon: ScanSearch, label: 'Slide QC', labelTH: 'Slide Quality Control', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', note: 'If QC fails, recommend re-staining or re-scanning the slide.' },
  ParasitologistAgent: { icon: Bug, label: 'Parasitologist', labelTH: 'OV Parasitology Assessment', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', note: 'OV-associated CCA is commonly found at the peri-hilar location.' },
  GradingAgent: { icon: BarChart3, label: 'WHO Grading', labelTH: 'WHO Histological Grading', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', note: 'Grade G3 is associated with significantly worse overall survival.' },
  SpatialAgent: { icon: Map, label: 'Spatial Analysis', labelTH: 'Spatial Microenvironment Analysis', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', note: 'LVI and PNI are independent adverse prognostic factors.' },
  OncologistAgent: { icon: Hospital, label: 'Oncologist', labelTH: 'AJCC Staging & Treatment Planning', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', note: 'Results should be discussed at a multidisciplinary tumor board (MDT).' },
  TimeMachineAgent: { icon: Timer, label: 'Time Machine', labelTH: 'Survival Prognosis Modelling', color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/30', note: 'Survival estimates are population-level statistics, not individual-level predictions.' },
  ReportAgent: { icon: FileText, label: 'Report Compiler', labelTH: 'CAP Protocol Report Compilation', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', note: 'Must be reviewed and signed by a licensed pathologist before clinical use.' },
};

const PIPELINE_ORDER = [
  'MLPrescreen', 'SlideQCAgent', 'ParasitologistAgent', 'GradingAgent',
  'SpatialAgent', 'OncologistAgent', 'TimeMachineAgent', 'ReportAgent',
];

// ── Helpers ──────────────────────────────────────────────────────────────
function safeStr(v, fallback = '—') {
  if (v === null || v === undefined) return fallback;
  return String(v);
}
function safeNum(v) {
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function Section({ title, children }) {
  return (
    <div className="rounded-xl border border-[var(--line)] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[var(--line)] bg-[var(--surface-3)]">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">{title}</p>
      </div>
      <div className="px-4 py-3 bg-[var(--surface-2)]">{children}</div>
    </div>
  );
}

function Row({ label, value, accent }) {
  return (
    <div className="flex justify-between items-start py-1 border-b border-[var(--line)] last:border-0">
      <span className="text-xs text-[var(--muted)]">{label}</span>
      <span className={`text-xs font-medium text-right max-w-[60%] ${accent || 'text-[var(--text)]'}`}>{value}</span>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────
export default function PICHAClinicalReport({ report = {}, events = [] }) {
  const [pipelineExpanded, setPipelineExpanded] = useState(false);
  const [openAgents, setOpenAgents] = useState({});

  // Parse report fields (defensive — LLM output varies)
  const diagnosis = safeStr(report.diagnosis ?? report.primary_diagnosis);
  const confidence = safeNum(report.overall_confidence);
  const grade = safeStr(report.who_grade ?? report.grade);
  const isOv = Boolean(report.ov_associated);
  const xaiSummary = safeStr(report.xai_summary, '');

  // Staging
  const stg = report.staging || {};
  const tStage = safeStr(stg.T);
  const nStage = safeStr(stg.N);
  const mStage = safeStr(stg.M);
  const stage = safeStr(stg.overall_stage);
  const resectability = safeStr(stg.resectability);
  const recommendation = safeStr(stg.treatment_recommendation);

  // Survival
  const sv = report.survival || {};
  const survivalData = [
    ...(sv['30d'] != null ? [{ label: '30d', probability: sv['30d'] }] : []),
    ...(sv['90d'] != null ? [{ label: '90d', probability: sv['90d'] }] : []),
    ...(sv['180d'] != null ? [{ label: '180d', probability: sv['180d'] }] : []),
    ...(sv['365d'] != null ? [{ label: '365d', probability: sv['365d'] }] : []),
  ];

  // QC
  const qc = report.slide_qc || {};
  const qcQuality = safeStr(qc.overall_quality);
  const qcProceed = qc.proceed !== false;

  // Spatial
  const sp = report.spatial || {};

  // Get final event per agent
  const lastByAgent = {};
  for (const e of events) {
    if (e.type === 'conclusion' || e.type === 'ml_prescreen' || e.is_final) {
      lastByAgent[e.agent] = e;
    }
  }

  return (
    <div className="space-y-3 animate-fade-in">
      {/* ── PDPA Notice ── */}
      <div className="border border-[var(--line)] bg-[var(--surface-2)] rounded-xl px-4 py-3">
        <div className="flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-[var(--muted)] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
              Patient Rights &amp; Data Privacy Notice (PDPA)
            </p>
            <p className="text-[11px] text-[var(--text-2)] leading-relaxed">
              This report is generated by <strong className="text-[var(--text)]">PICHA MARS</strong>{' '}
              — an AI-assisted clinical decision support tool. Data is processed in compliance with applicable personal data protection regulations.
              All findings <strong className="text-[var(--text)]">must be reviewed and signed by a licensed specialist physician</strong> before clinical use.
            </p>
          </div>
        </div>
      </div>

      {/* ── Primary Diagnosis ── */}
      <div className="bg-gradient-to-r from-violet-500/10 to-transparent border border-violet-500/30 rounded-xl px-5 py-4">
        <p className="text-[10px] uppercase tracking-widest text-violet-400 mb-1.5">Primary Diagnosis</p>
        <p className="text-base font-bold text-[var(--text)] leading-snug mb-2">{diagnosis}</p>
        <div className="flex flex-wrap items-center gap-2">
          {grade !== '—' && (
            <span className="text-[10px] bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 px-2 py-0.5 rounded font-bold">
              {grade}
            </span>
          )}
          {isOv && (
            <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded font-bold">
              OV-associated
            </span>
          )}
          {confidence !== null && (
            <span className="text-[10px] bg-purple-500/20 border border-purple-500/30 text-purple-400 px-2 py-0.5 rounded font-bold">
              Confidence {Math.round(confidence * 100)}%
            </span>
          )}
          {stage !== '—' && (
            <span className="text-[10px] bg-red-500/20 border border-red-500/30 text-red-400 px-2 py-0.5 rounded font-bold">
              {stage}
            </span>
          )}
        </div>
      </div>

      {/* ── Staging + Survival ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Section title="pTNM Staging (AJCC 8th Ed.)">
          <Row label="T stage" value={tStage} />
          <Row label="N stage" value={nStage} />
          <Row label="M stage" value={mStage} />
          <Row label="Overall stage" value={stage} accent="text-red-400 font-bold" />
          <Row label="Resectability" value={resectability} />
          <div className="mt-2 pt-2 border-t border-[var(--line)]">
            <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1">Treatment Recommendation</p>
            <p className="text-xs text-[var(--text-2)] leading-relaxed">{recommendation}</p>
          </div>
        </Section>

        <Section title="Survival Prognosis">
          <SurvivalChart data={survivalData} />
        </Section>
      </div>

      {/* ── QC + Spatial ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Section title="Slide Quality Control">
          <div className="flex items-center gap-2 mb-2">
            {qcProceed
              ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              : <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            }
            <span className={`text-sm font-bold ${qcProceed ? 'text-emerald-400' : 'text-red-400'}`}>
              {qcQuality}
            </span>
          </div>
          {Array.isArray(qc.issues) && qc.issues.length > 0 && (
            <div className="space-y-0.5">
              {qc.issues.map((issue, i) => (
                <p key={i} className="text-amber-400 text-xs">• {issue}</p>
              ))}
            </div>
          )}
        </Section>

        <Section title="Spatial / Microenvironment">
          <Row label="Growth pattern" value={safeStr(sp.growth_pattern)} />
          <Row label="TIL density" value={safeStr(sp.til_density)} />
          <Row label="Lymphovascular invasion" value={safeStr(sp.lymphovascular_invasion)}
               accent={sp.lymphovascular_invasion === 'Present' ? 'text-red-400 font-bold' : undefined} />
          <Row label="Perineural invasion" value={safeStr(sp.perineural_invasion)}
               accent={sp.perineural_invasion === 'Present' ? 'text-red-400 font-bold' : undefined} />
        </Section>
      </div>

      {/* ── XAI Summary ── */}
      {xaiSummary && (
        <Section title="XAI Audit Summary">
          <p className="text-xs text-[var(--text-2)] leading-relaxed">{xaiSummary}</p>
        </Section>
      )}

      {/* ── Agent Pipeline Results (collapsible) ── */}
      {Object.keys(lastByAgent).length > 0 && (
        <div className="rounded-xl border border-[var(--line)] overflow-hidden">
          <button
            onClick={() => setPipelineExpanded(v => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-[var(--surface-3)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-violet-400" />
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                MARS Pipeline Results
              </p>
              <span className="text-[10px] bg-violet-500/20 border border-violet-500/30 text-violet-400 px-1.5 py-0.5 rounded font-bold">
                {Object.keys(lastByAgent).length}/{PIPELINE_ORDER.length} agents
              </span>
            </div>
            {pipelineExpanded ? <ChevronUp className="w-4 h-4 text-[var(--muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--muted)]" />}
          </button>

          {pipelineExpanded && (
            <div className="divide-y divide-[var(--line)] bg-[var(--surface-2)]">
              {PIPELINE_ORDER.map(agentKey => {
                const meta = AGENT_META[agentKey];
                if (!meta) return null;
                const finalEvent = lastByAgent[agentKey];
                if (!finalEvent) return null;
                const Icon = meta.icon;
                const isOpen = openAgents[agentKey] ?? false;

                return (
                  <div key={agentKey}>
                    <button
                      onClick={() => setOpenAgents(prev => ({ ...prev, [agentKey]: !prev[agentKey] }))}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--surface-3)] transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full ${meta.bg} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-4 h-4 ${meta.color}`} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[var(--text)]">{meta.labelTH}</p>
                          <p className="text-[11px] text-[var(--muted)]">{meta.label}</p>
                        </div>
                      </div>
                      {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />}
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4">
                        <pre className="text-[11px] text-[var(--text-2)] bg-[var(--surface)] rounded-lg p-3 whitespace-pre-wrap break-words leading-relaxed max-h-64 overflow-y-auto border border-[var(--line)]">
                          {finalEvent.message}
                        </pre>
                        {meta.note && (
                          <div className="mt-2 flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                            <Info className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                            <p className="text-amber-400 text-[11px] leading-relaxed">{meta.note}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Clinical Disclaimer ── */}
      <div className="border border-amber-500/30 bg-amber-500/10 rounded-xl px-4 py-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 text-xs font-bold">
              Clinical Decision Support Only — Requires Pathologist Sign-off
            </p>
            <p className="text-amber-400/80 text-[11px] mt-0.5 leading-relaxed">
              PICHA generates AI-assisted analysis reports. All findings must be reviewed and confirmed by a licensed pathologist before clinical use.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
