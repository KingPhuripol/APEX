import React, { useState, useEffect, useRef, useMemo, useCallback, useContext } from 'react';
import { Icon, MODULES, Badge, SectionLabel, Stat, ProgressBar, RadialGauge, Sparkline, Btn, Kbd, Card, StatusDot, KV, PageHeader, PatientStrip, PatientPhoto, applyAccent, Tip, InfoTip, AIOverride, Modal, MfaInput, ToastProvider, useToasts, fmtTime, FLAG_DEFS } from './ui.jsx';
// ============================================================
// Login — Hospital portal sign-in
// ============================================================

function Login({ onLogin }) {
  const [username, setUsername] = useState("phuripol.t");
  const [password, setPassword] = useState("••••••••••••");
  const [mfa, setMfa] = useState("");
  const [step, setStep] = useState(1); // 1: credentials, 2: MFA
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);

  const submitCreds = (e) => {
    e?.preventDefault?.();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(2);
    }, 700);
  };
  const submitMfa = (e) => {
    e?.preventDefault?.();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin();
    }, 800);
  };

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg)" }}>
      {/* Left — brand panel */}
      <aside className="hidden lg:flex w-[44%] xl:w-[42%] min-h-screen flex-col justify-between p-8 xl:p-10 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #2a3fa8 0%, #1f2e7e 60%, #18215c 100%)" }}>
        {/* Subtle pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.07]" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#ffffff" />
            </pattern>
          </defs>
          <rect width="200" height="200" fill="url(#dots)" />
        </svg>

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-white grid place-items-center">
              <div className="w-5 h-5 rounded-sm bg-[#2a3fa8]" style={{ clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)" }} />
            </div>
            <div className="leading-tight">
              <div className="text-[18px] font-semibold tracking-[-0.01em]">APEX Clinical AI Suite</div>
              <div className="text-[12px] text-white/70">King Chulalongkorn Memorial Hospital · Thai Red Cross</div>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="text-[28px] font-semibold leading-snug tracking-[-0.015em] max-w-md">
            Unified diagnostic intelligence for emergency, hepatology and oncology.
          </div>
          <p className="mt-4 text-[14px] text-white/80 max-w-md leading-relaxed">
            AXIA brain CT triage, SmartLiva hepatic ultrasound and PICHA digital pathology — in one secure clinical workspace.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-4 max-w-md">
            <BrandStat k="Studies / mo" v="42.6k" />
            <BrandStat k="Sites" v="14" />
            <BrandStat k="Avg latency" v="1.4s" />
          </div>
        </div>

        <div className="relative flex items-center justify-between text-[11.5px] text-white/60">
          <div className="flex items-center gap-3">
            <span>HIPAA · PDPA</span>
            <span>·</span>
            <span>FDA cleared (510k K231104)</span>
            <span>·</span>
            <span>ISO 13485</span>
          </div>
          <div>v2.6.1</div>
        </div>
      </aside>

      {/* Right — login form */}
      <main className="flex-1 flex items-center justify-center px-5 sm:px-8 py-8 sm:py-10">
        <div className="w-full max-w-[400px]">
          {/* Mobile brand header */}
          <div className="lg:hidden flex items-center gap-2.5 mb-6 pb-5 border-b hairline">
            <div className="w-10 h-10 rounded-md grid place-items-center" style={{ background: "var(--accent)" }}>
              <div className="w-4 h-4 rounded-sm bg-white" style={{ clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)" }} />
            </div>
            <div className="leading-tight">
              <div className="text-[16px] font-semibold tracking-[-0.01em] t-primary">APEX Clinical AI Suite</div>
              <div className="text-[11.5px] t-muted">King Chulalongkorn Memorial Hospital</div>
            </div>
          </div>
          <div className="mb-7">
            <div className="label-eyebrow" style={{ color: "var(--accent-text)" }}>
              {step === 1 ? "Step 1 of 2 · Credentials" : "Step 2 of 2 · Verification"}
            </div>
            <h1 className="mt-1 text-[24px] font-semibold t-primary tracking-[-0.01em]">
              {step === 1 ? "Sign in to your account" : "Two-factor verification"}
            </h1>
            <p className="mt-1.5 text-[13px] t-secondary">
              {step === 1
                ? "Use your hospital SSO credentials. All sessions are audited."
                : "Enter the 6-digit code from your authenticator app."}
            </p>
          </div>

          {step === 1 ? (
            <form onSubmit={submitCreds} className="space-y-4">
              <Field label="Username" hint="HR / hospital ID">
                <input
                  className="input w-full"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </Field>
              <Field label="Password" hint={<a className="text-[12px] accent-text hover:underline" href="#">Forgot password?</a>}>
                <input
                  type="password"
                  className="input w-full font-mono tracking-widest"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </Field>

              <label className="flex items-center gap-2 text-[13px] t-secondary cursor-pointer select-none">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="rounded border-slate-300 text-[color:var(--accent)] focus:ring-[color:var(--accent)]" />
                Trust this workstation for 8 hours
                <InfoTip text="Skips MFA on this device for 8 hours. Use only on private hospital workstations — never on shared or personal devices." />
              </label>

              <Btn type="submit" size="lg" className="w-full" disabled={loading} icon={loading ? "loader" : "arrow-right"}>
                {loading ? "Verifying…" : "Continue"}
              </Btn>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t hairline" /></div>
                <div className="relative flex justify-center"><span className="bg-[color:var(--bg)] px-3 text-[12px] t-muted">or sign in with</span></div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Btn variant="secondary" icon="building-2" size="sm" className="w-full">SSO</Btn>
                <Btn variant="secondary" icon="id-card" size="sm" className="w-full">Smart Card</Btn>
                <Btn variant="secondary" icon="fingerprint" size="sm" className="w-full">Biometric</Btn>
              </div>
            </form>
          ) : (
            <form onSubmit={submitMfa} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12.5px] font-medium t-primary">Verification code</span>
                  <button type="button" className="text-[12px] accent-text hover:underline">Resend</button>
                </div>
                <MfaInput value={mfa} onChange={setMfa} length={6} />
              </div>
              <div className="text-[12.5px] t-secondary flex items-center gap-2 bg-slate-50 border hairline rounded-md px-3 py-2.5">
                <Icon name="info" size={14} className="text-slate-500 shrink-0" />
                <span>Code sent to authenticator paired with <span className="font-medium t-primary">+66 ••• ••• 419</span></span>
              </div>
              <Btn type="submit" size="lg" className="w-full" disabled={loading || mfa.length < 6} icon={loading ? "loader" : "log-in"}>
                {loading ? "Signing in…" : "Sign in"}
              </Btn>
              <Btn variant="ghost" size="md" className="w-full" onClick={() => setStep(1)} icon="arrow-left">Back</Btn>
            </form>
          )}

          <div className="mt-8 pt-5 border-t hairline">
            <div className="flex items-start gap-2.5">
              <span className="w-8 h-8 rounded-md bg-slate-100 grid place-items-center shrink-0 mt-0.5">
                <Icon name="life-buoy" size={15} className="text-slate-600" />
              </span>
              <div className="text-[12.5px] t-secondary leading-relaxed">
                <div className="font-medium t-primary">IT Service Desk</div>
                Ext. 2424 · 24/7 · <a className="accent-text hover:underline" href="#">helpdesk@kcmh.go.th</a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12.5px] font-medium t-primary">{label}</span>
        {hint && <span className="text-[12px] t-muted">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

function BrandStat({ k, v }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.14em] text-white/60 font-semibold">{k}</div>
      <div className="text-[20px] font-semibold mt-0.5">{v}</div>
    </div>
  );
}



export default Login;