import React, { useState, useEffect, useCallback } from 'react';
import { Icon, Badge, RadialGauge, Btn, Card, PageHeader, PatientStrip, StatusDot, KV } from './ui.jsx';
import { pichaAnalyzeStream, ApiError } from '../lib/api.js';

// ============================================================
// PICHA AI — Digital Pathology (Real API Integration)
// ============================================================

const MARS_AGENTS = [
  { id: "SlideQC", role: "Image quality & focus check", icon: "scan-search", time: 320, log: "Tile-level QC complete · 0 blur / 0 fold / 0 pen-mark artifacts across 41,328 tiles." },
  { id: "Parasitologist", role: "Liver fluke (O. viverrini) screen", icon: "bug", time: 540, log: "Detected ova clusters in 6 ducts · suggestive of chronic opisthorchiasis. Confidence 0.91." },
  { id: "Grading", role: "Nuclear grade & mitotic count", icon: "grid-2x2", time: 480, log: "Nuclear pleomorphism G3 · mitoses 12 / 10 HPF · necrosis present." },
  { id: "Spatial", role: "Tumor-immune neighborhood map", icon: "git-fork", time: 720, log: "CD8+ infiltrate spatial entropy 2.41 · 'cold' tumor edge phenotype dominant." },
  { id: "Oncologist", role: "Clinical correlation & staging", icon: "stethoscope", time: 600, log: "Stage pT3 N1 — perineural invasion present. Margins R1 anterior." },
  { id: "TimeMachine", role: "Longitudinal risk projection", icon: "history", time: 460, log: "Projected 24-mo recurrence risk 64% (95% CI 58–71%). Suggests adjuvant gem/cis." },
  { id: "Report", role: "Synthesis & report drafting", icon: "file-signature", time: 380, log: "Composed structured pathology report · 7 sections · ready for sign-out." },
];

