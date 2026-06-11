/**
 * useServiceHealth — React hook for polling backend health
 * Checks all three APEX services every 30 seconds.
 */

import { useState, useEffect, useCallback } from "react";
import { checkHealth } from "./api";

const POLL_INTERVAL = 30_000; // 30 seconds

const INITIAL_STATE = {
  axia: { status: "loading", modelReady: false, details: {} },
  smartliva: { status: "loading", modelReady: false, details: {} },
  picha: { status: "loading", modelReady: false, details: {} },
};

export function useServiceHealth() {
  const [health, setHealth] = useState(INITIAL_STATE);

  const pollAll = useCallback(async () => {
    const services = ["axia", "smartliva", "picha"];
    const results = await Promise.allSettled(
      services.map((s) => checkHealth(s)),
    );

    setHealth((prev) => {
      const next = { ...prev };
      services.forEach((svc, i) => {
        const r = results[i];
        if (r.status === "fulfilled" && r.value.ok) {
          const d = r.value.data;
          next[svc] = {
            status: "ok",
            modelReady: d.models_loaded ?? d.model_ready ?? true,
            details: d,
          };
        } else {
          next[svc] = {
            status: "error",
            modelReady: false,
            details: { error: r.reason?.message || "Offline" },
          };
        }
      });
      return next;
    });
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    pollAll();
    const interval = setInterval(pollAll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [pollAll]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Helper: overall system status
  const anyOnline = Object.values(health).some((s) => s.status === "ok");
  const allOnline = Object.values(health).every((s) => s.status === "ok");

  return { health, anyOnline, allOnline, refresh: pollAll };
}
