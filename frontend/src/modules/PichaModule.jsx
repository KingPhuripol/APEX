import { useState, useRef, useEffect, useCallback } from 'react';
import { pichaChat, pichaHealth, pichaAnalyze } from '../lib/api';
import {
  Microscope, Send, Bot, User, Maximize2, Layers, Loader2,
  WifiOff, CheckCircle2, Clock, Zap, RefreshCw, FileSearch,
  Activity, AlertTriangle, ChevronDown, ChevronUp, Upload, CheckCircle
} from 'lucide-react';
import MedicalReportModal from '../components/MedicalReportModal';
import { playScanBlip, playAlertPing, playSuccessChime } from '../lib/audio';

// ─── MARS agent definitions ──────────────────────────────────────────────────
const MARS_AGENTS = [
  {
    id: 'SlideQC',
    icon: <FileSearch className="w-3.5 h-3.5" />,
    role: 'Image quality & focus check',
    durationMs: 320,
    color: 'text-gray-400',
    log: 'Tile-level QC complete · 0 blur / 0 fold / 0 pen-mark artifacts across 41,328 tiles.',
  },
  {
    id: 'Parasitologist',
    icon: <Activity className="w-3.5 h-3.5" />,
    role: 'Liver fluke (O. viverrini) screen',
    durationMs: 540,
    color: 'text-emerald-400',
    log: 'Detected ova clusters in 6 ducts · chronic opisthorchiasis. Confidence 0.91.',
  },
  {
    id: 'Grading',
    icon: <Layers className="w-3.5 h-3.5" />,
    role: 'Nuclear grade & mitotic count',
    durationMs: 480,
    color: 'text-violet-300', // lighter violet
    log: 'Nuclear pleomorphism G3 · mitoses 12/10 HPF · necrosis present.',
  },
  {
    id: 'Spatial',
    icon: <Maximize2 className="w-3.5 h-3.5" />,
    role: 'Tumor-immune neighborhood map',
    durationMs: 720,
    color: 'text-blue-300', // lighter blue
    log: 'CD8+ infiltrate spatial entropy 2.41 · "cold" tumor edge phenotype.',
  },
  {
    id: 'Oncologist',
    icon: <Microscope className="w-3.5 h-3.5" />,
    role: 'Clinical correlation & staging',
    durationMs: 600,
    color: 'text-pink-300', // lighter pink
    log: 'Stage pT3 N1 — perineural invasion present. Margins R1 anterior.',
  },
  {
    id: 'TimeMachine',
    icon: <Clock className="w-3.5 h-3.5" />,
    role: 'Longitudinal risk projection',
    durationMs: 460,
    color: 'text-amber-400',
    log: 'Projected 24-mo recurrence risk 64% (95% CI 58–71%). Suggests adjuvant gem/cis.',
  },
  {
    id: 'Report',
    icon: <Zap className="w-3.5 h-3.5" />,
    role: 'Synthesis & report drafting',
    durationMs: 380,
    color: 'text-cyan-400',
    log: 'Structured pathology report composed · 7 sections · ready for sign-out.',
  },
];

const PICHA_REPLIES = [
  "Based on the MARS 7-agent analysis:\n\n**Diagnosis**: Intrahepatic cholangiocarcinoma (iCCA), mass-forming, **Grade 3 poorly differentiated**.\n\n**Key findings:**\n- Nuclear pleomorphism G3, mitoses 12/10 HPF\n- Perineural invasion, focal LVI\n- Background: chronic opisthorchiasis\n- Stage: pT3 N1 (2/8 LN)\n\n*This is AI-assisted analysis. Pathologist sign-out required.*",
  "**Margin status:**\n- Anterior margin: R1 (positive, < 1mm)\n- All other margins: R0\n\n**TimeMachine projection:** 64% 24-month recurrence risk. Adjuvant gemcitabine-cisplatin is recommended per BTC guidelines.",
];

