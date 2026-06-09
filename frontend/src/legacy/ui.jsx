import * as LucideIcons from "lucide-react";
// ============================================================
// Shared UI primitives — Clinical light theme (v2 — UX hardened)
// ============================================================
import React, {  useState, useEffect, useRef, useMemo, useCallback, useContext, createContext  } from "react";

// ---- Lucide icon ----
function _pascal(name) {
  return name.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
}
function Icon({ name, size = 16, className = "", strokeWidth = 1.75, style }) {
        const key = _pascal(name);
        const LucideIcon = LucideIcons[key];
        if (!LucideIcon) return <span className={className} style={{...style, width: size, height: size, display: 'inline-block'}} />;
        return <LucideIcon size={size} className={className} strokeWidth={strokeWidth} style={style} />;
      }

// ---- Modules ----
const MODULES = {
  hub: { key: "hub", short: "APEX", name: "Worklist", long: "Active cases", accent: "#3955d8", accent2: "#2a3fa8", soft: "#e7ebfb", text: "#2a3fa8", icon: "layout-grid", tag: "Administrative" },
  axia: { key: "axia", short: "AXIA", name: "AXIA · Brain CT", long: "Emergency Neuroradiology", accent: "#b81f25", accent2: "#8b1a1f", soft: "#fde8e9", text: "#8b1a1f", icon: "brain", tag: "Critical Triage" },
  smartliva: { key: "smartliva", short: "SmartLiva", name: "SmartLiva · Liver US", long: "Hepatic Ultrasound", accent: "#0d8a82", accent2: "#0a6b65", soft: "#daf1ee", text: "#0a6b65", icon: "activity", tag: "Diagnostic" },
  picha: { key: "picha", short: "PICHA", name: "PICHA AI · Pathology", long: "Digital Pathology", accent: "#6b3aa8", accent2: "#522b85", soft: "#ede4f7", text: "#522b85", icon: "microscope", tag: "Oncology" },
};

function applyAccent(mod) {
  const root = document.documentElement;
  root.style.setProperty("--accent", mod.accent);
  root.style.setProperty("--accent-2", mod.accent2);
  root.style.setProperty("--accent-soft", mod.soft);
  root.style.setProperty("--accent-text", mod.text);
  root.style.setProperty("--focus-ring", `0 0 0 3px ${mod.accent}44`);
}

// ---- Tooltip wrapper ----
function Tip({ text, children, className = "" }) {
  return (
    <span tabIndex={0} className={`has-tip ${className}`}>
      {children}
      <span className="tip" role="tooltip">{text}</span>
    </span>
  );
}
// Inline "?" pill that explains jargon
function InfoTip({ text, className = "" }) {
  return (
    <Tip text={text} className={`align-middle inline-flex ${className}`}>
      <span className="w-3.5 h-3.5 rounded-full bg-slate-200 text-slate-600 text-[9px] font-bold grid place-items-center cursor-help select-none">?</span>
    </Tip>
  );
}

// ---- Badge ----
function Badge({ children, tone = "neutral", className = "", style, title }) {
  const tones = {
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
    accent: "border-[color:var(--accent)]/35 text-[color:var(--accent-text)] bg-[color:var(--accent-soft)]",
    danger: "bg-[#fde8e9] text-[#8b1a1f] border-[#f4c5c8]",
    warn: "bg-[#fdf1de] text-[#7a3a08] border-[#f3d9b1]",
    ok: "bg-[#def4e8] text-[#055735] border-[#c1e6d2]",
    info: "bg-[#e0eaf6] text-[#154f8a] border-[#bfd2ec]",
  };
  return (
    <span
      style={style}
      title={title}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11.5px] font-semibold border whitespace-nowrap ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

function SectionLabel({ children, right }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="label-eyebrow">{children}</div>
      {right}
    </div>
  );
}

// ---- Stat ----
function Stat({ label, value, unit, sub, tone = "primary", size = "md", tip }) {
  const colors = {
    primary: "text-slate-900",
    danger: "text-[#8b1a1f]",
    warn: "text-[#7a3a08]",
    ok: "text-[#055735]",
    accent: "accent-text",
  };
  const sizes = { sm: "text-xl", md: "text-2xl", lg: "text-3xl" };
  return (
    <div>
      <div className="label-eyebrow flex items-center gap-1">{label}{tip && <InfoTip text={tip} />}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <div className={`${sizes[size]} font-semibold tabular-nums ${colors[tone]}`}>{value}</div>
        {unit && <div className="text-[12px] t-muted">{unit}</div>}
      </div>
      {sub && <div className="mt-1 text-[12px] t-muted">{sub}</div>}
    </div>
  );
}

