import { User, MapPin, Pill, FlaskConical, AlertTriangle } from "lucide-react";

// Accepts both camelCase (legacy mock) and snake_case (DB / API) field names.
// All fields optional — component renders gracefully with minimal data.
export interface PatientRecord {
  // Identifiers — accept both conventions
  hn?: string;
  patient_hn?: string;
  name?: string | null;
  patient_name?: string | null;
  // Demographics
  age?: number | null;
  sex?: string | null;
  region?: string | null;
  // Clinical
  history?: string | null;
  chief_complaint?: string | null;
  allergies?: string[] | null;
  medications?: string[] | null;
  labValues?: Record<string, string> | null;
  lab_results?: Record<string, unknown> | null;
  source?: string | null;
}

interface PatientCardProps {
  patient: PatientRecord;
}

export default function PatientCard({ patient }: PatientCardProps) {
  // Normalise — prefer snake_case (DB) over camelCase (mock)
  const hn = patient.patient_hn ?? patient.hn ?? "—";
  const name = patient.patient_name ?? patient.name ?? "Unknown Patient";
  const age = patient.age;
  const sex = patient.sex;
  const region = patient.region;
  const history = patient.chief_complaint ?? patient.history ?? null;
  const allergies = patient.allergies ?? [];
  const medications = patient.medications ?? [];

  // Merge lab sources into display map
  const labDisplay: Record<string, string> = {};
  if (patient.labValues) {
    Object.entries(patient.labValues).forEach(([k, v]) => {
      labDisplay[k] = v;
    });
  }
  if (patient.lab_results) {
    Object.entries(patient.lab_results).forEach(([k, v]) => {
      if (!(k in labDisplay)) labDisplay[k] = String(v);
    });
  }

  return (
    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-[#1d4ed8]" />
          </div>
          <div>
            <p className="text-[#0a1628] text-sm font-semibold">{name}</p>
            <p className="text-slate-400 text-xs font-mono">{hn}</p>
          </div>
        </div>
        {patient.source && (
          <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
            {patient.source}
          </span>
        )}
      </div>

      {/* Demographics */}
      <div className="px-4 py-3 grid grid-cols-3 gap-3 border-b border-slate-100">
        <div>
          <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-0.5">
            Age
          </p>
          <p className="text-[#0a1628] text-sm font-medium">
            {age != null ? `${age} yrs` : "—"}
          </p>
        </div>
        <div>
          <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-0.5">
            Sex
          </p>
          <p className="text-[#0a1628] text-sm font-medium">{sex ?? "—"}</p>
        </div>
        <div>
          <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-0.5">
            Region
          </p>
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <p className="text-slate-600 text-xs truncate">{region ?? "—"}</p>
          </div>
        </div>
      </div>

      {/* History */}
      {history && (
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">
            Clinical History
          </p>
          <p className="text-slate-600 text-xs leading-relaxed">{history}</p>
        </div>
      )}

      {/* Lab Values */}
      {Object.keys(labDisplay).length > 0 && (
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 mb-2">
            <FlaskConical className="w-3 h-3 text-slate-400" />
            <p className="text-slate-400 text-[10px] uppercase tracking-wider">
              Lab Values
            </p>
          </div>
          <div className="space-y-1">
            {Object.entries(labDisplay).map(([key, val]) => (
              <div key={key} className="flex justify-between items-center">
                <span className="text-slate-500 text-xs">{key}</span>
                <span className="text-[#0a1628] text-xs font-mono font-medium">
                  {val}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Medications & Allergies */}
      <div className="px-4 py-3 grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Pill className="w-3 h-3 text-slate-400" />
            <p className="text-slate-400 text-[10px] uppercase tracking-wider">
              Medications
            </p>
          </div>
          {medications.length > 0 ? (
            medications.map((m) => (
              <p key={m} className="text-slate-600 text-xs leading-relaxed">
                {m}
              </p>
            ))
          ) : (
            <p className="text-slate-300 text-xs">None</p>
          )}
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            <p className="text-slate-400 text-[10px] uppercase tracking-wider">
              Allergies
            </p>
          </div>
          {allergies.length > 0 ? (
            allergies.map((a) => (
              <p key={a} className="text-amber-600 text-xs leading-relaxed">
                {a}
              </p>
            ))
          ) : (
            <p className="text-slate-300 text-xs">None known</p>
          )}
        </div>
      </div>
    </div>
  );
}
