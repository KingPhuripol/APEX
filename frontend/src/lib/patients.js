// ── Hospital registry ─────────────────────────────────────────────────────────
export const HOSPITALS = [
  { code: "KKH",     nameEn: "Khon Kaen Hospital",                        shortName: "Khon Kaen",      city: "Khon Kaen",   dept: "AI Diagnostics — Radiology · Hepatology · Pathology" },
  { code: "CU",      nameEn: "King Chulalongkorn Memorial Hospital",       shortName: "Chulalongkorn",  city: "Bangkok",     dept: "Clinical AI Diagnostics Centre" },
  { code: "RAMA",    nameEn: "Ramathibodi Hospital",                       shortName: "Ramathibodi",    city: "Bangkok",     dept: "Dept. of Radiology & AI Medicine" },
  { code: "SIRIRAJ", nameEn: "Siriraj Hospital",                          shortName: "Siriraj",        city: "Bangkok",     dept: "Radiology · Hepatobiliary · Pathology" },
  { code: "PMK",     nameEn: "Phramongkutklao Hospital",                  shortName: "Phramongkutklao",city: "Bangkok",     dept: "Military Medical AI Division" },
  { code: "CMH",     nameEn: "Maharaj Nakorn Chiang Mai Hospital",         shortName: "Chiang Mai",     city: "Chiang Mai",  dept: "Northern Region AI Diagnostics Hub" },
  { code: "PSU",     nameEn: "Songklanagarind Hospital",                  shortName: "Songkla / PSU",  city: "Hat Yai",     dept: "Southern Region Clinical AI Centre" },
  { code: "RATCH",   nameEn: "Rajavithi Hospital",                        shortName: "Rajavithi",      city: "Bangkok",     dept: "Radiology & Digital Pathology" },
  { code: "BUMRUN",  nameEn: "Bumrungrad International Hospital",         shortName: "Bumrungrad",     city: "Bangkok",     dept: "International AI Diagnostics" },
  { code: "VACHIRA", nameEn: "Vajira Hospital",                           shortName: "Vajira",         city: "Bangkok",     dept: "AI-Assisted Radiology Division" },
];

export const HOSPITAL = HOSPITALS.find((h) => h.code === "KKH");

// Demo reference patients (used by Dashboard quick-launch buttons)
const DEMO_PATIENTS = [
  {
    id: "REF-AXIA-001",
    name: "Somchai Jaidee (Demo)",
    nameEn: "Somchai Jaidee (Demo)",
    age: 67, gender: "M",
    status: "Demo", priority: "Critical",
    date: "2026-06-11 08:14",
    tools: ["AXIA"],
    accession: "DEMO-CT-001",
    indication: "Sudden headache, right-sided weakness",
    ward: "Emergency Dept.",
    referrer: "Dr. Wirut Sombat",
    lastResult: null,
  },
  {
    id: "REF-LIVA-001",
    name: "Pornchai Srisuk (Demo)",
    nameEn: "Pornchai Srisuk (Demo)",
    age: 52, gender: "M",
    status: "Demo", priority: "Urgent",
    date: "2026-06-11 09:45",
    tools: ["SmartLiva"],
    accession: "DEMO-US-001",
    indication: "Chronic HBV, 3-year follow-up liver US",
    ward: "Hepatology OPD",
    referrer: "Dr. Siriporn Maneerat",
    lastResult: null,
  },
  {
    id: "REF-PICHA-001",
    name: "Prayoon Chaidee (Demo)",
    nameEn: "Prayoon Chaidee (Demo)",
    age: 58, gender: "M",
    status: "Demo", priority: "Urgent",
    date: "2026-06-11 08:30",
    tools: ["PICHA"],
    accession: "DEMO-PATH-001",
    indication: "Liver biopsy — suspect CCA, OV-endemic background",
    ward: "Hepatobiliary Surgery",
    referrer: "Dr. Wanchai Uttaraphol",
    lastResult: null,
  },
];

