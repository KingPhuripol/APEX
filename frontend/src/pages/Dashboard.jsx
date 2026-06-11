import React from "react";
import { useNavigate } from "react-router-dom";
import { useServiceHealth } from "../lib/useServiceHealth";
import {
  Brain,
  Activity,
  Microscope,
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Database,
  Zap,
  Workflow,
} from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { health, allOnline, refresh } = useServiceHealth();

  const modules = [
    {
      id: "axia",
      name: "AXIA",
      subtitle: "Neuro CT Triage",
      description:
        "Fast hemorrhage and ischemic triage with explainable visual overlays for emergency workflows.",
      metaLeft: "Latency ~1.2s",
      metaRight: "Sensitivity 98%",
      accent: "from-blue-500/30 to-cyan-500/5",
      badge: "text-blue-300 border-blue-500/40 bg-blue-500/10",
      iconWrap: "bg-blue-500/15 border-blue-500/40",
      iconColor: "text-blue-300",
      route: "/patient/REF-AXIA-001/axia",
      icon: Brain,
      span: "xl:col-span-5",
    },
    {
      id: "smartliva",
      name: "SmartLiva",
      subtitle: "Liver Ultrasound XAI",
      description:
        "Fibrosis staging, lesion suspicion support, and structured clinical insight for hepatology teams.",
      metaLeft: "EfficientNet-B3 XAI",
      metaRight: "7-Class Lesion",
      accent: "from-emerald-500/30 to-teal-500/5",
      badge: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10",
      iconWrap: "bg-emerald-500/15 border-emerald-500/40",
      iconColor: "text-emerald-300",
      route: "/patient/REF-LIVA-001/smartliva",
      icon: Activity,
      span: "xl:col-span-4",
    },
    {
      id: "picha",
      name: "PICHA",
      subtitle: "Digital Pathology MARS",
      description:
        "Whole-slide reasoning pipeline with explainability trace for pathology diagnosis and staging.",
      metaLeft: "Multi-Agent",
      metaRight: "Whole Slide",
      accent: "from-violet-500/30 to-fuchsia-500/5",
      badge: "text-violet-300 border-violet-500/40 bg-violet-500/10",
      iconWrap: "bg-violet-500/15 border-violet-500/40",
      iconColor: "text-violet-300",
      route: "/patient/REF-PICHA-001/picha",
      icon: Microscope,
      span: "xl:col-span-3",
    },
  ];

  const statusTone = (status) => {
    if (status === "ok") return "bg-emerald-400";
    if (status === "loading") return "bg-amber-400";
    return "bg-red-400";
  };

  const statusLabel = (status) => {
    if (status === "ok") return "Online";
    if (status === "loading") return "Checking";
    return "Offline";
  };

  return (
    <div className="min-h-full bg-[#040507] text-white relative overflow-x-hidden">
      <div className="absolute inset-0 viewer-grid opacity-[0.22] pointer-events-none" />
      <div className="absolute -top-32 -left-24 w-[36rem] h-[36rem] bg-blue-600/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-28 right-[-8%] w-[42rem] h-[32rem] bg-violet-600/15 blur-[120px] rounded-full pointer-events-none" />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
        <section className="grid lg:grid-cols-[1.25fr_0.95fr] gap-6 lg:gap-8 items-stretch">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#101733]/90 via-[#0d1020]/85 to-[#0a0c16]/90 p-6 sm:p-8 lg:p-10 shadow-[0_24px_80px_-32px_rgba(30,64,175,0.45)]">
            <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-cyan-300/80 font-semibold">
              <Workflow className="w-4 h-4" /> Integrated Intelligence Fabric
            </span>
            <h2 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-black leading-[0.95] tracking-tight">
              Clinical AI
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-cyan-200 to-violet-300">
                That Moves Fast
              </span>
            </h2>
            <p className="mt-5 text-base sm:text-lg text-slate-300/90 max-w-2xl">
              Single entry-point for radiology, hepatology, and digital
              pathology. Start in seconds, review explainable outputs, and push
              forward to PACS worklists without context switching.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/worklist")}
                className="group inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-semibold transition-colors"
              >
                Enter PACS Worklist
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={() => navigate("/patient/REF-PICHA-001/picha")}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-slate-100 font-semibold transition-colors"
              >
                Run Full Pathology MARS
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                  Response SLA
                </p>
                <p className="mt-1 text-lg font-bold text-white">
                  sub-2 sec triage
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                  Explainability
                </p>
                <p className="mt-1 text-lg font-bold text-white">
                  SHAP / CAM / Trace
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                  Platform State
                </p>
                <p
                  className={`mt-1 text-lg font-bold ${allOnline ? "text-emerald-300" : "text-amber-300"}`}
                >
                  {allOnline ? "All Services Ready" : "Partial Availability"}
                </p>
              </div>
            </div>
          </div>

          <aside className="rounded-3xl border border-white/10 bg-black/45 backdrop-blur-md p-6 sm:p-7">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-bold">
              Operations Pulse
            </p>
            <div className="mt-4 space-y-3">
              {Object.entries(health).map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {key.toUpperCase()}
                    </p>
                    <p className="text-xs text-slate-400">
                      Model readiness + API heartbeat
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-200">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${statusTone(value.status)}`}
                    />
                    {statusLabel(value.status)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3">
              <p className="text-xs text-cyan-200 font-semibold">
                Live Care Path
              </p>
              <p className="mt-1 text-sm text-cyan-100/90">
                Triage in AXIA -&gt; Follow-up in SmartLiva -&gt; Confirm
                pathology in PICHA.
              </p>
            </div>
          </aside>
        </section>

        <section className="mt-8 sm:mt-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 sm:gap-5">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <article
                key={module.id}
                onClick={() => navigate(module.route)}
                className={`group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-[#090c14]/80 p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_18px_48px_-24px_rgba(59,130,246,0.5)] ${module.span}`}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${module.accent} opacity-70 group-hover:opacity-100 transition-opacity`}
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.12),transparent_42%)]" />

                <div className="relative z-10 flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl border flex items-center justify-center ${module.iconWrap}`}
                    >
                      <Icon className={`w-6 h-6 ${module.iconColor}`} />
                    </div>
                    <span
                      className={`text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full border ${module.badge}`}
                    >
                      {module.subtitle}
                    </span>
                  </div>

                  <h3 className="mt-4 text-2xl font-bold tracking-tight text-white">
                    {module.name}
                  </h3>
                  <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                    {module.description}
                  </p>

                  <div className="mt-auto pt-5 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span>{module.metaLeft}</span>
                    <span>{module.metaRight}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <footer className="mt-8 sm:mt-10 pb-3 flex flex-wrap items-center gap-4 sm:gap-6 text-xs font-mono text-slate-400/85">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> HIPAA Compliant
          </span>
          <span className="inline-flex items-center gap-2">
            <Database className="w-4 h-4" /> Zero-Footprint Storage
          </span>
          <span className="inline-flex items-center gap-2">
            <Zap className="w-4 h-4" /> Edge & Cloud Ready
          </span>
        </footer>
      </main>
    </div>
  );
}
