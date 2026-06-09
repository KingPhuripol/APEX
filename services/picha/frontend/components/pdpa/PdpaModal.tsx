"use client";
import { useState, useEffect } from "react";
import { Shield, X, LogOut } from "lucide-react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

// Bump this version string whenever the privacy policy content changes.
// A new version will re-show the modal even on devices that previously accepted.
const PDPA_VERSION = "v1.0";
const STORAGE_KEY = `picha_pdpa_accepted_${PDPA_VERSION}`;

export default function PdpaModal() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show modal if this version hasn't been accepted on this device
    if (typeof window !== "undefined" && !localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setVisible(false);
  };

  const handleDecline = async () => {
    try {
      await api.post("/api/auth/logout", {});
    } catch {}
    router.replace("/login");
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-[#1d4ed8]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[#0a1628] font-bold text-sm">
              นโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA)
            </h2>
            <p className="text-slate-400 text-[11px]">
              Personal Data Protection Act · {PDPA_VERSION}
            </p>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4 text-[13px] text-slate-700 leading-relaxed">
          <p>
            ระบบ <strong>PICHA</strong> (Pathology Intelligence &amp; Clinical
            Health Analysis) ประมวลผลข้อมูลส่วนบุคคลของผู้ป่วยตาม พ.ร.บ.
            คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
            กรุณาอ่านและยอมรับก่อนใช้งาน
          </p>

          <Section title="1. วัตถุประสงค์การเก็บข้อมูล">
            ระบบเก็บรวบรวมข้อมูลผู้ป่วย ได้แก่ HN, ชื่อ-สกุล, อายุ, เพศ,
            ผลการวิเคราะห์ทางพยาธิวิทยา และภาพ H&amp;E slide
            เพื่อวัตถุประสงค์ด้าน{" "}
            <strong>การวินิจฉัยโรคและสนับสนุนการตัดสินใจทางคลินิก</strong>{" "}
            เท่านั้น
          </Section>

          <Section title="2. ระยะเวลาเก็บข้อมูล">
            ข้อมูลผู้ป่วยจะถูกเก็บรักษาตามนโยบายของโรงพยาบาล
            และจะถูกลบหรือทำให้ไม่สามารถระบุตัวตนได้เมื่อพ้นระยะเวลาที่กำหนด
          </Section>

          <Section title="3. สิทธิ์ของเจ้าของข้อมูล (ผู้ป่วย)">
            <ul className="list-disc pl-4 space-y-0.5">
              <li>สิทธิ์รับทราบการเก็บและใช้ข้อมูล</li>
              <li>สิทธิ์เข้าถึงและขอสำเนาข้อมูลของตน</li>
              <li>สิทธิ์แก้ไขข้อมูลที่ไม่ถูกต้อง</li>
              <li>สิทธิ์ขอลบหรือระงับการประมวลผลข้อมูล</li>
              <li>สิทธิ์คัดค้านการประมวลผล</li>
            </ul>
          </Section>

          <Section title="4. ผู้ควบคุมข้อมูลส่วนบุคคล (Data Controller)">
            โรงพยาบาล / หน่วยงานที่ติดตั้งระบบ PICHA
            <br />
            เจ้าหน้าที่คุ้มครองข้อมูล (DPO): กรุณาติดต่อฝ่าย IT หรือ Legal
            ของหน่วยงาน
          </Section>

          <Section title="5. ความปลอดภัยของข้อมูล">
            ข้อมูลทั้งหมดถูกเข้ารหัสผ่าน HTTPS (TLS 1.2/1.3)
            และจัดเก็บในฐานข้อมูลที่ได้รับการป้องกัน การเข้าถึงจำกัดเฉพาะผู้ใช้
            ที่ได้รับอนุญาตเท่านั้น
          </Section>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[12px] text-amber-800">
            <strong>หมายเหตุ:</strong> PICHA
            เป็นระบบสนับสนุนการตัดสินใจทางคลินิก (Clinical Decision Support)
            ไม่ใช่การวินิจฉัยโดยอัตโนมัติ
            ผลการวิเคราะห์ทั้งหมดต้องผ่านการตรวจสอบและลงนามโดยแพทย์ผู้เชี่ยวชาญ
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            onClick={handleDecline}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 hover:border-slate-300 px-3 py-2 rounded-xl transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            ไม่ยอมรับ / ออกจากระบบ
          </button>
          <button
            onClick={handleAccept}
            className="flex items-center gap-2 bg-[#1d4ed8] hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors shadow-sm shadow-blue-900/20"
          >
            <Shield className="w-4 h-4" />
            รับทราบและยอมรับ
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-semibold text-[#0a1628] mb-1">{title}</p>
      <div className="text-slate-600">{children}</div>
    </div>
  );
}
