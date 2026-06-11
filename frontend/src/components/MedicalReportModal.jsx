import { useRef } from "react";
import {
  Printer,
  X,
  ShieldCheck,
  User,
  Calendar,
  FileText,
} from "lucide-react";

export default function MedicalReportModal({
  isOpen,
  onClose,
  analysisResult,
  patientId,
  moduleName,
}) {
  const printRef = useRef(null);

  if (!isOpen || !analysisResult) return null;

  const handlePrint = () => {
    window.print();
  };

  const { stage4_formatter } = analysisResult;
  const primaryFinding =
    stage4_formatter?.primary_finding || "No primary finding available.";
  const insights = stage4_formatter?.explainable_insights || [];
  const recommendations =
    stage4_formatter?.actionable_recommendations ||
    "No recommendations provided.";

  // Format current date for the report
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Module specific titles
  const getModuleTitle = () => {
    switch (moduleName) {
      case "axia":
        return "Neuroradiology CT Report";
      case "picha":
        return "Gastrointestinal Pathology Report";
      case "smartliva":
        return "Hepatobiliary Ultrasound Report";
      default:
        return "Clinical AI Analysis Report";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm print:bg-white print:backdrop-blur-none">
      {/* Modal Container */}
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden print:w-full print:max-w-none print:max-h-none print:shadow-none print:rounded-none">
        {/* Header - Screen Only */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200 print:hidden">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-violet-600" />
            <h2 className="text-lg font-bold text-gray-800">
              Finalized Medical Report
            </h2>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="flex items-center px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-md shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4 mr-2" />
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Report Content */}
        <div
          ref={printRef}
          className="flex-1 overflow-y-auto p-10 bg-white print:overflow-visible print:p-0"
        >
          {/* Print specific container with strict styling */}
          <div className="max-w-3xl mx-auto space-y-8 text-gray-900">
            {/* Report Header */}
            <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-gray-900 uppercase">
                  APEX CLINICAL
                </h1>
                <p className="text-sm font-semibold text-gray-500 tracking-widest mt-1 uppercase">
                  Advanced AI Diagnostics
                </p>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold text-violet-700 uppercase">
                  {getModuleTitle()}
                </h2>
                <p className="text-sm text-gray-600 mt-1">Generated: {today}</p>
                <div className="inline-flex items-center mt-2 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold uppercase rounded border border-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                  Verified by MARS AI
                </div>
              </div>
            </div>

            {/* Patient Metadata */}
            <div className="grid grid-cols-2 gap-6 bg-gray-50 p-5 rounded-lg border border-gray-200">
              <div className="flex items-start space-x-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Patient ID
                  </p>
                  <p className="text-lg font-mono font-bold text-gray-900">
                    {patientId || "UNKNOWN"}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Analysis Date
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {today}
                  </p>
                </div>
              </div>
            </div>

            {/* Main Clinical Content */}
            <div className="space-y-6">
              {/* Primary Diagnosis */}
              <section>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest border-b border-gray-200 pb-2 mb-4">
                  Primary Diagnosis / Findings
                </h3>
                <div className="bg-violet-50 border-l-4 border-violet-600 p-5 rounded-r-lg">
                  <p className="text-lg font-bold text-gray-900 leading-relaxed">
                    {primaryFinding}
                  </p>
                </div>
              </section>

              {/* Evidence & Insights */}
              <section>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest border-b border-gray-200 pb-2 mb-4">
                  {stage4_formatter?.synoptic_report
                    ? "Microscopic Description"
                    : "Clinical Evidence & Insights"}
                </h3>
                <ul className="space-y-3">
                  {insights.length > 0 ? (
                    insights.map((insight, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 rounded-full bg-gray-400 mr-3" />
                        <span className="text-base text-gray-800 leading-relaxed">
                          {insight}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-500 italic">
                      No detailed insights provided.
                    </li>
                  )}
                </ul>
              </section>

              {/* Synoptic Report (if available) */}
              {stage4_formatter?.synoptic_report && (
                <section>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest border-b border-gray-200 pb-2 mb-4">
                    CAP Synoptic Details
                  </h3>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <tbody className="divide-y divide-gray-200">
                        {Object.entries(stage4_formatter.synoptic_report).map(
                          ([key, val]) => (
                            <tr key={key} className="even:bg-gray-50">
                              <td className="py-3 px-4 text-sm font-semibold text-gray-700 w-1/3 align-top">
                                {key}
                              </td>
                              <td className="py-3 px-4 text-base text-gray-900 font-medium">
                                {val}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Recommendations */}
              <section>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest border-b border-gray-200 pb-2 mb-4">
                  Actionable Recommendations
                </h3>
                <div className="bg-gray-50 border border-gray-200 p-5 rounded-lg">
                  <p className="text-base text-gray-800 font-medium leading-relaxed whitespace-pre-line">
                    {recommendations}
                  </p>
                </div>
              </section>
            </div>

            {/* Footer Sign-off */}
            <div className="pt-12 mt-12 border-t-2 border-gray-200">
              <div className="flex justify-between items-end">
                <div className="max-w-md">
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    <strong>DISCLAIMER:</strong> This report is generated by the
                    APEX Clinical AI Platform (Multi-Agent Reasoning System). It
                    is designed to assist, not replace, clinical judgment. Final
                    diagnostic and treatment decisions must be made by a
                    qualified healthcare professional.
                  </p>
                </div>
                <div className="text-center w-64">
                  <div className="border-b border-gray-400 h-10 mb-2"></div>
                  <p className="text-sm font-bold text-gray-900">
                    Electronically Signed
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Attending Physician / Specialist
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles injection */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body * { visibility: hidden; }
          .fixed.inset-0 { position: absolute; left: 0; top: 0; right: 0; bottom: 0; }
          .fixed.inset-0 * { visibility: visible; }
          .print\\:hidden { display: none !important; }
          .print\\:bg-white { background-color: white !important; }
          .print\\:backdrop-blur-none { backdrop-filter: none !important; }
          .print\\:w-full { width: 100% !important; max-width: 100% !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:overflow-visible { overflow: visible !important; }
          .print\\:p-0 { padding: 0 !important; }
        }
      `,
        }}
      />
    </div>
  );
}
