"use client";
import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/", label: "Home",
    icon: (a: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: "/trade", label: "Trade",
    icon: (a: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    ),
  },
  {
    href: "/shop", label: "Shop",
    icon: (a: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    href: "/plan", label: "Invest",
    icon: (a: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    href: "/passbook", label: "History",
    icon: (a: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    href: "/account", label: "Profile",
    icon: (a: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

function NavInner() {
  const pathname = usePathname();
  return (
    <nav
      className="shrink-0 bg-white border-t border-[#ede0c4] shadow-[0_-2px_16px_rgba(184,134,11,0.08)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom,0px)" }}
    >
      <div className="flex items-center justify-around px-2 h-[58px]">
        {TABS.map(({ href, label, icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-col items-center justify-center gap-[3px] min-w-[56px] py-1 active:scale-90 transition-transform duration-150"
            >
              {active && (
                <div className="absolute -top-[1px] w-[24px] h-[3px] rounded-full bg-gradient-to-r from-[#d4a017] to-[#b8860b]" />
              )}
              <div className={`transition-colors duration-200 ${active ? "text-[#b8860b]" : "text-[#b0a090]"}`}>
                {icon(active)}
              </div>
              <span className={`text-[10px] font-bold transition-colors duration-200 ${active ? "text-[#b8860b]" : "text-[#b0a090]"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function BottomNav() {
  return (
    <Suspense fallback={
      <nav className="shrink-0 bg-white border-t border-[#ede0c4] h-[58px]" />
    }>
      <NavInner />
    </Suspense>
  );
}
