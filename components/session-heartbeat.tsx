"use client";

import { useEffect } from "react";

export function SessionHeartbeat() {
  useEffect(() => {
    const run = () => {
      fetch("/api/session/heartbeat", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      }).catch((e) => {
        console.warn("[SessionHeartbeat] Transient heartbeat failure:", e);
      });
    };
    run();
    const timer = setInterval(run, 8 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  return null;
}