export const MOCK_PATIENTS = [
  // AXIA – Brain CT
  {
    id: "HN-2566-4891",
    name: "Somchai Jaidee",
    nameEn: "Somchai Jaidee",
    age: 67, gender: "M",
    status: "Pending", priority: "Critical",
    date: "2026-06-11 08:14",
    tools: ["AXIA"],
    accession: "KKH-CT-2026-0891",
    indication: "Sudden headache, right-sided weakness",
    ward: "Emergency Dept.",
    referrer: "Dr. Wirut Sombat",
    lastResult: null,
  },
  {
    id: "HN-2566-3204",
    name: "Panita Meesuk",
    nameEn: "Panita Meesuk",
    age: 54, gender: "F",
    status: "Pending", priority: "Stat",
    date: "2026-06-11 09:02",
    tools: ["AXIA"],
    accession: "KKH-CT-2026-0892",
    indication: "Head trauma, GCS 14 after fall",
    ward: "Neurology Ward 3",
    referrer: "Dr. Porntip Saengthong",
    lastResult: null,
  },
  {
    id: "HN-2566-7741",
    name: "Wira Khayanди",
    nameEn: "Wira Khayanди",
    age: 45, gender: "M",
    status: "Reviewed", priority: "Routine",
    date: "2026-06-10 15:30",
    tools: ["AXIA"],
    accession: "KKH-CT-2026-0879",
    indication: "Post-op CT brain follow-up",
    ward: "Neurosurgery",
    referrer: "Dr. Kasem Phuthai",
    lastResult: "ICH: Negative. No midline shift detected.",
  },
  // SmartLiva – Liver US
  {
    id: "HN-2566-5512",
    name: "Pornchai Srisuk",
    nameEn: "Pornchai Srisuk",
    age: 52, gender: "M",
    status: "In Progress", priority: "Urgent",
    date: "2026-06-11 09:45",
    tools: ["SmartLiva"],
    accession: "KKH-US-2026-1120",
    indication: "Chronic HBV, 3-year follow-up liver US",
    ward: "Hepatology OPD",
    referrer: "Dr. Siriporn Maneerat",
    lastResult: null,
  },
  {
    id: "HN-2566-2089",
    name: "Malee Phetdee",
    nameEn: "Malee Phetdee",
    age: 38, gender: "F",
    status: "Pending", priority: "Urgent",
    date: "2026-06-11 10:20",
    tools: ["SmartLiva"],
    accession: "KKH-US-2026-1121",
    indication: "Elevated ALT 3× ULN, rule out fibrosis",
    ward: "Internal Medicine Ward 2",
    referrer: "Dr. Nuttapong Chaiyarat",
    lastResult: null,
  },
  {
    id: "HN-2566-8830",
    name: "Surachai Saengthong",
    nameEn: "Surachai Saengthong",
    age: 61, gender: "M",
    status: "Reviewed", priority: "Routine",
    date: "2026-06-10 11:00",
    tools: ["SmartLiva"],
    accession: "KKH-US-2026-1105",
    indication: "Annual US monitoring, known liver cirrhosis F3",
    ward: "Hepatology OPD",
    referrer: "Dr. Siriporn Maneerat",
    lastResult: "F3 Severe Fibrosis. Follow-up in 3 months.",
  },
  {
    id: "HN-2566-1147",
    name: "Bunmee Somjai",
    nameEn: "Bunmee Somjai",
    age: 55, gender: "M",
    status: "Pending", priority: "Critical",
    date: "2026-06-11 10:55",
    tools: ["SmartLiva", "PICHA"],
    accession: "KKH-US-2026-1122",
    indication: "Suspicious liver mass 3.2 cm, AFP 420 ng/mL",
    ward: "Oncology",
    referrer: "Dr. Thanaporn Wiset",
    lastResult: null,
  },
  {
    id: "HN-2566-4420",
    name: "Wasana Pinthong",
    nameEn: "Wasana Pinthong",
    age: 44, gender: "F",
    status: "Reviewed", priority: "Routine",
    date: "2026-06-09 13:00",
    tools: ["SmartLiva"],
    accession: "KKH-US-2026-1098",
    indication: "Annual liver US, steatosis screening",
    ward: "Health Checkup Centre",
    referrer: "Dr. Nuttapong Chaiyarat",
    lastResult: "F0 No fibrosis. Mild steatosis detected.",
  },
  // PICHA – Digital Pathology
  {
    id: "HN-2566-9341",
    name: "Prayoon Chaidee",
    nameEn: "Prayoon Chaidee",
    age: 58, gender: "M",
    status: "Pending", priority: "Urgent",
    date: "2026-06-11 08:30",
    tools: ["PICHA"],
    accession: "KKH-PATH-2026-0441",
    indication: "Liver biopsy — suspect CCA, OV-endemic background",
    ward: "Hepatobiliary Surgery",
    referrer: "Dr. Wanchai Uttaraphol",
    lastResult: null,
  },
  {
    id: "HN-2566-6622",
    name: "Rattana Kaewsai",
    nameEn: "Rattana Kaewsai",
    age: 49, gender: "F",
    status: "Reviewed", priority: "Routine",
    date: "2026-06-10 14:20",
    tools: ["PICHA"],
    accession: "KKH-PATH-2026-0435",
    indication: "Bile duct biopsy — cholangiopathy workup",
    ward: "GI Oncology",
    referrer: "Dr. Thanaporn Wiset",
    lastResult: "iCCA G2 Stage II. MDT referral recommended.",
  },
  {
    id: "HN-2566-3305",
    name: "Kitti Sirirat",
    nameEn: "Kitti Sirirat",
    age: 63, gender: "M",
    status: "In Progress", priority: "Urgent",
    date: "2026-06-11 09:15",
    tools: ["PICHA"],
    accession: "KKH-PATH-2026-0440",
    indication: "Core needle biopsy — hepatic mass 4.1 cm",
    ward: "Hepatobiliary Surgery",
    referrer: "Dr. Wanchai Uttaraphol",
    lastResult: null,
  },
  // Multi-module
  {
    id: "HN-2566-7112",
    name: "Amnaj Veerasak",
    nameEn: "Amnaj Veerasak",
    age: 71, gender: "M",
    status: "Pending", priority: "Critical",
    date: "2026-06-11 07:50",
    tools: ["AXIA", "SmartLiva"],
    accession: "KKH-MUL-2026-0021",
    indication: "ICU — hepatic encephalopathy + altered consciousness",
    ward: "ICU",
    referrer: "Dr. Pairin Kamolchan",
    lastResult: null,
  },
];

