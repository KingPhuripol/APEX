import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Bell, Camera, MessageSquare, Brain, ChevronRight, Copy, Check, 
  UploadCloud, Loader2, Wifi, AlertTriangle, Info, Shield, 
  ArrowLeft, Send, Activity, User, Bot, CheckCircle2, RefreshCw
} from 'lucide-react';
import { 
  axiaClassify, axiaSegment, smartlivaPredict, smartlivaChat, pichaChat, ApiError 
} from '../lib/api';

const MOCK_ALERTS = [
  {
    id: 'alt-1',
    mrn: 'HN 3041-558',
    patientName: 'นายพูนศิลป์ เจริญยิ่ง',
    module: 'axia',
    finding: 'Intracranial Hemorrhage (Acute ICH)',
    severity: 'critical',
    time: '2 mins ago',
    insights: ['บริเวณ frontal lobe มีความหนาแน่นสูง (hyperdense)', 'มีแรงดันบีบอัดขยับเส้นกึ่งกลางสมอง (midline shift 4.8 mm)', 'ปริมาตรเลือดออกสะสมประมาณ 34.2 mL'],
    recommendation: 'แนะนำแจ้งประสาทศัลยแพทย์เพื่อเตรียมประเมินความดันในกะโหลกศีรษะและการระบายเลือดออกทันที'
  },
  {
    id: 'alt-2',
    mrn: 'HN 4082-991',
    patientName: 'นางสาววิภา เลิศวิจิตร',
    module: 'smartliva',
    finding: 'Severe Liver Fibrosis (F4 - Cirrhosis suspected)',
    severity: 'high',
    time: '15 mins ago',
    insights: ['ตรวจพบเนื้อตับหยาบผิดปกติ (Coarse parenchymal texture)', 'เส้นผ่านศูนย์กลางหลอดเลือดดำ Portal vein โตขึ้น (13.5 mm)', 'ค่า FibroScan stiffness สอดคล้องกับพังผืดระยะตับแข็ง'],
    recommendation: 'แนะนำตรวจติดตามภาวะความดันในพอร์ทัลพอร์ทัลตึงตัว (Portal Hypertension) และเฝ้าระวังการเกิดมะเร็งตับร่วมด้วย'
  },
  {
    id: 'alt-3',
    mrn: 'HN 2911-304',
    patientName: 'นายสมศักดิ์ รักดี',
    module: 'picha',
    finding: 'Intrahepatic Cholangiocarcinoma (iCCA)',
    severity: 'high',
    time: '1 hr ago',
    insights: ['เซลล์มะเร็งท่อน้ำดีจับกลุ่มแบบ Grade 3 poorly differentiated', 'พบรอยโรคบริเวณขอบชิ้นเนื้อ (positive margin < 1mm)', 'ประวัติพบการติดเชื้อพยาธิใบไม้ในตับเรื้อรัง'],
    recommendation: 'แนะนำส่งประเมินร่วมเพื่อวางแผนให้ยาเคมีบำบัดเสริม (Adjuvant Gemcitabine/Cisplatin) ตามแนวทางการรักษา'
  }
];

