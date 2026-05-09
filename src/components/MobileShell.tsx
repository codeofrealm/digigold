"use client";

import { BottomNav } from "@/components/BottomNav";

export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex flex-col bg-[#09090b] text-zinc-100 overflow-hidden">
      {/* Status bar spacer */}
      <div
        className="shrink-0 bg-[#09090b]"
        style={{ height: "env(safe-area-inset-top, 0px)" }}
      />

      {/* Scrollable content area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden overscroll-none">
        {children}
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
}