/** Lookup a patient by HN id or demo reference id. Returns null if not found. */
export function getPatientById(id) {
  return (
    ALL_PATIENTS.find((p) => p.id === id) ??
    DEMO_PATIENTS.find((p) => p.id === id) ??
    null
  );
}

// ── Name pools ────────────────────────────────────────────────────────────────
const MALE_FIRST = [
  "Somchai","Wira","Prayoon","Bunmee","Surachai","Amnaj","Pornchai","Kitti",
  "Prapat","Sakchai","Nattapol","Thongchai","Chaiwat","Wirat","Kasem","Wanchai",
  "Nuttapong","Thanakorn","Arnat","Pipob","Supot","Banchong","Chalerm","Chatchai",
  "Jakkrit","Sarawut","Teerawut","Watcharapol","Yuttapong","Chawan","Noppadon",
  "Sathit","Siwat","Somsak","Teerapong","Udom","Viboon","Wisut","Worawit",
  "Krisada","Pongsakorn","Ratchapol","Sitthipong","Theerayut","Vichai","Weerasak",
  "Yuthachai","Aphisit","Bordin","Chakrit","Damrong","Ekachai","Fongchat",
  "Gridsada","Hathairat","Itthiphat","Jatuporn","Kanakorn","Lertsak","Mongkol",
  "Narupon","Ohm","Paisan","Quanchai","Ruangrit","Sunthorn","Tanat","Ubolrat",
  "Voraphong","Wuthikorn","Xayaphet","Yongyut","Zathit","Adisak","Bamrung",
  "Chalermpol","Direk","Ekkarin","Fuangfa","Giralda","Harnchai","Issara",
];
const FEMALE_FIRST = [
  "Panita","Malee","Wasana","Rattana","Porntip","Siriporn","Thanaporn","Pairin",
  "Saowanit","Sureeporn","Nipa","Duangporn","Supranee","Thitima","Kanokwan",
  "Natnicha","Pornthip","Ratchada","Sawitri","Somjai","Apinya","Chompunuch",
  "Dusita","Jariyaporn","Kanittha","Lalita","Monrudee","Nalinrat","Onuma",
  "Patchara","Rossarin","Sasithorn","Thanya","Uraiwan","Varaporn","Watsana",
  "Yanisa","Amara","Benjamas","Chitpong","Dararat","Ekawit","Fah","Gamonmas",
  "Hathaiphat","Inphen","Jantana","Kanya","Laddawan","Manasawan","Nattaya",
  "Orada","Pennapa","Rachanee","Saifah","Tanyarat","Ubonwan","Vilai","Wipawee",
  "Yuwadee","Achariya","Boonyarat","Chalita","Darunee","Eiamtip","Farnthong",
  "Ganjana","Hathai","Intira","Jutarat","Kanlaya","Ladda","Manee","Nanthicha",
];
const LAST_NAMES = [
  "Jaidee","Meesuk","Srisuk","Phetdee","Saengthong","Somjai","Pinthong","Chaidee",
  "Kaewsai","Sirirat","Veerasak","Manee","Boonma","Chaiyarat","Wiset","Phuthai",
  "Uttaraphol","Kamolchan","Maneerat","Bunnak","Charoenwong","Daengdee","Eiamlarp",
  "Fahsai","Ganjanapan","Hanchana","Inprom","Janprasert","Klahan","Laohasuwan",
  "Mahawan","Nakhon","Ongart","Patcharee","Rattanapitak","Saardrak","Taksinwong",
  "Udomsap","Vatthanasak","Wangthong","Yodkam","Siriwong","Thongkam","Boonsai",
  "Kerdthong","Paisal","Rungsima","Sombat","Phimsen","Meechai","Kaewmanee",
  "Thongdee","Raksachat","Kongkaew","Chaichana","Wutthi","Piromrak","Sawangphol",
  "Phongphit","Nuamthong","Khamphitak","Sangthong","Benchakhan","Polthum",
  "Yodsawat","Kerdkarn","Wiriyasuk","Thaithae","Phromphao","Natham","Khantho",
  "Ruengdet","Chantaranothai","Pimolphan","Suanprasert","Kaewtong","Boriboon",
  "Silpasart","Lertkiatmongkol","Phongsamut","Chanchit","Nakadate","Khadaeng",
];

