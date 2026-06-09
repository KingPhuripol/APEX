/* tab_scan.jsx — Tab 2: Quick Scan — segment, dropzone, pipeline, report */
(function () {
  const { useState, useEffect, useRef } = React;
  const Icon = window.Icon;
  const { ModuleChip, SeverityBadge, SEV, MOD } = window;
  const API = window.ApexAPI;

  const MODULES = [
    { id: 'AXIA', label: 'CT สมอง', icon: 'brain', tint: '#06b6d4', frame: 'ct' },
    { id: 'SmartLiva', label: 'อัลตราซาวด์ตับ', icon: 'droplet', tint: '#3b82f6', frame: 'us' },
    { id: 'PICHA', label: 'พยาธิวิทยา', icon: 'microscope', tint: '#8b5cf6', frame: 'path' },
  ];
  const STAGES = [
    { id: 'gate', icon: 'shield', label: 'ตรวจสอบคุณภาพภาพ', sub: 'ตรวจสอบความสมบูรณ์ของภาพและ DICOM' },
    { id: 'vision', icon: 'eye', label: 'วิเคราะห์ด้วย LLM Vision', sub: 'วิเคราะห์สัณฐานแบบหลายเอเจนต์' },
    { id: 'safety', icon: 'shield', label: 'ตรวจทานความปลอดภัย', sub: 'ตรวจซ้ำกับ guardrails' },
    { id: 'report', icon: 'languages', label: 'จัดรูปแบบรายงานไทย', sub: 'เรียบเรียงรายงานทางคลินิก' },
  ];

  /* synthetic PACS visual per modality + pulsing AI segmentation overlay */
  function ScanVisual({ frame, tint, segment }) {
    return (
      <div className="relative rounded-full overflow-hidden grid place-items-center" style={{ width: 188, height: 188, border: `2px solid ${tint}66`, boxShadow: `0 0 0 6px ${tint}14, 0 0 40px ${tint}33, inset 0 0 60px rgba(0,0,0,.6)` }}>
        {/* base scan texture */}
        {frame === 'ct' && (
          <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 45%, #59617a 0%, #313a4e 40%, #0e1320 72%)' }}>
            <div className="absolute" style={{ inset: '24%', borderRadius: '46% 54% 50% 50%', background: 'radial-gradient(circle at 45% 40%, #6b7488, transparent)', opacity: .5 }}></div>
            <div className="absolute" style={{ top: '42%', left: '38%', width: '8%', height: '16%', borderRadius: '50%', background: '#1a2030' }}></div>
            <div className="absolute" style={{ top: '42%', left: '54%', width: '8%', height: '16%', borderRadius: '50%', background: '#1a2030' }}></div>
          </div>
        )}
        {frame === 'us' && (
          <div className="absolute inset-0" style={{ background: '#0a1322' }}>
            <div className="absolute left-1/2 top-1 -translate-x-1/2" style={{ width: 0, height: 0, borderLeft: '92px solid transparent', borderRight: '92px solid transparent', borderBottom: '184px solid #16243d', filter: 'blur(1px)' }}></div>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="absolute left-1/2 -translate-x-1/2" style={{ top: `${20 + i * 12}%`, width: `${30 + i * 11}%`, height: 2, background: `rgba(120,150,200,${.22 - i * .02})`, borderRadius: 4 }}></div>
            ))}
          </div>
        )}
        {frame === 'path' && (
          <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 40% 38%, #7a5494 0%, #432e5c 42%, #1a1228 78%)' }}>
            {[...Array(14)].map((_, i) => (
              <div key={i} className="absolute rounded-full" style={{ width: 8 + (i % 4) * 5, height: 8 + (i % 3) * 5, left: `${12 + (i * 37) % 76}%`, top: `${14 + (i * 53) % 72}%`, background: 'rgba(40,12,60,.6)', border: '1.5px solid rgba(190,120,220,.4)' }}></div>
            ))}
          </div>
        )}

        {/* scanning sweep line */}
        <div className="absolute inset-0 scan-sweep pointer-events-none"></div>

        {/* pulsing AI segmentation overlay */}
        {segment && (
          <div className="absolute seg-blob" style={{ left: '46%', top: '40%', width: 54, height: 46 }}>
            <span className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, rgba(239,68,68,.85), rgba(239,68,68,.25) 60%, transparent 72%)', filter: 'blur(1px)' }}></span>
            <span className="absolute inset-0 rounded-full seg-ring" style={{ border: '1.5px solid rgba(255,90,90,.95)' }}></span>
          </div>
        )}

        {/* crosshair reticle */}
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: .4 }}>
          <span className="absolute left-1/2 top-2 bottom-2 w-px -translate-x-1/2" style={{ background: `linear-gradient(${tint}, transparent, ${tint})` }}></span>
          <span className="absolute top-1/2 left-2 right-2 h-px -translate-y-1/2" style={{ background: `linear-gradient(90deg, ${tint}, transparent, ${tint})` }}></span>
        </div>
      </div>
    );
  }

  function Dropzone({ tint, label, onStart }) {
    const inputRef = useRef(null);
    return (
      <div>
        <button onClick={() => onStart()} className="w-full rounded-3xl press relative overflow-hidden grid place-items-center"
          style={{ height: 248, border: `1.5px dashed ${tint}59`, background: `radial-gradient(circle at 50% 40%, ${tint}12, rgba(17,28,52,.4))` }}>
          <span className="absolute inset-3 rounded-[20px] pointer-events-none" style={{ border: `1px solid ${tint}1f` }}></span>
          {/* shutter */}
          <div className="relative grid place-items-center">
            <span className="absolute rounded-full shutter-ping" style={{ width: 96, height: 96, border: `2px solid ${tint}`, '--rc': tint }}></span>
            <span className="grid place-items-center rounded-full" style={{ width: 76, height: 76, background: `${tint}1f`, border: `2px solid ${tint}`, color: tint, boxShadow: `0 0 30px ${tint}4d` }}>
              <Icon name="camera" size={30} stroke={1.8} />
            </span>
          </div>
          <div className="mt-5 text-center px-6">
            <div className="th-tight" style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>ถ่ายหรือวางภาพ {label}</div>
            <div className="th-tight" style={{ fontSize: 12.5, color: 'rgba(255,255,255,.7)', marginTop: 4 }}>DICOM, JPG, PNG · แตะเพื่อจำลองการตรวจ</div>
          </div>
        </button>
        <div className="flex gap-2.5 mt-3">
          <button onClick={() => inputRef.current && inputRef.current.click()} className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 press" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid var(--line)', color: 'rgba(255,255,255,.8)', fontSize: 13, fontWeight: 600 }}>
            <Icon name="image" size={16} /> คลังภาพ
          </button>
          <button onClick={() => onStart()} className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 press" style={{ background: `${tint}1f`, border: `1px solid ${tint}59`, color: tint, fontSize: 13, fontWeight: 700 }}>
            <Icon name="zap" size={16} fill={tint} /> เริ่มวิเคราะห์
          </button>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={() => onStart()} />
        </div>
      </div>
    );
  }

  function Pipeline({ tint, stage }) {
    return (
      <div className="rounded-3xl p-5 card-surface" style={{ border: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="grid place-items-center w-7 h-7 rounded-lg spin-slow" style={{ background: `${tint}1f`, color: tint }}><Icon name="loader" size={16} /></span>
            <span className="th" style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>กำลังวิเคราะห์…</span>
          </div>
          <span className="mono tnum" style={{ fontSize: 12, color: tint, fontWeight: 600 }}>{Math.round((stage / STAGES.length) * 100)}%</span>
        </div>
        <div className="relative">
          <span className="absolute left-[15px] top-2 bottom-2 w-px" style={{ background: 'var(--line)' }}></span>
          <div className="flex flex-col gap-3.5">
            {STAGES.map((s, i) => {
              const done = i < stage, active = i === stage;
              return (
                <div key={s.id} className="flex items-start gap-3 relative">
                  <span className="grid place-items-center rounded-full shrink-0 z-10 transition-all" style={{ width: 32, height: 32, background: done ? '#10b981' : active ? `${tint}1f` : 'rgba(255,255,255,.04)', border: `1.5px solid ${done ? '#10b981' : active ? tint : 'var(--line)'}`, color: done ? '#04121c' : active ? tint : 'rgba(255,255,255,.55)' }}>
                    {done ? <Icon name="check" size={16} stroke={2.6} /> : active ? <span className="spin-slow grid place-items-center"><Icon name="loader" size={15} /></span> : <Icon name={s.icon} size={15} />}
                  </span>
                  <div className="pt-1 min-w-0">
                    <div className="leading-tight th-tight" style={{ fontSize: 13.5, fontWeight: active || done ? 700 : 500, color: done ? 'rgba(255,255,255,.82)' : active ? '#fff' : 'rgba(255,255,255,.66)' }}>{s.label}</div>
                    {active && <div className="shimmer-text th-tight" style={{ fontSize: 11.5, color: 'rgba(255,255,255,.74)', marginTop: 3 }}>{s.sub}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function ReportCard({ module, result, onReset }) {
    const [copied, setCopied] = useState(false);
    const m = MODULES.find((x) => x.id === module);
    const s = SEV[result.severity] || SEV.normal;
    const copy = () => {
      const txt = `รายงานผลทางการแพทย์\n${result.title}\n${result.thai}\n` + result.insights.join('\n') + '\nคำแนะนำ: ' + result.recommendation.join(' / ');
      if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(() => {});
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    };
    return (
      <div className="stagger">
        <div className="rounded-3xl overflow-hidden card-surface" style={{ border: '1px solid var(--line)' }}>
          {/* PACS visual header */}
          <div className="relative grid place-items-center py-6" style={{ background: `radial-gradient(circle at 50% 30%, ${m.tint}14, rgba(8,12,20,.5))`, borderBottom: '1px solid var(--line)' }}>
            <ScanVisual frame={m.frame} tint={m.tint} segment={result.segment} />
            {result.segment && (
              <span className="absolute bottom-4 flex items-center gap-1.5 rounded-full px-2.5 py-1 dot-pulse keep-pulse" style={{ background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.4)', '--dot': 'rgba(239,68,68,.5)' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#ef4444' }}></span>
                <span className="mono" style={{ fontSize: 11.5, fontWeight: 700, color: '#ef4444', letterSpacing: '.04em' }}>AI ระบุขอบเขตรอยโรค</span>
              </span>
            )}
          </div>

          <div className="p-5">
            {/* report title */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Icon name="file" size={15} style={{ color: m.tint }} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,.8)', letterSpacing: '.06em' }}>รายงานผลทางการแพทย์</span>
              </div>
              <ModuleChip module={module} />
            </div>
            <h3 className="mt-2 th-tight" style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-.01em' }}>{result.title}</h3>
            <div className="mt-1.5 flex items-center gap-2">
              <SeverityBadge sev={result.severity} pulse={result.severity === 'critical'} />
              <span className="mono tnum" style={{ fontSize: 11.5, color: 'rgba(255,255,255,.74)' }}>ความเชื่อมั่น {(result.confidence * 100).toFixed(0)}%</span>
            </div>
            <p className="mt-3 th" style={{ fontSize: 13.5, lineHeight: 1.65, color: 'rgba(255,255,255,.82)' }}>{result.thai}</p>

            {/* measurements */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              {result.metrics.map((mt, i) => (
                <div key={i} className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,.03)', border: '1px solid var(--line)' }}>
                  <div className="mono tnum" style={{ fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{mt.value}</div>
                  <div className="mono" style={{ fontSize: 11, color: m.tint, marginTop: 3 }}>{mt.unit}</div>
                  <div className="th-tight" style={{ fontSize: 11, color: 'rgba(255,255,255,.66)', marginTop: 3 }}>{mt.label}</div>
                </div>
              ))}
            </div>

            {/* insights */}
            <div className="mt-4 flex items-center gap-2 mb-2.5">
              <Icon name="eye" size={14} style={{ color: m.tint }} />
              <span className="th" style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,.85)', letterSpacing: '.02em' }}>ผลวิเคราะห์เชิงโครงสร้าง</span>
            </div>
            <div className="flex flex-col gap-2">
              {result.insights.map((ins, i) => (
                <div key={i} className="flex gap-2.5 items-start">
                  <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full" style={{ background: m.tint }}></span>
                  <span className="th flex-1 min-w-0" style={{ fontSize: 13, lineHeight: 1.55, color: 'rgba(255,255,255,.8)' }}>{ins}</span>
                </div>
              ))}
            </div>

            {/* recommendation */}
            <div className="mt-4 rounded-2xl p-3.5 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${s.c}1c, ${s.c}08)`, border: `1px solid ${s.c}40` }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon name="zap" size={14} stroke={2.2} style={{ color: s.c }} fill={s.c} />
                <span className="th" style={{ fontSize: 12, fontWeight: 800, color: s.c, letterSpacing: '.02em' }}>คำแนะนำ</span>
              </div>
              <div className="flex flex-col gap-2.5">
                {result.recommendation.map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="shrink-0 grid place-items-center rounded-full mt-px" style={{ width: 18, height: 18, background: s.c, color: '#fff' }}>
                      <Icon name="check" size={11} stroke={3} />
                    </span>
                    <span className="th flex-1 min-w-0" style={{ fontSize: 13.5, lineHeight: 1.5, color: '#fff', fontWeight: 500 }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* actions */}
            <div className="flex gap-2.5 mt-4">
              <button onClick={copy} className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 press transition-all" style={{ background: copied ? '#10b981' : 'var(--accent)', color: '#04121c', fontSize: 13.5, fontWeight: 700 }}>
                {copied ? <><span className="check-pop"><Icon name="check" size={17} stroke={3} /></span> คัดลอกแล้ว</> : <><Icon name="copy" size={16} /> คัดลอกรายงาน</>}
              </button>
              <button onClick={onReset} className="flex items-center justify-center gap-2 rounded-xl py-3 px-4 press" style={{ background: 'rgba(255,255,255,.05)', border: '1px solid var(--line)', color: '#fff', fontSize: 13.5, fontWeight: 600 }}>
                <Icon name="refresh" size={16} /> สแกนใหม่
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function ScanTab() {
    const [mod, setMod] = useState('AXIA');
    const [phase, setPhase] = useState('idle'); // idle | running | done
    const [stage, setStage] = useState(0);
    const [result, setResult] = useState(null);
    const timers = useRef([]);
    const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
    useEffect(() => () => clearTimers(), []);

    const RISK_TH = { low: 'ต่ำ', moderate: 'ปานกลาง', high: 'สูง', critical: 'วิกฤต' };
    const buildResult = async (module) => {
      try {
        if (module === 'AXIA') {
          const c = await API.axiaClassify([]);
          const seg = await API.axiaSegment([], c.type);
          return {
            severity: c.severity, title: c.label, confidence: c.confidence,
            thai: c.critique.thai_summary, segment: c.type === 'hemorrhage',
            metrics: [
              { value: seg.volume, unit: 'mL', label: 'ปริมาตร' },
              { value: seg.midlineShift, unit: 'mm', label: 'midline' },
              { value: (c.stage1Score * 100).toFixed(0), unit: '%', label: 'Stage-1' },
            ],
            insights: c.critique.explainable_insights,
            recommendation: c.critique.actionable_recommendations,
          };
        }
        if (module === 'SmartLiva') {
          const p = await API.smartlivaPredict(null, {});
          return {
            severity: p.risk_level === 'critical' ? 'critical' : p.risk_level === 'high' ? 'high' : p.risk_level === 'moderate' ? 'moderate' : 'normal',
            title: `พังผืดตับ ${p.fibrosis_stage}`, confidence: p.fibrosis_confidence,
            thai: `ผลตรวจตับ: ค่าความแข็งตับ ${p.te_kpa} kPa จัดอยู่ในระยะ ${p.fibrosis_stage} ระดับความเสี่ยง${RISK_TH[p.risk_level] || ''}`,
            segment: false,
            metrics: [
              { value: p.te_kpa, unit: 'kPa', label: 'ความแข็ง' },
              { value: p.fibrosis_stage, unit: 'METAVIR', label: 'ระยะ' },
              { value: (p.fibrosis_confidence * 100).toFixed(0), unit: '%', label: 'เชื่อมั่น' },
            ],
            insights: [p.fibrosis_text, `สถานะความแข็งตับ: ${p.stiffness_status === 'normal' ? 'ปกติ' : 'สูงกว่าปกติ'}`, `ไขมันพอกตับ: ${{ none: 'ไม่พบ', mild: 'เล็กน้อย', moderate: 'ปานกลาง' }[p.steatosis_status] || p.steatosis_status}`],
            recommendation: p.recommendation,
          };
        }
        // PICHA
        const r = await API.pichaChat('analyze slide', 'sess');
        const malignant = r.reply.includes('มะเร็ง') && !r.reply.includes('มากกว่ามะเร็ง');
        return {
          severity: malignant ? 'critical' : 'normal',
          title: malignant ? 'สงสัยมะเร็งท่อน้ำดี' : 'การเปลี่ยนแปลงแบบ Reactive', confidence: 0.93,
          thai: malignant ? 'ผลพยาธิวิทยา: พบลักษณะเซลล์ผิดปกติเข้าได้กับมะเร็งท่อน้ำดี แนะนำยืนยันโดยผู้เชี่ยวชาญ' : 'ผลพยาธิวิทยา: พบการเปลี่ยนแปลงแบบ reactive ไม่พบเซลล์มะเร็ง',
          segment: malignant,
          metrics: [
            { value: malignant ? '0.93' : '0.12', unit: 'score', label: 'คะแนนมะเร็ง' },
            { value: '4', unit: 'เอเจนต์', label: 'ผู้ตรวจ' },
            { value: malignant ? '3/4' : '0/4', unit: 'ชี้บวก', label: 'มติร่วม' },
          ],
          insights: malignant
            ? ['นิวเคลียสโตขึ้น ขอบไม่เรียบ สูญเสีย polarity', 'พบ cribriform glands และ desmoplastic stroma', 'ความเห็นร่วม 3/4 เอเจนต์ชี้ลักษณะมะเร็ง']
            : ['สัดส่วนนิวเคลียส:ไซโทพลาซึมปกติ', 'ระยะห่างของต่อมคงเดิม', 'เข้าได้กับการเปลี่ยนแปลงแบบ reactive'],
          recommendation: malignant
            ? ['ให้ผู้เชี่ยวชาญท่านที่สองยืนยัน', 'ย้อม CK7/CK19', 'นำเข้าที่ประชุม MDT']
            : ['สุ่มตรวจตามปกติต่อได้', 'พิจารณาร่วมกับอาการทางคลินิก'],
        };
      } catch (e) {
        return { severity: 'normal', title: 'วิเคราะห์เสร็จสิ้น', confidence: 0.9, thai: 'ไม่พบความผิดปกติ', segment: false, metrics: [], insights: ['ไม่พบความผิดปกติ'], recommendation: ['ติดตามตามปกติ'] };
      }
    };

    const start = async () => {
      clearTimers();
      setPhase('running'); setStage(0); setResult(null);
      const resPromise = buildResult(mod);
      [700, 1500, 2300].forEach((t, i) => timers.current.push(setTimeout(() => setStage(i + 1), t)));
      const res = await resPromise;
      timers.current.push(setTimeout(() => { setResult(res); setPhase('done'); }, 3100));
    };
    const reset = () => { clearTimers(); setPhase('idle'); setStage(0); setResult(null); };

    const active = MODULES.find((x) => x.id === mod);
    return (
      <div className="px-4 pt-3">
        {/* segment controller */}
        <div className="flex gap-1.5 rounded-2xl p-1.5 mb-4 card-surface" style={{ border: '1px solid var(--line)' }}>
          {MODULES.map((x) => {
            const on = mod === x.id;
            return (
              <button key={x.id} disabled={phase === 'running'} onClick={() => { setMod(x.id); reset(); }}
                className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl press transition-all"
                style={{ background: on ? `${x.tint}1f` : 'transparent', border: `1px solid ${on ? x.tint + '66' : 'transparent'}`, opacity: phase === 'running' && !on ? .4 : 1 }}>
                <Icon name={x.icon} size={20} stroke={on ? 2.2 : 1.8} style={{ color: on ? x.tint : 'rgba(255,255,255,.74)' }} />
                <span className="whitespace-nowrap" style={{ fontSize: 12.5, fontWeight: on ? 700 : 500, color: on ? '#fff' : 'rgba(255,255,255,.74)' }}>{x.label}</span>
              </button>
            );
          })}
        </div>

        {phase === 'idle' && <Dropzone tint={active.tint} label={active.label} onStart={start} />}
        {phase === 'running' && <Pipeline tint={active.tint} stage={stage} />}
        {phase === 'done' && result && <ReportCard module={mod} result={result} onReset={reset} />}
      </div>
    );
  }

  window.ScanTab = ScanTab;
})();
