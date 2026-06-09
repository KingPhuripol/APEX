import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ArrowRight, Brain, Activity as LiverIcon, Microscope, AlertTriangle } from 'lucide-react';

// Mock Patient Data
const MOCK_PATIENTS = [
  { id: 'HN-100234', name: 'Somsri Phakdee', age: 45, gender: 'F', status: 'Pending', priority: 'Critical', date: '2026-05-26 09:30', tools: ['AXIA', 'SmartLiva'], accession: 'ACC-883921' },
  { id: 'HN-100235', name: 'Mana Jaidee', age: 62, gender: 'M', status: 'Reviewed', priority: 'Routine', date: '2026-05-25 14:15', tools: ['PICHA'], accession: 'ACC-883922' },
  { id: 'HN-100236', name: 'Wichai Sukhum', age: 38, gender: 'M', status: 'Pending', priority: 'Stat', date: '2026-05-26 10:45', tools: ['SmartLiva'], accession: 'ACC-883923' },
  { id: 'HN-100237', name: 'Suree Srisawat', age: 55, gender: 'F', status: 'In Progress', priority: 'Urgent', date: '2026-05-26 11:20', tools: ['AXIA', 'PICHA'], accession: 'ACC-883924' },
];

export default function Worklist() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const getToolIcon = (tool) => {
    switch(tool) {
      case 'AXIA': return <Brain className="w-3.5 h-3.5 text-blue-400" title="Brain CT" />;
      case 'SmartLiva': return <LiverIcon className="w-3.5 h-3.5 text-blue-400" title="Liver US" />;
      case 'PICHA': return <Microscope className="w-3.5 h-3.5 text-blue-400" title="Pathology" />;
      default: return null;
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'Critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'Stat': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'Urgent': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default: return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-[var(--bg)]">
      <header className="mb-4">
        <h1 className="text-xl font-bold text-[var(--text)] mb-1 font-sans">PACS Worklist</h1>
        <p className="text-sm text-[var(--muted)]">Select a patient study to access APEX Clinical AI</p>
      </header>

      <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-3 mb-4">
        <div className="flex-1 relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input 
            type="text" 
            placeholder="Search by HN, Accession, Name..."
            className="w-full bg-[var(--surface-2)] border border-[var(--line)] rounded-md py-1.5 pl-9 pr-3 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--info)] transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="px-3 py-1.5 rounded-md bg-[var(--surface-2)] border border-[var(--line)] hover:bg-[var(--surface-3)] flex items-center justify-center text-sm text-[var(--text)] transition-colors w-full md:w-auto">
          <Filter className="w-4 h-4 mr-2 text-[var(--muted)]" />
          Filters
        </button>
      </div>

      <div className="glass-panel flex-1 overflow-hidden flex flex-col rounded-md border border-[var(--line)] shadow-sm">
        <div className="overflow-x-auto flex-1 bg-[var(--surface)]">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[var(--surface-2)] text-[var(--muted)] border-b border-[var(--line)] uppercase text-xs tracking-wider">
                <th className="px-4 py-2 font-semibold">Priority</th>
                <th className="px-4 py-2 font-semibold">Patient ID (HN)</th>
                <th className="px-4 py-2 font-semibold">Accession</th>
                <th className="px-4 py-2 font-semibold">Patient Name</th>
                <th className="px-4 py-2 font-semibold">Age/Sex</th>
                <th className="px-4 py-2 font-semibold">Study Date</th>
                <th className="px-4 py-2 font-semibold">AI Required</th>
                <th className="px-4 py-2 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {MOCK_PATIENTS.map(patient => (
                <tr 
                  key={patient.id} 
                  className="hover:bg-[var(--surface-2)] transition-colors cursor-pointer group"
                  onClick={() => navigate(`/patient/${patient.id}`)}
                >
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getPriorityColor(patient.priority)} flex items-center w-fit`}>
                      {patient.priority === 'Critical' && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {patient.priority}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[var(--text)]">{patient.id}</td>
                  <td className="px-4 py-2.5 font-mono text-[var(--text-2)]">{patient.accession}</td>
                  <td className="px-4 py-2.5 text-[var(--text)] font-medium">{patient.name}</td>
                  <td className="px-4 py-2.5 font-mono text-[var(--text-2)]">{patient.age}<span className="text-[var(--muted)]">/</span>{patient.gender}</td>
                  <td className="px-4 py-2.5 font-mono text-[var(--text-2)]">{patient.date}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex space-x-1">
                      {patient.tools.map(tool => (
                        <div key={tool} className="bg-[var(--surface-3)] p-1 rounded border border-[var(--line)]">
                          {getToolIcon(tool)}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button className="text-[var(--info)] hover:text-blue-400 flex items-center justify-end w-full font-medium text-xs uppercase tracking-wide group-hover:translate-x-1 transition-transform">
                      Open Study
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