// ── Clinical pools ────────────────────────────────────────────────────────────
const AXIA_INDICATIONS = [
  "Sudden onset headache, rule out hemorrhage",
  "Acute right-sided weakness and dysarthria",
  "Head trauma after road traffic accident",
  "GCS deterioration in ICU patient",
  "Post-craniotomy follow-up CT",
  "Suspected ischemic stroke, 3h from onset",
  "Seizure first episode, age 55",
  "Altered consciousness, evaluate intracranial pathology",
  "Headache + vomiting, raised ICP suspected",
  "Fall from height, loss of consciousness",
  "Monitoring subdural hematoma progression",
  "CT brain — pre-operative assessment",
  "Stroke screening, atrial fibrillation",
  "Vertigo + nystagmus, rule out cerebellar lesion",
  "TIA workup — diffusion restriction",
  "Repeat CT, worsening neurological status",
  "Screen CT for cerebral metastasis",
  "Pediatric head injury, child 8 years",
  "Hypertensive encephalopathy evaluation",
  "Post-thrombolysis 24h follow-up CT",
];
const SMARTLIVA_INDICATIONS = [
  "Chronic HBV carrier, annual liver surveillance",
  "Elevated ALT ×3 ULN, rule out fibrosis",
  "Known F3 cirrhosis — 6-month follow-up US",
  "Suspicious liver mass, AFP 210 ng/mL",
  "NAFLD screening, metabolic syndrome",
  "Post-hepatitis C treatment SVR, monitor fibrosis",
  "Biliary obstruction workup, jaundice",
  "Right upper quadrant pain, hepatomegaly",
  "Portal hypertension evaluation, splenomegaly",
  "Pre-surgical liver function assessment",
  "Alcoholic hepatitis monitoring",
  "Autoimmune hepatitis staging",
  "Liver steatosis grading, morbid obesity",
  "Hepatic cyst characterisation",
  "Cholestasis workup — elevated ALP",
  "HCC surveillance — known cirrhosis",
  "Congestive hepatopathy, heart failure patient",
  "Drug-induced liver injury investigation",
  "Liver transplant donor evaluation",
  "Post-ablation hepatocellular carcinoma response",
];
const PICHA_INDICATIONS = [
  "Liver core biopsy — suspect intrahepatic CCA",
  "Bile duct biopsy — cholangiopathy workup",
  "Hepatic mass 4 cm, core needle biopsy",
  "Surgical specimen — liver resection for iCCA",
  "OV-endemic background, biliary stricture biopsy",
  "Lymph node biopsy — adenocarcinoma, unknown primary",
  "Intraductal papillary neoplasm, resection specimen",
  "Combined hepatocellular-cholangiocarcinoma workup",
  "Perihilar stricture — brush biopsy",
  "Metastatic liver, primary CCA staging",
  "Gallbladder carcinoma specimen",
  "Ampullary tumour resection",
  "Pancreatic head mass biopsy",
  "EUS-guided biopsy — pancreatic duct mass",
  "Neuroendocrine tumour liver metastasis",
  "Post-neoadjuvant resection — pathological response",
  "Second opinion slide review, CCA grading",
  "Immunohistochemistry — CK7/CK20/CDX2 panel",
  "PD-L1 expression assessment for immunotherapy",
  "FGFR2 fusion testing, targeted therapy workup",
];

