"use client";

import Link from "next/link";
import { useGoldDemo } from "@/context/GoldDemoProvider";
import { useEffect, useState } from "react";

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatGrams(g: number) {
  return `${g.toFixed(4)} g`;
}

function formatCompact(n: number) {
  if (n >= 100000) return `${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toFixed(0);
}

export default function HomePage() {
  const {
    pricePerGramInr,
    priceSilverPerGramInr,
    balanceGrams,
    balanceSilverGrams,
    walletInr,
    portfolioInr,
    sip,
    inAppNotifications,
    dismissNotification,
  } = useGoldDemo();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const goldValue = balanceGrams * pricePerGramInr;
  const silverValue = balanceSilverGrams * priceSilverPerGramInr;
  const totalMetalValue = goldValue + silverValue;

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-[var(--gold-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-enter px-5 py-4 pb-6 flex flex-col gap-5">

      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[13px] text-zinc-400 font-medium">Good {getGreeting()},</p>
          <h1 className="text-[22px] font-bold text-white tracking-tight mt-0.5">DigiGold</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <Link
            href="/account"
            className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white/[0.05] border border-white/[0.08] active:scale-90 transition-transform"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {inAppNotifications.length > 0 && (
              <div className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-[9px] font-bold text-white">{inAppNotifications.length > 9 ? "9+" : inAppNotifications.length}</span>
              </div>
            )}
          </Link>
          {/* Profile */}
          <Link
            href="/account"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-[var(--gold-primary)] to-[var(--gold-dark)] active:scale-90 transition-transform"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </Link>
        </div>
      </header>

      {/* Notification Banner */}
      {inAppNotifications.length > 0 && (
        <div className="flex items-center gap-3 card p-3 border-l-[3px] border-l-[var(--gold-primary)]">
          <div className="shrink-0 w-2 h-2 rounded-full bg-[var(--gold-primary)] live-dot" />
          <p className="flex-1 text-[12px] text-zinc-300 font-medium leading-snug">
            {inAppNotifications[0].message}
          </p>
          <button
            type="button"
            onClick={() => dismissNotification(inAppNotifications[0].id)}
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-white/[0.05] active:scale-90 transition-transform"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-zinc-400">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Portfolio Card */}
      <section className="relative rounded-[24px] overflow-hidden">
        {/* Gold gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1708] via-[#141210] to-[#0c0b09]" />
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_top_right,rgba(245,200,66,0.2)_0%,transparent_60%)]" />
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--gold-primary)]/30 to-transparent" />

        <div className="relative p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.12em]">Total Portfolio</p>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.05]">
              <div className="w-[5px] h-[5px] rounded-full bg-emerald-400 live-dot" />
              <span className="text-[10px] font-semibold text-emerald-400">LIVE</span>
            </div>
          </div>

          <h2 className="text-[36px] font-extrabold text-white tabular-nums tracking-tight leading-none mt-2">
            {formatInr(portfolioInr)}
          </h2>

          <p className="text-[12px] text-zinc-500 mt-2">
            Wallet: <span className="text-zinc-300">{formatInr(walletInr)}</span> · Metals: <span className="text-zinc-300">{formatInr(totalMetalValue)}</span>
          </p>

          {/* Gold & Silver Holdings */}
          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3.5">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--gold-secondary)] to-[var(--gold-dark)] flex items-center justify-center shadow-lg">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#000" stroke="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                </div>
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Gold</span>
              </div>
              <p className="text-[17px] font-bold text-[var(--gold-secondary)] tabular-nums">
                {formatGrams(balanceGrams)}
              </p>
              <p className="text-[11px] text-zinc-500 mt-1 tabular-nums">{formatInr(goldValue)}</p>
            </div>

            <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3.5">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--silver-light)] to-zinc-400 flex items-center justify-center shadow-lg">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#000" stroke="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                </div>
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Silver</span>
              </div>
              <p className="text-[17px] font-bold text-zinc-200 tabular-nums">
                {formatGrams(balanceSilverGrams)}
              </p>
              <p className="text-[11px] text-zinc-500 mt-1 tabular-nums">{formatInr(silverValue)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Live Prices */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-bold text-white">Live Prices</h3>
          <div className="flex items-center gap-1.5">
            <div className="w-[5px] h-[5px] rounded-full bg-emerald-400 live-dot" />
            <span className="text-[11px] text-zinc-500 font-medium">Real-time</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4 relative overflow-hidden active:scale-[0.97] transition-transform">
            <div className="absolute inset-0 shimmer-gold" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-[var(--gold-primary)]/20 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--gold-primary)]" />
                </div>
                <span className="text-[12px] font-semibold text-zinc-400">Gold / g</span>
              </div>
              <p className="text-[22px] font-extrabold text-white tabular-nums">
                {formatInr(pricePerGramInr)}
              </p>
              <p className="text-[11px] text-emerald-400 font-medium mt-1">24K • 999 purity</p>
            </div>
          </div>

          <div className="card p-4 relative overflow-hidden active:scale-[0.97] transition-transform">
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-zinc-500/20 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
                </div>
                <span className="text-[12px] font-semibold text-zinc-400">Silver / g</span>
              </div>
              <p className="text-[22px] font-extrabold text-white tabular-nums">
                {formatInr(priceSilverPerGramInr)}
              </p>
              <p className="text-[11px] text-zinc-500 font-medium mt-1">999 purity</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h3 className="text-[15px] font-bold text-white mb-3">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-2">
          <QuickAction href="/trade" label="Buy" color="gold">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </QuickAction>
          <QuickAction href="/trade" label="Sell" color="white">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </QuickAction>
          <QuickAction href="/plan" label="SIP" color="green">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
          </QuickAction>
          <QuickAction href="/plan" label="Gift" color="pink">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
            </svg>
          </QuickAction>
        </div>
      </section>

      {/* SIP Banner */}
      <Link
        href="/plan"
        className="card p-4 flex items-center gap-4 active:scale-[0.98] transition-transform border-[var(--gold-primary)]/10"
      >
        <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--gold-primary)]/20 to-[var(--gold-primary)]/5 flex items-center justify-center border border-[var(--gold-primary)]/20">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gold-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-white">
            {sip.active ? "Gold SIP Active" : "Start a SIP"}
          </p>
          <p className="text-[12px] text-zinc-400 mt-0.5">
            {sip.active
              ? `${formatInr(sip.amountInr)} / ${sip.frequency} in ${sip.metal}`
              : "Automate your gold savings today"}
          </p>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500 shrink-0">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>

      {/* Safety banner */}
      <div className="card p-4 flex items-center gap-3">
        <div className="shrink-0 w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-white">100% Secure & Insured</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Your gold is stored in MMTC-PAMP certified vaults</p>
        </div>
      </div>

      {/* Bottom spacer */}
      <div className="h-2" />
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

function QuickAction({
  href,
  label,
  color,
  children,
}: {
  href: string;
  label: string;
  color: "gold" | "white" | "green" | "pink";
  children: React.ReactNode;
}) {
  const colorMap = {
    gold: { bg: "bg-[var(--gold-primary)]/15", text: "text-[var(--gold-primary)]", border: "border-[var(--gold-primary)]/20" },
    white: { bg: "bg-white/[0.06]", text: "text-zinc-300", border: "border-white/[0.08]" },
    green: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/20" },
    pink: { bg: "bg-pink-500/15", text: "text-pink-400", border: "border-pink-500/20" },
  };
  const c = colorMap[color];

  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-2 py-3 rounded-2xl ${c.bg} border ${c.border} active:scale-90 transition-transform`}
    >
      <div className={c.text}>{children}</div>
      <span className="text-[11px] font-semibold text-zinc-300">{label}</span>
    </Link>
  );
}
