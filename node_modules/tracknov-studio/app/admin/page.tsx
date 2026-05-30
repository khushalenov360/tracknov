"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to the consolidated Control Center
    router.replace("/admin/control-center");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-sans">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm tracking-wider animate-pulse">Redirecting to Tracknov Control Center...</p>
      </div>
    </div>
  );
}
