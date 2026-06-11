import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { useServiceHealth } from "../lib/useServiceHealth";
import {
  Activity,
  ShieldCheck,
  Lock,
  User,
  Loader2,
  Server,
  Stethoscope,
  Brain,
  Database,
  AlertTriangle,
  CircleCheck,
  Microscope,
  Zap,
  CheckCircle,
} from "lucide-react";

const MODULES = [
  {
    icon: Brain,
    name: "AXIA",
    label: "Neuro AI",
    desc: "Brain CT — hemorrhage & stroke detection",
    gradient: "from-violet-500 to-purple-600",
    badge: "text-violet-300 bg-violet-500/10 border-violet-500/30",
    stat: "94.2% sensitivity",
  },
  {
    icon: Stethoscope,
    name: "SmartLiva",
    label: "Hepato AI",
    desc: "Liver ultrasound — fibrosis & lesion staging",
    gradient: "from-blue-500 to-cyan-500",
    badge: "text-blue-300 bg-blue-500/10 border-blue-500/30",
    stat: "F0 – F4 staging",
  },
  {
    icon: Microscope,
    name: "PICHA",
    label: "Patho AI",
    desc: "MARS 7-agent digital pathology pipeline",
    gradient: "from-emerald-500 to-teal-500",
    badge: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
    stat: "XAI explainable",
  },
];

