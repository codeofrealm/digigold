"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useGoldDemo } from "@/context/GoldDemoProvider";

const NAV_ITEMS = [
  {
    href: "/", label: "Home",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    href: "/trade", label: "Trade",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  },
  {
    href: "/plan", label: "Invest & SIP",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  },
  {
    href: "/passbook", label: "Passbook",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  },
  {
    href: "/account", label: "My Profile",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  },
];

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function SidebarInner({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, logout, hasPin } = useAuth();
  const { pricePerGramInr, priceSilverPerGramInr, balanceGrams, balanceSilverGrams, walletInr, portfolioInr } = useGoldDemo();

  useEffect(() => { onClose(); }, [pathname]);

  function handleLogout() { logout(); router.replace("/login"); }

  // Display name — from auth (real login name)
  const displayName = user?.name ?? "User";
  const phone       = user?.phone ?? "";
  const role        = user?.role ?? "user";
  const initial     = displayName[0]?.toUpperCase() ?? "U";

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`fixed top-0 left-0 h-full w-[285px] z-50 flex flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "-translate-x-full"}`}>

        {/* ── Header ── */}
        <div className="bg-gradient-to-br from-[#7b1c1c] to-[#b8860b] px-5 pt-12 pb-5">
          <div className="flex items-start justify-between mb-4">
            {/* User info */}
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/35 flex items-center justify-center shadow-md shrink-0">
                <span className="text-[20px] font-extrabold text-white">{initial}</span>
              </div>
              <div>
                {/* Real name from login */}
                <p className="text-[16px] font-extrabold text-white leading-tight">{displayName}</p>
                {/* Phone */}
                <p className="text-[11px] text-white/65 mt-0.5">+91 {phone}</p>
                {/* Role badge */}
                <div className="mt-1.5">
                  {role === "admin" ? (
                    <span className="inline-flex items-center gap-1 bg-[#F5C842]/20 border border-[#F5C842]/40 rounded-full px-2 py-0.5 text-[10px] font-bold text-[#F5C842]">
                      👑 Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-white/15 border border-white/25 rounded-full px-2 py-0.5 text-[10px] font-bold text-white/80">
                      👤 User
                    </span>
                  )}
                  {hasPin() && (
                    <span className="ml-1 inline-flex items-center gap-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      🔒 PIN
                    </span>
                  )}
                </div>
              </div>
            </div>
            {/* Close */}
            <button type="button" onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 active:scale-90 transition-transform shrink-0 mt-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Portfolio mini */}
          <div className="bg-white/10 border border-white/20 rounded-xl px-3 py-2.5">
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Total Portfolio</p>
            <p className="text-[22px] font-extrabold text-white tabular-nums mt-0.5">{fmt(portfolioInr)}</p>
            <p className="text-[10px] text-white/50 mt-0.5">Wallet {fmt(walletInr)}</p>
          </div>
        </div>

        {/* ── Live prices strip ── */}
        <div className="flex border-b border-[#ede0c4]">
          <div className="flex-1 px-4 py-2.5 border-r border-[#ede0c4]">
            <p className="text-[10px] font-bold text-[#9a8060] uppercase tracking-wider">🥇 Gold/g</p>
            <p className="text-[14px] font-extrabold text-[#b8860b]">
              ₹{pricePerGramInr.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="flex-1 px-4 py-2.5">
            <p className="text-[10px] font-bold text-[#9a8060] uppercase tracking-wider">🥈 Silver/g</p>
            <p className="text-[14px] font-extrabold text-[#5a5a5a]">
              ₹{priceSilverPerGramInr.toFixed(2)}
            </p>
          </div>
        </div>

        {/* ── Nav items ── */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {NAV_ITEMS.map(({ href, label, icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl mb-1 transition-all active:scale-[0.98] ${
                  active ? "bg-[#fdf3d0] border border-[#e8c84a]" : "hover:bg-[#f5f0e8]"
                }`}>
                <div className={active ? "text-[#b8860b]" : "text-[#9a8060]"}>{icon}</div>
                <span className={`text-[14px] font-semibold ${active ? "text-[#b8860b]" : "text-[#5a4a2a]"}`}>{label}</span>
                {active && <div className="ml-auto w-2 h-2 rounded-full bg-[#b8860b]" />}
              </Link>
            );
          })}

          <div className="border-t border-[#ede0c4] my-3" />

          {/* Holdings */}
          <div className="px-3 py-3 rounded-xl bg-[#fdfaf4] border border-[#ede0c4] mb-3">
            <p className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider mb-2">My Holdings</p>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] text-[#5a4a2a]">🥇 Gold 24K</span>
              <div className="text-right">
                <span className="text-[13px] font-bold text-[#b8860b]">{balanceGrams.toFixed(4)} g</span>
                <p className="text-[10px] text-[#9a8060]">{fmt(balanceGrams * pricePerGramInr)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[#5a4a2a]">🥈 Silver 999</span>
              <div className="text-right">
                <span className="text-[13px] font-bold text-[#5a5a5a]">{balanceSilverGrams.toFixed(2)} g</span>
                <p className="text-[10px] text-[#9a8060]">{fmt(balanceSilverGrams * priceSilverPerGramInr)}</p>
              </div>
            </div>
          </div>

          {/* Support */}
          <a href="tel:+911800123456"
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-[#5a4a2a] hover:bg-[#f5f0e8] transition-all">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9a8060" strokeWidth="2" strokeLinecap="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.11 12 19.79 19.79 0 0 1 1.07 3.4 2 2 0 0 1 3.04 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            <span className="text-[14px] font-semibold">Support</span>
          </a>
        </nav>

        {/* ── Footer: user name + role + logout ── */}
        <div className="px-4 py-4 border-t border-[#ede0c4]">
          {/* User name + role strip */}
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#d4a017] to-[#b8860b] flex items-center justify-center shrink-0">
              <span className="text-[13px] font-extrabold text-white">{initial}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-[#1c1208] truncate">{displayName}</p>
              <p className="text-[10px] text-[#9a8060]">
                {role === "admin" ? "👑 Administrator" : "👤 User Account"}
              </p>
            </div>
          </div>

          <button type="button" onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#a52a2a] to-[#7b1c1c] text-white text-[14px] font-bold active:scale-[0.97] transition-transform">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
          <p className="text-center text-[10px] text-[#9a8060] mt-2">DigiGold v1.0.0</p>
        </div>
      </div>
    </>
  );
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Suspense fallback={null}>
      <SidebarInner open={open} onClose={onClose} />
    </Suspense>
  );
}
