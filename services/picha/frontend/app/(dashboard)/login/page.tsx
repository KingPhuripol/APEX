"use client";
// Auto-login with demo credentials, then redirect to dashboard

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  useEffect(() => {
    api
      .post("/api/auth/login", { username: "Nano", password: "Nano2527" })
      .finally(() => router.replace("/dashboard"));
  }, [router]);
  return null;
}
