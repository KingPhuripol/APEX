/* shell.jsx — LINE/LIFF chrome, status bar, bottom tab nav, shared atoms */
(function () {
  const { useState, useEffect, useRef } = React;
  const Icon = window.Icon;

  /* ----- severity + module config ----- */
  const SEV = {
    critical: { c: '#ef4444', label: 'วิกฤต', glow: 'rgba(239,68,68,.55)' },
    high:     { c: '#f59e0b', label: 'เร่งด่วน', glow: 'rgba(245,158,11,.45)' },
    moderate: { c: '#f59e0b', label: 'ปานกลาง', glow: 'rgba(245,158,11,.4)' },
    normal:   { c: '#10b981', label: 'ปกติ',   glow: 'rgba(16,185,129,.4)' },
    low:      { c: '#10b981', label: 'ต่ำ',       glow: 'rgba(16,185,129,.4)' },
  };
  const MOD = {
    AXIA:      { icon: 'brain',      tint: '#06b6d4', full: 'CT สมอง · AXIA' },
    SmartLiva: { icon: 'droplet',    tint: '#3b82f6', full: 'อัลตราซาวด์ตับ · SmartLiva' },
    PICHA:     { icon: 'microscope', tint: '#8b5cf6', full: 'พยาธิวิทยา · PICHA' },
  };

  /* ----- iOS status bar ----- */
  function StatusBar() {
    return (
      <div className="flex items-center justify-between px-6 pt-2 pb-1 text-white/90 select-none" style={{ fontSize: 13, fontWeight: 600 }}>
        <span style={{ letterSpacing: '.02em' }}>9:41</span>
        <div className="flex items-center gap-1.5">
          <Icon name="signal" size={15} stroke={2.4} />
          <Icon name="wifi" size={15} stroke={2.2} />
          <Icon name="battery" size={17} stroke={2} />
        </div>
      </div>
    );
  }

  /* ----- LINE LIFF header bar ----- */
  function LineBar({ title }) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ background: 'rgba(8,12,20,.85)', borderColor: 'var(--line)' }}>
        <button className="grid place-items-center w-8 h-8 rounded-full press" style={{ color: 'rgba(255,255,255,.75)' }}>
          <Icon name="chevron-left" size={22} />
        </button>
        <div className="flex-1 min-w-0 flex items-center justify-center gap-1.5">
          <Icon name="lock" size={11} className="shrink-0" style={{ color: 'rgba(255,255,255,.66)' }} />
          <span className="truncate" style={{ fontSize: 12.5, color: 'rgba(255,255,255,.62)', fontWeight: 500, letterSpacing: '.01em' }}>{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="grid place-items-center w-8 h-8 rounded-full press" style={{ color: 'rgba(255,255,255,.75)' }}>
            <Icon name="more" size={20} />
          </button>
          <div className="w-px h-4" style={{ background: 'var(--line)' }}></div>
          <button className="grid place-items-center w-8 h-8 rounded-full press" style={{ color: 'rgba(255,255,255,.75)' }}>
            <Icon name="x" size={20} />
          </button>
        </div>
      </div>
    );
  }

  /* ----- bottom tab nav (floating, safe-area aware) ----- */
  function TabBar({ active, onChange }) {
    const tabs = [
      { id: 'alerts', icon: 'bell', label: 'แจ้งเตือน' },
      { id: 'scan', icon: 'scan', label: 'สแกน' },
      { id: 'copilot', icon: 'sparkles', label: 'ผู้ช่วย AI' },
    ];
    return (
      <div className="shrink-0 px-3 pt-2 z-30" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))', background: 'linear-gradient(0deg, rgba(7,11,18,.95), transparent)' }}>
        <div className="flex items-stretch gap-1 rounded-[22px] p-1.5 glass-strong" style={{ border: '1px solid var(--line)', boxShadow: '0 -8px 30px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.02) inset' }}>
          {tabs.map((t) => {
            const on = active === t.id;
            return (
              <button key={t.id} onClick={() => onChange(t.id)}
                className="relative flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-[16px] press transition-all"
                style={{ color: on ? 'var(--accent)' : 'rgba(255,255,255,.74)', background: on ? 'var(--accent-wash)' : 'transparent' }}>
                {on && <span className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full" style={{ background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)' }}></span>}
                <Icon name={t.icon} size={21} stroke={on ? 2.3 : 1.9} fill={on ? 'var(--accent-wash)' : 'none'} />
                <span style={{ fontSize: 11.5, fontWeight: on ? 700 : 500, letterSpacing: '.02em' }}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ----- shared atoms ----- */
  function SeverityBadge({ sev, pulse }) {
    const s = SEV[sev] || SEV.normal;
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: s.c + '1a', border: `1px solid ${s.c}4d` }}>
        <span className={'relative w-1.5 h-1.5 rounded-full ' + (pulse ? 'dot-pulse keep-pulse' : '')} style={{ background: s.c, '--dot': s.glow }}></span>
        <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.02em', color: s.c }}>{s.label}</span>
      </span>
    );
  }
  function ModuleChip({ module, size = 'sm' }) {
    const m = MOD[module] || MOD.AXIA;
    const sm = size === 'sm';
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full" style={{ padding: sm ? '3px 9px 3px 6px' : '5px 11px 5px 7px', background: m.tint + '14', border: `1px solid ${m.tint}33` }}>
        <span className="grid place-items-center rounded-full" style={{ width: sm ? 16 : 20, height: sm ? 16 : 20, background: m.tint + '26', color: m.tint }}>
          <Icon name={m.icon} size={sm ? 11 : 13} stroke={2} />
        </span>
        <span style={{ fontSize: sm ? 10.5 : 12, fontWeight: 700, color: m.tint, letterSpacing: '.01em' }}>{module}</span>
      </span>
    );
  }

  Object.assign(window, { StatusBar, LineBar, TabBar, SeverityBadge, ModuleChip, SEV, MOD });
})();
