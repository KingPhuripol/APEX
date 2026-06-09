"use client";
import { useState, useEffect, useRef } from "react";
import {
  Microscope,
  ScanSearch,
  Bug,
  BarChart3,
  Map,
  Hospital,
  Timer,
  FileText,
  CheckCircle,
  Loader2,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
} from "lucide-react";

export interface AgentEventData {
  agent: string;
  type: string;
  message: string;
  is_final: boolean;
}

// ── Agent metadata ────────────────────────────────────────────────────────────

export interface AgentMeta {
  icon: React.ElementType;
  label: string;
  labelTH: string;
  ringColor: string;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  badgeText: string;
  /** Short description of what this agent does (displayed under running state) */
  descTH: string;
  /** What the doctor should pay attention to in the result */
  clinicalNote: string;
}

export const AGENT_META: Record<string, AgentMeta> = {
  MLPrescreen: {
    icon: Microscope,
    label: "ML Pre-screen",
    labelTH: "การคัดกรองชนิดเนื้อเยื่อ",
    ringColor: "ring-purple-300",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    badgeBg: "bg-purple-50 border-purple-200",
    badgeText: "text-purple-700",
    descTH:
      "ConvNeXt-Base จำแนกชนิดเนื้อเยื่อ (colorectal tissue typing) เพื่อให้ MARS agents ใช้เป็น context เกี่ยวกับส่วนประกอบของ slide — ไม่ใช่การวินิจฉัย CCA โดยตรง",
    clinicalNote:
      "โมเดลนี้ trained บน CRC-NCT-HE-555K (colorectal) ไม่ใช่ CCA dataset · accuracy 76.33% (colorectal domain) · ใช้เป็น tissue context pre-screen เท่านั้น",
  },
  SlideQCAgent: {
    icon: ScanSearch,
    label: "Slide QC",
    labelTH: "ตรวจสอบคุณภาพสไลด์",
    ringColor: "ring-blue-300",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    badgeBg: "bg-blue-50 border-blue-200",
    badgeText: "text-blue-700",
    descTH:
      "ตรวจสอบว่า H&E section มีคุณภาพเพียงพอ: ความคมชัด, การย้อมสี, การกระจายของเนื้อเยื่อ และ artifact ที่อาจรบกวนการวินิจฉัย",
    clinicalNote:
      "หาก QC ไม่ผ่าน แนะนำให้ถ่ายภาพสไลด์ใหม่ในบริเวณที่ tissue distribution ดีกว่า หรือผ่านการย้อมสีใหม่",
  },
  ParasitologistAgent: {
    icon: Bug,
    label: "Parasitologist",
    labelTH: "ตรวจพยาธิใบไม้ตับ (OV)",
    ringColor: "ring-emerald-300",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    badgeBg: "bg-emerald-50 border-emerald-200",
    badgeText: "text-emerald-700",
    descTH:
      "ค้นหาหลักฐาน Opisthorchis viverrini (OV) ซึ่งเป็นสาเหตุหลักของ Cholangiocarcinoma ในเอเชียตะวันออกเฉียงใต้ ตรวจหา periductal fibrosis, goblet cell metaplasia และ egg remnants",
    clinicalNote:
      "OV-associated CCA มักพบใน peri-hilar location และมี prognosis ต่างจาก non-OV CCA การยืนยัน OV status สำคัญสำหรับการวาง treatment plan",
  },
  GradingAgent: {
    icon: BarChart3,
    label: "WHO Grading",
    labelTH: "กำหนด Grade ตาม WHO",
    ringColor: "ring-yellow-300",
    iconBg: "bg-yellow-100",
    iconColor: "text-yellow-600",
    badgeBg: "bg-yellow-50 border-yellow-200",
    badgeText: "text-yellow-700",
    descTH:
      "จำแนก histological grade ตาม WHO Classification of Digestive Tumors: G1 (well-differentiated), G2 (moderately differentiated), G3 (poorly differentiated) โดยประเมิน gland formation, nuclear pleomorphism และ mitotic count",
    clinicalNote:
      "Grade G3 สัมพันธ์กับ overall survival ที่แย่ลงอย่างมีนัยสำคัญ และมักต้องพิจารณา adjuvant chemotherapy หลังผ่าตัด",
  },
  SpatialAgent: {
    icon: Map,
    label: "Spatial Analysis",
    labelTH: "วิเคราะห์โครงสร้างเชิงพื้นที่",
    ringColor: "ring-orange-300",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    badgeBg: "bg-orange-50 border-orange-200",
    badgeText: "text-orange-700",
    descTH:
      "วิเคราะห์ tumor microenvironment: ความหนาแน่นของ TIL (Tumor-Infiltrating Lymphocytes), lymphovascular invasion (LVI), perineural invasion (PNI) และรูปแบบการเติบโตของเนื้องอก",
    clinicalNote:
      "LVI และ PNI เป็น adverse prognostic factors ที่ส่งผลต่อการกำหนด surgical margin และการพิจารณา adjuvant therapy ส่วน TIL density สูงมักสัมพันธ์กับการตอบสนองต่อ immunotherapy ดีขึ้น",
  },
  OncologistAgent: {
    icon: Hospital,
    label: "Oncologist",
    labelTH: "การ Stage และแผนการรักษา",
    ringColor: "ring-red-300",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    badgeBg: "bg-red-50 border-red-200",
    badgeText: "text-red-700",
    descTH:
      "กำหนด pTNM stage ตาม AJCC 8th Edition สำหรับ intrahepatic/perihilar/distal CCA พร้อมประเมิน resectability และให้ treatment recommendation เบื้องต้น",
    clinicalNote:
      "การ staging ที่แม่นยำเป็นหัวใจสำคัญในการเลือก surgical approach หรือ palliative care ควรนำไปอภิปรายใน multidisciplinary tumor board (MDT)",
  },
  TimeMachineAgent: {
    icon: Timer,
    label: "Time Machine",
    labelTH: "การพยากรณ์อัตรารอดชีวิต",
    ringColor: "ring-pink-300",
    iconBg: "bg-pink-100",
    iconColor: "text-pink-600",
    badgeBg: "bg-pink-50 border-pink-200",
    badgeText: "text-pink-700",
    descTH:
      "คำนวณอัตราการรอดชีวิตที่ 30, 90, 180 และ 365 วัน โดยอ้างอิงจากฐานข้อมูล SEER 2010–2020 ปรับค่าสำหรับประชากรเอเชียตะวันออกเฉียงใต้",
    clinicalNote:
      "ค่าพยากรณ์เหล่านี้เป็นตัวเลขเชิงสถิติจากฐานข้อมูลประชากร ไม่ใช่การทำนายระดับบุคคล ควรใช้ประกอบการตัดสินใจร่วมกับปัจจัยทางคลินิกอื่นๆ และความต้องการของผู้ป่วย",
  },
  ReportAgent: {
    icon: FileText,
    label: "Report Compiler",
    labelTH: "รวบรวมและสรุปผลรายงาน",
    ringColor: "ring-cyan-300",
    iconBg: "bg-cyan-100",
    iconColor: "text-cyan-600",
    badgeBg: "bg-cyan-50 border-cyan-200",
    badgeText: "text-cyan-700",
    descTH:
      "รวบรวมผลลัพธ์จากผู้เชี่ยวชาญทั้ง 7 ท่านและจัดทำ CAP-compliant Synoptic Report พร้อม audit trail สมบูรณ์",
    clinicalNote:
      "รายงานนี้ผ่านการตรวจสอบโดย AI pipeline เท่านั้น — ต้องได้รับการยืนยันจากแพทย์พยาธิวิทยาที่มีใบอนุญาตก่อนนำไปใช้ในการรักษา",
  },
};

