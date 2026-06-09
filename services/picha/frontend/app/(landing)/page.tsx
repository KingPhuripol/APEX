"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import {
  Microscope,
  FlaskConical,
  Clock,
  BarChart3,
  Brain,
  ArrowRight,
  FileText,
  CheckCircle2,
  Activity,
  TrendingUp,
  Layers,
  AlertTriangle,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

// ── Tissue tiles ─────────────────────────────────────────────────────────────

const TILES = [
  {
    src: "/samples/colorectal_cancer.png",
    label: "Tumor",
    badge: "bg-rose-500",
    conf: "97.2%",
  },
  {
    src: "/samples/stroma.png",
    label: "Stroma",
    badge: "bg-amber-500",
    conf: "94.8%",
  },
  {
    src: "/samples/lymphocytes.png",
    label: "TIL",
    badge: "bg-cyan-500",
    conf: "91.3%",
  },
  {
    src: "/samples/normal_colon.png",
    label: "Normal Gland",
    badge: "bg-emerald-500",
    conf: "98.1%",
  },
  {
    src: "/samples/smooth_muscle.png",
    label: "Smooth Muscle",
    badge: "bg-violet-500",
    conf: "88.7%",
  },
  {
    src: "/samples/adipose.png",
    label: "Adipose",
    badge: "bg-yellow-500",
    conf: "95.6%",
  },
  {
    src: "/samples/mucus.png",
    label: "Mucus",
    badge: "bg-teal-500",
    conf: "92.4%",
  },
  {
    src: "/samples/debris.png",
    label: "Debris",
    badge: "bg-slate-400",
    conf: "87.9%",
  },
  {
    src: "/samples/normal_colon_v2.png",
    label: "Epithelium",
    badge: "bg-green-500",
    conf: "96.3%",
  },
];
// ── Static data ──────────────────────────────────────────────────────────────

const STATS = [
  { value: "6M+", label: "OV-infected", sub: "Thailand alone" },
  { value: "Group 1", label: "WHO IARC", sub: "Carcinogen class" },
  { value: "77.5%", label: "AI Accuracy", sub: "9-class, ConvNeXt" },
  { value: "<60s", label: "Report Time", sub: "End-to-end" },
];

const CAPABILITIES = [
  {
    step: "01",
    icon: Microscope,
    title: "Slide Quality Control",
    desc: "H&E staining quality, focus, tissue coverage, and artifact detection before analysis.",
  },
  {
    step: "02",
    icon: FlaskConical,
    title: "OV-Associated Pathology",
    desc: "OV marker detection with models trained specifically on Northeast Thai populations.",
  },
  {
    step: "03",
    icon: BarChart3,
    title: "WHO Tumor Grading",
    desc: "G1–G3 grading per WHO 5th Edition Classification of Digestive Tumors.",
  },
  {
    step: "04",
    icon: Activity,
    title: "Spatial Tissue Analysis",
    desc: "TIL density, tumor–stroma ratio, lymphovascular and perineural invasion.",
  },
  {
    step: "05",
    icon: TrendingUp,
    title: "pTNM Staging & Prognosis",
    desc: "AJCC 8th edition staging with SEA-calibrated survival probability curves.",
  },
  {
    step: "06",
    icon: FileText,
    title: "CAP Synoptic Report",
    desc: "Structured CAP-compliant report with confidence scores and full audit trail.",
  },
];

const AGENTS = [
  { n: "01", label: "Slide QC", sub: "Quality gate", icon: Microscope },
  { n: "02", label: "Parasitologist", sub: "OV detection", icon: FlaskConical },
  { n: "03", label: "Grader", sub: "WHO G1–G3", icon: BarChart3 },
  { n: "04", label: "Spatial", sub: "TIL / LVI / PNI", icon: Layers },
  { n: "05", label: "Oncologist", sub: "pTNM AJCC 8th", icon: Brain },
  { n: "06", label: "Time Machine", sub: "Survival curves", icon: Clock },
  { n: "07", label: "Report Writer", sub: "CAP synoptic", icon: FileText },
];

