/**
 * XAIExplanationPanel — Collapsible XAI reasoning display
 * Shows SHAP, Grad-CAM, LIME, CF-Δ, MC-Dropout explanations
 * streamed from MARS agents.
 */
import { useState } from 'react';
import {
  ChevronDown, ChevronUp, Brain, Eye, BarChart3,
  FlaskConical, Zap, Activity
} from 'lucide-react';

// Categorize XAI events by method
const XAI_CATEGORIES = {
  'Grad-CAM': { icon: Eye, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
  'SHAP': { icon: BarChart3, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  'LIME': { icon: FlaskConical, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  'CF-Δ': { icon: Zap, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/30' },
  'MC-Dropout': { icon: Activity, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30' },
  'Calibration': { icon: Brain, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
};

function detectCategory(message) {
  for (const [key] of Object.entries(XAI_CATEGORIES)) {
    if (message.includes(`[XAI] ${key}`) || message.includes(key)) return key;
  }
  return null;
}

function XAICard({ message, agentName }) {
  const [expanded, setExpanded] = useState(false);
  const category = detectCategory(message);
  const style = category ? XAI_CATEGORIES[category] : XAI_CATEGORIES['Grad-CAM'];
  const Icon = style.icon;

  // Extract first line as title, rest as body
  const lines = message.split('\n');
  const title = lines[0].replace(/^\[XAI\]\s*/, '').replace(/^.*?:\s*/, '');
  const body = lines.slice(1).join('\n').trim();

  return (
    <div className={`rounded-lg border ${style.border} ${style.bg} overflow-hidden transition-all`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-2 px-3 py-2 text-left hover:brightness-110 transition-all"
      >
        <Icon className={`w-3.5 h-3.5 ${style.color} shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {category && (
              <span className={`text-[9px] font-bold uppercase tracking-wider ${style.color}`}>
                {category}
              </span>
            )}
            <span className="text-[10px] text-[var(--muted)]">{agentName}</span>
          </div>
          <p className="text-xs text-[var(--text)] leading-snug mt-0.5 line-clamp-2">
            {title}
          </p>
        </div>
        {body && (
          expanded
            ? <ChevronUp className="w-3 h-3 text-[var(--muted)] shrink-0 mt-1" />
            : <ChevronDown className="w-3 h-3 text-[var(--muted)] shrink-0 mt-1" />
        )}
      </button>
      {expanded && body && (
        <div className="px-3 pb-3 pt-0">
          <pre className="text-[11px] text-[var(--text-2)] whitespace-pre-wrap leading-relaxed font-mono">
            {body}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function XAIExplanationPanel({ events = [] }) {
  const [panelOpen, setPanelOpen] = useState(true);

  // Filter only XAI-tagged events
  const xaiEvents = events.filter(e =>
    e.message && (e.message.includes('[XAI]') || e.type === 'ml_prescreen')
  );

  if (xaiEvents.length === 0) return null;

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] overflow-hidden">
      <button
        onClick={() => setPanelOpen(!panelOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--surface-3)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-[var(--text)] uppercase tracking-wider">
            Explainable AI (XAI) Reasoning
          </span>
          <span className="text-[10px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded font-bold">
            {xaiEvents.length} explanations
          </span>
        </div>
        {panelOpen
          ? <ChevronUp className="w-4 h-4 text-[var(--muted)]" />
          : <ChevronDown className="w-4 h-4 text-[var(--muted)]" />
        }
      </button>
      {panelOpen && (
        <div className="px-3 pb-3 space-y-1.5 max-h-[500px] overflow-y-auto">
          {xaiEvents.map((event, i) => (
            <XAICard key={i} message={event.message} agentName={event.agent} />
          ))}
        </div>
      )}
    </div>
  );
}