export const PIPELINE_ORDER = [
  "MLPrescreen",
  "SlideQCAgent",
  "ParasitologistAgent",
  "GradingAgent",
  "SpatialAgent",
  "OncologistAgent",
  "TimeMachineAgent",
  "ReportAgent",
];

// ── Result parser ─────────────────────────────────────────────────────────────

export function parseMessage(msg: string): {
  parsed: Record<string, unknown> | null;
  raw: string;
} {
  try {
    // Strip optional FINAL_REPORT: prefix emitted by ReportAgent
    const cleaned = msg.replace(/^FINAL_REPORT:\s*/i, "").trim();
    const obj = JSON.parse(cleaned);
    if (typeof obj === "object" && obj !== null)
      return { parsed: obj as Record<string, unknown>, raw: cleaned };
  } catch {
    // not JSON
  }
  return { parsed: null, raw: msg };
}

export function renderValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v || "—";
  if (Array.isArray(v)) return v.join(", ") || "—";
  return JSON.stringify(v);
}

export function flattenKeys(
  obj: Record<string, unknown>,
  prefix = "",
): Array<{ key: string; value: string }> {
  const out: Array<{ key: string; value: string }> = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      out.push(...flattenKeys(v as Record<string, unknown>, fullKey));
    } else {
      out.push({ key: fullKey, value: renderValue(v) });
    }
  }
  return out.slice(0, 20); // cap at 20 rows
}