function PhaseStep({ active, done, title, desc }) {
  return (
    <div className={`p-3 rounded-lg border transition-all duration-300 ${
      active ? 'bg-violet-500/10 border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.1)] transform scale-[1.02]' : 
      done ? 'bg-[var(--surface-2)] border-[var(--line-strong)]' : 
      'bg-[var(--surface)] border-[var(--line)] opacity-50'
    }`}>
        <div className="flex items-center justify-between mb-1">
            <span className={`text-sm font-bold ${active ? 'text-violet-300' : done ? 'text-[var(--text)]' : 'text-[#666]'}`}>{title}</span>
            {done ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : active ? <Loader2 className="w-4 h-4 text-violet-400 animate-spin" /> : null}
        </div>
        <div className="text-xs text-[var(--text-2)]">{desc}</div>
        {active && (
            <div className="mt-2 h-1 w-full bg-[var(--surface-3)] rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 w-1/2 animate-pulse rounded-full" />
            </div>
        )}
    </div>
  )
}

function AgentStream({ completedCount, isRunning }) {
  return (
    <div className="space-y-2">
      {MARS_AGENTS.map((agent, i) => {
        const done   = i < completedCount;
        const active = i === completedCount && isRunning;
        
        // Hide agents that have not started yet
        if (!done && !active) return null;

        return (
          <div
            key={agent.id}
            className={`rounded-md border animate-fade-in transition-all duration-300 ${
              done   ? 'bg-[var(--surface-3)] border-[var(--line-strong)] shadow-sm' :
              active ? 'bg-[#1e1b4b] border-violet-500/60 shadow-[0_0_10px_rgba(139,92,246,0.2)] scale-[1.01]' :

              'bg-[var(--surface)] border-[var(--line)] opacity-50'
            }`}
          >
            <div className="px-3 py-2.5 flex items-start gap-3">
              <span className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                done   ? 'bg-[var(--surface)] border-[var(--line)] text-[var(--ok)]' :
                active ? 'bg-violet-600 border-violet-400 text-white shadow-[0_0_8px_rgba(139,92,246,0.5)]' :
                'bg-[var(--surface-2)] border-[var(--line-strong)] text-[var(--muted)]'
              }`}>
                {done ? <CheckCircle2 className="w-4 h-4" /> : agent.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-bold ${active ? 'text-violet-300' : 'text-[var(--text)]'}`}>
                    {agent.id}
                  </span>
                  <span className="text-xs font-mono text-[var(--muted)]">
                    {done ? `${(agent.durationMs / 1000).toFixed(2)}s` : active ? 'Reasoning...' : 'Queued'}
                  </span>
                </div>
                <div className="text-sm text-[var(--text-2)] leading-tight mt-0.5">{agent.role}</div>
                {done && (
                  <div className={`mt-1.5 text-xs leading-snug font-mono ${agent.color}`}>
                    › {agent.log}
                  </div>
                )}
                {active && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1 w-24 rounded-full bg-[var(--surface-2)] overflow-hidden">
                      <div className="h-full bg-violet-400 w-1/2 animate-pulse rounded-full" />
                    </div>
                    <span className="text-[10px] text-violet-300 uppercase tracking-wider animate-pulse">Synthesizing...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function PichaModule({ patientId }) {
  const [heatOn, setHeatOn]       = useState(true);
  const [zoom, setZoom]           = useState('20x');
  
  // Pipeline state
  const [status, setStatus]       = useState('idle'); // 'idle' | 'phase1' | 'phase2' | 'done'
  const [phase1Step, setPhase1Step] = useState(0); // 0, 1, 2, 3, 4
  const [agentsDone, setDone]     = useState(0);
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [messages, setMessages]   = useState([{
    role: 'assistant',
    content: '**MARS 7-Agent Pathology** initialized. \nPlease upload a slide/image to begin analysis.',
  }]);
  const [input, setInput]         = useState('');
  const [chatLoading, setChatL]   = useState(false);
  const [isOnline, setOnline]     = useState(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  
  // Demo Gallery state
  const [demoImages, setDemoImages] = useState([]);

  useEffect(() => {
    fetch('/demo-dataset/manifest.json')
      .then(res => res.json())
      .then(data => {
        if (data.picha) setDemoImages(data.picha);
      })
      .catch(err => console.error('Failed to load demo manifest:', err));
  }, []);
  
  const mockReplyIdx              = useRef(0);
  const chatEndRef                = useRef(null);

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  const handleFileUpload = async (e) => {
    const file = e.target.files ? e.target.files[0] : e;
    if (!file) return;
    
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setAnalysisResult(null);
    setDone(0);
    
    // --- Phase 1: Pre-screening ---
    setStatus('phase1');
    
    setPhase1Step(1); // Tiling
    playScanBlip();
    await delay(1200);
    
    setPhase1Step(2); // Normalization
    playScanBlip();
    await delay(1200);
    
    setPhase1Step(3); // QC
    playScanBlip();
    await delay(1000);
    
    setPhase1Step(4); // ConvNeXt 9-Class
    playScanBlip();
    await delay(1500);

    // --- Phase 2: MARS Agents ---
    setStatus('phase2');
    
    let i = 0;
    const progressInterval = setInterval(() => {
      i += 1;
      if (i <= MARS_AGENTS.length - 1) {
        setDone(i);
        playScanBlip();
      }
    }, 800);

    try {
      const res = await pichaAnalyze(file, patientId);
      clearInterval(progressInterval);
      setDone(MARS_AGENTS.length);
      setStatus('done');
      playSuccessChime();
      if (res.status === 'success') {
        setAnalysisResult(res.pipeline_results);
      }
    } catch (err) {
      console.error(err);
      clearInterval(progressInterval);
      setStatus('idle');
    }
  };

  useEffect(() => {
    pichaHealth().then(({ ok }) => setOnline(ok));
  }, []);

  const handleDemoClick = async (url) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const fileObj = new File([blob], url.split('/').pop(), { type: blob.type || "image/png" });
      handleFileUpload({ target: { files: [fileObj] } });
    } catch (e) {
      console.error("Demo load failed", e);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const replayAgents = useCallback(async () => {
    if (status === 'phase1' || status === 'phase2') return;
    
    setDone(0);
    setStatus('phase1');
    
    // Replay Phase 1
    setPhase1Step(1); playScanBlip(); await delay(800);
    setPhase1Step(2); playScanBlip(); await delay(800);
    setPhase1Step(3); playScanBlip(); await delay(600);
    setPhase1Step(4); playScanBlip(); await delay(1000);
    
    // Replay Phase 2
    setStatus('phase2');
    let i = 0;
    const tick = () => {
      if (i >= MARS_AGENTS.length) { setStatus('done'); playSuccessChime(); return; }
      const delayMs = MARS_AGENTS[i].durationMs;
      i += 1;
      setTimeout(() => {
        setDone(i);
        playScanBlip();
        tick();
      }, delayMs);
    };
    setTimeout(tick, 300);
  }, [status]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || chatLoading) return;
    const userMsg = { role: 'user', content: input.trim() };
    setInput('');
    setMessages((prev) => [...prev, userMsg, { role: 'assistant', typing: true }]);
    setChatL(true);

    try {
      if (isOnline) {
        const { reply } = await pichaChat(userMsg.content, patientId);
        setMessages((prev) => [...prev.slice(0, -1), { role: 'assistant', content: reply }]);
      } else {
        throw new Error('offline');
      }
    } catch {
      await delay(1000 + Math.random() * 800);
      const reply = PICHA_REPLIES[mockReplyIdx.current % PICHA_REPLIES.length];
      mockReplyIdx.current += 1;
      setMessages((prev) => [...prev.slice(0, -1), { role: 'assistant', content: reply }]);
    } finally {
      setChatL(false);
    }
  }, [input, chatLoading, isOnline, patientId]);

  return (
    <div className="flex h-full w-full bg-[var(--bg)]">
      <style>
      {`
        @keyframes scanline {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scanline {
          animation: scanline 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        @keyframes fadeInScale {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fadeInScale 0.4s ease-out forwards;
          opacity: 0;
        }
        @keyframes typing {
          from { width: 0; }
          to { width: 100%; }
        }
      `}
      </style>
      
      {/* ─── LEFT PANE: WSI Viewer (60%) ─── */}
      <div className="flex-[3] flex flex-col border-r border-[var(--line)] bg-[#000000]">
        
        {/* Viewer Toolbar */}
        <div className="h-12 border-b border-[#222222] bg-[#0a0a0a] flex items-center justify-between px-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-[#ffcc00] font-mono text-xs">
              <Microscope className="w-4 h-4 text-violet-400" />
              <span>CCA-0142</span>
              <span className="text-[#666]">•</span>
              <span>H&E Slide</span>
            </div>
          </div>

          <div className="flex items-center space-x-1">
             <div className="bg-[#1a1a1a] rounded flex p-1 border border-[#333]">
                {['10x', '20x', '40x'].map((z) => (
                  <button
                    key={z}
                    onClick={() => setZoom(z)}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                      zoom === z ? 'bg-violet-600 text-white shadow-sm' : 'text-[#888] hover:text-white'
                    }`}
                  >
                    {z}
                  </button>
                ))}
             </div>
             <div className="w-px h-5 bg-[#333] mx-2" />
             <label className="flex items-center space-x-2 text-xs text-white cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={heatOn} 
                  onChange={() => setHeatOn(!heatOn)}
                  className="accent-violet-500"
                />
                <span>Grad-CAM Heatmap</span>
             </label>
             <button className="p-1.5 ml-2 text-[#888888] hover:text-white transition-colors" title="Fullscreen"><Maximize2 className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Viewport */}
        <div className="flex-1 relative overflow-hidden viewer-grid bg-[#050505] flex flex-col items-center justify-center">
          {!previewUrl ? (
            <div className="flex flex-col items-center justify-center w-full h-full">
              <div className="text-center relative z-10 p-8 border-2 border-dashed border-[#333] hover:border-violet-500 rounded-lg transition-colors bg-[#0a0a0a]">
                <input
                  type="file"
                  id="picha-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileUpload}
                />
                <label htmlFor="picha-upload" className="cursor-pointer inline-flex items-center justify-center px-6 py-3 border border-[#333] hover:border-violet-500 rounded-md bg-[#111] hover:bg-[#1a1a1a] transition-all text-sm font-semibold text-white">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Pathology/Dermoscopy Image
                </label>
                <p className="mt-2 text-xs text-[#666]">Supports WSI Formats (SVS, NDPI), JPEG, PNG</p>
              </div>

              {/* Demo Gallery */}
              {demoImages.length > 0 && (
                <div className="mt-8 w-[90%] max-w-2xl">
                  <div className="text-xs text-[#888] font-bold uppercase tracking-wider mb-3 text-center">Or select a demo slide</div>
                  <div className="grid grid-cols-6 gap-3">
                    {demoImages.map((url, i) => (
                      <div key={i} onClick={() => handleDemoClick(url)} className="cursor-pointer border-2 border-[#333] hover:border-violet-500 rounded-md overflow-hidden aspect-square transition-all hover:scale-105 bg-black">
                        <img src={url} className="w-full h-full object-cover" alt="Demo Case" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              {/* Main Image */}
              <img src={previewUrl} alt="Uploaded Slide" className="max-w-full max-h-full object-contain transition-all duration-700 ease-in-out" 
                   style={{ 
                       filter: phase1Step === 2 ? 'hue-rotate(15deg) saturate(1.4) contrast(1.1) brightness(1.1)' : 'none',
                       opacity: (phase1Step === 1 || phase1Step === 2) ? 0.7 : 1 
                   }} />
                   
              {/* Animation 1: Tiling Grid */}
              {phase1Step === 1 && (
                  <div className="absolute inset-0 pointer-events-none flex flex-wrap content-start">
                      {Array.from({ length: 100 }).map((_, i) => (
                          <div key={i} className="w-[10%] h-[10%] border border-violet-500/20 bg-violet-500/5 animate-pulse" style={{ animationDelay: `${(i % 10) * 0.05}s` }}></div>
                      ))}
                      <div className="absolute top-0 left-0 w-full h-1 bg-violet-400 shadow-[0_0_20px_4px_#8b5cf6] animate-scanline" />
                  </div>
              )}
              
              {/* Animation 2: Color Norm Flash */}
              {phase1Step === 2 && (
                  <div className="absolute inset-0 bg-pink-500/10 pointer-events-none animate-pulse mix-blend-color"></div>
              )}

              {/* Animation 3: 9-Class Patch Classifier (ConvNeXt) */}
              {phase1Step === 4 && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="grid grid-cols-6 gap-1 w-3/4 h-3/4">
                          {Array.from({ length: 36 }).map((_, i) => {
                              const isCancer = i % 5 === 0 || i % 8 === 0;
                              const isInflam = i % 7 === 0;
                              let bg = 'bg-emerald-500/10 border-emerald-500/30';
                              let text = 'NORM';
                              if (isCancer) { bg = 'bg-red-500/40 border-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.5)]'; text = 'CANCER'; }
                              else if (isInflam) { bg = 'bg-yellow-500/30 border-yellow-500/60'; text = 'INFLAM'; }
                              return <div key={i} className={`border ${bg} rounded-sm flex items-center justify-center animate-fade-in backdrop-blur-sm`} style={{ animationDelay: `${i * 0.03}s` }}>
                                  <span className="text-[8px] font-bold text-white shadow-sm">{text}</span>
                              </div>
                          })}
                      </div>
                  </div>
              )}
            </div>
          )}

          {/* Overlays */}
          {previewUrl && status === 'done' && (
            <div className="absolute bottom-4 left-4 flex gap-2">
              <span className="text-[10px] px-2 py-1 bg-[#111] rounded border border-[#333] text-[#aaa] flex items-center font-bold uppercase tracking-wider shadow-md">
                <span className="w-2 h-2 rounded-sm inline-block bg-emerald-500 mr-1.5 shadow-[0_0_5px_#10b981]" /> Analysis Complete
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ─── RIGHT PANE: Dual-Phase Dashboard (40%) ─── */}
      <div className="flex-[2] flex flex-col bg-[var(--surface)] border-l border-[var(--line)]">
        
        {/* Module Title */}
        <div className="p-5 border-b border-[var(--line)] bg-[var(--surface-2)] shrink-0 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 text-violet-400 mb-1">
              <Layers className="w-5 h-5" />
              <h2 className="font-bold text-lg text-[var(--text)]">PICHA Dual-Phase Engine</h2>
            </div>
            <p className="text-xs text-[var(--muted)]">Pre-screening Pipeline & MARS Multi-Agent</p>
          </div>
          <button
              onClick={replayAgents}
              disabled={status === 'phase1' || status === 'phase2'}
              className="px-3 py-1.5 border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-3)] rounded text-xs font-semibold text-[var(--text)] disabled:opacity-50 transition-colors flex items-center shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${status === 'phase1' || status === 'phase2' ? 'animate-spin' : ''}`} />
              Re-run AI
          </button>
        </div>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto p-5 border-b border-[var(--line)]">
            {status === 'idle' && (
                <div className="h-full flex flex-col items-center justify-center text-center text-[#666]">
                    <Layers className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm">Please upload a slide or select a demo to begin the 2-phase pipeline.</p>
                </div>
            )}

            {(status !== 'idle') && (
                <div className="space-y-8">
                    
                    {/* --- PHASE 1 --- */}
                    <div>
                        <div className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-3 flex items-center">
                            <Activity className="w-4 h-4 mr-2" /> Phase 1: Pre-screening Pipeline
                        </div>
                        <div className="grid grid-cols-1 gap-2.5">
                            <PhaseStep active={phase1Step === 1} done={phase1Step > 1} title="1. WSI Tiling (256x256)" desc="Dividing whole slide into thousands of micro-patches." />
                            <PhaseStep active={phase1Step === 2} done={phase1Step > 2} title="2. Color Normalization" desc="Macenko standardisation for stain consistency." />
                            <PhaseStep active={phase1Step === 3} done={phase1Step > 3} title="3. Quality Control (QC)" desc="Filtering out blur, folds, and artifacts." />
                            <PhaseStep active={phase1Step === 4} done={phase1Step > 4} title="4. 9-Class Patch Classifier" desc="ConvNeXt-Base: Classifying Tumor vs Normal regions." />
                        </div>
                    </div>

                    {/* --- PHASE 2 --- */}
                    {(status === 'phase2' || status === 'done') && (
                        <div className="pt-4 border-t border-[var(--line)] animate-fade-in">
                            <div className="text-xs font-bold text-pink-400 uppercase tracking-wider mb-4 flex items-center">
                                <Zap className="w-4 h-4 mr-2" /> Phase 2: MARS Reasoning System
                            </div>
                            
                            {/* Coordinator Node */}
                            <div className="mb-5 bg-[#1e1b4b]/40 border border-violet-500/40 p-4 rounded-xl flex items-center justify-center relative overflow-hidden shadow-lg">
                                {status === 'phase2' && <div className="absolute inset-0 bg-violet-500/10 animate-pulse"></div>}
                                <div className="z-10 flex flex-col items-center">
                                    <Bot className={`w-8 h-8 mb-2 ${status === 'phase2' ? 'text-pink-400 animate-bounce' : 'text-violet-400'}`} />
                                    <span className="font-bold text-sm text-violet-200 tracking-wide">MARS Coordinator</span>
                                    <span className="text-[10px] text-violet-400/80 uppercase font-bold tracking-widest mt-0.5">
                                        {status === 'phase2' ? 'Orchestrating 7 Agents...' : 'Synthesis Complete'}
                                    </span>
                                </div>
                            </div>

                            <AgentStream completedCount={agentsDone} isRunning={status === 'phase2'} />
                        </div>
                    )}

                    {/* --- FINAL REPORT --- */}
                    {status === 'done' && analysisResult && (
                        <div className="mt-8 pt-6 border-t border-[var(--line)] animate-fade-in">
                            <div className="bg-[#1e1b4b] px-4 py-3 border border-violet-500/30 rounded-t-md flex justify-between items-center shadow-md">
                                <span className="text-sm font-bold text-violet-300 uppercase tracking-wider">Final Pathology Report</span>
                                <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold flex items-center">
                                    <CheckCircle className="w-3 h-3 mr-1" /> Ready
                                </span>
                            </div>
                            <div className="p-5 text-sm text-[var(--text)] space-y-5 font-mono leading-relaxed bg-[var(--surface-2)] border-x border-b border-violet-500/30 rounded-b-md shadow-md relative overflow-hidden">
                                
                                {/* Typing Animation Overlay (runs once) */}
                                <div className="absolute top-0 left-0 h-full bg-violet-500/5 overflow-hidden whitespace-nowrap" style={{ animation: 'typing 1.5s steps(40, end) forwards' }}>
                                </div>

                                <div className="relative z-10">
                                    {/* Primary Finding */}
                                    <div className="pb-4 border-b border-[var(--line)]">
                                        <div className="text-xs text-[var(--muted)] uppercase font-sans font-bold mb-1">Final Diagnosis</div>
                                        <div className="text-[var(--text)] font-bold text-base text-violet-400">
                                        {analysisResult.stage4_formatter?.primary_finding || 'N/A'}
                                        </div>
                                    </div>

                                    {/* Microscopic Description */}
                                    <div className="pb-4 pt-2 border-b border-[var(--line)]">
                                        <div className="text-xs text-[var(--muted)] uppercase font-sans font-bold mb-2">Microscopic Description</div>
                                        <div className="text-[var(--text-2)] whitespace-pre-wrap text-sm leading-relaxed">
                                        {analysisResult.stage4_formatter?.explainable_insights?.map(s => `• ${s}`).join('\n') || 'N/A'}
                                        </div>
                                    </div>

                                    {/* Recommendations */}
                                    <div className="pt-2">
                                        <div className="text-xs text-[var(--muted)] uppercase font-sans font-bold mb-1">Clinical Recommendations</div>
                                        <div className="text-pink-300 text-sm bg-pink-500/10 p-3 rounded border border-pink-500/20 mt-2">
                                            {analysisResult.stage4_formatter?.actionable_recommendations || 'N/A'}
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => setIsReportOpen(true)}
                                        className="w-full mt-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded font-sans font-bold transition-all shadow-lg hover:shadow-violet-500/30 flex justify-center items-center"
                                    >
                                        <FileSearch className="w-4 h-4 mr-2" /> View Full Official PDF Report
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            )}
        </div>

      </div>

      <MedicalReportModal 
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        analysisResult={analysisResult}
        patientId={patientId}
        moduleName="picha"
      />
    </div>
  );
}