// ── Pipeline steps (for animated "How it works" section) ─────────────────────

const PIPELINE_STEPS = [
  {
    id: "upload",
    label: "Upload Slide",
    sub: "H&E input",
    icon: Microscope,
    dur: "—",
  },
  {
    id: "ml",
    label: "ML Prescreen",
    sub: "ConvNeXt-Base",
    icon: BarChart3,
    dur: "4.2s",
  },
  {
    id: "qc",
    label: "Slide QC",
    sub: "Quality gate",
    icon: Microscope,
    dur: "3.8s",
  },
  {
    id: "parasit",
    label: "Parasitologist",
    sub: "OV detection",
    icon: FlaskConical,
    dur: "6.1s",
  },
  {
    id: "grader",
    label: "Grader",
    sub: "WHO G1–G3",
    icon: BarChart3,
    dur: "5.4s",
  },
  {
    id: "spatial",
    label: "Spatial Agent",
    sub: "TIL · LVI · PNI",
    icon: Activity,
    dur: "7.2s",
  },
  {
    id: "onco",
    label: "Oncologist",
    sub: "pTNM AJCC 8th",
    icon: Brain,
    dur: "5.9s",
  },
  {
    id: "time",
    label: "Time Machine",
    sub: "Survival curves",
    icon: Clock,
    dur: "4.7s",
  },
  {
    id: "report",
    label: "Report Writer",
    sub: "CAP synoptic",
    icon: FileText,
    dur: "8.3s",
  },
];

// ── Animation helper ──────────────────────────────────────────────────────────

