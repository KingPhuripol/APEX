import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Activity, ShieldCheck, Lock, User, Loader2 } from 'lucide-react';

export default function Login() {
  const [doctorId, setDoctorId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate network delay for clinical realism
    await new Promise(r => setTimeout(r, 800));

    const result = await login(doctorId, password);
    if (result.success) {
      navigate('/'); // Redirect to Worklist
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex bg-[var(--bg)] text-[var(--text)] font-sans">
      
      {/* Left Panel - Login Form (Enterprise Style) */}
      <div className="w-full lg:w-5/12 xl:w-4/12 flex flex-col relative z-10 border-r border-[var(--line-strong)] bg-[var(--surface)]">
        
        <div className="flex-1 flex flex-col justify-center px-10 sm:px-16 md:px-24 lg:px-12 xl:px-16">
          <div className="mb-10 flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-[var(--surface-3)] border border-[var(--line-strong)] flex items-center justify-center shadow-inner">
              <Activity className="w-6 h-6 text-[var(--info)]" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--text)] leading-none">APEX Platform</h1>
              <p className="text-xs text-[var(--muted)] mt-1 uppercase tracking-widest font-bold">Clinical AI Portal</p>
            </div>
          </div>

          <h2 className="text-lg font-semibold mb-6">Physician Login</h2>
          
          <form onSubmit={handleLogin} className="space-y-5">
            
            {error && (
              <div className="p-3 rounded-md bg-[var(--danger-soft)] border border-[var(--danger)] text-[var(--danger)] text-sm flex items-center font-medium">
                <ShieldCheck className="w-4 h-4 mr-2" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Hospital ID</label>
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
              <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Passcode</label>
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
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Secure Access"}
            </button>
          </form>
          
          <div className="mt-8 text-xs text-[var(--dim)] flex items-start gap-2 bg-[var(--surface-2)] p-3 rounded-md border border-[var(--line)]">
            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              This system contains protected health information (PHI). 
              Access is monitored and audited in compliance with HIPAA & PDPA regulations.
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-[var(--line)] flex justify-between items-center text-[10px] text-[var(--muted)] font-mono uppercase tracking-widest bg-[var(--surface-2)]">
          <span>© 2026 APEX AI</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> All Systems Nominal</span>
        </div>
      </div>

      {/* Right Panel - Branding / Abstract Graphic */}
      <div className="hidden lg:block lg:w-7/12 xl:w-8/12 relative overflow-hidden bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#1e1b4b]">
        
        {/* Subtle CSS Pattern Overlay */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent opacity-80"></div>
        
        <div className="absolute bottom-12 right-12 text-right">
          <div className="inline-block px-3 py-1.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-md text-white/70 font-mono text-xs mb-2">
            Multi-Modal Medical Intelligence
          </div>
          <h3 className="text-white text-3xl font-light tracking-wide drop-shadow-lg">
            Empowering <span className="font-semibold text-[var(--info)]">Diagnostic</span> Precision
          </h3>
        </div>
      </div>

    </div>
  );
}
