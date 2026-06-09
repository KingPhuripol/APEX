import { Check } from "lucide-react";

interface Step {
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  current: number; // 0-indexed
}

export default function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors text-xs font-bold ${
                  done
                    ? "border-[#1d4ed8] bg-[#1d4ed8] text-white"
                    : active
                      ? "border-[#1d4ed8] bg-blue-50 text-[#1d4ed8]"
                      : "border-slate-200 bg-white text-slate-400"
                }`}
              >
                {done ? <Check className="w-4 h-4" /> : <span>{i + 1}</span>}
              </div>
              <span
                className={`text-[11px] font-medium whitespace-nowrap ${
                  active
                    ? "text-[#1d4ed8]"
                    : done
                      ? "text-slate-500"
                      : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-px w-12 mx-1 mb-5 transition-colors ${
                  i < current ? "bg-[#1d4ed8]" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
