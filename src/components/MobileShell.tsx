"use client";
import { Suspense, useState, useEffect, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";

const NO_SHELL  = ["/login", "/verify", "/register", "/admin", "/setpin", "/pin"];
const AUTH_FREE = ["/login", "/verify", "/register", "/pin"];

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, loading, hasPin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pinChecked, setPinChecked]   = useState(false);
  const [, startTransition] = useTransition();

  const bare   = NO_SHELL.some(p => pathname === p || pathname.startsWith(p + "/"));
  const isFree = AUTH_FREE.some(p => pathname === p || pathname.startsWith(p + "/"));

  useEffect(() => {
    if (loading) return;

    if (!user && !isFree) {
      startTransition(() => router.replace("/login"));
      setPinChecked(true);
      return;
    }
    if (user?.role === "admin") { setPinChecked(true); return; }
    if (isFree) { setPinChecked(true); return; }

    if (user?.role === "user") {
      const pinAsked = sessionStorage.getItem("dg-pin-asked");
      if (!pinAsked) {
        if (hasPin()) {
          sessionStorage.setItem("dg-pin-asked", "1");
          startTransition(() => router.replace("/pin"));
          setPinChecked(true);
          return;
        } else if (!user.pinSet && pathname !== "/setpin") {
          sessionStorage.setItem("dg-pin-asked", "1");
          startTransition(() => router.replace("/setpin"));
          setPinChecked(true);
          return;
        }
      }
    }
    setPinChecked(true);
  }, [loading, user, pathname, isFree, router, hasPin]);

  if (loading || !pinChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#f7f3ec]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7b1c1c] to-[#b8860b] flex items-center justify-center shadow-lg">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <polygon points="12,2 15.5,8.5 23,9.5 17.5,14.5 19,22 12,18.5 5,22 6.5,14.5 1,9.5 8.5,8.5" fill="#F5C842"/>
            </svg>
          </div>
          <svg className="spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#b8860b" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/>
            <path d="M12 2a10 10 0 0 1 10 10"/>
          </svg>
        </div>
      </div>
    );
  }

  if (bare) {
    return <div className="fixed inset-0 bg-[#f7f3ec] overflow-y-auto">{children}</div>;
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-[#f7f3ec] text-[#1c1208] overflow-hidden">
      <div className="shrink-0 bg-[#f7f3ec]" style={{ height: "env(safe-area-inset-top,0px)" }} />

      {/* Top bar with hamburger */}
      <div className="shrink-0 bg-gradient-to-r from-[#7b1c1c] to-[#b8860b] px-4 py-2.5 flex items-center justify-between">
        {/* Hamburger */}
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="w-9 h-9 flex flex-col items-center justify-center gap-[5px] rounded-xl bg-white/15 border border-white/20 active:scale-90 transition-transform"
        >
          <span className="w-5 h-[2px] bg-white rounded-full" />
          <span className="w-5 h-[2px] bg-white rounded-full" />
          <span className="w-3.5 h-[2px] bg-white rounded-full self-start ml-[5px]" />
        </button>

        {/* Logo center */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/15 border border-white/25 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <polygon points="12,2 15.5,8.5 23,9.5 17.5,14.5 19,22 12,18.5 5,22 6.5,14.5 1,9.5 8.5,8.5" fill="#F5C842" stroke="#b8860b" strokeWidth="1"/>
            </svg>
          </div>
          <span className="text-[17px] font-extrabold text-white tracking-tight">DigiGold</span>
        </div>

        {/* User name + role — right side */}
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="flex items-center gap-1.5 active:scale-90 transition-transform"
        >
          <div className="text-right">
            <p className="text-[12px] font-bold text-white leading-tight max-w-[80px] truncate">
              {user?.name ?? "User"}
            </p>
            <p className="text-[9px] text-white/60 font-medium">
              {user?.role === "admin" ? "👑 Admin" : "👤 User"}
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
            <span className="text-[13px] font-extrabold text-white">
              {(user?.name ?? "U")[0]?.toUpperCase()}
            </span>
          </div>
        </button>
      </div>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-y-auto overflow-x-hidden overscroll-none">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}

export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center bg-[#f7f3ec]">
          <svg className="spin" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#b8860b" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/>
            <path d="M12 2a10 10 0 0 1 10 10"/>
          </svg>
        </div>
      }
    >
      <ShellInner>{children}</ShellInner>
    </Suspense>
  );
}