export function formatKey(k: string): string {
  return k
    .replace(/_/g, " ")
    .replace(/\./g, " › ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── ResultCard ────────────────────────────────────────────────────────────────

export function ResultCard({
  message,
  meta,
}: {
  message: string;
  meta: AgentMeta;
}) {
  const [showRaw, setShowRaw] = useState(false);
  const { parsed, raw } = parseMessage(message);
  const rows = parsed ? flattenKeys(parsed) : [];

  return (
    <div className="mt-3 space-y-3">
      {/* Key findings grid */}
      {rows.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
          {rows.map(({ key, value }) => (
            <div
              key={key}
              className="flex justify-between items-start gap-2 py-1 border-b border-slate-100 last:border-0"
            >
              <span className="text-slate-500 text-xs shrink-0">
                {formatKey(key)}
              </span>
              <span className="text-[#0a1628] text-xs font-semibold text-right break-all">
                {value}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-slate-600 text-sm leading-relaxed">{raw}</p>
      )}

      {/* Clinical note */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
        <Info className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
        <p className="text-amber-700 text-xs leading-relaxed">
          {meta.clinicalNote}
        </p>
      </div>

      {/* Toggle raw JSON */}
      {parsed && (
        <button
          onClick={() => setShowRaw((v) => !v)}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-[11px] transition-colors"
        >
          {showRaw ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
          {showRaw ? "ซ่อน raw data" : "ดู raw JSON output"}
        </button>
      )}
      {showRaw && parsed && (
        <pre className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 overflow-x-auto leading-relaxed">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface AgentTimelineProps {
  events: AgentEventData[];
  isRunning: boolean;
}

export default function AgentTimeline({
  events,
  isRunning,
}: AgentTimelineProps) {
  const activeRef = useRef<HTMLDivElement>(null);

  const completedAgents = new Set(
    events
      .filter(
        (e) =>
          e.type === "conclusion" || e.type === "ml_prescreen" || e.is_final,
      )
      .map((e) => e.agent),
  );
  const lastAgent = events.length > 0 ? events[events.length - 1].agent : null;

  // Auto-scroll to active step
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [lastAgent]);

  const doneCount = completedAgents.size;
  const total = PIPELINE_ORDER.length;

  return (
    <div className="space-y-0">
      {/* Progress summary */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-slate-700">
          {isRunning
            ? `กำลังวิเคราะห์… (${doneCount}/${total} ขั้นตอน)`
            : doneCount === total
              ? "วิเคราะห์ครบทุกขั้นตอนแล้ว"
              : `เสร็จสิ้น ${doneCount} / ${total} ขั้นตอน`}
        </p>
        <div className="flex items-center gap-1.5">
          {isRunning && (
            <Loader2 className="w-3.5 h-3.5 text-[#1d4ed8] animate-spin" />
          )}
          <span className="text-xs text-slate-400">
            {doneCount}/{total}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-slate-100 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-[#1d4ed8] rounded-full transition-all duration-700"
          style={{ width: `${(doneCount / total) * 100}%` }}
        />
      </div>

      {/* Steps */}
      <div className="relative">
        {/* Vertical connector line */}
        <div className="absolute left-5 top-8 bottom-8 w-px bg-slate-100" />

        <div className="space-y-3">
          {PIPELINE_ORDER.map((agentKey, idx) => {
            const meta = AGENT_META[agentKey];
            if (!meta) return null;

            const AgentIcon = meta.icon;
            const isDone = completedAgents.has(agentKey);
            const isActive = isRunning && lastAgent === agentKey && !isDone;
            const isPending = !isDone && !isActive;

            // Final message for this agent
            const agentEvents = events.filter((e) => e.agent === agentKey);
            const finalEvent = agentEvents.find((e) => e.is_final);
            const activeMsg =
              agentEvents[agentEvents.length - 1]?.message ?? "";

            return (
              <div
                key={agentKey}
                ref={isActive ? activeRef : undefined}
                className={`relative transition-all duration-300 ${isPending ? "opacity-40" : ""}`}
              >
                <div
                  className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                    isActive
                      ? "border-[#1d4ed8]/30 bg-blue-50/60 shadow-sm shadow-blue-100"
                      : isDone
                        ? "border-slate-200 bg-white shadow-sm"
                        : "border-slate-100 bg-white"
                  }`}
                >
                  {/* Step header */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Step number / status icon */}
                    <div className="relative z-10 shrink-0">
                      {isDone ? (
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center ring-4 ring-white">
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                        </div>
                      ) : isActive ? (
                        <div
                          className={`w-10 h-10 rounded-full ${meta.iconBg} flex items-center justify-center ring-4 ring-white ring-offset-0 animate-pulse`}
                        >
                          <AgentIcon className={`w-5 h-5 ${meta.iconColor}`} />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center ring-4 ring-white">
                          <span className="text-slate-400 text-xs font-bold">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Title + description */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm font-bold ${isDone ? "text-[#0a1628]" : isActive ? "text-[#1d4ed8]" : "text-slate-400"}`}
                        >
                          {meta.labelTH}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${meta.badgeBg} ${meta.badgeText}`}
                        >
                          {meta.label}
                        </span>
                        {isActive && (
                          <span className="flex items-center gap-1 text-[#1d4ed8] text-[11px] font-medium">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            กำลังทำงาน...
                          </span>
                        )}
                        {isDone && (
                          <span className="text-emerald-600 text-[11px] font-medium">
                            เสร็จสิ้น
                          </span>
                        )}
                        {isPending && (
                          <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                            <Clock className="w-3 h-3" />
                            รอ
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs mt-0.5 leading-relaxed line-clamp-2">
                        {meta.descTH}
                      </p>
                    </div>
                  </div>

                  {/* Active: show live message */}
                  {isActive && activeMsg && (
                    <div className="px-4 pb-4">
                      <div className="bg-white border border-blue-100 rounded-xl px-3 py-2.5">
                        <p className="text-slate-600 text-xs leading-relaxed">
                          {activeMsg}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Done: show full result */}
                  {isDone && finalEvent && (
                    <div className="px-4 pb-4">
                      <div className="border-t border-slate-100 pt-3">
                        <ResultCard message={finalEvent.message} meta={meta} />
                      </div>
                    </div>
                  )}

                  {/* Warning if QC failed */}
                  {isDone &&
                    agentKey === "SlideQCAgent" &&
                    (() => {
                      try {
                        const obj = JSON.parse(finalEvent?.message ?? "{}");
                        if (obj.proceed === false) {
                          return (
                            <div className="mx-4 mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                              <p className="text-red-700 text-xs font-medium">
                                คุณภาพสไลด์ไม่ผ่านเกณฑ์ —
                                ผลลัพธ์อาจมีความแม่นยำลดลง
                              </p>
                            </div>
                          );
                        }
                      } catch {
                        /* ignore */
                      }
                      return null;
                    })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