function FadeUp({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.5,
        delay: delay * 0.08,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Tissue classification grid ────────────────────────────────────────────────

function TissueGrid() {
  return (
    <div className="relative w-full max-w-[380px]">
      <div className="absolute -inset-6 rounded-3xl bg-cyan-500/5 blur-3xl" />
      <div className="relative rounded-2xl overflow-hidden border border-white/[0.1] bg-black/40 backdrop-blur-sm shadow-2xl shadow-black/60">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.07]">
          <div className="flex items-center gap-2">
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-70" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
            </span>
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.18em]">
              Tissue Classification · Live
            </span>
          </div>
          <span className="text-[9px] text-white/25 font-mono">
            9 classes · H&E
          </span>
        </div>

        {/* Tile grid */}
        <div className="relative grid grid-cols-3 gap-1 p-1.5">
          {/* Scanning line */}
          <motion.div
            className="absolute inset-x-1.5 z-20 pointer-events-none"
            style={{ height: "2px" }}
            initial={{ top: "6px" }}
            animate={{
              top: ["6px", "calc(100% - 6px)", "calc(100% - 6px)", "6px"],
            }}
            transition={{
              duration: 4.5,
              times: [0, 0.45, 0.55, 1],
              repeat: Infinity,
              repeatDelay: 0.5,
              ease: "linear",
            }}
          >
            <div className="h-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_3px_rgba(34,211,238,0.7)]" />
          </motion.div>

          {TILES.map((tile, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.4,
                delay: 0.4 + i * 0.07,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative aspect-square rounded-lg overflow-hidden group"
            >
              <Image
                src={tile.src}
                alt={tile.label}
                fill
                className="object-cover"
                sizes="120px"
                unoptimized
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-150" />
              {/* Confidence */}
              <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-bold text-white/90 bg-black/55 backdrop-blur-sm leading-none">
                {tile.conf}
              </div>
              {/* Label */}
              <div
                className={`absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-bold text-white leading-none ${tile.badge}`}
              >
                {tile.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.07]">
          <span className="text-[9px] text-white/25 font-mono">
            ConvNeXt-Base
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[9px] font-bold text-emerald-400">
              77.5% val. accuracy
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── How It Works — animated pipeline demo ────────────────────────────────────

function HowItWorks() {
  const [phase, setPhase] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: false, margin: "-80px" });

  useEffect(() => {
    if (!inView) {
      setPhase(0);
      return;
    }
    const schedule = (p: number) => {
      setPhase(p);
      if (p <= PIPELINE_STEPS.length) {
        timerRef.current = setTimeout(() => schedule(p + 1), 680);
      } else {
        timerRef.current = setTimeout(() => schedule(1), 3200);
      }
    };
    timerRef.current = setTimeout(() => schedule(1), 500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [inView]);

  const status = (i: number): "done" | "active" | "idle" => {
    if (phase > i + 1) return "done";
    if (phase === i + 1) return "active";
    return "idle";
  };

  const allDone = phase > PIPELINE_STEPS.length;
  const leftPhase = phase <= 2 ? 0 : phase <= 8 ? 1 : 2;

  const PHASES = [
    {
      n: "01",
      icon: Microscope,
      color: "cyan" as const,
      title: "Slide Intake & QC",
      desc: "Upload an H&E slide image. ConvNeXt-Base classifies 9 tissue types across the whole slide, then Slide QC verifies staining quality, focus, and tissue coverage.",
    },
    {
      n: "02",
      icon: Brain,
      color: "blue" as const,
      title: "7 Specialist Agents",
      desc: "Parasitologist detects OV markers. Grader assigns WHO G1–G3. Spatial Agent maps TIL density and LVI/PNI. Oncologist stages with AJCC 8th pTNM. Time Machine models survival.",
    },
    {
      n: "03",
      icon: FileText,
      color: "emerald" as const,
      title: "Structured CAP Report",
      desc: "Report Writer compiles findings into a CAP-compliant synoptic report with confidence scores, survival probability curves, and a full audit trail.",
    },
  ];

  const colorMap = {
    cyan: {
      border: "border-cyan-500/40",
      bg: "bg-cyan-950/20",
      shadow: "shadow-cyan-500/10",
      iconBg: "bg-cyan-500/15",
      iconBorder: "border-cyan-500/40",
      text: "text-cyan-400",
    },
    blue: {
      border: "border-blue-500/40",
      bg: "bg-blue-950/20",
      shadow: "shadow-blue-500/10",
      iconBg: "bg-blue-500/15",
      iconBorder: "border-blue-500/40",
      text: "text-blue-400",
    },
    emerald: {
      border: "border-emerald-500/40",
      bg: "bg-emerald-950/20",
      shadow: "shadow-emerald-500/10",
      iconBg: "bg-emerald-500/15",
      iconBorder: "border-emerald-500/40",
      text: "text-emerald-400",
    },
  };

  return (
    <section
      id="how-it-works"
      className="py-20 px-6 bg-[#050d1b] border-y border-white/[0.05]"
    >
      <div className="max-w-6xl mx-auto">
        <FadeUp className="mb-12 text-center">
          <p className="text-xs font-bold text-cyan-400 uppercase tracking-[0.18em] mb-2">
            How It Works
          </p>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Slide in. Report out.
          </h2>
          <p className="text-white/35 text-sm mt-3 max-w-sm mx-auto">
            9 sequential steps — slide intake through CAP report — completed in
            under 60 seconds.
          </p>
        </FadeUp>

        <div
          ref={sectionRef}
          className="grid lg:grid-cols-[1fr_360px] gap-8 items-start"
        >
          {/* Left: 3 phase cards */}
          <div className="flex flex-col gap-4">
            {PHASES.map((lp, i) => {
              const isActive = leftPhase === i;
              const isDone = phase > 0 && leftPhase > i;
              const c = colorMap[lp.color];
              return (
                <motion.div
                  key={lp.n}
                  animate={{
                    opacity: isActive
                      ? 1
                      : isDone
                        ? 0.65
                        : phase === 0
                          ? 0.45
                          : 0.25,
                    scale: isActive ? 1.01 : 1,
                  }}
                  transition={{ duration: 0.35 }}
                  className={`relative border rounded-2xl p-5 ${
                    isActive
                      ? `${c.border} ${c.bg} shadow-lg ${c.shadow}`
                      : "border-white/[0.06] bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${
                        isActive
                          ? `${c.iconBg} ${c.iconBorder}`
                          : "bg-white/[0.03] border-white/[0.06]"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <lp.icon
                          className={`w-5 h-5 ${isActive ? c.text : "text-white/20"}`}
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <p
                        className={`text-[10px] font-extrabold uppercase tracking-widest mb-1 ${
                          isActive ? c.text : "text-white/20"
                        }`}
                      >
                        Step {lp.n}
                      </p>
                      <h3
                        className={`font-bold text-base mb-1.5 ${
                          isActive ? "text-white" : "text-white/35"
                        }`}
                      >
                        {lp.title}
                      </h3>
                      <p
                        className={`text-xs leading-relaxed ${
                          isActive ? "text-white/45" : "text-white/15"
                        }`}
                      >
                        {lp.desc}
                      </p>
                    </div>
                  </div>
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-2xl pointer-events-none border"
                      style={{ borderColor: "inherit" }}
                      animate={{ opacity: [0.3, 0.9, 0.3] }}
                      transition={{ duration: 2.2, repeat: Infinity }}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Right: terminal panel */}
          <div className="bg-[#030912] rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl shadow-black/60 lg:sticky lg:top-20">
            {/* Terminal titlebar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-black/30">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
              <span className="text-[10px] text-white/20 font-mono ml-2 tracking-wide">
                MARS · Analysis Pipeline
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                {phase > 0 && !allDone && (
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 0.9, repeat: Infinity }}
                    className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                  />
                )}
                {allDone && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
                <span
                  className={`text-[10px] font-mono ${
                    allDone
                      ? "text-emerald-400"
                      : phase === 0
                        ? "text-white/25"
                        : "text-cyan-400"
                  }`}
                >
                  {allDone ? "Complete" : phase === 0 ? "Idle" : "Running"}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-0.5 bg-white/[0.04]">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                animate={{
                  width: `${Math.min((phase / (PIPELINE_STEPS.length + 1)) * 100, 100)}%`,
                }}
                transition={{ duration: 0.45 }}
              />
            </div>

            {/* Steps list */}
            <div className="p-3 space-y-0.5">
              {PIPELINE_STEPS.map((s, i) => {
                const st = status(i);
                return (
                  <div
                    key={s.id}
                    className={`relative flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors duration-200 ${
                      st === "active" ? "bg-blue-500/[0.08]" : ""
                    }`}
                  >
                    {i < PIPELINE_STEPS.length - 1 && (
                      <div className="absolute left-[17px] top-[30px] w-px h-2.5 bg-white/[0.05]" />
                    )}
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all duration-200 ${
                        st === "done"
                          ? "bg-emerald-500/15"
                          : st === "active"
                            ? "bg-blue-500/20"
                            : "bg-white/[0.03]"
                      }`}
                    >
                      {st === "done" && (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      )}
                      {st === "active" && (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 0.9,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full"
                        />
                      )}
                      {st === "idle" && (
                        <s.icon className="w-2.5 h-2.5 text-white/[0.12]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span
                          className={`text-[11px] font-semibold transition-colors ${
                            st === "done"
                              ? "text-emerald-400"
                              : st === "active"
                                ? "text-white"
                                : "text-white/[0.18]"
                          }`}
                        >
                          {s.label}
                        </span>
                        <span
                          className={`text-[10px] ml-1 transition-colors ${
                            st === "active"
                              ? "text-white/30"
                              : "text-white/[0.10]"
                          }`}
                        >
                          · {s.sub}
                        </span>
                      </div>
                      {st === "done" && (
                        <span className="text-[9px] text-emerald-600/70 font-mono shrink-0">
                          {s.dur}
                        </span>
                      )}
                      {st === "active" && (
                        <motion.span
                          animate={{ opacity: [1, 0.4, 1] }}
                          transition={{ duration: 0.7, repeat: Infinity }}
                          className="text-[9px] text-blue-400 font-mono shrink-0"
                        >
                          running…
                        </motion.span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Report preview — appears when all done */}
            <AnimatePresence>
              {allDone && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.4 }}
                  className="overflow-hidden"
                >
                  <div className="mx-3 mb-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3">
                    <p className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-[0.15em] mb-2.5">
                      ✓ Report Generated
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { k: "WHO Grade", v: "G2 — Moderate" },
                        { k: "pTNM Stage", v: "pT2a N0 M0" },
                        { k: "OV-Associated", v: "Positive" },
                        { k: "5-yr Survival", v: "41.2%" },
                      ].map((r) => (
                        <div
                          key={r.k}
                          className="bg-black/20 rounded-lg px-2 py-1.5"
                        >
                          <p className="text-[9px] text-white/25 mb-0.5">
                            {r.k}
                          </p>
                          <p className="text-[11px] font-bold text-white/75">
                            {r.v}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden">
      {/* ── Navbar — always dark ── */}
      <nav className="fixed inset-x-0 top-0 z-50 bg-[#020c1b]/85 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2.5"
          >
            <div className="w-8 h-8 rounded-lg bg-[#1d4ed8] flex items-center justify-center">
              <Microscope className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-white tracking-tight">
              PICHA
            </span>
            <span className="text-[9px] font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-700/40 px-2 py-0.5 rounded-md tracking-widest uppercase">
              Beta
            </span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="flex items-center gap-5"
          >
            <a
              href="#how-it-works"
              className="hidden md:block text-sm text-white/45 hover:text-white transition-colors"
            >
              How it works
            </a>
            <a
              href="#capabilities"
              className="hidden md:block text-sm text-white/45 hover:text-white transition-colors"
            >
              Capabilities
            </a>
            <a
              href="#pipeline"
              className="hidden md:block text-sm text-white/45 hover:text-white transition-colors"
            >
              Pipeline
            </a>
            <ThemeToggle />
            <Link
              href="/login"
              className="group flex items-center gap-1.5 text-sm font-semibold text-white bg-[#1d4ed8] hover:bg-[#1e40af] px-4 py-2 rounded-lg transition-colors"
            >
              Enter Platform
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </div>
      </nav>

      {/* ── Hero — full dark ── */}
      <section className="relative min-h-screen bg-[#020c1b] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_60%,rgba(29,78,216,0.13),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_80%_40%,rgba(6,182,212,0.07),transparent)]" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #475569 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="max-w-6xl mx-auto px-6 pt-20 pb-16 w-full grid lg:grid-cols-[1fr_auto] gap-14 xl:gap-20 items-center relative z-10">
          {/* Left */}
          <div className="max-w-xl">
            {/* Danger badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="inline-flex items-center gap-2 mb-7 px-3.5 py-1.5 rounded-full border border-amber-600/40 bg-amber-950/40 text-amber-400 text-xs font-bold uppercase tracking-wider"
            >
              <AlertTriangle className="w-3 h-3 shrink-0" />
              WHO IARC Group 1 Carcinogen · Opisthorchis viverrini
            </motion.div>

            {/* H1 */}
            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.55,
                delay: 0.07,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="text-[50px] sm:text-[62px] font-extrabold leading-[1.03] tracking-[-0.03em] text-white mb-5"
            >
              A parasitic worm.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-blue-500">
                Bile duct cancer.
              </span>
              <br />
              <span className="text-white/50 text-[34px] sm:text-[42px] font-bold leading-tight">
                Now detectable by AI.
              </span>
            </motion.h1>

            {/* Body */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.14 }}
              className="text-white/50 text-[15px] leading-[1.75] mb-7 max-w-lg"
            >
              <em className="text-white/70 not-italic">
                Opisthorchis viverrini
              </em>{" "}
              — a liver fluke endemic to Northeast Thailand — is the primary
              cause of cholangiocarcinoma in Southeast Asia. PICHA is the first
              AI pathology platform built specifically to analyze OV-associated
              CCA from a single H&amp;E slide.
            </motion.p>

            {/* Key numbers */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="flex flex-wrap gap-8 mb-8 pb-8 border-b border-white/[0.07]"
            >
              {[
                { v: "6M+", l: "people infected", s: "Thailand" },
                { v: "Group 1", l: "carcinogen", s: "WHO IARC" },
                { v: "<60s", l: "per report", s: "end-to-end" },
              ].map((s) => (
                <div key={s.v}>
                  <p className="text-2xl font-extrabold text-white leading-none">
                    {s.v}
                  </p>
                  <p className="text-white/40 text-xs mt-1">
                    {s.l} · <span className="text-white/25">{s.s}</span>
                  </p>
                </div>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.24 }}
              className="flex flex-wrap gap-3 mb-7"
            >
              <Link
                href="/login"
                className="group flex items-center gap-2 px-6 py-3 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-semibold rounded-xl text-sm transition-colors shadow-lg shadow-blue-900/40"
              >
                <Microscope className="w-4 h-4" />
                Open Clinical Workstation
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#problem"
                className="flex items-center gap-1.5 px-5 py-3 border border-white/10 hover:border-white/25 text-white/50 hover:text-white/80 font-medium rounded-xl text-sm transition-colors"
              >
                Why it matters
                <ArrowRight className="w-3.5 h-3.5 rotate-90" />
              </a>
            </motion.div>

            {/* Standards */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="flex flex-wrap gap-x-5 gap-y-2"
            >
              {[
                "WHO 5th Ed.",
                "AJCC 8th pTNM",
                "CAP-Compliant",
                "SEA-Calibrated",
              ].map((s) => (
                <span
                  key={s}
                  className="flex items-center gap-1.5 text-xs text-white/30"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  {s}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Right: tissue grid */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.7,
              delay: 0.25,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="flex justify-center lg:justify-end"
          >
            <TissueGrid />
          </motion.div>
        </div>
      </section>

      {/* ── Stats band ── */}
      <section className="bg-[#0a1628] py-12 px-6 border-y border-white/[0.05]">
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-10">
          {STATS.map((s, i) => (
            <FadeUp key={s.label} delay={i}>
              <p className="text-4xl font-extrabold text-white leading-none tracking-tight">
                {s.value}
              </p>
              <p className="text-blue-400 text-xs font-semibold mt-2 tracking-wide">
                {s.label}
              </p>
              <p className="text-slate-500 text-[11px] mt-0.5">{s.sub}</p>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <HowItWorks />

      {/* ── Capabilities ── */}
      <section
        id="capabilities"
        className="py-20 px-6 bg-[#f4f8ff] dark:bg-white/[0.015] border-y border-slate-100 dark:border-white/[0.05]"
      >
        <div className="max-w-6xl mx-auto">
          <FadeUp className="mb-12">
            <p className="text-xs font-bold text-[#1d4ed8] dark:text-blue-400 tracking-[0.18em] uppercase mb-2">
              Clinical Capabilities
            </p>
            <h2 className="text-3xl font-extrabold text-[#0a1628] dark:text-white tracking-tight">
              Purpose-built for CCA
            </h2>
          </FadeUp>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CAPABILITIES.map((c, i) => (
              <FadeUp key={c.title} delay={i} className="h-full">
                <div className="group h-full border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] hover:border-blue-300 dark:hover:border-blue-700/50 hover:shadow-lg hover:shadow-blue-50 dark:hover:shadow-blue-600/10 rounded-xl p-5 transition-all duration-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-700/30 flex items-center justify-center group-hover:bg-[#1d4ed8] group-hover:border-[#1d4ed8] transition-all">
                      <c.icon className="w-[18px] h-[18px] text-[#1d4ed8] dark:text-blue-400 group-hover:text-white transition-colors" />
                    </div>
                    <span className="text-2xl font-extrabold text-slate-100 dark:text-white/[0.05] tabular-nums leading-none">
                      {c.step}
                    </span>
                  </div>
                  <h3 className="font-bold text-[#0a1628] dark:text-white text-sm mb-1.5">
                    {c.title}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-500 text-xs leading-relaxed">
                    {c.desc}
                  </p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── MARS Pipeline ── */}
      <section id="pipeline" className="py-20 px-6 bg-white dark:bg-[#030911]">
        <div className="max-w-6xl mx-auto">
          <FadeUp className="mb-12">
            <p className="text-xs font-bold text-[#1d4ed8] dark:text-blue-400 tracking-[0.18em] uppercase mb-2">
              MARS Agent Pipeline
            </p>
            <h2 className="text-3xl font-extrabold text-[#0a1628] dark:text-white tracking-tight">
              7 agents, one report
            </h2>
          </FadeUp>
          <div className="relative">
            <div className="hidden lg:block absolute top-7 left-10 right-10 h-px bg-blue-100 dark:bg-gradient-to-r dark:from-transparent dark:via-blue-700/30 dark:to-transparent z-0" />
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-5 relative z-10">
              {AGENTS.map((a, i) => (
                <FadeUp
                  key={a.label}
                  delay={i}
                  className="flex flex-col items-center text-center group"
                >
                  <div className="relative w-14 h-14 rounded-2xl bg-[#f4f8ff] dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] group-hover:border-[#1d4ed8] dark:group-hover:border-blue-600/60 group-hover:shadow-lg group-hover:shadow-blue-50 dark:group-hover:shadow-blue-600/20 flex items-center justify-center mb-3 transition-all duration-200">
                    <a.icon className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-[#1d4ed8] dark:group-hover:text-blue-400 transition-colors" />
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-extrabold text-[#1d4ed8] dark:text-blue-400 bg-white dark:bg-[#030911] border border-blue-200 dark:border-blue-700/50 px-1.5 rounded-full">
                      {a.n}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#0a1628] dark:text-slate-200">
                    {a.label}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-0.5">
                    {a.sub}
                  </p>
                </FadeUp>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 px-6 bg-[#1d4ed8] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_110%,rgba(6,182,212,0.18),transparent)]" />
        <FadeUp>
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
            <div>
              <p className="text-blue-300 text-xs uppercase tracking-widest font-bold mb-1.5">
                For Healthcare Professionals
              </p>
              <h2 className="text-2xl font-extrabold text-white mb-1 tracking-tight">
                Free access during beta.
              </h2>
              <p className="text-blue-200 text-sm">
                Requires institutional email verification.
              </p>
            </div>
            <Link
              href="/login"
              className="group shrink-0 flex items-center gap-2 px-7 py-4 bg-white hover:bg-blue-50 text-[#1d4ed8] font-bold rounded-xl text-sm transition-colors shadow-xl shadow-blue-900/30 whitespace-nowrap"
            >
              <Microscope className="w-4 h-4" />
              Enter Clinical Workstation
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </FadeUp>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-800 px-6 py-10 bg-[#0a1628]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-10 mb-8">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg bg-[#1d4ed8] flex items-center justify-center">
                  <Microscope className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-extrabold text-white tracking-tight">
                  PICHA AI
                </span>
              </div>
              <p className="text-slate-500 text-xs max-w-xs leading-relaxed">
                AI-assisted pathology for OV-associated CCA and hepatobiliary
                cancers. Purpose-built for Southeast Asian clinical contexts.
              </p>
            </div>
            <div className="flex gap-12">
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-3">
                  Platform
                </p>
                <div className="space-y-2">
                  {[
                    "Clinical Workstation",
                    "MARS Pipeline",
                    "Report Output",
                  ].map((l) => (
                    <Link
                      key={l}
                      href="/login"
                      className="block text-slate-500 hover:text-white text-xs transition-colors"
                    >
                      {l}
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-3">
                  Legal
                </p>
                <div className="space-y-2">
                  {["Privacy Policy", "Terms of Use"].map((l) => (
                    <Link
                      key={l}
                      href="#"
                      className="block text-slate-500 hover:text-white text-xs transition-colors"
                    >
                      {l}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-slate-600 text-xs">
              © 2026 PICHA AI. All rights reserved.
            </p>
            <p className="text-slate-700 text-xs">
              For clinical decision support only. Not a standalone diagnostic
              device.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