// ---- ProgressBar ----
function ProgressBar({ value, max = 100, tone = "accent" }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const color =
    tone === "danger" ? "#b81f25" :
    tone === "warn" ? "#92480a" :
    tone === "ok" ? "#066c44" :
    "var(--accent)";
  return (
    <div className="relative h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
      <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out" style={{ width: pct + "%", background: color }} />
    </div>
  );
}

// ---- RadialGauge ----
function RadialGauge({ value, max = 100, label, unit, size = 120, stroke = 8, color }) {
  const pct = Math.max(0, Math.min(1, value / max));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * pct;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e2e8f0" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color || "var(--accent)"} strokeWidth={stroke} fill="none"
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 700ms ease, stroke 300ms ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[20px] font-semibold tabular-nums t-primary">
          {value}
          <span className="text-[12px] t-muted ml-0.5">{unit}</span>
        </div>
        {label && <div className="label-eyebrow mt-0.5">{label}</div>}
      </div>
    </div>
  );
}

// ---- Sparkline ----
function Sparkline({ data, color = "var(--accent)", height = 36, fill = true }) {
  const w = 200, h = height;
  const max = Math.max(...data), min = Math.min(...data);
  const range = Math.max(0.001, max - min);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return [x, y];
  });
  const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const area = d + ` L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      {fill && <path d={area} fill={color} opacity="0.12" />}
      <path d={d} stroke={color} strokeWidth="1.5" fill="none" />
    </svg>
  );
}

// ---- Btn (with tooltip-able kbd hint) ----
function Btn({ children, onClick, variant = "primary", icon, size = "md", disabled, className = "", type = "button", kbd, title }) {
  const sizes = {
    sm: "h-9 px-3 text-[12.5px]",         // 36px — iPad touch min
    md: "h-10 px-3.5 text-[13px]",        // 40px
    lg: "h-11 px-5 text-[14px]",          // 44px touch ideal
  };
  const variants = {
    primary: "bg-[color:var(--accent)] text-white hover:brightness-105 border border-transparent",
    secondary: "bg-white hover:bg-slate-50 text-slate-800 border border-[color:var(--line-strong)]",
    ghost: "hover:bg-slate-100 text-slate-700 border border-transparent",
    outline: "border border-[color:var(--accent)]/40 text-[color:var(--accent-text)] hover:bg-[color:var(--accent-soft)] bg-white",
    danger: "bg-[#b81f25] text-white hover:bg-[#9a191e] border border-transparent",
  };
  const btn = (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`accent-transition inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap ${sizes[size]} ${variants[variant]} disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 14 : 15} />}
      {children}
      {kbd && <Kbd>{kbd}</Kbd>}
    </button>
  );
  return btn;
}