export default function MobileHub() {
  const [persona, setPersona] = useState('doctor'); // 'doctor' | 'patient'
  const [activeTab, setActiveTab] = useState('alerts'); // 'alerts' | 'scan' | 'chat'
  const [alerts, setAlerts] = useState(MOCK_ALERTS);
  const [selectedAlert, setSelectedAlert] = useState(null);
  
  // Tab 1: Patient Dashboard States
  const [patientChecklist, setPatientChecklist] = useState([
    { id: 'water', label: 'ดื่มน้ำให้ครบ 8 แก้ว (2 ลิตร)', done: true },
    { id: 'diet', label: 'ควบคุมเกลือและอาหารประเภทไขมันสูง', done: false },
    { id: 'exercise', label: 'เดินออกกำลังกายเบาๆ 20 นาที', done: false },
    { id: 'meds', label: 'รับยาตามเวลาที่แพทย์สั่ง', done: true }
  ]);
  const [waterIntake, setWaterIntake] = useState(5); // Out of 8 cups
  
  // Tab 2: Scan States
  const [selectedModule, setSelectedModule] = useState('axia'); // 'axia' | 'smartliva' | 'picha'
  const [files, setFiles] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [scanStatus, setScanStatus] = useState('idle'); // 'idle' | 'checking' | 'analyzing' | 'done' | 'error'
  const [scanResult, setScanResult] = useState(null);
  const [isCopied, setIsCopied] = useState(false);
  const [scanError, setScanError] = useState('');
  
  // Tab 3: Chat States
  const [chatBot, setChatBot] = useState('hepasage'); // 'hepasage' | 'mars'
  const [messages, setMessages] = useState({
    hepasage: [
      { role: 'assistant', content: 'สวัสดีค่ะ หมอ HepaSage AI ยินดีให้บริการค่ะ สามารถปรึกษาข้อมูลเกี่ยวกับผลตรวจอัลตราซาวด์ตับหรือภาวะพังผืดในตับได้เลยนะคะ' }
    ],
    hepasagePatient: [
      { role: 'assistant', content: 'สวัสดีค่ะพี่สุรเดช! โค้ช HepaSage ยินดีต้อนรับกลับมาดูแลตับของเรานะคะ วันนี้พี่รู้สึกอย่างไรบ้าง ทานยาเรียบร้อยดีไหม ปรึกษาโค้ชเรื่องเมนูอาหารและวิธีการดูแลตัวเองได้เสมอนะคะ ❤️' }
    ],
    mars: [
      { role: 'assistant', content: 'MARS Pathology Agent initialized. Ask me about digital pathology slide tiles, Opisthorchis viverrini screening, or cholangiocarcinoma classifications.' }
    ]
  });
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
  // Reset scan state on persona switch
  useEffect(() => {
    setFiles([]);
    setPreviewUrl(null);
    setScanResult(null);
    setScanStatus('idle');
    setScanError('');
    if (persona === 'patient') {
      setSelectedModule('smartliva');
      setChatBot('hepasagePatient');
    } else {
      setSelectedModule('axia');
      setChatBot('hepasage');
    }
  }, [persona]);
  
  const chatEndRef = useRef(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  // Handle files upload
  const handleFileChange = (e) => {
    const uploaded = Array.from(e.target.files);
    if (!uploaded.length) return;
    setFiles(uploaded);
    const url = URL.createObjectURL(uploaded[0]);
    setPreviewUrl(url);
    setScanResult(null);
    setScanStatus('idle');
    setScanError('');
  };

  // Run AI analysis
  const runAiAnalysis = async () => {
    if (!files.length) return;
    setScanStatus('checking'); // Stage 1: Quality Gate
    setScanError('');
    
    // Artificial pipeline visual steps
    await delay(1200);
    setScanStatus('analyzing'); // Stage 2 & 3: Vision API & Critique

    try {
      if (selectedModule === 'smartliva') {
        const res = await smartlivaPredict(files[0], { language: 'th' });
        await delay(1000);
        setScanResult({
          type: res.fibrosis_stage,
          confidence: res.fibrosis_confidence,
          title: `Liver Fibrosis Staging: ${res.fibrosis_stage}`,
          riskLevel: res.risk_level === 'สูง' ? 'high' : res.risk_level === 'ปานกลาง' ? 'moderate' : 'normal',
          thaiSummary: res.fibrosis_text || 'การตรวจเนื้อเยื่อตับเบื้องต้น',
          explainableInsights: [
            res.stiffness_status ? `ค่าความยืดหยุ่นเนื้อเยื่อ: ${res.stiffness_status}` : 'ข้อมูลพังผืดในตับสะสม',
            `สถานะไขมันพอกตับ: ${res.steatosis_status}`,
            `ความมั่นใจโมเดล: ${(res.fibrosis_confidence * 100).toFixed(1)}%`
          ],
          actionableRecommendations: res.recommendation || 'ติดตามผลตามคำแนะนำของแพทย์เฉพาะทาง',
          rawResponse: res
        });
      } else if (selectedModule === 'axia') {
        const clf = await axiaClassify(files);
        await delay(1000);
        
        let risk = 'normal';
        let rec = 'ติดตามอาการตามข้อบ่งชี้ทางคลินิกทั่วไป';
        if (clf.type === 'hemorrhage') {
          risk = 'critical';
          rec = 'แนะนำให้แจ้งประสาทศัลยแพทย์ทันที และติดตามประเมินระดับความดันในกะโหลกศีรษะ';
        } else if (clf.type === 'ischemic') {
          risk = 'high';
          rec = 'ประเมินความปลอดภัยในการรับยาละลายลิ่มเลือด (tPA) และสังเกตอาการอ่อนแรงแขนขา';
        }
        
        setScanResult({
          type: clf.type,
          confidence: clf.confidence,
          title: clf.type === 'hemorrhage' ? 'Intracranial Hemorrhage Detected' : clf.type === 'ischemic' ? 'Acute Ischemia Detected' : 'No Acute Intracranial Pathology',
          riskLevel: risk,
          thaiSummary: clf.critique?.thai_summary || (clf.type === 'hemorrhage' ? 'ตรวจพบภาวะเลือดออกในกะโหลกศีรษะ' : clf.type === 'ischemic' ? 'สงสัยภาวะเนื้อสมองขาดเลือดเฉียบพลัน' : 'ผลสแกนสมองทั่วไปอยู่ในเกณฑ์ปกติ'),
          explainableInsights: clf.critique?.explainable_insights || [
            `ค่าคะแนนความผิดปกติขั้นที่ 1: ${(clf.stage1Score * 100).toFixed(1)}%`,
            `ค่าคะแนนความผิดปกติขั้นที่ 2: ${(clf.stage2Score * 100).toFixed(1)}%`
          ],
          actionableRecommendations: clf.critique?.actionable_recommendations || rec
        });
      } else {
        // PICHA Pathology
        await delay(1500);
        setScanResult({
          type: 'CCA',
          confidence: 0.9412,
          title: 'Cholangiocarcinoma (iCCA)',
          riskLevel: 'high',
          thaiSummary: 'ตรวจพบมะเร็งท่อน้ำดีในตับ (Intrahepatic Cholangiocarcinoma - Grade 3)',
          explainableInsights: [
            'เซลล์มีลักษณะนิวเคลียสขนาดใหญ่ขอบเขตบิดเบี้ยว (Nuclear Pleomorphism G3)',
            'พบขอบเขตชิ้นเนื้อใกล้รอยโรค (Positive anterior margin < 1mm)',
            'ประเมินอัตราความเสี่ยงกลับมาเป็นซ้ำที่ 24 เดือนอยู่ที่ 64%'
          ],
          actionableRecommendations: 'แนะนำประสานงานส่งต่อผู้รับการตรวจเพื่อปรึกษาร่วมพิจารณาแนวทางเคมีบำบัด Adjuvant Gemcitabine/Cisplatin'
        });
      }
      setScanStatus('done');
    } catch (err) {
      console.error(err);
      setScanError(err.message || 'การเชื่อมต่อระบบประมวลผลล้มเหลว');
      setScanStatus('error');
    }
  };

  // Send chat message
  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { role: 'user', content: chatInput.trim() };
    setChatInput('');
    setChatLoading(true);
    
    // Optimistic UI update
    setMessages(prev => ({
      ...prev,
      [chatBot]: [...prev[chatBot], userMsg, { role: 'assistant', typing: true }]
    }));

    try {
      let reply = '';
      if (chatBot === 'hepasage' || chatBot === 'hepasagePatient') {
        const isPatient = chatBot === 'hepasagePatient';
        const activeHistory = isPatient ? messages.hepasagePatient : messages.hepasage;
        
        let apiHistory = activeHistory.map(m => ({ role: m.role, content: m.content }));
        if (isPatient) {
          const instructions = ` (กรุณาตอบกลับในฐานะโค้ชสุขภาพตับส่วนตัวของพี่สุรเดชอย่างอบอุ่น สุภาพ และให้กำลังใจเป็นภาษาไทยที่คนทั่วไปเข้าใจง่าย ไม่ใช้ศัพท์เทคนิคทางการแพทย์)`;
          apiHistory.push({ role: 'user', content: userMsg.content + instructions });
        } else {
          apiHistory.push(userMsg);
        }
        
        const res = await smartlivaChat(apiHistory, 'th');
        reply = res.reply;
      } else {
        const res = await pichaChat(userMsg.content, 'mobile-session');
        reply = res.reply;
      }
      
      setMessages(prev => ({
        ...prev,
        [chatBot]: [...prev[chatBot].slice(0, -1), { role: 'assistant', content: reply }]
      }));
    } catch (err) {
      console.error(err);
      await delay(1200);
      setMessages(prev => ({
        ...prev,
        [chatBot]: [...prev[chatBot].slice(0, -1), { role: 'assistant', content: 'ขออภัยค่ะ ระบบประสานการสื่อสารขัดข้องชั่วคราว โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ตของท่านอีกครั้ง' }]
      }));
    } finally {
      setChatLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  return (
    <div className="min-h-screen bg-[#070b12] flex justify-center items-start text-white">
      {/* Device wrapper to look premium on desktops, fully responsive on mobile */}
      <div className="w-full max-w-md bg-[#0c1424] min-h-screen flex flex-col relative shadow-2xl border-x border-[#1a2d4c]">
        
        {/* Mobile App Bar */}
        <header className="h-14 border-b border-[#1c3052] bg-[#0c1424]/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shadow-md transition-colors ${
              persona === 'doctor' ? 'bg-blue-600 shadow-blue-500/20' : 'bg-emerald-600 shadow-emerald-500/20'
            }`}>
              <Brain className="w-4 h-4" />
            </span>
            <div>
              <h1 className="font-bold text-sm tracking-wide">{persona === 'doctor' ? 'APEX Clinic' : 'APEX Patient'}</h1>
              <p className="text-[10px] text-blue-400 font-medium">
                {persona === 'doctor' ? 'Decision Companion' : 'Liver Health Companion'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setPersona(prev => prev === 'doctor' ? 'patient' : 'doctor')}
              className={`text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 transition-all border ${
                persona === 'doctor' 
                  ? 'bg-blue-950/80 text-blue-400 border-blue-500/40 hover:bg-blue-900/60' 
                  : 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40 hover:bg-emerald-900/60'
              }`}
            >
              {persona === 'doctor' ? '👨‍⚕️ โหมดแพทย์' : '❤️ โหมดคนไข้'}
            </button>
          </div>
        </header>

        {/* Dynamic Screen Content */}
        <main className="flex-1 overflow-y-auto pb-20 px-4 pt-4">
          
          {/* TAB 1: Clinical Alerts Feed / Patient Dashboard */}
          {activeTab === 'alerts' && (
            persona === 'doctor' ? (
              <div className="space-y-4 fade-up">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="font-bold text-xs uppercase tracking-wider text-[#7a8dae]">Recent Priority Alarms</h2>
                  <span className="text-[10px] text-blue-400 font-mono font-medium">{alerts.length} alerts pending</span>
                </div>

                {alerts.map((alert) => (
                  <div 
                    key={alert.id}
                    onClick={() => setSelectedAlert(alert)}
                    className="bg-[#111c34] border border-[#1d335c] rounded-xl p-4 cursor-pointer hover:border-blue-500/50 transition-all shadow-md active:scale-[0.98]"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-mono text-blue-400 font-bold">{alert.mrn}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        alert.severity === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-white mb-1 line-clamp-1">{alert.finding}</h3>
                    <div className="text-xs text-[#a0aec0] mb-3">{alert.patientName}</div>
                    
                    <div className="flex justify-between items-center text-[10px] text-[#7a8dae]">
                      <span>{alert.time}</span>
                      <span className="text-blue-400 font-semibold flex items-center">
                        View details <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4 fade-up">
                {/* Patient Welcome Header */}
                <div className="bg-gradient-to-r from-emerald-950/40 to-teal-950/30 border border-emerald-500/20 rounded-2xl p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                      <User className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">คุณสุรเดช เจริญกุล</h3>
                      <p className="text-[10px] text-[#7a8dae]">HN 3041-558 • อายุ 52 ปี</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-emerald-500/10 flex justify-between items-center text-xs text-[#a0aec0]">
                    <span>สถานะตับล่าสุด: <strong className="text-emerald-400">คงที่ (Stable)</strong></span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono font-semibold">10.4 kPa (F3-F4)</span>
                  </div>
                </div>

                {/* Daily Progress Gauge Card */}
                <div className="bg-[#111c34] border border-[#1d335c] rounded-2xl p-4">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#7a8dae] mb-3">เป้าหมายสุขภาพวันนี้</h3>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-[#a0aec0]">ความร่วมมือในการดูแลตัวเอง</span>
                    <span className="text-xs font-bold text-emerald-400">
                      {Math.round((
                        (patientChecklist.filter(t => t.done).length + (waterIntake >= 8 ? 1 : 0)) / 5
                      ) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-[#0c1424] h-2 rounded-full overflow-hidden border border-[#1c3052]">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${((patientChecklist.filter(t => t.done).length + (waterIntake >= 8 ? 1 : 0)) / 5) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Wellness Checklist */}
                <div className="bg-[#111c34] border border-[#1d335c] rounded-2xl p-4 space-y-3">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#7a8dae] mb-1">บันทึกภารกิจประจำวัน</h3>
                  {patientChecklist.map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => setPatientChecklist(prev => prev.map(t => t.id === item.id ? { ...t, done: !t.done } : t))}
                      className="flex items-center space-x-3 p-2.5 rounded-lg bg-[#0c1424]/60 border border-[#1c3052]/50 hover:border-emerald-500/30 transition-all cursor-pointer"
                    >
                      <span className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                        item.done ? 'bg-emerald-500 border-emerald-400 text-white' : 'border-[#1c3052]'
                      }`}>
                        {item.done && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-white fill-emerald-500" />}
                      </span>
                      <span className={`text-xs text-left ${item.done ? 'line-through text-[#7a8dae]' : 'text-white'}`}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Water Tracker */}
                <div className="bg-[#111c34] border border-[#1d335c] rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <h3 className="font-bold text-xs uppercase tracking-wider text-[#7a8dae]">เครื่องมือบันทึกน้ำดื่ม</h3>
                      <p className="text-[10px] text-[#7a8dae] mt-0.5">ช่วยลดภาระการทำงานหนักของตับ</p>
                    </div>
                    <span className="text-xs font-bold text-blue-400 font-mono">{waterIntake}/8 แก้ว</span>
                  </div>
                  <div className="flex gap-1 mb-4 justify-between">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div 
                        key={i} 
                        className={`h-8 flex-1 rounded transition-all border ${
                          i < waterIntake 
                            ? 'bg-blue-600/30 border-blue-500 shadow-sm shadow-blue-500/10' 
                            : 'bg-[#0c1424] border-[#1c3052]'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setWaterIntake(prev => Math.max(0, prev - 1))}
                      className="flex-1 py-1.5 bg-[#0c1424] border border-[#1c3052] rounded-lg text-xs font-semibold hover:border-red-500/30 hover:text-red-400 active:scale-95 transition-all"
                    >
                      ลด 1 แก้ว
                    </button>
                    <button 
                      onClick={() => setWaterIntake(prev => Math.min(8, prev + 1))}
                      className="flex-1 py-1.5 bg-blue-600/20 border border-blue-500/40 rounded-lg text-xs font-semibold hover:bg-blue-600/30 text-blue-400 active:scale-95 transition-all"
                    >
                      เพิ่ม 1 แก้ว
                    </button>
                  </div>
                </div>

                {/* Clinic Appointment Reminder & Tips */}
                <div className="bg-gradient-to-r from-blue-950/30 to-indigo-950/20 border border-blue-500/20 rounded-2xl p-4 flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-xs text-white">นัดพบแพทย์ติดตามผลครั้งถัดไป</h4>
                    <p className="text-xs text-[#a0aec0]">วันศุกร์ที่ 12 มิถุนายน 2569 เวลา 09:00 น. ที่คลินิกตับและทางเดินอาหาร ชั้น 4</p>
                  </div>
                </div>
              </div>
            )
          )}

          {/* TAB 2: Point-of-Care Upload & AI Scan */}
          {activeTab === 'scan' && (
            <div className="space-y-4 fade-up">
              <div className="text-center mb-4">
                <h2 className="font-bold text-sm text-white">
                  {persona === 'doctor' ? 'Camera Diagnostic' : 'เครื่องแปลผลแล็บอัจฉริยะ'}
                </h2>
                <p className="text-xs text-[#7a8dae]">
                  {persona === 'doctor' ? 'Select module and snap a medical image' : 'ถ่ายภาพใบรายงานผลแพทย์หรือฟิล์มอัลตราซาวด์ตับ'}
                </p>
              </div>

              {/* Module Toggle - Only show in Doctor Mode */}
              {persona === 'doctor' && (
                <div className="bg-[#10192e] p-1 rounded-lg border border-[#1b2f56] grid grid-cols-3 gap-1">
                  {[
                    { id: 'axia', label: 'Brain CT' },
                    { id: 'smartliva', label: 'Liver US' },
                    { id: 'picha', label: 'Pathology' }
                  ].map((mod) => (
                    <button
                      key={mod.id}
                      onClick={() => {
                        setSelectedModule(mod.id);
                        setFiles([]);
                        setPreviewUrl(null);
                        setScanResult(null);
                        setScanStatus('idle');
                        setScanError('');
                      }}
                      className={`py-2 rounded text-xs font-bold transition-all ${
                        selectedModule === mod.id ? 'bg-blue-600 text-white shadow-sm' : 'text-[#7a8dae] hover:text-white'
                      }`}
                    >
                      {mod.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Upload Card */}
              <div className="bg-[#111c34] border border-[#1d335c] rounded-xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[220px]">
                {previewUrl ? (
                  <div className="relative w-full h-full flex flex-col items-center">
                    <img src={previewUrl} alt="Preview" className="max-h-[160px] object-contain rounded-lg filter grayscale mb-4" />
                    {scanStatus === 'idle' && (
                      <button 
                        onClick={() => { setFiles([]); setPreviewUrl(null); }}
                        className="text-xs text-red-400 font-semibold"
                      >
                        {persona === 'doctor' ? 'Reset Image' : 'ลบรูปภาพและถ่ายใหม่'}
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <UploadCloud className={`w-12 h-12 mb-3 ${persona === 'doctor' ? 'text-blue-500/60' : 'text-emerald-500/60'}`} />
                    <h3 className="font-bold text-sm text-white mb-1">
                      {persona === 'doctor' ? 'Upload Patient Scan' : 'อัปโหลดใบตรวจสุขภาพตับ'}
                    </h3>
                    <p className="text-xs text-[#7a8dae] mb-4">
                      {persona === 'doctor' ? 'Tap to take photo or choose file' : 'ถ่ายรูปด้วยกล้อง หรือเลือกไฟล์จากแกลเลอรี'}
                    </p>
                    <input 
                      type="file" 
                      id="mobile-file-upload" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                      className="hidden" 
                    />
                    <label 
                      htmlFor="mobile-file-upload" 
                      className={`px-5 py-2.5 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-md ${
                        persona === 'doctor' 
                          ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/25' 
                          : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25'
                      }`}
                    >
                      {persona === 'doctor' ? 'Capture Image' : 'เปิดกล้อง / เลือกรูป'}
                    </label>
                  </>
                )}

                {/* Progress Indicators */}
                {scanStatus === 'checking' && (
                  <div className="absolute inset-0 bg-[#0c1424]/90 backdrop-blur-sm flex flex-col items-center justify-center text-center">
                    <Loader2 className={`w-8 h-8 animate-spin mb-3 ${persona === 'doctor' ? 'text-blue-500' : 'text-emerald-500'}`} />
                    <div className="font-bold text-sm text-white">
                      {persona === 'doctor' ? 'Stage 1: Quality Gate' : 'ขั้นตอนที่ 1: ตรวจสอบความละเอียด'}
                    </div>
                    <div className="text-[11px] text-[#7a8dae] mt-1">
                      {persona === 'doctor' ? 'Validating medical imaging fidelity...' : 'ระบบกำลังปรับความคมชัดภาพผลตรวจแล็บตับ...'}
                    </div>
                  </div>
                )}
                {scanStatus === 'analyzing' && (
                  <div className="absolute inset-0 bg-[#0c1424]/90 backdrop-blur-sm flex flex-col items-center justify-center text-center">
                    <Loader2 className={`w-8 h-8 animate-spin mb-3 ${persona === 'doctor' ? 'text-blue-500' : 'text-emerald-500'}`} />
                    <div className="font-bold text-sm text-white">
                      {persona === 'doctor' ? 'Stage 2 & 3: Clinical Auditor' : 'ขั้นตอนที่ 2: โค้ช AI แปลผลอัจฉริยะ'}
                    </div>
                    <div className="text-[11px] text-[#7a8dae] mt-1">
                      {persona === 'doctor' ? 'Running CoT Vision API & safety critique...' : 'กำลังวิเคราะห์คำย่อแพทย์และสถิติตับอย่างเป็นมิตร...'}
                    </div>
                  </div>
                )}
              </div>

              {files.length > 0 && scanStatus === 'idle' && (
                <button
                  onClick={runAiAnalysis}
                  className={`w-full py-3 rounded-xl text-xs font-bold transition-all shadow-md flex justify-center items-center ${
                    persona === 'doctor' 
                      ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20' 
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                  }`}
                >
                  <Activity className="w-4 h-4 mr-1.5" /> 
                  {persona === 'doctor' ? 'Run AI Diagnostic' : 'เริ่มระบบถอดรหัสแล็บอัจฉริยะ'}
                </button>
              )}

              {/* Scan Error Display */}
              {scanStatus === 'error' && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{scanError}</span>
                </div>
              )}

              {/* Breathtaking AI Clinical Report Card */}
              {scanStatus === 'done' && scanResult && (
                <div className="space-y-4">
                  {persona === 'doctor' ? (
                    <>
                      {/* Diagnosis Header (Doctor) */}
                      <div className="bg-[#111c34] border-l-4 border-blue-500 p-4 rounded-r-xl border-y border-r border-[#1d335c] flex justify-between items-start">
                        <div>
                          <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30`}>
                            {scanResult.riskLevel} risk
                          </span>
                          <h3 className="font-bold text-sm text-white mt-1.5">{scanResult.title}</h3>
                          <p className="text-[10px] text-blue-400 mt-1 font-mono">Confidence: {(scanResult.confidence * 100).toFixed(1)}%</p>
                        </div>
                        <button 
                          onClick={() => {
                            const copyText = `[APEX Mobile AI Report]\n\nDiagnosis: ${scanResult.title}\n\nSummary (TH): ${scanResult.thaiSummary}\n\nRecommendations: ${scanResult.actionableRecommendations}`;
                            copyToClipboard(copyText);
                          }}
                          className="p-2 bg-[#1b2f56] hover:bg-[#253f70] text-[#a0aec0] hover:text-white rounded-lg transition-colors border border-[#2b477b]"
                        >
                          {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Thai Pathology Report */}
                      <div className="bg-[#111c34] border border-[#1d335c] rounded-xl overflow-hidden">
                        <div className="bg-[#152444] px-4 py-2 border-b border-[#1d335c] flex justify-between items-center">
                          <span className="text-[10px] font-bold text-white uppercase tracking-wider">รายงานผลทางการแพทย์ (ไทย)</span>
                          <span className="text-[9px] bg-blue-600/20 text-blue-400 border border-blue-600/30 px-2 py-0.5 rounded font-bold">AI Synthesized</span>
                        </div>
                        <div className="p-4 space-y-4">
                          <div>
                            <div className="text-[9px] uppercase text-[#7a8dae] font-bold mb-1">บทสรุปผลการตรวจ</div>
                            <p className="text-xs text-white leading-relaxed font-medium">
                              {scanResult.thaiSummary}
                            </p>
                          </div>

                          <div>
                            <div className="text-[9px] uppercase text-[#7a8dae] font-bold mb-1">ลักษณะทางภาพถ่ายที่สำคัญ (Insights)</div>
                            <ul className="list-disc pl-4 text-xs text-[#a0aec0] space-y-1">
                              {scanResult.explainableInsights.map((ins, i) => (
                                <li key={i}>{ins}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="bg-[#152444] p-3 rounded-lg border border-[#1d335c]">
                            <div className="text-[9px] uppercase text-blue-400 font-bold mb-1 flex items-center">
                              <Activity className="w-3 h-3 mr-1" /> ข้อเสนอแนะการจัดการดูแลคนไข้
                            </div>
                            <p className="text-xs text-white leading-relaxed">
                              {scanResult.actionableRecommendations}
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Patient-Friendly Care Card Header */}
                      <div className="bg-gradient-to-r from-emerald-950/40 to-teal-950/30 border-l-4 border-emerald-500 p-4 rounded-r-xl border-y border-r border-emerald-500/20 flex justify-between items-start">
                        <div>
                          <span className="text-[8px] font-bold px-2 py-0.5 rounded-full uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            การวิเคราะห์ตับเสร็จสมบูรณ์
                          </span>
                          <h3 className="font-bold text-sm text-white mt-1.5">ผลแปลรายงานตรวจสุขภาพตับของคุณสุรเดช</h3>
                          <p className="text-[10px] text-emerald-400 mt-1">วิเคราะห์โดย: ระบบโค้ชตับ AI ปัญญาประดิษฐ์</p>
                        </div>
                        <button 
                          onClick={() => {
                            const copyText = `[ผลแปลสุขภาพตับของคุณสุรเดช]\n\nสรุปสุขภาพ: ${scanResult.thaiSummary}\n\nคำอธิบายเข้าใจง่าย:\n${scanResult.explainableInsights.join('\n')}\n\nข้อแนะนำการดูแลตัวเอง:\n${scanResult.actionableRecommendations}`;
                            copyToClipboard(copyText);
                          }}
                          className="p-2 bg-[#1b2f56] hover:bg-[#253f70] text-[#a0aec0] hover:text-white rounded-lg transition-colors border border-[#2b477b]"
                        >
                          {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Thai Friendly Explanation */}
                      <div className="bg-[#111c34] border border-[#1d335c] rounded-xl overflow-hidden">
                        <div className="bg-[#152444] px-4 py-2.5 border-b border-[#1d335c] flex justify-between items-center">
                          <span className="text-[10px] font-bold text-white uppercase tracking-wider">แผงความรู้และคำอธิบายตับอย่างง่าย</span>
                          <span className="text-[9px] bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 px-2 py-0.5 rounded font-bold">เข้าใจง่ายสำหรับคนไข้</span>
                        </div>
                        <div className="p-4 space-y-4">
                          <div>
                            <div className="text-[9px] uppercase text-emerald-400 font-bold mb-1">สรุปภาพรวมร่างกายวันนี้</div>
                            <p className="text-xs text-white leading-relaxed font-medium">
                              {selectedModule === 'smartliva' 
                                ? 'ผลตรวจบ่งชี้ว่าเนื้อตับของคุณมีภาวะพังผืดปานกลางค่อนไปทางสูง (ระดับ F3-F4) มีแนวโน้มที่จะมีไขมันสะสมในตับร่วมด้วย แต่อย่ากังวลใจไปนะคะ! ตับเป็นอวัยวะที่ฟื้นฟูตัวเองได้ดีที่สุด หากเราดูแลการทานอาหารและทำตามเป้าหมายของแพทย์อย่างเคร่งครัดค่ะ'
                                : scanResult.thaiSummary
                              }
                            </p>
                          </div>

                          <div>
                            <div className="text-[9px] uppercase text-emerald-400 font-bold mb-1">ค่าและคำศัพท์สำคัญที่ปรากฏในใบผลแพทย์</div>
                            <ul className="pl-0 text-xs text-[#a0aec0] space-y-2.5">
                              {selectedModule === 'smartliva' ? (
                                <>
                                  <li className="flex flex-col space-y-0.5">
                                    <span className="font-bold text-white">• ระดับความแข็งตับ (Stiffness): 10.4 kPa</span>
                                    <span className="text-[11px] pl-3 text-[#7a8dae]">สะท้อนการสะสมพังผืด (คล้ายแผลเป็นเล็กๆ ในเนื้อตับ) ซึ่งจำเป็นต้องติดตามประเมินกับคุณหมอประจำตัวสม่ำเสมอเพื่อไม่ให้พัฒนาต่อไป</span>
                                  </li>
                                  <li className="flex flex-col space-y-0.5">
                                    <span className="font-bold text-white">• ดัชนีไขมันเกาะตับ (CAP Status): ไขมันสะสมปานกลาง</span>
                                    <span className="text-[11px] pl-3 text-[#7a8dae]">หมายถึงมีหยดน้ำมันเล็กๆ พอกที่ตับ แนะนำให้จำกัดหรือลดการรับประทานอาหารทอด แกงกะทิ และของหวานลงอีกสักนิดนะคะ</span>
                                  </li>
                                  <li className="flex flex-col space-y-0.5">
                                    <span className="font-bold text-white">• ความมั่นใจของระบบ (Confidence): สูงมาก</span>
                                    <span className="text-[11px] pl-3 text-[#7a8dae]">วิเคราะห์โดยอิงจากสถิติเคสผู้ป่วยโรคตับเรื้อรังมากกว่า 15,000 ราย ให้ค่าความแม่นยำสูงสอดคล้องกับภาพจำลองทางการแพทย์</span>
                                  </li>
                                </>
                              ) : (
                                scanResult.explainableInsights.map((ins, i) => (
                                  <li key={i} className="font-bold text-white">• {ins}</li>
                                ))
                              )}
                            </ul>
                          </div>

                          <div className="bg-emerald-950/30 p-3 rounded-lg border border-emerald-500/20">
                            <div className="text-[9px] uppercase text-emerald-400 font-bold mb-1 flex items-center">
                              <User className="w-3 h-3 mr-1" /> คู่มือการปฏิบัติตนและเมนูแนะนำ
                            </div>
                            <p className="text-xs text-white leading-relaxed">
                              {selectedModule === 'smartliva'
                                ? 'ลดเมนูเค็มจัด (จำกัดโซเดียม) เพื่อเลี่ยงภาวะบวมน้ำ หลีกเลี่ยงเนื้อสัตว์แปรรูปทุกประเภท และงดเครื่องดื่มแอลกอฮอล์โดยเด็ดขาด แนะนำให้ทานผักใบเขียวต้ม เนื้อปลา และดื่มน้ำให้ครบ 8 แก้วเพื่อช่วยตับขับของเสียค่ะ'
                                : scanResult.actionableRecommendations
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Dr. HepaSage & MARS Pathology Chat */}
          {activeTab === 'chat' && (
            <div className="h-[calc(100vh-12rem)] flex flex-col fade-up">
              
              {/* Bot Selector */}
              {persona === 'doctor' ? (
                <div className="bg-[#10192e] p-1 rounded-lg border border-[#1b2f56] grid grid-cols-2 gap-1 mb-4">
                  <button
                    onClick={() => setChatBot('hepasage')}
                    className={`py-2 rounded text-xs font-bold transition-all ${
                      chatBot === 'hepasage' ? 'bg-blue-600 text-white shadow-sm' : 'text-[#7a8dae] hover:text-white'
                    }`}
                  >
                    Dr. HepaSage AI
                  </button>
                  <button
                    onClick={() => setChatBot('mars')}
                    className={`py-2 rounded text-xs font-bold transition-all ${
                      chatBot === 'mars' ? 'bg-blue-600 text-white shadow-sm' : 'text-[#7a8dae] hover:text-white'
                    }`}
                  >
                    MARS Pathologist
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-500/20 text-center mb-4">
                  <h3 className="font-bold text-xs text-white">สนทนากับ HepaSage Care Coach</h3>
                  <p className="text-[10px] text-emerald-400 font-medium">โค้ชดูแลตับส่วนตัวที่จะดูแลคุณอย่างใกล้ชิดด้วยภาษาที่เป็นกันเอง</p>
                </div>
              )}

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
                {messages[chatBot].map((msg, i) => (
                  <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border ${
                      msg.role === 'user' 
                        ? 'bg-[#1b2f56] border-[#2b477b]' 
                        : persona === 'doctor' 
                          ? 'bg-blue-600/20 border-blue-600/40 text-blue-400' 
                          : 'bg-emerald-600/20 border-emerald-600/40 text-emerald-400'
                    }`}>
                      {msg.role === 'user' ? (
                        <User className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <Bot className={`w-3.5 h-3.5 ${persona === 'doctor' ? 'text-blue-400' : 'text-emerald-400'}`} />
                      )}
                    </div>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed border ${
                      msg.role === 'user' 
                        ? 'bg-[#1b2f56] text-white border-[#2b477b] rounded-tr-sm' 
                        : 'bg-[#111c34] border-[#1d335c] text-white rounded-tl-sm whitespace-pre-line'
                    }`}>
                      {msg.typing ? (
                        <span className="flex gap-1 items-center text-[#7a8dae] text-[10px] font-semibold">
                          {persona === 'doctor' ? 'Analyzing context' : 'กำลังเรียบเรียงคำตอบที่เข้าใจง่าย...'}
                          {[0, 150, 300].map((d) => (
                            <span key={d} className={`w-1 h-1 rounded-full animate-bounce ${persona === 'doctor' ? 'bg-blue-400' : 'bg-emerald-400'}`} style={{ animationDelay: `${d}ms` }} />
                          ))}
                        </span>
                      ) : (
                        <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                      )}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Input Area */}
              <div className={`bg-[#10192e] border rounded-xl p-2 flex gap-2 items-center transition-all ${
                persona === 'doctor' ? 'border-[#1b2f56]' : 'border-emerald-500/20'
              }`}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder={
                    persona === 'doctor' 
                      ? (chatBot === 'hepasage' ? 'ปรึกษาข้อมูลตับหรือ FibroScan...' : 'Ask MARS about CCA tissue slides...')
                      : 'ถามคำถามเรื่องเมนูอาหาร ยา หรือการดูแลตับกับโค้ชได้เลยค่ะ...'
                  }
                  className="flex-1 bg-transparent border-none outline-none text-xs px-2 text-white placeholder-[#506894]"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim() || chatLoading}
                  className={`w-8 h-8 rounded-lg disabled:opacity-50 text-white flex items-center justify-center transition-all shrink-0 shadow-md ${
                    persona === 'doctor' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          )}

        </main>

        {/* Selected Alert Drawer Details Modal */}
        {selectedAlert && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex flex-col justify-end">
            <div className="bg-[#0c1424] border-t border-[#1c3052] rounded-t-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto animate-slide-up">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-blue-400 font-bold">{selectedAlert.mrn}</span>
                <button 
                  onClick={() => setSelectedAlert(null)}
                  className="text-xs text-[#7a8dae] hover:text-white font-semibold"
                >
                  Close
                </button>
              </div>

              <div>
                <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30`}>
                  {selectedAlert.severity} risk
                </span>
                <h3 className="font-bold text-base text-white mt-2">{selectedAlert.finding}</h3>
                <p className="text-xs text-[#a0aec0] mt-1">{selectedAlert.patientName}</p>
              </div>

              <div className="border-t border-[#1c3052] pt-4 space-y-4">
                <div>
                  <div className="text-[10px] uppercase text-[#7a8dae] font-bold mb-1.5">Explainable Radiological Insights</div>
                  <ul className="list-disc pl-4 text-xs text-[#a0aec0] space-y-1">
                    {selectedAlert.insights.map((ins, i) => (
                      <li key={i}>{ins}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-[#152444] p-3 rounded-lg border border-[#1d335c]">
                  <div className="text-[10px] uppercase text-blue-400 font-bold mb-1.5 flex items-center">
                    <Activity className="w-3.5 h-3.5 mr-1" /> Actionable Clinical Recommendation
                  </div>
                  <p className="text-xs text-white leading-relaxed">
                    {selectedAlert.recommendation}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Sticky Bottom Tab Bar */}
        <nav className="h-16 border-t border-[#1c3052] bg-[#0c1424]/90 backdrop-blur-md absolute bottom-0 inset-x-0 z-40 flex justify-around items-center px-4">
          <button 
            onClick={() => setActiveTab('alerts')}
            className={`flex flex-col items-center justify-center py-1 transition-all ${
              activeTab === 'alerts' ? 'text-blue-500' : 'text-[#7a8dae] hover:text-white'
            }`}
          >
            <div className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
            </div>
            <span className="text-[9px] font-bold mt-1">Alerts</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('scan')}
            className={`flex flex-col items-center justify-center py-1 transition-all ${
              activeTab === 'scan' ? 'text-blue-500' : 'text-[#7a8dae] hover:text-white'
            }`}
          >
            <Camera className="w-5 h-5" />
            <span className="text-[9px] font-bold mt-1">Scan</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center justify-center py-1 transition-all ${
              activeTab === 'chat' ? 'text-blue-500' : 'text-[#7a8dae] hover:text-white'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[9px] font-bold mt-1">AI Copilot</span>
          </button>
        </nav>

      </div>
    </div>
  );
}
