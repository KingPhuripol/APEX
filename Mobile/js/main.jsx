/* main.jsx — MobileHub root: phone frame, app header, tab routing, tweaks */
(function () {
  const { useState, useEffect } = React;
  const Icon = window.Icon;
  const { StatusBar, LineBar, TabBar, AlertsTab, InsightDrawer, ScanTab, CopilotTab } = window;
  const { useTweaks, TweaksPanel, TweakSection, TweakColor, TweakRadio } = window;
  const API = window.ApexAPI;

  const ACCENTS = {
    cyan:   { c: '#06b6d4', wash: 'rgba(6,182,212,.14)', line: 'rgba(6,182,212,.35)' },
    blue:   { c: '#3b82f6', wash: 'rgba(59,130,246,.14)', line: 'rgba(59,130,246,.35)' },
    violet: { c: '#8b5cf6', wash: 'rgba(139,92,246,.14)', line: 'rgba(139,92,246,.35)' },
  };

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "accent": "cyan",
    "motion": "clinical"
  }/*EDITMODE-END*/;

  const HEADERS = {
    alerts:  { title: 'Clinical Alerts', sub: 'ระบบสนับสนุนการตัดสินใจแบบเรียลไทม์' },
    scan:    { title: 'Quick Scan', sub: 'ไปป์ไลน์วินิจฉัยด้วย AI' },
    copilot: { title: 'Specialist Copilot', sub: 'แชตปรึกษาผู้เชี่ยวชาญหลายเอเจนต์' },
  };

  function AppHeader({ tab }) {
    const h = HEADERS[tab];
    return (
      <div className="sticky top-0 z-20 px-4 pt-3 pb-3 glass-strong" style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="relative grid place-items-center rounded-xl" style={{ width: 38, height: 38, background: 'linear-gradient(135deg, var(--accent), #1d335c)', boxShadow: '0 4px 16px var(--accent-wash)' }}>
              <Icon name="activity" size={20} stroke={2.4} style={{ color: '#fff' }} />
              <span className="absolute inset-0 rounded-xl" style={{ border: '1px solid rgba(255,255,255,.18)' }}></span>
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '.06em' }}>APEX</span>
                <span className="mono" style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent-line)', borderRadius: 4, padding: '1px 4px', letterSpacing: '.04em' }}>LIFF</span>
              </div>
              <div className="th-tight" style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', marginTop: 1 }}>{h.sub}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.3)' }}>
              <span className="w-1.5 h-1.5 rounded-full dot-pulse" style={{ background: '#10b981', '--dot': 'rgba(16,185,129,.5)' }}></span>
              <span className="th" style={{ fontSize: 11, fontWeight: 700, color: '#10b981', letterSpacing: '.02em' }}>เชื่อมต่อ</span>
            </span>
            <button className="relative grid place-items-center rounded-full press" style={{ width: 36, height: 36, background: 'rgba(255,255,255,.05)', border: '1px solid var(--line)', color: 'rgba(255,255,255,.75)' }}>
              <Icon name="bell" size={17} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: '#ef4444', boxShadow: '0 0 6px #ef4444' }}></span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  function MobileHub() {
    const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
    const [tab, setTab] = useState('alerts');
    const [openAlert, setOpenAlert] = useState(null);
    const ac = ACCENTS[t.accent] || ACCENTS.cyan;

    // apply accent + motion to root vars
    useEffect(() => {
      const r = document.documentElement;
      r.style.setProperty('--accent', ac.c);
      r.style.setProperty('--accent-wash', ac.wash);
      r.style.setProperty('--accent-line', ac.line);
      r.dataset.motion = t.motion;
    }, [t.accent, t.motion]);

    return (
      <div className="phone-frame">
        <div className="phone-screen" style={{ background: 'radial-gradient(120% 80% at 50% -10%, #0c1424 0%, #070b12 60%)' }}>
          {/* ambient glow field */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <span className="absolute -top-10 -left-10 w-48 h-48 rounded-full blur-3xl" style={{ background: 'var(--accent-wash)', opacity: .6 }}></span>
            <span className="absolute top-1/3 -right-16 w-44 h-44 rounded-full blur-3xl" style={{ background: 'rgba(139,92,246,.1)' }}></span>
          </div>

          <div className="relative z-10 flex flex-col h-full">
            <StatusBar />
            <LineBar title="apex-clinical.liff.line.me" />
            <AppHeader tab={tab} />

            {/* scroll body */}
            <div className="flex-1 min-h-0 relative">
              <div key={tab} className={'tab-enter absolute inset-0 ' + (tab === 'copilot' ? 'overflow-hidden' : 'overflow-y-auto noscroll')}>
                {tab === 'copilot' ? <CopilotTab /> : tab === 'scan' ? <ScanTab /> : <AlertsTab alerts={API.ALERTS} onOpen={setOpenAlert} />}
              </div>
            </div>
            <TabBar active={tab} onChange={setTab} />
          </div>

          <InsightDrawer alert={openAlert} onClose={() => setOpenAlert(null)} />
        </div>

        <TweaksPanel title="Tweaks">
          <TweakSection label="Accent" />
          <TweakColor label="Accent color" value={ac.c} options={['#06b6d4', '#3b82f6', '#8b5cf6']}
            onChange={(v) => setTweak('accent', v === '#3b82f6' ? 'blue' : v === '#8b5cf6' ? 'violet' : 'cyan')} />
          <TweakSection label="Motion" />
          <TweakRadio label="Animation" value={t.motion} options={['clinical', 'showpiece']}
            onChange={(v) => setTweak('motion', v)} />
        </TweaksPanel>
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById('root')).render(<MobileHub />);
})();
