import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Activity, Wifi, WifiOff, RefreshCw, Sun, Moon, LogOut, User } from 'lucide-react';
import { useServiceHealth } from '../lib/useServiceHealth';
import { useAuth } from '../lib/AuthContext';

function StatusDot({ status, label }) {
  const cfg = {
    ok:      { bg: 'bg-[var(--ok)]', ring: 'shadow-[0_0_6px_rgba(16,185,129,0.7)]', text: 'text-[var(--ok)]' },
    error:   { bg: 'bg-[var(--danger)]', ring: 'shadow-[0_0_6px_rgba(239,68,68,0.7)]', text: 'text-[var(--danger)]' },
    loading: { bg: 'bg-[var(--warn)]', ring: '', text: 'text-[var(--warn)]' },
  }[status] || { bg: 'bg-[var(--muted)]', ring: '', text: 'text-[var(--muted)]' };

  return (
    <div className="flex items-center gap-1.5 group relative">
      <div className={`w-2 h-2 rounded-full ${cfg.bg} ${cfg.ring} ${status === 'loading' ? 'animate-pulse' : ''}`} />
      <span className={`text-xs hidden sm:inline ${cfg.text}`}>{label}</span>

      <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50">
        <div className="bg-[var(--surface-3)] border border-[var(--line-strong)] rounded px-3 py-2 text-xs text-[var(--text)] whitespace-nowrap shadow-xl">
          {label}: <span className={cfg.text}>{status === 'ok' ? 'Online' : status === 'error' ? 'Offline' : 'Connecting...'}</span>
        </div>
      </div>
    </div>
  );
}

export default function Layout() {
  const location = useLocation();
  const { health, anyOnline, refresh } = useServiceHealth();
  const { user, logout } = useAuth();
  
  const [theme, setTheme] = useState('dark');

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('apex-theme');
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('apex-theme', newTheme);
    
    if (newTheme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--bg)] text-[var(--text)] overflow-hidden transition-colors duration-200">
      
      {/* ── Top Nav ─────────────────────────────────────────────────── */}
      <nav className="h-14 flex items-center justify-between px-6 bg-[var(--surface)] border-b border-[var(--line)] shrink-0 z-30 transition-colors duration-200">
        
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[var(--surface-3)] border border-[var(--line-strong)] flex items-center justify-center">
            <Activity className="w-5 h-5 text-[var(--info)]" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-sm font-bold text-[var(--text)] leading-tight tracking-wide">APEX Clinical AI</div>
            <div className="text-[10px] text-[var(--muted)] leading-tight uppercase font-bold mt-0.5">Medical Grade System</div>
          </div>
        </Link>

        {/* Breadcrumb */}
        {location.pathname !== '/' && (
          <div className="hidden md:flex items-center gap-2 text-sm text-[var(--muted)] font-medium">
            <Link to="/worklist" className="hover:text-[var(--text)] transition-colors">PACS Worklist</Link>
            <span className="text-[var(--line-strong)]">/</span>
            <span className="text-[var(--text)]">Patient Hub</span>
          </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-4 bg-[var(--surface-2)] px-3 py-1.5 rounded border border-[var(--line)]">
            <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider font-bold">Services</span>
            <StatusDot status={health.axia.status}      label="AXIA" />
            <StatusDot status={health.smartliva.status} label="SmartLiva" />
            <StatusDot status={health.picha.status}     label="PICHA" />
          </div>

          <div className="flex items-center gap-2 px-2">
            {anyOnline ? (
              <Wifi className="w-4 h-4 text-[var(--ok)]" />
            ) : (
              <WifiOff className="w-4 h-4 text-[var(--warn)]" />
            )}
            <span className="text-xs text-[var(--muted)] font-semibold hidden sm:inline">
              {anyOnline ? 'Secure Connect' : 'Local Demo'}
            </span>
          </div>
          
          <div className="flex items-center space-x-1 border-l border-[var(--line)] pl-4">
            <button
              onClick={refresh}
              title="Refresh service status"
              className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="w-px h-5 bg-[var(--line-strong)] mx-1" />
            
            <div className="flex items-center gap-2 group relative">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-[var(--surface-3)] transition-colors">
                <div className="w-6 h-6 rounded-full bg-[var(--surface-3)] border border-[var(--line-strong)] flex items-center justify-center">
                  <User className="w-3 h-3 text-[var(--info)]" />
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-bold text-[var(--text)] leading-none">{user?.name}</div>
                </div>
              </div>
              
              <button
                onClick={logout}
                title="Secure Logout"
                className="p-1.5 rounded text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Page Content ─────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden relative">
        <Outlet />
      </main>

      {/* ── Status bar ───────────────────────────────────────────────── */}
      <footer className="py-2 md:h-6 md:py-0 flex flex-col md:flex-row items-center justify-between px-4 md:px-6 bg-[var(--surface-2)] border-t border-[var(--line)] text-[9px] md:text-[10px] text-[var(--muted)] font-mono shrink-0 uppercase tracking-wide transition-colors duration-200 gap-2 md:gap-0">
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 text-center">
          <span>APEX Clinical AI Platform</span>
          <span className="hidden md:inline text-[var(--line-strong)]">|</span>
          <span>HIPAA / PDPA Compliant</span>
          <span className="hidden md:inline text-[var(--line-strong)]">|</span>
          <span>FDA 510(k) K231104</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 text-center">
          <span>Clinical Decision Support Only</span>
          <span className="hidden md:inline text-[var(--line-strong)]">|</span>
          <span className={`font-bold ${anyOnline ? 'text-[var(--ok)]' : 'text-[var(--warn)]'}`}>
            {anyOnline ? 'STATUS: ALL SYSTEMS NOMINAL' : 'STATUS: DEMO MODE ACTIVE'}
          </span>
        </div>
      </footer>
    </div>
  );
}
