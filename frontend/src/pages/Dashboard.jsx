import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Activity, Microscope, ArrowRight, ShieldCheck, Database, Zap } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col relative overflow-hidden">
      
      {/* Background Grid & Glows */}
      <div className="absolute inset-0 viewer-grid opacity-30 pointer-events-none"></div>
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-600/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Header */}
      <header className="relative z-10 px-8 py-6 flex justify-between items-center border-b border-[#222]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-lg shadow-lg flex items-center justify-center">
             <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-widest uppercase">APEX</h1>
            <p className="text-[10px] text-violet-400 font-mono tracking-widest">Clinical AI Platform</p>
          </div>
        </div>
        
        <button 
          onClick={() => navigate('/worklist')}
          className="group px-6 py-2.5 bg-[#111] hover:bg-[#1a1a1a] border border-[#333] hover:border-violet-500 transition-all rounded-md text-sm font-semibold flex items-center space-x-2"
        >
          <span>Enter PACS Worklist</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-center mb-16 max-w-3xl">
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-500">
            Next-Generation <br/> Diagnostic Intelligence
          </h2>
          <p className="text-lg text-gray-400 font-light">
            An integrated ecosystem of specialized AI agents designed to augment clinical workflows across Radiology, Hepatology, and Pathology.
          </p>
        </div>

        {/* Ecosystem Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
          
          {/* AXIA */}
          <div 
            onClick={() => navigate('/patient/DEMO-AXIA/axia')}
            className="ecosystem-card relative bg-[#0a0a0a] border border-[#222] rounded-2xl p-8 cursor-pointer flex flex-col items-center text-center group"
            style={{ '--glow-color': 'rgba(59, 130, 246, 0.4)' }}
          >
            <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <Brain className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold mb-2">AXIA</h3>
            <p className="text-[11px] uppercase tracking-widest text-blue-400 font-bold mb-4">Brain CT Hemorrhage</p>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              Instantaneous detection and volumetric segmentation of intracranial hemorrhage and ischemic stroke with explainable radar-ping UI.
            </p>
            <div className="mt-auto pt-6 border-t border-[#222] w-full flex justify-between text-[#555] text-xs font-mono">
               <span>Latency: ~1.2s</span>
               <span>Sensitivity: 98%</span>
            </div>
          </div>

          {/* SMARTLIVA */}
          <div 
            onClick={() => navigate('/patient/DEMO-LIVA/smartliva')}
            className="ecosystem-card relative bg-[#0a0a0a] border border-[#222] rounded-2xl p-8 cursor-pointer flex flex-col items-center text-center group"
            style={{ '--glow-color': 'rgba(16, 185, 129, 0.4)' }}
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Activity className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-bold mb-2">SmartLiva</h3>
            <p className="text-[11px] uppercase tracking-widest text-emerald-400 font-bold mb-4">Liver Ultrasound XAI</p>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              Vision LLM-powered assessment of liver fibrosis (METAVIR), focal lesions (HCC/CCA), and parasitic infections (Opisthorchis viverrini).
            </p>
            <div className="mt-auto pt-6 border-t border-[#222] w-full flex justify-between text-[#555] text-xs font-mono">
               <span>GPT-4o Vision API</span>
               <span>7-Class Lesion</span>
            </div>
          </div>

          {/* PICHA */}
          <div 
            onClick={() => navigate('/patient/DEMO-PICHA/picha')}
            className="ecosystem-card relative bg-[#0a0a0a] border border-[#222] rounded-2xl p-8 cursor-pointer flex flex-col items-center text-center group"
            style={{ '--glow-color': 'rgba(139, 92, 246, 0.4)' }}
          >
            <div className="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(139,92,246,0.2)]">
              <Microscope className="w-8 h-8 text-violet-400" />
            </div>
            <h3 className="text-2xl font-bold mb-2">PICHA</h3>
            <p className="text-[11px] uppercase tracking-widest text-violet-400 font-bold mb-4">Digital Pathology MARS</p>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              A 2-phase pipeline featuring ConvNeXt pre-screening and a 7-Agent Multi-Agent Reasoning System for Cholangiocarcinoma staging.
            </p>
            <div className="mt-auto pt-6 border-t border-[#222] w-full flex justify-between text-[#555] text-xs font-mono">
               <span>Multi-Agent Orchestrator</span>
               <span>Whole Slide</span>
            </div>
          </div>

        </div>

        {/* Footer Badges */}
        <div className="mt-16 flex items-center space-x-6">
           <div className="flex items-center space-x-2 text-xs font-mono text-[#666]">
             <ShieldCheck className="w-4 h-4 text-[#888]" />
             <span>HIPAA Compliant</span>
           </div>
           <div className="flex items-center space-x-2 text-xs font-mono text-[#666]">
             <Database className="w-4 h-4 text-[#888]" />
             <span>Zero-Footprint Storage</span>
           </div>
           <div className="flex items-center space-x-2 text-xs font-mono text-[#666]">
             <Zap className="w-4 h-4 text-[#888]" />
             <span>Edge & Cloud Ready</span>
           </div>
        </div>
      </main>
    </div>
  );
}
