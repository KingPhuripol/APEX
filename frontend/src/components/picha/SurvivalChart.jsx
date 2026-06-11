/**
 * SurvivalChart — CSS-only survival probability bar chart
 * Ported from Picha standalone (TSX → JSX), no recharts dependency needed.
 */

const COLORS = ['#22d3ee', '#06b6d4', '#0891b2', '#0e7490'];

export default function SurvivalChart({ data = [] }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-6 text-sm" style={{ color: 'var(--muted, #666)' }}>
        Survival data not available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((point, i) => {
        const pct = Math.round((point.probability ?? 0) * 100);
        const color = COLORS[i % COLORS.length];
        return (
          <div key={point.label} className="flex items-center gap-3">
            <span className="text-xs font-mono w-10 text-right shrink-0" style={{ color: 'var(--text-2, #aaa)' }}>
              {point.label}
            </span>
            <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: 'var(--surface-3, #1a1a2e)' }}>
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-2"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${color}44, ${color})`,
                  minWidth: pct > 0 ? '2rem' : '0',
                }}
              >
                <span className="text-[10px] font-bold text-white drop-shadow-sm">
                  {pct}%
                </span>
              </div>
            </div>
          </div>
        );
      })}
      <p className="text-[10px] text-center mt-1" style={{ color: 'var(--muted, #666)' }}>
        SEER 2010–2020 · SEA-adjusted · Population-based statistical estimate
      </p>
    </div>
  );
}