// ---- Keyboard hint chip ----
function Kbd({ children, className = "" }) {
  return (
    <kbd className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded border border-slate-300 bg-slate-50 text-slate-600 font-mono text-[10px] leading-none ${className}`}>{children}</kbd>
  );
}

// ---- Card ----
function Card({ children, className = "", title, eyebrow, right, padded = true, accent = false, titleTip }) {
  return (
    <div className={`card card-elev ${className}`}>
      {(title || eyebrow || right) && (
        <div className="flex items-center justify-between px-4 py-3 border-b hairline gap-3">
          <div className="min-w-0 flex-1">
            {eyebrow && <div className="label-eyebrow mb-0.5 flex items-center gap-1">{eyebrow}{titleTip && <InfoTip text={titleTip} />}</div>}
            {title && <div className="text-[14px] font-semibold t-primary tracking-[-0.005em] leading-tight whitespace-nowrap truncate">{title}</div>}
          </div>
          {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
        </div>
      )}
      <div className={padded ? "p-4" : ""}>{children}</div>
    </div>
  );
}

function StatusDot({ tone = "ok" }) {
  const t = { ok: "#066c44", warn: "#92480a", danger: "#b81f25", info: "#154f8a", neutral: "#94a3b8" }[tone];
  return (
    <span className="relative inline-flex w-2 h-2 shrink-0">
      <span className="absolute inset-0 rounded-full" style={{ background: t }} />
      <span className="absolute inset-0 rounded-full pulse-soft" style={{ background: t, opacity: 0.4 }} />
    </span>
  );
}

function KV({ k, v, mono = false }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100 last:border-0 text-[13px]">
      <div className="t-muted">{k}</div>
      <div className={`${mono ? "font-mono" : ""} t-primary font-medium tabular-nums text-right`}>{v}</div>
    </div>
  );
}

// ---- Page Header ----
function PageHeader({ eyebrow, title, subtitle, right, back }) {
  return (
    <div className="pb-3 border-b hairline mb-4 space-y-1">
      {back && <div className="flex items-center gap-2 -mb-1">{back}</div>}
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-3 xl:gap-6">
        <div className="min-w-0 flex-1">
          <div className="label-eyebrow">{eyebrow}</div>
          <h1 className="mt-1 text-[20px] sm:text-[22px] font-semibold tracking-[-0.01em] t-primary leading-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 text-[13px] t-secondary max-w-3xl leading-relaxed">{subtitle}</p>}
        </div>
        {right && <div className="flex items-center gap-2 flex-wrap xl:flex-nowrap xl:shrink-0">{right}</div>}
      </div>
    </div>
  );
}

// ---- Patient Strip (with photo + clinical flags) ----
const FLAG_DEFS = {
  allergy: { tone: "danger", icon: "alert-triangle", label: "ALLERGY" },
  dnr: { tone: "danger", icon: "ban", label: "DNR" },
  isolation: { tone: "warn", icon: "shield-alert", label: "ISOLATION" },
  fall: { tone: "warn", icon: "person-standing", label: "FALL RISK" },
  npo: { tone: "info", icon: "utensils-crossed", label: "NPO" },
  pregnancy: { tone: "info", icon: "baby", label: "PREGNANT" },
};
function PatientStrip({ patient, items, right }) {
  return (
    <div className="card card-elev overflow-hidden">
      <div className="flex items-stretch divide-x divide-slate-200">
        {/* Photo + ID */}
        {patient && (
          <div className="flex items-center gap-3 px-4 py-2.5 shrink-0 min-w-0">
            <PatientPhoto patient={patient} />
            <div className="min-w-0">
              <div className="text-[14px] font-semibold t-primary leading-tight whitespace-nowrap">{patient.name}</div>
              <div className="text-[11.5px] t-muted leading-tight whitespace-nowrap">
                {patient.sex}{patient.age && " · " + patient.age + " y"}
                {patient.mrn && <span> · MRN {patient.mrn}</span>}
              </div>
              {patient.flags?.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 mt-1">
                  {patient.flags.map((f) => {
                    const d = FLAG_DEFS[f.k] || { tone: "neutral", icon: "circle-alert", label: f.k.toUpperCase() };
                    return (
                      <Tip key={f.k} text={f.note || d.label}>
                        <Badge tone={d.tone} className="!px-1.5 !py-0">
                          <Icon name={d.icon} size={10} />{d.label}
                        </Badge>
                      </Tip>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
        {/* Other items — scroll horizontally */}
        <div className="flex-1 min-w-0 overflow-x-auto">
          <div className="flex items-stretch divide-x divide-slate-200 min-w-max">
            {items.map((it, i) => (
              <div key={i} className="px-4 py-2.5 min-w-[140px]">
                <div className="label-eyebrow mb-0.5">{it.k}</div>
                <div className="t-primary font-medium whitespace-nowrap text-[13px]">{it.v}</div>
              </div>
            ))}
          </div>
        </div>
        {right && <div className="flex items-center px-3 shrink-0 border-l divide-slate-200">{right}</div>}
      </div>
    </div>
  );
}

function PatientPhoto({ patient }) {
  const initials = (patient.name || "").split(/[\s,]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  // Deterministic color per MRN
  const hue = (patient.mrn || patient.name || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className="w-11 h-11 rounded-full grid place-items-center text-[14px] font-semibold shrink-0 border-2 border-white shadow-sm"
      style={{ background: `hsl(${hue}, 28%, 88%)`, color: `hsl(${hue}, 35%, 28%)` }}
      title={patient.name}
    >
      {initials || "?"}
    </div>
  );
}

// ---- AI Override (Disagree) ----
function AIOverride({ finding, value, onOverride, compact = false }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const submit = () => {
    onOverride?.({ finding, reason, at: new Date().toISOString() });
    setOpen(false);
    setReason("");
  };
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 text-[11px] font-medium rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 ${compact ? "px-1.5 h-6" : "px-2 h-7"}`}
        title="Disagree with this AI finding"
      >
        <Icon name="thumbs-down" size={11} />Disagree
      </button>
      {open && (
        <Modal onClose={() => setOpen(false)} title={`Disagree · ${finding}`} subtitle={`Current AI: ${value}`}>
          <label className="block">
            <div className="label-eyebrow mb-1">Reason (audit log)</div>
            <textarea
              autoFocus
              className="input w-full min-h-[96px] resize-y"
              placeholder="e.g. Clinically discordant — patient on anticoagulation, recheck CTA"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {["Image quality", "Clinically discordant", "Known artifact", "Different threshold"].map((r) => (
              <button key={r} onClick={() => setReason(r)} className="text-[12px] px-2.5 h-9 rounded-md border border-slate-200 hover:bg-slate-50 text-left t-secondary">{r}</button>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <Btn variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Btn>
            <Btn variant="danger" size="sm" icon="check" onClick={submit} disabled={!reason.trim()}>Submit override</Btn>
          </div>
          <div className="mt-3 text-[11px] t-muted">Logged to audit trail under your credentials. Used for model retraining.</div>
        </Modal>
      )}
    </>
  );
}

// ---- Modal ----
function Modal({ children, onClose, title, subtitle, width = 440 }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(10,19,34,0.45)" }} onClick={onClose}>
      <div className="card card-elev w-full" style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b hairline flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[14px] font-semibold t-primary">{title}</div>
            {subtitle && <div className="text-[12px] t-muted mt-0.5">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-md grid place-items-center hover:bg-slate-100 t-secondary" title="Close (Esc)">
            <Icon name="x" size={14} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

// ---- MFA Digit Input ----
function MfaInput({ value, onChange, length = 6 }) {
  const inputs = useRef([]);
  const digits = value.padEnd(length, " ").slice(0, length).split("");

  const setDigit = (i, ch) => {
    if (!/^\d?$/.test(ch)) return;
    const next = (value + "      ").slice(0, length).split("");
    next[i] = ch;
    const joined = next.join("").trimEnd().slice(0, length);
    onChange(joined);
    if (ch && i < length - 1) inputs.current[i + 1]?.focus();
  };

  const onKey = (i, e) => {
    if (e.key === "Backspace" && !digits[i].trim() && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === "ArrowLeft" && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < length - 1) inputs.current[i + 1]?.focus();
  };

  const onPaste = (e) => {
    const t = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, length);
    if (t) {
      e.preventDefault();
      onChange(t);
      inputs.current[Math.min(t.length, length - 1)]?.focus();
    }
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-2" onPaste={onPaste}>
      {Array.from({ length }, (_, i) => (
        <React.Fragment key={i}>
          <input
            ref={(el) => (inputs.current[i] = el)}
            inputMode="numeric"
            maxLength={1}
            className="input w-10 sm:w-11 h-12 text-center text-[20px] font-mono font-semibold tabular-nums"
            value={digits[i].trim()}
            onChange={(e) => setDigit(i, e.target.value.slice(-1))}
            onKeyDown={(e) => onKey(i, e)}
            aria-label={`Digit ${i + 1}`}
          />
          {i === length / 2 - 1 && <span className="t-muted">·</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

// ---- Toast context ----
const ToastCtx = createContext({ push: () => {} });
function useToasts() { return useContext(ToastCtx); }

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((t) => {
    const id = Math.random().toString(36).slice(2);
    const toast = { id, ttl: 4500, tone: "info", ...t };
    setToasts((cur) => [...cur, toast]);
    if (toast.ttl) setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== id)), toast.ttl);
    return id;
  }, []);
  const dismiss = (id) => setToasts((cur) => cur.filter((x) => x.id !== id));
  return (
    <ToastCtx.Provider value={{ push, dismiss }}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className="toast" data-tone={t.tone}>
            <div className="flex items-start gap-2.5">
              <Icon name={t.icon || ({ ok: "check-circle", danger: "alert-triangle", warn: "alert-circle", info: "info" }[t.tone])} size={16} className={`mt-0.5 shrink-0 ${({ ok: "text-emerald-700", danger: "text-rose-700", warn: "text-amber-700", info: "text-sky-700" }[t.tone])}`} />
              <div className="flex-1 min-w-0">
                {t.title && <div className="text-[13px] font-semibold t-primary leading-tight">{t.title}</div>}
                {t.body && <div className="text-[12px] t-secondary leading-snug mt-0.5">{t.body}</div>}
                {t.action && (
                  <button onClick={() => { t.action.onClick?.(); dismiss(t.id); }} className="mt-1.5 text-[12px] font-semibold accent-text hover:underline">{t.action.label} →</button>
                )}
              </div>
              <button onClick={() => dismiss(t.id)} className="w-6 h-6 rounded-md hover:bg-slate-100 grid place-items-center t-muted shrink-0" aria-label="Dismiss"><Icon name="x" size={12} /></button>
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ---- Time helper ----
function fmtTime(d = new Date(), withSec = false) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: withSec ? "2-digit" : undefined, hour12: false });
}

export { 
  Icon, MODULES, Badge, SectionLabel, Stat, ProgressBar, RadialGauge, Sparkline,
  Btn, Kbd, Card, StatusDot, KV, PageHeader, PatientStrip, PatientPhoto,
  applyAccent, Tip, InfoTip, AIOverride, Modal, MfaInput, ToastProvider, useToasts,
  fmtTime, FLAG_DEFS,
 };