const RESULTS_AXIA = [
  "No acute intracranial hemorrhage detected.",
  "Acute right temporal intracerebral hemorrhage ~18 mL.",
  "Ischemic infarct left MCA territory — early changes.",
  "Subdural hematoma 6 mm — no midline shift.",
  "No midline shift. Follow up in 24h.",
  "Cerebral edema, sulcal effacement bilateral.",
  "Multiple lacunar infarcts in basal ganglia.",
  "Subarachnoid hemorrhage — basal cisterns.",
];
const RESULTS_SMARTLIVA = [
  "F0 No fibrosis. Normal liver parenchyma.",
  "F1 Mild fibrosis. Annual follow-up recommended.",
  "F2 Moderate fibrosis. 6-month follow-up.",
  "F3 Severe fibrosis. Fibroscan recommended.",
  "F4 Cirrhosis. Quarterly HCC surveillance.",
  "Focal lesion 2.1 cm — LIRADS-4. MRI advised.",
  "Mild hepatic steatosis S1. Lifestyle intervention.",
  "Portal vein thrombosis identified. Anticoagulation review.",
];
const RESULTS_PICHA = [
  "iCCA Grade 2, Stage II. MDT referral recommended.",
  "Well-differentiated cholangiocarcinoma, pT2N0M0.",
  "Poorly differentiated CCA G3 — systemic therapy indicated.",
  "OV-associated perihilar CCA, positive resection margin.",
  "No malignancy identified. Reactive changes.",
  "Adenocarcinoma, immunoprofile consistent with CCA.",
  "pCR — complete pathological response post-chemo.",
  "FGFR2 fusion positive. Pemigatinib eligible.",
];

