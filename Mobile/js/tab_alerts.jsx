/* tab_alerts.jsx — Tab 1: clinical alarm feed + slide-up insight drawer */
(function () {
  const { useState, useEffect } = React;
  const Icon = window.Icon;
  const { SeverityBadge, ModuleChip, SEV, MOD } = window;

  function AlertCard({ a, onOpen }) {
    const s = SEV[a.severity];
    const crit = a.severity === 'critical';
    return (
      <button onClick={() => onOpen(a)}
        className="relative w-full text-left rounded-2xl p-3.5 press card-surface overflow-hidden"
        style={{ border: `1px solid ${crit ? s.c + '4d' : 'var(--line)'}` }}>
        {/* severity edge */}
        <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full" style={{ background: s.c, boxShadow: crit ? `0 0 12px ${s.glow}` : 'none' }}></span>
        {crit && <span className="absolute inset-0 pointer-events-none crit-sheen"></span>}

        <div className="flex items-center justify-between mb-2.5 pl-2">
          <ModuleChip module={a.module} />
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1" style={{ fontSize: 12.5, color: 'rgba(255,255,255,.66)' }}>
              <Icon name="clock" size={11} /> {a.time}
            </span>
            <SeverityBadge sev={a.severity} pulse={crit} />
          </div>
        </div>

        <div className="flex items-end justify-between gap-3 pl-2">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <h3 className="truncate" style={{ fontSize: 15.5, fontWeight: 700, color: '#fff', letterSpacing: '-.01em' }}>{a.name}</h3>
              <span className="mono shrink-0" style={{ fontSize: 12, color: 'rgba(255,255,255,.62)' }}>{a.age}{a.sex}</span>
            </div>
            <div className="mono mt-0.5" style={{ fontSize: 12.5, color: 'rgba(255,255,255,.68)', letterSpacing: '.02em' }}>{a.hn}</div>
            <div className="mt-2 flex items-center gap-1.5" style={{ color: s.c }}>
              <Icon name={crit ? 'alert-triangle' : a.severity === 'normal' ? 'check' : 'activity'} size={13} stroke={2.2} />
              <span className="th-tight" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.9)' }}>{a.finding}</span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="mono tnum" style={{ fontSize: 22, fontWeight: 700, color: s.c, lineHeight: 1 }}>
              {a.metric.value}<span style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,.7)', marginLeft: 2 }}>{a.metric.unit}</span>
            </div>
            <div className="th-tight" style={{ fontSize: 11.5, color: 'rgba(255,255,255,.66)', marginTop: 3, letterSpacing: '.02em' }}>{a.metric.label}</div>
          </div>
        </div>
      </button>
    );
  }

  function AlertsTab({ alerts, onOpen }) {
    const [filter, setFilter] = useState('all');
    const counts = {
      all: alerts.length,
      critical: alerts.filter((a) => a.severity === 'critical').length,
      high: alerts.filter((a) => a.severity === 'high').length,
    };
    const list = filter === 'all' ? alerts : alerts.filter((a) => a.severity === filter);
    const chips = [
      { id: 'all', label: 'ทั้งหมด', n: counts.all },
      { id: 'critical', label: 'วิกฤต', n: counts.critical },
      { id: 'high', label: 'เร่งด่วน', n: counts.high },
    ];
    return (
      <div className="px-4 pt-3">
        {/* summary banner */}
        <div className="rounded-2xl p-4 mb-3.5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,.14), rgba(17,28,52,.6) 60%)', border: '1px solid rgba(239,68,68,.28)' }}>
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full" style={{ background: 'radial-gradient(circle, rgba(239,68,68,.4), transparent 70%)' }}></div>
          <div className="flex items-center justify-between relative">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid place-items-center w-7 h-7 rounded-lg dot-pulse keep-pulse" style={{ background: 'rgba(239,68,68,.2)', color: '#ef4444', '--dot': 'rgba(239,68,68,.5)' }}>
                  <Icon name="alert-triangle" size={15} stroke={2.2} />
                </span>
                <span className="th" style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,.82)' }}>แจ้งเตือนวิกฤตที่ต้องจัดการ</span>
              </div>
              <div className="mt-2 mono tnum" style={{ fontSize: 30, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{counts.critical} <span className="th" style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,.7)' }}>รายการรอดำเนินการ</span></div>
            </div>
            <div className="text-right">
              <div className="mono tnum" style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>● LIVE</div>
              <div className="th" style={{ fontSize: 12, color: 'rgba(255,255,255,.66)', marginTop: 4 }}>{alerts.length} เคสวันนี้</div>
            </div>
          </div>
        </div>

        {/* filter chips */}
        <div className="flex items-center gap-2 mb-3">
          {chips.map((c) => {
            const on = filter === c.id;
            return (
              <button key={c.id} onClick={() => setFilter(c.id)} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 press transition-all"
                style={{ background: on ? 'var(--accent)' : 'rgba(255,255,255,.04)', border: `1px solid ${on ? 'var(--accent)' : 'var(--line)'}` }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: on ? '#04121c' : 'rgba(255,255,255,.82)' }}>{c.label}</span>
                <span className="mono tnum grid place-items-center rounded-full" style={{ minWidth: 17, height: 17, fontSize: 11.5, fontWeight: 700, background: on ? 'rgba(0,0,0,.2)' : 'rgba(255,255,255,.08)', color: on ? '#04121c' : 'rgba(255,255,255,.8)', padding: '0 4px' }}>{c.n}</span>
              </button>
            );
          })}
        </div>

        {/* list */}
        <div className="flex flex-col gap-2.5">
          {list.map((a, i) => (
            <div key={a.id} className="stagger" style={{ animationDelay: `${i * 55}ms` }}>
              <AlertCard a={a} onOpen={onOpen} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ----- slide-up insight drawer ----- */
  function InsightDrawer({ alert, onClose }) {
    const [shown, setShown] = useState(false);
    useEffect(() => {
      if (alert) { const t = setTimeout(() => setShown(true), 10); return () => clearTimeout(t); }
      setShown(false);
    }, [alert]);
    if (!alert) return null;
    const s = SEV[alert.severity];
    const m = MOD[alert.module];
    const close = () => { setShown(false); setTimeout(onClose, 280); };
    return (
      <div className="absolute inset-0 z-40">
        <div onClick={close} className="absolute inset-0 transition-opacity" style={{ background: 'rgba(2,5,12,.66)', backdropFilter: 'blur(3px)', opacity: shown ? 1 : 0 }}></div>
        <div className="absolute left-0 right-0 bottom-0 rounded-t-[26px] overflow-hidden transition-transform glass-strong"
          style={{ transform: shown ? 'translateY(0)' : 'translateY(100%)', maxHeight: '86%', border: '1px solid var(--line)', borderBottom: 'none', transitionTimingFunction: 'cubic-bezier(.16,1,.3,1)', transitionDuration: '.42s' }}>
          {/* grab handle */}
          <div className="flex justify-center pt-2.5 pb-1"><span className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,.22)' }}></span></div>

          <div className="overflow-y-auto noscroll" style={{ maxHeight: 'calc(86vh - 30px)' }}>
            {/* header */}
            <div className="px-5 pt-2 pb-4" style={{ borderBottom: '1px solid var(--line)' }}>
              <div className="flex items-center justify-between mb-3">
                <ModuleChip module={alert.module} size="lg" />
                <button onClick={close} className="grid place-items-center w-8 h-8 rounded-full press" style={{ background: 'rgba(255,255,255,.05)', color: 'rgba(255,255,255,.8)' }}>
                  <Icon name="x" size={18} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-.02em' }}>{alert.name}</h2>
                  <div className="mono mt-1 flex items-center gap-2" style={{ fontSize: 11.5, color: 'rgba(255,255,255,.7)' }}>
                    <span>{alert.hn}</span><span>·</span><span>{alert.age}{alert.sex}</span>
                  </div>
                </div>
                <SeverityBadge sev={alert.severity} pulse={alert.severity === 'critical'} />
              </div>
            </div>

            {/* finding + metric */}
            <div className="px-5 py-4 flex items-center gap-4" style={{ borderBottom: '1px solid var(--line)' }}>
              <div className="relative shrink-0 grid place-items-center rounded-2xl" style={{ width: 64, height: 64, background: s.c + '14', border: `1px solid ${s.c}40` }}>
                <span className="absolute inset-0 rounded-2xl ring-pulse" style={{ '--rc': s.glow }}></span>
                <Icon name={alert.severity === 'normal' ? 'shield' : 'alert-triangle'} size={26} stroke={2} style={{ color: s.c }} />
              </div>
              <div className="flex-1">
                <div className="th-tight" style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{alert.finding}</div>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="mono tnum" style={{ fontSize: 12, color: s.c, fontWeight: 600 }}>{(alert.confidence * 100).toFixed(0)}%</span>
                  <span className="th whitespace-nowrap" style={{ fontSize: 11.5, color: 'rgba(255,255,255,.7)' }}>ความเชื่อมั่น AI</span>
                </div>
              </div>
              <div className="text-right pl-2" style={{ borderLeft: '1px solid var(--line)' }}>
                <div className="mono tnum" style={{ fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1, paddingLeft: 12 }}>{alert.metric.value}<span style={{ fontSize: 12.5, color: 'rgba(255,255,255,.7)', marginLeft: 2 }}>{alert.metric.unit}</span></div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.66)', marginTop: 4, paddingLeft: 12 }}>{alert.metric.label}</div>
              </div>
            </div>

            {/* explainable insights */}
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="eye" size={15} style={{ color: 'var(--accent)' }} />
                <h4 className="th" style={{ fontSize: 12.5, fontWeight: 800, color: 'rgba(255,255,255,.9)', letterSpacing: '.02em' }}>เหตุผลประกอบการวินิจฉัย</h4>
              </div>
              <div className="flex flex-col gap-3">
                {alert.insights.map((ins, i) => (
                  <div key={i} className="flex gap-2.5 items-start stagger" style={{ animationDelay: `${shown ? i * 60 : 0}ms` }}>
                    <span className="mono shrink-0 grid place-items-center rounded-md mt-px" style={{ width: 18, height: 18, fontSize: 11.5, fontWeight: 700, background: 'var(--accent-wash)', color: 'var(--accent)', border: '1px solid var(--accent-line)' }}>{i + 1}</span>
                    <span className="th flex-1 min-w-0" style={{ fontSize: 13.5, lineHeight: 1.55, color: 'rgba(255,255,255,.84)' }}>{ins}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* actionable recommendation banner */}
            <div className="px-5 pb-5">
              <div className="rounded-2xl p-4 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${s.c}1f, ${s.c}0a)`, border: `1px solid ${s.c}4d` }}>
                <span className="absolute right-0 top-0 bottom-0 w-20 pointer-events-none" style={{ background: `radial-gradient(circle at right, ${s.glow}, transparent 70%)` }}></span>
                <div className="flex items-center gap-2 mb-2.5 relative">
                  <Icon name="zap" size={15} stroke={2.2} style={{ color: s.c }} fill={s.c} />
                  <span className="th" style={{ fontSize: 12, fontWeight: 800, color: s.c, letterSpacing: '.02em' }}>คำแนะนำที่ต้องปฏิบัติ</span>
                </div>
                <div className="relative flex flex-col gap-2.5">
                  {alert.recommendation.map((step, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="shrink-0 grid place-items-center rounded-full mt-px" style={{ width: 19, height: 19, background: s.c, color: '#fff' }}>
                        <Icon name="check" size={12} stroke={3} />
                      </span>
                      <span className="th flex-1 min-w-0" style={{ fontSize: 14, lineHeight: 1.5, color: '#fff', fontWeight: 500 }}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2.5 mt-3">
                <button className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 press whitespace-nowrap" style={{ background: 'var(--accent)', color: '#04121c', fontSize: 14, fontWeight: 700 }}>
                  <Icon name="check" size={16} stroke={2.5} /> รับทราบ
                </button>
                <button className="flex items-center justify-center gap-2 rounded-xl py-3 px-4 press whitespace-nowrap" style={{ background: 'rgba(255,255,255,.05)', border: '1px solid var(--line)', color: '#fff', fontSize: 14, fontWeight: 600 }}>
                  <Icon name="message" size={16} /> ส่งต่อ
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  Object.assign(window, { AlertsTab, InsightDrawer });
})();
