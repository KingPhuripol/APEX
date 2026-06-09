/* data.jsx — API contract shim + high-fidelity mock generators (ภาษาไทยเป็นหลัก).
   Mirrors ../lib/api.js. In this sandbox every call falls back to the
   mock generators (as if the live endpoint returned 503), so the app
   is fully functional offline. คำแนะนำเก็บเป็น array เพื่อแสดงเป็น checklist. */
(function () {
  class ApiError extends Error {
    constructor(message, status) { super(message); this.name = 'ApiError'; this.status = status; }
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const rnd = (min, max, dp = 1) => +(min + Math.random() * (max - min)).toFixed(dp);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  /* ---------- AXIA (Brain CT) ---------- */
  const AXIA_PROFILES = {
    hemorrhage: {
      type: 'hemorrhage', label: 'เลือดออกในสมองเฉียบพลัน', severity: 'critical',
      finding: 'เลือดออก basal ganglia ขวา เฉียบพลัน',
      critique: {
        thai_summary: 'พบเลือดออกในสมองบริเวณ basal ganglia ด้านขวา ปริมาตรราว 34 mL มี midline shift เล็กน้อย แนะนำปรึกษาประสาทศัลยแพทย์โดยด่วน',
        explainable_insights: [
          'รอยโรคความหนาแน่นสูง (62 HU) ที่ basal ganglia ด้านขวา',
          'ปริมาตรก้อนเลือดประมาณ 34.2 mL (วิธี ABC/2)',
          'Mass effect เล็กน้อย midline shift 4.8 mm ไปทางซ้าย',
          'ไม่พบเลือดกระจายเข้าโพรงสมอง (IVH) ในภาพที่ตรวจ',
        ],
        actionable_recommendations: [
          'ปรึกษาประสาทศัลยแพทย์ทันที (STAT)',
          'แก้ภาวะเลือดออกง่าย / หยุดยาต้านการแข็งตัวของเลือด',
          'คุมความดัน SBP < 140 mmHg',
          'ทำ NCCT ซ้ำใน 6 ชั่วโมง',
        ],
      },
    },
    ischemic: {
      type: 'ischemic', label: 'สมองขาดเลือดระยะแรก', severity: 'high',
      finding: 'สมองขาดเลือดระยะแรก left MCA',
      critique: {
        thai_summary: 'พบลักษณะสมองขาดเลือดระยะแรกบริเวณ left MCA แนะนำพิจารณาให้ยาละลายลิ่มเลือดภายในกรอบเวลา',
        explainable_insights: [
          'สูญเสียความต่างเนื้อเทา–ขาวบริเวณ left insular ribbon',
          'ความหนาแน่นลดลงที่ left lentiform nucleus',
          'ASPECTS ประเมินได้ 8/10',
          'ยังไม่มี hypodensity ชัดเจน — อยู่ในกรอบเวลาให้ยาละลายลิ่มเลือด',
        ],
        actionable_recommendations: [
          'เปิด stroke pathway',
          'ประเมินสิทธิ์ให้ IV tPA / ดึงลิ่มเลือด (thrombectomy)',
          'พิจารณาทำ CT angiography',
        ],
      },
    },
    normal: {
      type: 'normal', label: 'ไม่พบความผิดปกติเฉียบพลัน', severity: 'normal',
      finding: 'ไม่พบเลือดออกหรือสมองขาดเลือด',
      critique: {
        thai_summary: 'ไม่พบความผิดปกติเฉียบพลันในสมอง ไม่พบเลือดออกหรือภาวะสมองขาดเลือด',
        explainable_insights: [
          'ความต่างเนื้อเทา–ขาวสมมาตรปกติ',
          'ไม่พบรอยโรคความหนาแน่นสูง/ต่ำเฉพาะที่',
          'โพรงสมองและ basal cisterns ปกติ',
          'ไม่มี midline shift หรือ mass effect',
        ],
        actionable_recommendations: [
          'ไม่จำเป็นต้องรักษาเร่งด่วน',
          'ติดตามตามอาการทางคลินิก',
          'พิจารณา MRI หากอาการยังคงอยู่',
        ],
      },
    },
  };

  async function axiaClassify(/* files */) {
    await wait(rnd(700, 1200, 0));
    const key = pick(['hemorrhage', 'ischemic', 'normal']);
    const p = AXIA_PROFILES[key];
    return {
      ...p,
      confidence: rnd(0.88, 0.99, 3),
      stage1Score: rnd(0.82, 0.97, 3),
      stage2Score: rnd(0.79, 0.96, 3),
    };
  }
  async function axiaSegment(/* files, type */) {
    await wait(rnd(600, 1000, 0));
    return {
      maskFound: true,
      volume: rnd(8, 42, 1),
      midlineShift: rnd(0.5, 6.5, 1),
      sliceResults: Array.from({ length: 5 }, () => ({
        maskFound: Math.random() > 0.3, confidence: rnd(0.7, 0.98, 2), maskImage: null,
      })),
    };
  }

  /* ---------- SmartLiva (Liver US) ---------- */
  async function smartlivaPredict(/* file, ctx */) {
    await wait(rnd(800, 1300, 0));
    const kpa = rnd(4.5, 14.5, 1);
    const stage = kpa < 7 ? 'F0–F1' : kpa < 9.5 ? 'F2' : kpa < 12.5 ? 'F3' : 'F4';
    const risk = kpa < 7 ? 'low' : kpa < 9.5 ? 'moderate' : kpa < 12.5 ? 'high' : 'critical';
    return {
      te_kpa: kpa, fibrosis_stage: stage, fibrosis_confidence: rnd(0.84, 0.97, 2),
      risk_level: risk,
      recommendation: risk === 'low'
        ? ['ไม่พบพังผืดที่มีนัยสำคัญ', 'ติดตามตามปกติใน 12 เดือน']
        : risk === 'critical'
          ? ['อยู่ในเกณฑ์ตับแข็ง (cirrhosis)', 'ส่งปรึกษาแพทย์โรคตับ', 'เฝ้าระวังมะเร็งตับ: US + AFP ทุก 6 เดือน']
          : ['พบพังผืดระดับมีนัยสำคัญ', 'ส่งปรึกษาแพทย์โรคตับ', 'ปรับพฤติกรรม + ประเมินซ้ำใน 6 เดือน'],
      fibrosis_text: `ค่าความแข็งตับ ${kpa} kPa เทียบเท่า METAVIR ${stage}`,
      stiffness_status: kpa < 7 ? 'normal' : 'elevated',
      steatosis_status: pick(['none', 'mild', 'moderate']),
    };
  }

  /* ---------- Chat (ภาษาไทย) ---------- */
  const HEPA_REPLIES = [
    'จากค่า TE 12.5 kPa ผู้ป่วยอยู่ในเกณฑ์ F4 (ตับแข็ง) ควรให้ความสำคัญกับการเฝ้าระวังมะเร็งตับด้วยอัลตราซาวด์และ AFP ทุก 6 เดือน',
    'ภาวะไขมันพอกตับร่วมกับค่าความแข็งตับที่สูง ชวนสงสัย MASH แนะนำตรวจทางเมแทบอลิก — HbA1c และไขมันในเลือด — ควบคู่กับการส่งปรึกษาแพทย์โรคตับ',
    'สำหรับพังผืด F2 การปรับพฤติกรรมเป็นแนวทางแรก การลดน้ำหนัก 7–10% ช่วยให้พังผืดดีขึ้นได้อย่างมีนัยสำคัญ ควรประเมินซ้ำใน 6 เดือน',
    'ลักษณะที่อธิบาย (ความแข็งตับสูงร่วมกับผิวตับขรุขระ) ชวนสงสัยภาวะตับเรื้อรังระยะลุกลาม ควรส่องกล้องคัดกรองหลอดเลือดขอดในหลอดอาหาร',
  ];
  const MARS_REPLIES = [
    'ลักษณะทางสัณฐานที่อธิบาย — นิวเคลียสโตขึ้น ขอบไม่เรียบ และสูญเสีย polarity — เข้าได้กับ biliary intraepithelial neoplasia ระดับสูง แนะนำให้ผู้เชี่ยวชาญท่านที่สองยืนยัน',
    'ความเห็นร่วมจากหลายเอเจนต์: 3 ใน 4 ชี้ลักษณะมะเร็งท่อน้ำดี (cholangiocarcinoma) เอเจนต์ที่เห็นต่างระบุว่าเป็น reactive atypia จากการอักเสบ — ควรพิจารณาร่วมกับอาการทางคลินิก',
    'ความซับซ้อนของโครงสร้างที่มี cribriform glands และ desmoplastic stroma สนับสนุน adenocarcinoma ระยะลุกลาม แนะนำย้อม CK7/CK19 เพื่อยืนยันต้นกำเนิดท่อน้ำดี',
    'ภาพนี้แสดงการเปลี่ยนแปลงแบบ reactive มากกว่ามะเร็ง — สัดส่วนนิวเคลียส:ไซโทพลาซึมปกติ และระยะห่างของต่อมคงเดิม สามารถสุ่มตรวจตามปกติต่อได้',
  ];
  async function smartlivaChat(history /*, language */) {
    await wait(rnd(900, 1500, 0));
    return { reply: pick(HEPA_REPLIES) };
  }
  async function pichaChat(/* message, sessionId */) {
    await wait(rnd(900, 1500, 0));
    return { reply: pick(MARS_REPLIES) };
  }

  /* ---------- Seed alert feed ---------- */
  const ALERTS = [
    {
      id: 'A-7741', module: 'AXIA', hn: 'HN 64-002281', name: 'สมชาย พ.', age: 67, sex: 'ช',
      time: '2 นาที', severity: 'critical', finding: 'เลือดออกในสมองเฉียบพลัน',
      metric: { value: '34.2', unit: 'mL', label: 'ปริมาตรเลือด' },
      insights: [
        'รอยโรคความหนาแน่นสูง (62 HU) ที่ basal ganglia ขวา',
        'ปริมาตรก้อนเลือดประมาณ 34.2 mL (ABC/2)',
        'midline shift 4.8 mm ไปทางซ้าย',
        'ไม่พบเลือดเข้าโพรงสมองในภาพที่ตรวจ',
      ],
      recommendation: ['ปรึกษาประสาทศัลยแพทย์ทันที (STAT)', 'หยุดยาต้านการแข็งตัวของเลือด', 'คุม SBP < 140 mmHg'],
      confidence: 0.96,
    },
    {
      id: 'A-7739', module: 'AXIA', hn: 'HN 64-009114', name: 'วนิดา ส.', age: 58, sex: 'ญ',
      time: '11 นาที', severity: 'high', finding: 'สมองขาดเลือดระยะแรก L-MCA',
      metric: { value: '8', unit: '/10', label: 'ASPECTS' },
      insights: [
        'สูญเสียความต่างเนื้อเทา–ขาวที่ left insular ribbon',
        'ความหนาแน่นลดลงที่ left lentiform nucleus',
        'ASPECTS 8/10 — อยู่ในกรอบเวลาให้ยาละลายลิ่มเลือด',
        'ยังไม่มี hypodensity บริเวณกว้างชัดเจน',
      ],
      recommendation: ['เปิด stroke pathway', 'ประเมิน IV tPA / thrombectomy', 'พิจารณา CT angiography'],
      confidence: 0.91,
    },
    {
      id: 'A-7733', module: 'SmartLiva', hn: 'HN 63-117820', name: 'ประเสริฐ ก.', age: 61, sex: 'ช',
      time: '28 นาที', severity: 'high', finding: 'พังผืดตับระยะลุกลาม F3–F4',
      metric: { value: '12.5', unit: 'kPa', label: 'ความแข็งตับ' },
      insights: [
        'Transient elastography 12.5 kPa → METAVIR F4',
        'เนื้อตับหยาบ ผิวตับขรุขระเป็นปุ่ม',
        'ไขมันพอกตับระดับปานกลางบน B-mode',
        'ม้ามยาว 13.2 ซม. — อาจมีภาวะความดันพอร์ทัลสูง',
      ],
      recommendation: ['ส่งปรึกษาแพทย์โรคตับ', 'เฝ้าระวังมะเร็งตับ US + AFP ทุก 6 เดือน', 'ส่องกล้องคัดกรองหลอดเลือดขอด'],
      confidence: 0.89,
    },
    {
      id: 'A-7726', module: 'PICHA', hn: 'HN 65-044190', name: 'อรุณ ท.', age: 54, sex: 'ช',
      time: '47 นาที', severity: 'critical', finding: 'สงสัยมะเร็งท่อน้ำดี',
      metric: { value: '0.93', unit: '', label: 'คะแนนมะเร็ง' },
      insights: [
        'ความเห็นร่วมหลายเอเจนต์ 3/4 ชี้ลักษณะมะเร็ง',
        'นิวเคลียสโตขึ้น ขอบไม่เรียบ',
        'มี cribriform glands และ desmoplastic stroma',
        'สูญเสีย polarity ของเยื่อบุท่อน้ำดี',
      ],
      recommendation: ['ให้ผู้เชี่ยวชาญท่านที่สองยืนยัน', 'ย้อม CK7/CK19', 'นำเข้าที่ประชุม MDT'],
      confidence: 0.93,
    },
    {
      id: 'A-7719', module: 'AXIA', hn: 'HN 64-051002', name: 'ณัฐญา ร.', age: 44, sex: 'ญ',
      time: '1 ชม.', severity: 'normal', finding: 'ไม่พบความผิดปกติเฉียบพลัน',
      metric: { value: '0', unit: 'mm', label: 'midline shift' },
      insights: [
        'ความต่างเนื้อเทา–ขาวสมมาตรปกติ',
        'ไม่พบรอยโรคความหนาแน่นสูง/ต่ำเฉพาะที่',
        'โพรงสมองและ basal cisterns ปกติ',
        'ไม่มี midline shift หรือ mass effect',
      ],
      recommendation: ['ไม่ต้องรักษาเร่งด่วน', 'ติดตามตามอาการทางคลินิก', 'พิจารณา MRI หากอาการคงอยู่'],
      confidence: 0.97,
    },
    {
      id: 'A-7712', module: 'SmartLiva', hn: 'HN 63-088471', name: 'เดชา ม.', age: 49, sex: 'ช',
      time: '1 ชม.', severity: 'normal', finding: 'ไม่พบพังผืดที่มีนัยสำคัญ',
      metric: { value: '5.2', unit: 'kPa', label: 'ความแข็งตับ' },
      insights: [
        'Transient elastography 5.2 kPa → METAVIR F0–F1',
        'เนื้อตับสม่ำเสมอ ผิวเรียบ',
        'ไม่พบไขมันพอกตับบน B-mode',
        'ขนาดม้ามปกติ',
      ],
      recommendation: ['ติดตามตามปกติใน 12 เดือน', 'ให้คำแนะนำปรับพฤติกรรม'],
      confidence: 0.95,
    },
  ];

  window.ApexAPI = {
    ApiError, axiaClassify, axiaSegment, smartlivaPredict, smartlivaChat, pichaChat,
    ALERTS, AXIA_PROFILES,
  };
})();