const WARDS_AXIA = [
  "Emergency Dept.","Neurology Ward","Neurosurgery ICU","Stroke Unit",
  "ICU","CCU","Trauma Ward","Outpatient Neurology","Neuro-Oncology",
];
const WARDS_SMARTLIVA = [
  "Hepatology OPD","Internal Medicine Ward","Hepatobiliary Surgery",
  "GI Oncology","Health Checkup Centre","Oncology Ward","Transplant Unit",
  "Gastroenterology OPD",
];
const WARDS_PICHA = [
  "Hepatobiliary Surgery","GI Oncology","Oncology MDT","Pathology Dept.",
  "Hepatology OPD","Surgical Oncology","Liver Transplant Unit",
];

const REFERRERS = {
  KKH:     ["Dr. Wirut Sombat","Dr. Porntip Saengthong","Dr. Kasem Phuthai","Dr. Siriporn Maneerat","Dr. Nuttapong Chaiyarat","Dr. Thanaporn Wiset","Dr. Wanchai Uttaraphol","Dr. Pairin Kamolchan"],
  CU:      ["Dr. Pornthip Chaiyo","Dr. Krisada Teerawong","Dr. Apinya Siriwong","Dr. Banchong Ratana","Dr. Chalerm Phomjan","Dr. Dararat Lertpan","Dr. Ekachai Somboon"],
  RAMA:    ["Dr. Fah Kongkaew","Dr. Ganjana Thiangphan","Dr. Hathai Wiwat","Dr. Itthiphat Rueng","Dr. Jatuporn Kamol","Dr. Kanittha Phong","Dr. Lalita Nakadate"],
  SIRIRAJ: ["Dr. Manee Chaiyasan","Dr. Nipa Boonrak","Dr. Onuma Wattana","Dr. Paisan Kerdkul","Dr. Rachanee Thong","Dr. Saifah Khamdi","Dr. Tanya Lertrak"],
  PMK:     ["Dr. Ubonwan Phromrak","Dr. Vilai Khantong","Dr. Wipawee Srichan","Dr. Yuwadee Kaewlek","Dr. Achariya Phutson","Dr. Boriboon Suk","Dr. Chalita Mansuwan"],
  CMH:     ["Dr. Darunee Khunpol","Dr. Eiamtip Sanga","Dr. Farnthong Piriya","Dr. Ganjana Chalit","Dr. Hathaiphat Wirth","Dr. Intira Boonsak","Dr. Jutarat Thong"],
  PSU:     ["Dr. Kanlaya Pradit","Dr. Ladda Worasom","Dr. Manasawan Supa","Dr. Nanthicha Kerd","Dr. Orada Phothong","Dr. Pennapa Tawan","Dr. Rachanee Silpa"],
  RATCH:   ["Dr. Saifah Khanthat","Dr. Tanyarat Lertsak","Dr. Ubonrat Sawat","Dr. Vichai Palat","Dr. Wipawee Phong","Dr. Yuwadee Kaewtong","Dr. Amara Boon"],
  BUMRUN:  ["Dr. Benjamas Sirikul","Dr. Chalita Udom","Dr. David Chen","Dr. Elena Sharma","Dr. Francesca Liu","Dr. George Tan","Dr. Helen Park"],
  VACHIRA: ["Dr. Ittikhom Wanich","Dr. Jariyaporn Suk","Dr. Kanya Mahawan","Dr. Laddawan Rat","Dr. Manee Pong","Dr. Natnicha Siri","Dr. Orada Khom"],
};

