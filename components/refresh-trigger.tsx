"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function RefreshTrigger({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    if (intervalMs <= 0) return;

    const interval = setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs, router]);

  return null;
}