function Picha({ running: globalRunning }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | fetching | anonymizing | queued | analyzing | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isMockMode, setMock] = useState(false);

  const [heatOn, setHeatOn] = useState(true);
  const [zoom, setZoom] = useState("20x");
  const [streamStep, setStreamStep] = useState(0);

  const handleFile = useCallback((f) => {
    if (!f) return;
    setFile(f);
    setError('');
  }, []);

  const runAnalysis = useCallback(async () => {
    if (!file) return;
    setStatus('anonymizing');
    setResult(null);
    setError('');
    setMock(false);
    setStreamStep(0);

    try {
      await new Promise(r => setTimeout(r, 600));
      setStatus('queued');
      await new Promise(r => setTimeout(r, 800));
      setStatus('analyzing');

      // Simulate agent progress while API is running
      let agentInterval = setInterval(() => {
        setStreamStep(s => Math.min(s + 1, MARS_AGENTS.length - 1));
      }, 1500);

    try {
      const data = await pichaAnalyze(file, "3041-558");
      clearInterval(agentInterval);
      setStreamStep(MARS_AGENTS.length);
      setResult(data);
      setStatus('done');
    } catch (err) {
      clearInterval(agentInterval);
      if (err instanceof ApiError && err.status === 503) {
        setMock(true);
        setTimeout(() => {
          setStreamStep(MARS_AGENTS.length);
          setResult({
            diagnosis: "Intrahepatic cholangiocarcinoma",
            confidence: 0.94,
            grade: "G3 poorly differentiated",
            recommendation: "Adjuvant gemcitabine–cisplatin (TimeMachine: 64% 24-mo recurrence)."
          });
          setStatus('done');
        }, 1000);
      } else {
        setError(err.message || 'Analysis failed. Please try again.');
        setStatus('error');
        setStreamStep(0);
      }
    }
  }, [file]);

  const reset = () => {
    setFile(null);
    setStatus('idle');
    setResult(null);
    setError('');
    setMock(false);
    setStreamStep(0);
  };

  const fetchFromPACS = async () => {
    setFile(null); 
    setError('');
    setStatus('fetching');
    
    try {
      const data = await coreOrchestrate(null, '3041-558', 'picha');
      const pipeline = data.pipeline_results;
      
      if (!pipeline.stage1_quality_gate.passed) {
        setError(pipeline.stage1_quality_gate.reject_reason || 'Quality gate failed. Image rejected.');
        setStatus('error');
        return;
      }

      setStatus('anonymizing');
      await new Promise(r => setTimeout(r, 1000));
      setStatus('queued');
      await new Promise(r => setTimeout(r, 800));
      setStatus('analyzing');

      // Simulate agent progress
      let agentInterval = setInterval(() => {
        setStreamStep(s => Math.min(s + 1, MARS_AGENTS.length - 1));
      }, 800);
      
      await new Promise(r => setTimeout(r, MARS_AGENTS.length * 800 + 500));
      clearInterval(agentInterval);
      
      setStreamStep(MARS_AGENTS.length);
      const formatter = pipeline.stage4_formatter;
      
      setResult({
        diagnosis: formatter.primary_finding || "Intrahepatic cholangiocarcinoma",
        confidence: pipeline.stage2_analysis.raw_findings?.confidence || 0.94,
        grade: "G3 poorly differentiated",
        recommendation: formatter.actionable_recommendations
      });
      setMock(true);
      setStatus('done');
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setStatus('anonymizing');
        await new Promise(r => setTimeout(r, 1000));
        setStatus('queued');
        await new Promise(r => setTimeout(r, 800));
        setStatus('analyzing');
        
        let agentInterval = setInterval(() => {
          setStreamStep(s => Math.min(s + 1, MARS_AGENTS.length - 1));
        }, 800);
        await new Promise(r => setTimeout(r, MARS_AGENTS.length * 800 + 500));
        clearInterval(agentInterval);
        
        setStreamStep(MARS_AGENTS.length);
        setResult({
          diagnosis: "Intrahepatic cholangiocarcinoma",
          confidence: 0.94,
          grade: "G3 poorly differentiated",
          recommendation: "Adjuvant gemcitabine–cisplatin (TimeMachine: 64% 24-mo recurrence)."
        });
        setMock(true);
        setStatus('done');
      } else {
        setError(err.message || 'Fetch failed.');
        setStatus('error');
      }
    }
  };

  const isRunning = ['fetching', 'anonymizing', 'queued', 'analyzing'].includes(status) || globalRunning;

  return (
    <div className="fade-up space-y-4">
      <PageHeader
        eyebrow="PICHA AI · Digital Pathology"
        title={result ? (
          <>{result.diagnosis} · <span className="accent-text">{result.grade || 'grade 3'}</span> — MARS multi-agent diagnostic</>
        ) : (
          <>Digital Pathology Multi-Agent Analysis</>
        )}
        subtitle="Whole-slide explainability with H&E normalization, Grad-CAM attribution and 7 specialist AutoGen agents reasoning in sequence."
        right={
          <>
            <Badge tone="accent"><Icon name="sparkles" size={11} /> MARS v2 · 7 agents</Badge>
            {isMockMode && <Badge tone="warn"><Icon name="wifi-off" size={11} /> Demo Mode</Badge>}
            {result && <Btn icon="file-down" size="sm">Export PDF report</Btn>}
          </>
        }
      />

      <PatientStrip items={[
        { k: "Patient", v: "Pongsakorn, Thanawat · 63M" },
        { k: "MRN", v: "3041-558" },
        { k: "Slide", v: "CCA-0142 · H&E" },
        { k: "Scanner", v: "Aperio AT2 · 40x" },
        { k: "Block", v: "B12 · liver hilum, R-lobectomy" },
        { k: "Tiles", v: "41,328" },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: viewers */}
        <Card className={status === 'idle' || status === 'error' ? "lg:col-span-12 max-w-4xl mx-auto w-full" : "lg:col-span-5"} padded={false}>
          {status === 'idle' || status === 'error' ? (
            <div className="p-10 flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-full max-w-lg border rounded-xl p-8 flex flex-col items-center justify-center text-center bg-slate-50">
                <Icon name="database" size={32} className="text-slate-400 mb-3" />
                <div className="text-[15px] font-semibold text-slate-800">Fetch study from PACS</div>
                <div className="text-[13px] text-slate-500 mt-1 mb-6">Pull current pathology WSI directly from hospital VNA</div>
                
                <div className="w-full flex items-center gap-2">
                   <div className="flex-1 bg-white border border-slate-200 shadow-sm rounded-md px-3 py-2 text-left text-[13px] font-mono text-slate-700 flex items-center justify-between">
                     <span>MRN: 3041-558</span>
                     <Badge tone="neutral">WSI H&E</Badge>
                   </div>
                   <Btn icon="cloud-download" onClick={fetchFromPACS}>Fetch Study</Btn>
                </div>

                <div className="flex items-center gap-4 w-full my-6">
                  <div className="h-px bg-slate-200 flex-1" />
                  <span className="text-[11px] t-muted font-medium uppercase tracking-wider">OR</span>
                  <div className="h-px bg-slate-200 flex-1" />
                </div>

                <div 
                  className="w-full border-2 border-dashed border-slate-300 bg-white rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => document.getElementById('picha-file-upload').click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
                >
                  <input id="picha-file-upload" type="file" className="hidden" accept="image/*,.svs,.ndpi" onChange={e => handleFile(e.target.files[0])} />
                  <Icon name="upload-cloud" size={20} className="text-slate-400 mb-2" />
                  <div className="text-[13px] font-medium text-slate-700">Manual upload for external files</div>
                  <div className="text-[11.5px] text-slate-500 mt-0.5">JPEG, PNG, SVS, NDPI up to 2GB</div>
                </div>

                {file && (
                  <div className="mt-4 w-full text-left">
                    <div className="p-2 bg-white rounded-md border shadow-sm w-full text-sm font-mono text-slate-600 truncate mb-3">
                      {file.name}
                    </div>
                    <Btn className="w-full" icon="sparkles" onClick={runAnalysis} disabled={isRunning}>
                      {isRunning ? "Starting MARS Agents..." : "Start PICHA MARS Diagnostics"}
                    </Btn>
                  </div>
                )}
              </div>
              
              {error && (
                <div className="mt-4 text-sm text-[#c1272d] bg-[#fde8e9] px-3 py-2 rounded-md border border-[#f4c5c8] flex items-center gap-2 w-full max-w-lg">
                  <Icon name="triangle-alert" size={14} /> {error}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b hairline flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge tone="accent"><Icon name="microscope" size={11} /> {zoom}</Badge>
                  <Badge tone="neutral">Macenko · normalized</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={reset} className="px-2.5 h-7 rounded-md text-[12px] border border-slate-200 t-secondary bg-white hover:bg-slate-50 font-medium flex items-center gap-1.5">
                    <Icon name="x" size={12} /> Clear
                  </button>
                  <div className="w-px h-5 bg-slate-200 mx-1.5" />
                  {["10x", "20x", "40x"].map((z) => (
                    <button
                      key={z}
                      onClick={() => setZoom(z)}
                      className={`px-2 h-7 rounded-md text-[12px] border accent-transition font-medium whitespace-nowrap
                        ${zoom === z ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent-text)]" : "border-slate-200 t-secondary bg-white hover:bg-slate-50"}`}
                    >
                      {z}
                    </button>
                  ))}
                  <div className="w-px h-5 bg-slate-200 mx-1.5" />
                  <button
                    onClick={() => setHeatOn(!heatOn)}
                    className={`px-2.5 h-7 rounded-md text-[12px] border accent-transition font-medium whitespace-nowrap inline-flex items-center gap-1.5
                      ${heatOn ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent-text)]" : "border-slate-200 t-secondary bg-white hover:bg-slate-50"}`}
                  >
                    <Icon name="flame" size={12} /> Explainability
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2">
                <div className="relative aspect-square border-r hairline overflow-hidden">
                  <Slide />
                  <div className="absolute top-2 left-2 font-mono whitespace-nowrap text-[10.5px] text-slate-800/90 bg-white/80 px-1.5 py-0.5 rounded">H&E · Macenko normalized</div>
                  <div className="absolute bottom-2 right-2 font-mono whitespace-nowrap text-[10.5px] text-slate-800/90 bg-white/80 px-1.5 py-0.5 rounded">{zoom}</div>
                </div>
                <div className="relative aspect-square overflow-hidden">
                  <Slide />
                  {heatOn && result && <Heatmap />}
                  <div className="absolute top-2 left-2 font-mono whitespace-nowrap text-[10.5px] text-white bg-violet-700/90 px-1.5 py-0.5 rounded">Grad-CAM · violet attribution</div>
                  {result && <div className="absolute bottom-2 right-2 font-mono whitespace-nowrap text-[10.5px] text-white bg-violet-700/90 px-1.5 py-0.5 rounded">conf {(result.confidence || 0.94).toFixed(2)}</div>}
                  {status === 'analyzing' && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      <div className="absolute left-0 right-0 h-px scan-line bg-violet-300" />
                    </div>
                  )}
                  {isRunning && status !== 'analyzing' && (
                    <div className="absolute inset-0 overflow-hidden pointer-events-none bg-black/40 flex items-center justify-center backdrop-blur-sm z-10">
                      <div className="text-white flex flex-col items-center gap-3 font-medium">
                        <Icon name="loader" size={24} className="animate-spin" />
                        {status === 'fetching' ? 'Fetching from PACS...' :
                         status === 'anonymizing' ? 'De-identifying DICOM headers...' :
                         status === 'queued' ? 'Queued in GPU cluster...' :
                         'Analyzing...'}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-4 py-2.5 border-t hairline flex items-center gap-2 text-[12px] flex-wrap">
                <span className="t-muted">Legend</span>
                <Badge tone="neutral"><span className="w-2 h-2 rounded-sm inline-block mr-1" style={{ background: "#8b5cf6" }} /> tumor attribution</Badge>
                <Badge tone="neutral"><span className="w-2 h-2 rounded-sm inline-block mr-1" style={{ background: "#e879f9" }} /> high gradient</Badge>
                <span className="ml-auto t-muted">7 ROIs · 12 mitoses</span>
              </div>
            </>
          )}
        </Card>

        {/* Center: MARS agent reasoning */}
        {status !== 'idle' && status !== 'error' && (
        <Card className="lg:col-span-4" eyebrow="MARS reasoning" title="7-agent diagnostic stream"
          right={<Badge tone={streamStep === MARS_AGENTS.length ? "ok" : "accent"}>
            <StatusDot tone={streamStep === MARS_AGENTS.length ? "ok" : "info"} />
            {streamStep === MARS_AGENTS.length ? "Complete" : `Step ${streamStep}/${MARS_AGENTS.length}`}
          </Badge>}>
          <AgentStream streamStep={streamStep} />
        </Card>
        )}

        {/* Right: report */}
        {result && (
          <div className="lg:col-span-3 space-y-4">
            <Card eyebrow="Findings" title="Diagnostic confidence">
              <div className="flex items-center gap-3">
                <RadialGauge value={(result.confidence || 0.94) * 100} unit="%" label="Confidence" color="var(--accent)" size={100} stroke={7} />
                <div className="flex-1 space-y-1">
                  <KV k="Top class" v={<span className="font-mono text-[color:var(--accent-text)]">iCCA, {result.grade || 'G3'}</span>} />
                  <KV k="2nd class" v={<span className="font-mono">HCC, G3 · 0.04</span>} />
                  <KV k="OOD" v={<span className="text-[#066c44] font-semibold">in-distribution</span>} />
                </div>
              </div>
            </Card>
            <ReportCard result={result} />
          </div>
        )}
      </div>
    </div>
  );
}

function AgentStream({ streamStep }) {
  return (
    <ol className="space-y-2">
      {MARS_AGENTS.map((a, i) => {
        const done = i + 1 <= streamStep;
        const active = i + 1 === streamStep + 1 && streamStep < MARS_AGENTS.length;
        return (
          <li
            key={a.id}
            className={`relative rounded-md border accent-transition
              ${done ? "border-[color:var(--accent)]/30 bg-[color:var(--accent-soft)]/40" : "border-slate-200 bg-slate-50"}`}
          >
            <div className="px-3 py-2.5 flex items-start gap-2.5">
              <span
                className="relative w-7 h-7 rounded-md grid place-items-center shrink-0 border accent-transition"
                style={done ? { color: "var(--accent-text)", background: "var(--surface)", borderColor: "var(--accent)" } : { color: "#64748b", background: "white", borderColor: "var(--line)" }}
              >
                {done && i + 1 < streamStep ? <Icon name="check" size={13} /> : <Icon name={a.icon} size={13} />}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className="text-[12.5px] font-semibold t-primary">Agent {i + 1} · {a.id}</span>
                  <span className="ml-auto font-mono text-[10.5px] t-muted">{done ? `${(a.time/1000).toFixed(2)} s` : active ? "running…" : "queued"}</span>
                </div>
                <div className="text-[11.5px] t-muted leading-tight">{a.role}</div>
                {done && (
                  <div className="mt-1.5 text-[12px] t-primary leading-snug font-mono">
                    <span className="t-muted mr-1">›</span>{a.log}
                    {i + 1 === streamStep && <span className="caret inline-block w-1.5 h-3 align-middle bg-[color:var(--accent)] ml-0.5" />}
                  </div>
                )}
                {active && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px] t-secondary">
                    <div className="h-1 w-32 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full accent-bg" style={{ width: "55%", transition: "width 600ms ease" }} />
                    </div>
                    <span>streaming tokens…</span>
                  </div>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ReportCard({ result }) {
  return (
    <div className="card card-elev overflow-hidden">
      <div className="px-4 py-3 border-b hairline flex items-center justify-between">
        <div>
          <div className="label-eyebrow">Clinical pathology report</div>
          <div className="text-[14px] font-semibold t-primary tracking-[-0.005em]">CCA-0142 · sign-out draft</div>
        </div>
        <Badge tone="warn"><Icon name="lock" size={10} /> Draft</Badge>
      </div>
      <div className="px-4 py-3 text-[12.5px] t-primary leading-relaxed space-y-2.5">
        <div>
          <div className="label-eyebrow mb-0.5">Diagnosis</div>
          <div className="font-semibold">{result.diagnosis}, mass-forming, <span className="accent-text">{result.grade || "G3 poorly differentiated"}</span>.</div>
        </div>
        <div>
          <div className="label-eyebrow mb-0.5">Microscopy</div>
          <div className="t-secondary">Infiltrating glands with desmoplastic stroma. Perineural invasion present. Lymphovascular invasion focal. Background liver: chronic opisthorchiasis with periductal fibrosis.</div>
        </div>
        <div>
          <div className="label-eyebrow mb-0.5">Margins · stage</div>
          <div className="font-mono">R1 anterior · pT3 N1 (2/8 LN) · LVI+ PNI+</div>
        </div>
        <div>
          <div className="label-eyebrow mb-0.5">Recommendation</div>
          <div className="t-secondary">{result.recommendation || "Adjuvant gemcitabine–cisplatin (TimeMachine: 64% 24-mo recurrence). MDT review Friday."}</div>
        </div>
      </div>
      <div className="px-4 py-3 border-t hairline flex items-center gap-2 bg-slate-50">
        <Btn icon="check" size="sm" className="flex-1">Sign &amp; release</Btn>
        <Btn variant="secondary" icon="file-down" size="sm">PDF</Btn>
      </div>
    </div>
  );
}

function Slide() {
  return (
    <svg viewBox="0 0 400 400" className="w-full h-full">
      <defs>
        <pattern id="nuclei" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="4" r="1.4" fill="#5b21b6" />
          <circle cx="10" cy="9" r="1.0" fill="#6d28d9" />
          <circle cx="6" cy="12" r="1.2" fill="#4c1d95" />
          <circle cx="12" cy="2" r="0.9" fill="#6d28d9" />
        </pattern>
        <pattern id="nucleiDense" width="9" height="9" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="3" r="1.4" fill="#3b0764" />
          <circle cx="6" cy="6" r="1.6" fill="#4c1d95" />
          <circle cx="8" cy="2" r="1.1" fill="#5b21b6" />
        </pattern>
        <radialGradient id="tissue" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="#fecdd3" />
          <stop offset="40%" stopColor="#fbcfe8" />
          <stop offset="100%" stopColor="#f9a8d4" />
        </radialGradient>
        <filter id="slideBlur"><feGaussianBlur stdDeviation="0.5" /></filter>
      </defs>

      <rect x="0" y="0" width="400" height="400" fill="url(#tissue)" />
      <rect x="0" y="0" width="400" height="400" fill="url(#nuclei)" opacity="0.85" />

      <g filter="url(#slideBlur)">
        <ellipse cx="120" cy="140" rx="55" ry="42" fill="#f0abfc" opacity="0.6" />
        <ellipse cx="120" cy="140" rx="55" ry="42" fill="url(#nucleiDense)" />
        <ellipse cx="270" cy="190" rx="68" ry="52" fill="#f0abfc" opacity="0.55" />
        <ellipse cx="270" cy="190" rx="68" ry="52" fill="url(#nucleiDense)" />
        <ellipse cx="180" cy="290" rx="48" ry="38" fill="#f0abfc" opacity="0.5" />
        <ellipse cx="180" cy="290" rx="48" ry="38" fill="url(#nucleiDense)" />
        <ellipse cx="320" cy="320" rx="38" ry="30" fill="#f0abfc" opacity="0.5" />
        <ellipse cx="320" cy="320" rx="38" ry="30" fill="url(#nucleiDense)" />
      </g>

      <g opacity="0.7">
        <ellipse cx="115" cy="138" rx="14" ry="9" fill="#fff1f2" />
        <ellipse cx="260" cy="185" rx="20" ry="13" fill="#fff1f2" />
        <ellipse cx="178" cy="288" rx="12" ry="8" fill="#fff1f2" />
      </g>

      <g fill="#3b0764" opacity="0.85">
        <circle cx="65" cy="320" r="2" />
        <circle cx="70" cy="324" r="2" />
        <circle cx="62" cy="328" r="1.6" />
        <circle cx="78" cy="318" r="1.7" />
      </g>

      <g stroke="#1e1b4b" strokeWidth="1.2" fill="#3b0764">
        <g><line x1="150" y1="160" x2="156" y2="158" /><circle cx="153" cy="159" r="1.2" /></g>
        <g><line x1="285" y1="175" x2="291" y2="173" /><circle cx="288" cy="174" r="1.2" /></g>
      </g>
    </svg>
  );
}

function Heatmap() {
  return (
    <svg viewBox="0 0 400 400" className="absolute inset-0 w-full h-full pointer-events-none" style={{ mixBlendMode: "multiply" }}>
      <defs>
        <radialGradient id="hot1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.85" />
          <stop offset="40%" stopColor="#6d28d9" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#4c1d95" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hot2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.70" />
          <stop offset="60%" stopColor="#7c3aed" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#4c1d95" stopOpacity="0" />
        </radialGradient>
        <filter id="heatBlur"><feGaussianBlur stdDeviation="6" /></filter>
      </defs>
      <g filter="url(#heatBlur)">
        <ellipse cx="120" cy="140" rx="70" ry="55" fill="url(#hot1)" />
        <ellipse cx="270" cy="190" rx="86" ry="65" fill="url(#hot1)" />
        <ellipse cx="180" cy="290" rx="58" ry="46" fill="url(#hot2)" />
        <ellipse cx="320" cy="320" rx="44" ry="34" fill="url(#hot2)" />
      </g>
      <g fill="none" stroke="#7c3aed" strokeWidth="0.8" opacity="0.55">
        <ellipse cx="270" cy="190" rx="72" ry="54" />
        <ellipse cx="270" cy="190" rx="54" ry="40" strokeDasharray="3 3" />
      </g>
    </svg>
  );
}

export default Picha;