// ── Seeded LCG RNG ────────────────────────────────────────────────────────────
function makeRng(seed) {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s ^= s >>> 16;
    return (s >>> 0) / 0x100000000;
  };
}

// ── Patient generator ─────────────────────────────────────────────────────────
function generatePatients(count = 9988) {
  const rng = makeRng(1337);
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const hospitals = HOSPITALS;
  const patients = [];
  let hnOffset = 10001;

  for (let i = 0; i < count; i++) {
    const hosp = hospitals[Math.floor(rng() * hospitals.length)];
    const gender = rng() > 0.47 ? "M" : "F";
    const firstName = gender === "M" ? pick(MALE_FIRST) : pick(FEMALE_FIRST);
    const lastName = pick(LAST_NAMES);
    const age = 18 + Math.floor(rng() * 72);

    // Tool distribution: 38% AXIA, 38% SmartLiva, 16% PICHA, 8% multi
    const tr = rng();
    let tools;
    if (tr < 0.38) tools = ["AXIA"];
    else if (tr < 0.76) tools = ["SmartLiva"];
    else if (tr < 0.92) tools = ["PICHA"];
    else if (tr < 0.96) tools = ["AXIA", "SmartLiva"];
    else tools = ["SmartLiva", "PICHA"];

    const pr = rng();
    const priority = pr < 0.10 ? "Critical" : pr < 0.26 ? "Urgent" : pr < 0.44 ? "Stat" : "Routine";
    const sr = rng();
    const status = sr < 0.48 ? "Pending" : sr < 0.63 ? "In Progress" : "Reviewed";

    // Date in last 365 days
    const daysBack = Math.floor(rng() * 365);
    const dt = new Date("2026-06-11T00:00:00Z");
    dt.setUTCDate(dt.getUTCDate() - daysBack);
    const h = 7 + Math.floor(rng() * 13);
    const m = Math.floor(rng() * 60);
    const dateStr = dt.toISOString().slice(0, 10) + " " + String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");

    const hnYear = 2565 + Math.floor(rng() * 2);
    const hnNum = hnOffset++;
    const id = `HN-${hnYear}-${hnNum}`;
    const modCode = tools[0] === "AXIA" ? "CT" : tools[0] === "SmartLiva" ? "US" : "PATH";
    const accNum = String(Math.floor(rng() * 9000) + 1000).padStart(4, "0");
    const accession = `${hosp.code}-${modCode}-${dt.getUTCFullYear()}-${accNum}`;

    const indication = tools[0] === "AXIA" ? pick(AXIA_INDICATIONS) : tools[0] === "SmartLiva" ? pick(SMARTLIVA_INDICATIONS) : pick(PICHA_INDICATIONS);
    const ward = tools[0] === "AXIA" ? pick(WARDS_AXIA) : tools[0] === "SmartLiva" ? pick(WARDS_SMARTLIVA) : pick(WARDS_PICHA);
    const referrer = pick(REFERRERS[hosp.code] || REFERRERS.KKH);

    let lastResult = null;
    if (status === "Reviewed") {
      const pool = tools[0] === "AXIA" ? RESULTS_AXIA : tools[0] === "SmartLiva" ? RESULTS_SMARTLIVA : RESULTS_PICHA;
      lastResult = pick(pool);
    }

    patients.push({
      id, name: `${firstName} ${lastName}`, nameEn: `${firstName} ${lastName}`,
      age, gender, status, priority, date: dateStr, tools, accession,
      indication, ward, referrer, lastResult,
      hospitalCode: hosp.code, hospitalName: hosp.shortName,
    });
  }
  return patients;
}

// ── Combine original + generated patients ────────────────────────────────────
export const ALL_PATIENTS = [
  ...MOCK_PATIENTS.map((p) => ({ ...p, hospitalCode: "KKH", hospitalName: "Khon Kaen" })),
  ...generatePatients(9988),
];