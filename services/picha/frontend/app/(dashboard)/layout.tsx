"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Microscope,
  ChevronRight,
  Activity,
  FlaskConical,
  FolderOpen,
  LogOut,
} from "lucide-react";
import { api } from "@/lib/api";
import PdpaModal from "@/components/pdpa/PdpaModal";

interface User {
  username: string;
  fullName: string;
  role: string;
  department: string;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analyze", label: "New Analysis", icon: FlaskConical },
  { href: "/cases", label: "Case History", icon: FolderOpen },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (isLoginPage) return;
    api
      .getJson<{ user: User }>("/api/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => router.replace("/login"));
  }, [isLoginPage, router]);

  const handleLogout = async () => {
    try {
      await api.post("/api/auth/logout", {});
    } catch {}
    router.replace("/login");
  };

  // Login page: render without sidebar
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Wait for auth to resolve before rendering the shell
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside className="w-56 shrink-0 bg-[#0a1628] border-r border-white/5 flex flex-col h-screen sticky top-0">
        {/* Brand */}
        <div className="px-4 pt-5 pb-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1d4ed8] flex items-center justify-center shadow-lg shadow-blue-900/50">
              <Microscope className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <p className="text-white font-extrabold text-sm leading-none tracking-tight">
                  PICHA
                </p>
                <span className="text-[9px] font-bold text-slate-600 bg-slate-700/60 border border-slate-700 px-1 py-0.5 rounded leading-none">
                  v1.0
                </span>
              </div>
              <p className="text-slate-500 text-[10px] mt-1">
                Clinical Workstation
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 pt-3 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  active
                    ? "bg-[#1d4ed8] text-white font-semibold shadow-md shadow-blue-900/30"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight className="w-3 h-3 opacity-70" />}
              </Link>
            );
          })}

          {/* Analysis in progress indicator */}
          {pathname === "/analyze" && (
            <div className="mt-2 px-3 py-2.5 bg-[#1d4ed8]/10 border border-[#1d4ed8]/20 rounded-xl">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1d4ed8] animate-pulse" />
                <p className="text-[#93b4f7] text-[10px] font-bold uppercase tracking-wider">
                  Analysis in progress
                </p>
              </div>
              <p className="text-slate-600 text-[10px] mt-0.5 pl-3">
                MARS pipeline active
              </p>
            </div>
          )}
        </nav>

        {/* Service Status — compact */}
        <div className="px-4 py-3 border-t border-white/5">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-slate-600" />
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                Services
              </span>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>
          {[
            { name: "ML model", port: ":8100" },
            { name: "AI agents", port: ":8200" },
            { name: "API", port: ":3005" },
          ].map((s) => (
            <div
              key={s.name}
              className="flex items-center justify-between py-0.5"
            >
              <span className="text-slate-600 text-[10px]">{s.name}</span>
              <span className="text-emerald-500/70 text-[10px] font-mono">
                {s.port}
              </span>
            </div>
          ))}
        </div>

        {/* User + Logout */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#1d4ed8]/30 border border-blue-700/40 flex items-center justify-center shrink-0">
              <span className="text-blue-300 text-xs font-bold">
                {user.username[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">
                {user.fullName}
              </p>
              <p className="text-slate-500 text-[10px] truncate">{user.role}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="text-slate-600 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-white/5"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto min-h-screen">{children}</main>

      {/* PDPA consent modal — shown once per device per policy version */}
      <PdpaModal />
    </div>
  );
}
