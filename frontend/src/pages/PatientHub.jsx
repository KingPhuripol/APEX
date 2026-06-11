import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, Calendar, Brain, Activity as LiverIcon, Microscope, UploadCloud, FileText, Activity } from 'lucide-react';
import { getPatientById } from '../lib/patients';
import AxiaModule from '../modules/AxiaModule';
import SmartLivaModule from '../modules/SmartLivaModule';
import PichaModule from '../modules/PichaModule';
import UnifiedChat from '../components/UnifiedChat';

export default function PatientHub() {
  const { id, module } = useParams();
  const navigate = useNavigate();

  const patient = getPatientById(id);
  const patientName = patient?.name ?? id;
  const patientAge = patient?.age ?? '—';
  const patientGender = patient?.gender ?? '—';
  const patientWard = patient?.ward ?? '—';
  const patientReferrer = patient?.referrer ?? '—';

  const getModuleTheme = (mod) => {
    switch (mod) {
      case 'smartliva': // Blue
        return {
          '--accent': '#2563eb',
          '--accent-soft': 'rgba(37, 99, 235, 0.1)',
          '--accent-text': '#60a5fa',
          '--info': '#3b82f6',
          '--info-soft': 'rgba(59, 130, 246, 0.1)',
        };
      case 'axia': // Red
        return {
          '--accent': '#dc2626',
          '--accent-soft': 'rgba(220, 38, 38, 0.1)',
          '--accent-text': '#f87171',
          '--info': '#ef4444',
          '--info-soft': 'rgba(239, 68, 68, 0.1)',
        };
      case 'picha': // Violet
        return {
          '--accent': '#7c3aed',
          '--accent-soft': 'rgba(124, 58, 237, 0.1)',
          '--accent-text': '#a78bfa',
          '--info': '#8b5cf6',
          '--info-soft': 'rgba(139, 92, 246, 0.1)',
        };
      default:
        return {}; // Use defaults from index.css
    }
  };

  const renderModule = () => {
    switch (module) {
      case 'axia':
        return <AxiaModule patientId={id} />;
      case 'smartliva':
        return <SmartLivaModule patientId={id} />;
      case 'picha':
        return <PichaModule patientId={id} />;
      default:
        return (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-[var(--surface-3)] flex items-center justify-center mb-6">
              <Activity className="w-8 h-8 text-[var(--muted)]" />
            </div>
            <h3 className="text-xl font-bold text-[var(--text)] mb-2">Patient Overview</h3>
            <p className="text-[var(--text-2)] max-w-md text-sm">
              Select a diagnostic module from the left menu to begin AI-assisted analysis for {patientName}.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-full flex-col bg-[var(--bg)] transition-colors duration-300" style={getModuleTheme(module)}>
      {/* Patient Header */}
      <header className="glass-panel border-b border-[var(--line)] px-6 py-3 flex items-center justify-between z-20 rounded-none shadow-none bg-[var(--surface)]">
        <div className="flex items-center space-x-6">
          <button 
            onClick={() => navigate('/')}
            className="p-1.5 rounded-md hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-4 border-l border-[var(--line)] pl-6">
            <div className="w-10 h-10 rounded-full bg-[var(--surface-3)] flex items-center justify-center border border-[var(--line-strong)]">
              <User className="w-5 h-5 text-[var(--muted)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text)] leading-tight">{patientName}</h2>
              <div className="text-xs text-[var(--text-2)] flex items-center space-x-3 mt-0.5">
                <span className="font-mono">{id}</span>
                <span className="text-[var(--line-strong)]">•</span>
                <span className="font-mono">{patientAge} Yrs / {patientGender}</span>
                <span className="text-[var(--line-strong)]">•</span>
                <span className="font-mono">{patientWard}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Patient Actions */}
        <div className="hidden md:flex items-center space-x-2">
          <button className="flex items-center px-3 py-1.5 rounded-md bg-[var(--surface-2)] border border-[var(--line)] hover:bg-[var(--surface-3)] text-[var(--text)] text-sm transition-colors">
            <FileText className="w-4 h-4 mr-2 text-[var(--muted)]" />
            Clinical Notes
          </button>
          <button className="flex items-center px-3 py-1.5 rounded-md bg-[var(--info)] border border-[var(--info)] hover:bg-blue-600 text-white text-sm shadow-sm transition-colors">
            <UploadCloud className="w-4 h-4 mr-2" />
            Upload Study
          </button>
        </div>
      </header>

      {/* Main Split View */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0">
        {/* Patient Modules Sidebar */}
        <div className="w-full md:w-56 bg-[var(--surface-2)] border-b md:border-b-0 md:border-r border-[var(--line)] p-2 md:p-3 flex flex-row md:flex-col space-x-2 md:space-x-0 md:space-y-1.5 z-10 overflow-x-auto md:overflow-y-auto shrink-0">
          <h3 className="hidden md:block text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1.5 px-2 mt-2">AI Diagnostics</h3>
          
          <Link 
            to={`/patient/${id}/axia`}
            className={`flex items-center p-2 md:p-2.5 rounded-md transition-all shrink-0 ${module === 'axia' ? 'bg-[var(--surface-3)] border border-[var(--line-strong)] text-[var(--text)] shadow-sm' : 'hover:bg-[var(--surface-3)] text-[var(--text-2)] border border-transparent'}`}
          >
            <div className={`p-1.5 rounded-md mr-2 md:mr-2.5 ${module === 'axia' ? 'bg-[var(--info-soft)]' : 'bg-[var(--surface)]'}`}>
              <Brain className={`w-4 h-4 ${module === 'axia' ? 'text-[var(--info)]' : 'text-[var(--muted)]'}`} />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">AXIA</div>
              <div className="hidden md:block text-[10px] text-[var(--muted)]">Brain CT</div>
            </div>
          </Link>

          <Link 
            to={`/patient/${id}/smartliva`}
            className={`flex items-center p-2 md:p-2.5 rounded-md transition-all shrink-0 ${module === 'smartliva' ? 'bg-[var(--surface-3)] border border-[var(--line-strong)] text-[var(--text)] shadow-sm' : 'hover:bg-[var(--surface-3)] text-[var(--text-2)] border border-transparent'}`}
          >
            <div className={`p-1.5 rounded-md mr-2 md:mr-2.5 ${module === 'smartliva' ? 'bg-[var(--info-soft)]' : 'bg-[var(--surface)]'}`}>
              <LiverIcon className={`w-4 h-4 ${module === 'smartliva' ? 'text-[var(--info)]' : 'text-[var(--muted)]'}`} />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">SmartLiva</div>
              <div className="hidden md:block text-[10px] text-[var(--muted)]">Liver US</div>
            </div>
          </Link>

          <Link 
            to={`/patient/${id}/picha`}
            className={`flex items-center p-2 md:p-2.5 rounded-md transition-all shrink-0 ${module === 'picha' ? 'bg-[var(--surface-3)] border border-[var(--line-strong)] text-[var(--text)] shadow-sm' : 'hover:bg-[var(--surface-3)] text-[var(--text-2)] border border-transparent'}`}
          >
            <div className={`p-1.5 rounded-md mr-2 md:mr-2.5 ${module === 'picha' ? 'bg-[var(--info-soft)]' : 'bg-[var(--surface)]'}`}>
              <Microscope className={`w-4 h-4 ${module === 'picha' ? 'text-[var(--info)]' : 'text-[var(--muted)]'}`} />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">PICHA</div>
              <div className="hidden md:block text-[10px] text-[var(--muted)]">Pathology</div>
            </div>
          </Link>
        </div>

        {/* Module Content Area - No padding to allow edge-to-edge dual pane */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative z-10" style={{ WebkitOverflowScrolling: 'touch' }}>
          {renderModule()}
        </div>
      </div>
      {/* Global APEX Copilot Chatbot */}
      <UnifiedChat />
    </div>
  );
}
