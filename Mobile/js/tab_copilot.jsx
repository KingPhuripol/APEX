/* tab_copilot.jsx — Tab 3: AI Specialist Copilot chat */
(function () {
  const { useState, useRef, useEffect } = React;
  const Icon = window.Icon;
  const API = window.ApexAPI;

  const SPECIALISTS = {
    hepa: { id: 'hepa', name: 'Dr. HepaSage AI', role: 'ผู้เชี่ยวชาญตับ', icon: 'droplet', tint: '#3b82f6',
      greeting: 'สวัสดีครับคุณหมอ ผม HepaSage ผู้ช่วยด้านโรคตับ ส่งเคส ค่า TE หรือผลภาพมาได้ ผมจะช่วยวิเคราะห์ระยะพังผืดและแนวทางการรักษาให้',
      prompts: ['แปลผล TE 12.5 kPa', 'ขั้นตอนตรวจ MASH', 'เริ่มเฝ้าระวังมะเร็งตับเมื่อไร'] },
    mars: { id: 'mars', name: 'MARS Pathologist', role: 'ผู้ตรวจสอบมะเร็ง', icon: 'microscope', tint: '#8b5cf6',
      greeting: 'MARS ระบบตรวจสอบพยาธิวิทยาหลายเอเจนต์พร้อมทำงาน อธิบายลักษณะทางสัณฐาน หรือขอให้ผมทบทวนมติร่วมของสไลด์ท่อน้ำดี',
      prompts: ['ทบทวนมติร่วมของสไลด์', 'ลักษณะมะเร็งท่อน้ำดี', 'Reactive vs malignant atypia'] },
  };

  function TypingDots({ tint }) {
    return (
      <div className="flex items-center gap-1 px-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: tint, animationDelay: `${i * 160}ms` }}></span>
        ))}
      </div>
    );
  }

  function Bubble({ msg, sp }) {
    if (msg.role === 'user') {
      return (
        <div className="flex justify-end stagger">
          <div className="max-w-[78%] rounded-2xl rounded-br-md px-3.5 py-2.5" style={{ background: 'linear-gradient(135deg, #3b5b91, #2f4a78)', border: '1px solid rgba(120,150,210,.3)' }}>
            <p className="th" style={{ fontSize: 13.5, lineHeight: 1.6, color: '#fff' }}>{msg.text}</p>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-start gap-2 stagger">
        <span className="grid place-items-center rounded-full shrink-0 mt-0.5" style={{ width: 28, height: 28, background: `${sp.tint}26`, border: `1px solid ${sp.tint}59`, color: sp.tint }}>
          <Icon name={sp.icon} size={15} stroke={2} />
        </span>
        <div className="max-w-[80%] rounded-2xl rounded-tl-md px-3.5 py-2.5" style={{ background: 'rgba(17,28,52,.85)', border: '1px solid var(--line)' }}>
          {msg.typing ? <TypingDots tint={sp.tint} /> : <p className="th" style={{ fontSize: 13.5, lineHeight: 1.65, color: 'rgba(255,255,255,.88)' }}>{msg.text}</p>}
        </div>
      </div>
    );
  }

  function CopilotTab() {
    const [spId, setSpId] = useState('hepa');
    const [convos, setConvos] = useState({
      hepa: [{ role: 'bot', text: SPECIALISTS.hepa.greeting }],
      mars: [{ role: 'bot', text: SPECIALISTS.mars.greeting }],
    });
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const scrollRef = useRef(null);
    const sp = SPECIALISTS[spId];
    const msgs = convos[spId];

    useEffect(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [convos, spId, busy]);

    const send = async (text) => {
      const t = (text || input).trim();
      if (!t || busy) return;
      setInput('');
      setConvos((c) => ({ ...c, [spId]: [...c[spId], { role: 'user', text }, { role: 'bot', typing: true }] }));
      setBusy(true);
      let reply;
      try {
        const r = spId === 'hepa' ? await API.smartlivaChat([{ role: 'user', content: t }], 'th') : await API.pichaChat(t, 'sess-1');
        reply = r.reply;
      } catch (e) { reply = 'ขณะนี้ระบบทำงานในโหมดเดโมออฟไลน์ แต่ตามแนวทางมาตรฐาน แนะนำให้พิจารณาร่วมกับบริบททางคลินิกและปรึกษาผู้เชี่ยวชาญ'; }
      setConvos((c) => {
        const arr = c[spId].slice(0, -1);
        return { ...c, [spId]: [...arr, { role: 'bot', text: reply }] };
      });
      setBusy(false);
    };

    return (
      <div className="flex flex-col h-full">
        {/* specialist toggle */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="flex gap-1.5 rounded-2xl p-1.5 card-surface" style={{ border: '1px solid var(--line)' }}>
            {Object.values(SPECIALISTS).map((x) => {
              const on = spId === x.id;
              return (
                <button key={x.id} onClick={() => setSpId(x.id)} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl press transition-all"
                  style={{ background: on ? `${x.tint}1f` : 'transparent', border: `1px solid ${on ? x.tint + '66' : 'transparent'}` }}>
                  <span className="grid place-items-center rounded-full" style={{ width: 24, height: 24, background: on ? `${x.tint}33` : 'rgba(255,255,255,.05)', color: on ? x.tint : 'rgba(255,255,255,.66)' }}>
                    <Icon name={x.icon} size={14} stroke={2} />
                  </span>
                  <div className="text-left min-w-0">
                    <div className="whitespace-nowrap" style={{ fontSize: 12, fontWeight: 700, color: on ? '#fff' : 'rgba(255,255,255,.76)', lineHeight: 1.15 }}>{x.name.replace(' AI', '')}</div>
                    <div className="th whitespace-nowrap" style={{ fontSize: 10.5, color: on ? x.tint : 'rgba(255,255,255,.6)', lineHeight: 1.15 }}>{x.role}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto noscroll px-4 py-2 flex flex-col gap-3">
          {msgs.map((m, i) => <Bubble key={i} msg={m} sp={sp} />)}
          {/* suggested prompts (only at start) */}
          {msgs.length === 1 && (
            <div className="flex flex-wrap gap-2 mt-1 pl-9">
              {sp.prompts.map((p, i) => (
                <button key={i} onClick={() => send(p)} className="rounded-full px-3 py-1.5 press" style={{ background: `${sp.tint}14`, border: `1px solid ${sp.tint}40`, fontSize: 11.5, color: sp.tint, fontWeight: 600 }}>{p}</button>
              ))}
            </div>
          )}
        </div>

        {/* sticky input */}
        <div className="shrink-0 px-3 pt-2 pb-2" style={{ borderTop: '1px solid var(--line)', background: 'rgba(8,12,20,.6)' }}>
          <div className="flex items-center gap-2 rounded-2xl pl-4 pr-1.5 py-1.5" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid var(--line)' }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={`พิมพ์ถึง ${sp.name.replace(' AI', '')}…`} className="flex-1 bg-transparent outline-none" style={{ fontSize: 13.5, color: '#fff' }} />
            <button onClick={() => send()} disabled={!input.trim() || busy} className="grid place-items-center rounded-xl press transition-all" style={{ width: 38, height: 38, background: input.trim() && !busy ? sp.tint : 'rgba(255,255,255,.06)', color: input.trim() && !busy ? '#04121c' : 'rgba(255,255,255,.55)' }}>
              <Icon name="send" size={17} stroke={2.2} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  window.CopilotTab = CopilotTab;
})();