export default function Login() {
  const [doctorId, setDoctorId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState("loading");
  const [authMessage, setAuthMessage] = useState("Checking Auth service...");

  const { login } = useAuth();
  const { health, refresh } = useServiceHealth();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/health");
        if (!active) return;

        if (res.ok) {
          setAuthStatus("ok");
          setAuthMessage("Auth service ready");
        } else {
          setAuthStatus("error");
          setAuthMessage("Auth service unhealthy");
        }
      } catch {
        if (!active) return;
        setAuthStatus("error");
        setAuthMessage("Auth service unreachable");
      }
    };

    checkAuth();
    refresh();
    const interval = setInterval(checkAuth, 15_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [refresh]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(doctorId, password);
    if (result.success) {
      navigate("/"); // Redirect to Worklist
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const statusClass = (status) => {
    if (status === "ok")
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    if (status === "loading")
      return "text-amber-300 bg-amber-500/10 border-amber-500/30";
    return "text-red-400 bg-red-500/10 border-red-500/30";
  };

  const statusLabel = (status) => {
    if (status === "ok") return "Ready";
    if (status === "loading") return "Checking";
    return "Offline";
  };

  return (
    <div className="min-h-dvh w-full flex flex-col lg:flex-row bg-[var(--bg)] text-[var(--text)] font-sans overflow-x-hidden">
      {/* Left Panel - Login Form (Enterprise Style) */}
      <div className="w-full lg:w-5/12 xl:w-4/12 flex flex-col relative z-10 border-r border-[var(--line-strong)] bg-[var(--surface)]">
        <div className="flex-1 flex flex-col justify-center px-5 sm:px-8 md:px-12 lg:px-10 xl:px-14 py-8 sm:py-10">
          <div className="mb-8 sm:mb-10 flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-[var(--surface-3)] border border-[var(--line-strong)] flex items-center justify-center shadow-inner">
              <Activity
                className="w-6 h-6 text-[var(--info)]"
                strokeWidth={2.5}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--text)] leading-none">
                APEX Platform
              </h1>
              <p className="text-xs text-[var(--muted)] mt-1 uppercase tracking-widest font-bold">
                Clinical AI Portal
              </p>
            </div>
          </div>

          <div className="mb-6 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base sm:text-lg font-semibold">
                Physician Login
              </h2>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusClass(authStatus)}`}
              >
                {authStatus === "ok" ? (
                  <CircleCheck className="w-3 h-3" />
                ) : (
                  <AlertTriangle className="w-3 h-3" />
                )}
                {statusLabel(authStatus)}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">{authMessage}</p>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-2">
            <div
              className={`rounded-md border px-2.5 py-2 text-[11px] ${statusClass(health.axia.status)}`}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                <Brain className="w-3.5 h-3.5" /> AXIA
              </div>
              <div className="opacity-80 mt-0.5">
                {statusLabel(health.axia.status)}
              </div>
            </div>
            <div
              className={`rounded-md border px-2.5 py-2 text-[11px] ${statusClass(health.smartliva.status)}`}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                <Stethoscope className="w-3.5 h-3.5" /> SmartLiva
              </div>
              <div className="opacity-80 mt-0.5">
                {statusLabel(health.smartliva.status)}
              </div>
            </div>
            <div
              className={`rounded-md border px-2.5 py-2 text-[11px] ${statusClass(health.picha.status)}`}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                <Database className="w-3.5 h-3.5" /> PICHA
              </div>
              <div className="opacity-80 mt-0.5">
                {statusLabel(health.picha.status)}
              </div>
            </div>
            <div
              className={`rounded-md border px-2.5 py-2 text-[11px] ${statusClass(authStatus)}`}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                <Server className="w-3.5 h-3.5" /> Auth
              </div>
              <div className="opacity-80 mt-0.5">{statusLabel(authStatus)}</div>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-3 rounded-md bg-[var(--danger-soft)] border border-[var(--danger)] text-[var(--danger)] text-sm flex items-center font-medium">
                <ShieldCheck className="w-4 h-4 mr-2" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
                Hospital ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-[var(--dim)]" />
                </div>
                <input
                  type="text"
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  placeholder="e.g. admin"
                  className="w-full pl-10 pr-3 py-2.5 bg-[var(--surface-2)] border border-[var(--line-strong)] rounded-md text-[var(--text)] text-sm focus:outline-none focus:border-[var(--info)] focus:ring-1 focus:ring-[var(--info)] transition-all shadow-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
                Passcode
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[var(--dim)]" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter secure passcode"
                  className="w-full pl-10 pr-3 py-2.5 bg-[var(--surface-2)] border border-[var(--line-strong)] rounded-md text-[var(--text)] text-sm focus:outline-none focus:border-[var(--info)] focus:ring-1 focus:ring-[var(--info)] transition-all shadow-sm"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !doctorId || !password}
              className="w-full py-2.5 px-4 mt-2 bg-[var(--info)] hover:bg-blue-600 disabled:opacity-50 text-white rounded-md text-sm font-bold tracking-wide transition-colors flex items-center justify-center shadow-md"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Secure Access"
              )}
            </button>
          </form>

          <div className="mt-8 text-xs text-[var(--dim)] flex items-start gap-2 bg-[var(--surface-2)] p-3 rounded-md border border-[var(--line)]">
            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              This system contains protected health information (PHI). Access is
              monitored and audited in compliance with HIPAA & PDPA regulations.
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-[var(--line)] flex justify-between items-center text-[10px] text-[var(--muted)] font-mono uppercase tracking-widest bg-[var(--surface-2)]">
          <span>© 2026 APEX AI</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> All
            Systems Nominal
          </span>
        </div>
      </div>

      {/* Right Panel - Feature Showcase */}
      <div className="w-full lg:w-7/12 xl:w-8/12 relative overflow-hidden min-h-[40vh] lg:min-h-0 bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#1e1b4b] flex flex-col">
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Ambient glows */}
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-violet-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[10%] w-[40%] h-[40%] bg-blue-600/15 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#020617] to-transparent pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-14 xl:px-20 py-8 lg:py-0">
          {/* Heading */}
          <div className="mb-6 sm:mb-8 lg:mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-white/60 font-mono text-[10px] sm:text-xs mb-4 sm:mb-5">
              <Zap className="w-3 h-3 text-violet-400" />
              Multi-Modal Medical Intelligence
            </div>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white leading-tight mb-3">
              Empowering{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-blue-400">
                Diagnostic
              </span>
              <br className="hidden sm:block" /> Precision
            </h3>
            <p className="text-white/50 text-xs sm:text-sm font-light max-w-md leading-relaxed">
              An integrated AI ecosystem for radiology, hepatology, and digital
              pathology — explainable, auditable, and HIPAA-compliant.
            </p>
          </div>

          {/* Module cards */}
          <div className="space-y-2 sm:space-y-3 max-w-lg w-full">
            {MODULES.map((m) => (
              <div
                key={m.name}
                className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/8 hover:border-white/20 transition-all duration-300"
              >
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br ${m.gradient} flex items-center justify-center shrink-0 shadow-lg`}
                >
                  <m.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-white font-bold text-xs sm:text-sm">
                      {m.name}
                    </span>
                    <span
                      className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded border ${m.badge}`}
                    >
                      {m.label}
                    </span>
                  </div>
                  <p className="text-white/50 text-[10px] sm:text-xs truncate">
                    {m.desc}
                  </p>
                </div>
                <div className="shrink-0 hidden sm:block">
                  <span
                    className={`text-[10px] font-mono font-bold ${m.badge.split(" ")[0]}`}
                  >
                    {m.stat}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div className="mt-6 sm:mt-8 lg:mt-10 flex flex-wrap items-center gap-5 sm:gap-8">
            {[
              { val: "3", label: "AI Modules" },
              { val: "7", label: "MARS Agents" },
              { val: "24/7", label: "Availability" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-white">
                  {s.val}
                </div>
                <div className="text-[10px] sm:text-[11px] text-white/40 uppercase tracking-wider mt-0.5">
                  {s.label}
                </div>
              </div>
            ))}
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-green-500/10 border border-green-500/30 rounded-full">
              <CheckCircle className="w-3 h-3 text-green-400" />
              <span className="text-green-400 text-[10px] sm:text-[11px] font-semibold">
                HIPAA Compliant
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
