"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

export function DemoLandingModal({ userEmail }: { userEmail: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Only show for demo user and if not shown before in this session
    if (userEmail === "demo@enov360.com" && !sessionStorage.getItem("demo_modal_shown")) {
      setOpen(true);
      sessionStorage.setItem("demo_modal_shown", "true");
    }
  }, [userEmail]);

  const startDemo = async () => {
    // Reset demo data first
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      const data = await res.json();
      if (data.projectId) {
        setOpen(false);
        // Start walkthrough - we'll handle this with a global state or search param
        router.push(`/projects/${data.projectId}?demo=true`);
      }
    } catch (err) {
      console.error("Failed to reset demo", err);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[480px] bg-[var(--color-surface)] border-[var(--color-border)] shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-semibold text-[var(--color-green)]">
            Welcome to the Tracknov Demo
          </DialogTitle>
          <DialogDescription className="text-[14px] text-[var(--color-text-secondary)] mt-2">
            Would you like to start a guided walkthrough of the platform? 
            We'll set up a dummy green building project for you to explore all core features in under 10 minutes.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 flex flex-col gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-green-light)] border border-[var(--color-green-dim)]">
            <div className="w-8 h-8 rounded-full bg-[var(--color-green)] flex items-center justify-center text-white font-bold text-[14px]">1</div>
            <p className="text-[12px] text-[var(--color-green-strong)] font-medium">Resetting environment to baseline demo state...</p>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
            <div className="w-8 h-8 rounded-full bg-[var(--color-border-strong)] flex items-center justify-center text-[var(--color-text-primary)] font-bold text-[14px]">2</div>
            <p className="text-[12px] text-[var(--color-text-secondary)]">Step-by-step tooltip guidance enabled.</p>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:justify-start">
          <Button onClick={startDemo} className="bg-[var(--color-green)] hover:bg-[var(--color-green-dim)] text-white px-6">
            ✅ Start Guided Demo
          </Button>
          <Button variant="secondary" onClick={() => setOpen(false)} className="px-6">
            ❌ Skip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
