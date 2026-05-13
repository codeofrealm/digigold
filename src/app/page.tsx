"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGoldDemo } from "@/context/GoldDemoProvider";
import { useAuth } from "@/context/AuthContext";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
function fmtExact(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

const SLABS = [
  { label: "₹500 – ₹4,999",  pct: 5,    bar: 100 },
  { label: "₹5K – ₹24,999",  pct: 3.75, bar: 75  },
  { label: "₹25K – ₹99,999", pct: 2,    bar: 40  },
  { label: "₹1 Lakh+",       pct: 0.75, bar: 15  },
];

const BANNERS = [
  { bg: "from-[#7b1c1c] to-[#b8860b]", title: "Buy Gold from ₹10", sub: "24K 999 purity · MMTC-PAMP certified", cta: "Buy Now", href: "/trade" },
  { bg: "from-[#1a4731] to-[#15803d]", title: "Start Gold SIP Today", sub: "Automate savings · As low as ₹500/month", cta: "Start SIP", href: "/plan" },
  { bg: "from-[#1e3a5f] to-[#1d4ed8]", title: "Gift Gold to Loved Ones", sub: "Send digital gold instantly", cta: "Gift Now", href: "/plan" },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const {
    pricePerGramInr, priceSilverPerGramInr,
    priceStatus, goldChangePct, silverChangePct,
    balanceGrams, balanceSilverGrams,
    walletInr, portfolioInr, sip,
    inAppNotifications, dismissNotification,
  } = useGoldDemo();

  const [mounted, setMounted] = useState(false);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [rateCard, setRateCard] = useState({ gold10g24k: 0, gold10g22k: 0, silver10g: 0, silver50g: 0 });

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [user, loading, router]);
  useEffect(() => {
    const t = setInterval(() => setBannerIdx(i => (i + 1) % BANNERS.length), 3500);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "prices", "ratecard"), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setRateCard({ gold10g24k: d.gold10g24k || 0, gold10g22k: d.gold10g22k || 0, silver10g: d.silver10g || 0, silver50g: d.silver50g || 0 });
      }
    }, () => {});
    return () => unsub();
  }, []);

  if (!mounted || loading || !user) return (
    <div className="flex items-center justify-center h-full">
      <svg className="spin" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#b8860b" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10"/>
      </svg>
    </div>
  );

  const goldVal   = balanceGrams * pricePerGramInr;
  const silverVal = balanceSilverGrams * priceSilverPerGramInr;
  const b = BANNERS[bannerIdx];
  const goldUp    = goldChangePct >= 0;
  const silverUp  = silverChangePct >= 0;

  return (
    <div className="page-enter flex flex-col gap-0 pb-6">

      {/* ── Portfolio Card ── */}
      <div className="bg-gradient-to-b from-[#b8860b]/10 to-transparent px-4 pt-4 pb-2">
        <div className="bg-gradient-to-br from-[#7b1c1c] to-[#b8860b] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-bold text-white/60 uppercase tracking-wider">Total Portfolio</p>
            <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-2.5 py-1">
              <div className={`w-1.5 h-1.5 rounded-full ${priceStatus === "live" ? "bg-emerald-400 live-dot" : "bg-yellow-400"}`} />
              <span className={`text-[10px] font-bold ${priceStatus === "live" ? "text-emerald-300" : "text-yellow-300"}`}>
                {priceStatus === "live" ? "LIVE" : "CACHED"}
              </span>
            </div>
          </div>
          {/* Portfolio total — updates every 3s with live ticker */}
          <p className="text-[32px] font-extrabold text-white tabular-nums leading-none mt-1 transition-all duration-700">
            {fmt(portfolioInr)}
          </p>
          <p className="text-[11px] text-white/50 mt-1.5">
            Wallet <span className="text-white/80 font-semibold">{fmt(walletInr)}</span>
            {" · "}Metals <span className="text-white/80 font-semibold transition-all duration-700">{fmt(goldVal + silverVal)}</span>
          </p>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="bg-white/10 rounded-xl p-2.5">
              <p className="text-[10px] font-bold text-[#F5C842]/80 uppercase tracking-wider">Gold 24K</p>
              <p className="text-[14px] font-bold text-[#F5C842]">{balanceGrams.toFixed(4)} g</p>
              <p className="text-[11px] font-semibold text-[#F5C842]/90 transition-all duration-700">{fmt(goldVal)}</p>
              <p className="text-[10px] text-white/40 mt-0.5 transition-all duration-700">
                @ ₹{pricePerGramInr.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/g
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5">
              <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Silver 999</p>
              <p className="text-[14px] font-bold text-white/90">{balanceSilverGrams.toFixed(2)} g</p>
              <p className="text-[11px] font-semibold text-white/80 transition-all duration-700">{fmt(silverVal)}</p>
              <p className="text-[10px] text-white/40 mt-0.5 transition-all duration-700">
                @ ₹{priceSilverPerGramInr.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/g
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Notification ── */}
      {inAppNotifications.length > 0 && (
        <div className="mx-4 mt-3 flex items-center gap-3 bg-[#fdf3d0] border border-[#e8c84a] rounded-2xl px-3 py-2.5">
          <div className="w-2 h-2 rounded-full bg-[#b8860b] live-dot shrink-0" />
          <p className="flex-1 text-[12px] font-semibold text-[#7b4a00] leading-snug">{inAppNotifications[0].message}</p>
          <button type="button" onClick={() => dismissNotification(inAppNotifications[0].id)}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-[#e8c84a]/30 active:scale-90 transition-transform shrink-0">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#7b4a00" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      <div className="px-4 flex flex-col gap-4 mt-4">

        {/* ── Promo Banner ── */}
        <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-r ${b.bg} p-5 min-h-[110px]`}>
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_bottom_right,#fff_0%,transparent_60%)]" />
          <p className="text-[18px] font-extrabold text-white leading-tight relative">{b.title}</p>
          <p className="text-[12px] text-white/70 mt-1 relative">{b.sub}</p>
          <Link href={b.href} className="mt-3 inline-flex items-center gap-1.5 bg-white/20 border border-white/30 rounded-xl px-4 py-2 text-[13px] font-bold text-white active:scale-95 transition-transform relative">
            {b.cta}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </Link>
          <div className="absolute bottom-3 right-4 flex gap-1.5">
            {BANNERS.map((_, i) => (
              <button key={i} type="button" onClick={() => setBannerIdx(i)}
                className={`h-1.5 rounded-full transition-all ${i === bannerIdx ? "bg-white w-4" : "bg-white/40 w-1.5"}`} />
            ))}
          </div>
        </div>

        {/* ── Live Prices (exact from gold-api.com) ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[14px] font-bold text-[#1c1208]">Live Market Prices</p>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${priceStatus === "live" ? "bg-emerald-500 live-dot" : "bg-yellow-500"}`} />
              <span className="text-[11px] text-[#9a8060] font-medium">
                {priceStatus === "live" ? "gold-api.com · Live" : "Cached"}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* Gold */}
            <div className="card p-4 relative overflow-hidden">
              <div className="absolute inset-0 shimmer" />
              <div className="relative">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[16px]">🥇</span>
                  <span className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider">Gold 24K</span>
                </div>
                <p className="text-[11px] text-[#9a8060] mb-0.5">Per gram (INR)</p>
                <p className="text-[22px] font-extrabold text-[#b8860b] tabular-nums leading-none">
                  ₹{pricePerGramInr.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-[#9a8060] mt-1">999 purity · 24 Karat</p>
              </div>
            </div>
            {/* Silver */}
            <div className="card p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[16px]">🥈</span>
                <span className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider">Silver 999</span>
              </div>
              <p className="text-[11px] text-[#9a8060] mb-0.5">Per gram (INR)</p>
              <p className="text-[22px] font-extrabold text-[#5a5a5a] tabular-nums leading-none">
                ₹{priceSilverPerGramInr.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-[#9a8060] mt-1">999 purity · Fine Silver</p>
            </div>
          </div>

          {/* Total gold value banner */}
          <div className="mt-3 bg-gradient-to-r from-[#fdf3d0] to-[#fff8e8] border border-[#e8c84a] rounded-2xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider">Your Gold Value Today</p>
              <p className="text-[22px] font-extrabold text-[#b8860b] tabular-nums">
                ₹{goldVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-[#9a8060] mt-0.5">
                {balanceGrams.toFixed(4)}g × ₹{pricePerGramInr.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/g
              </p>
            </div>
            <span className="text-[28px]">🥇</span>
          </div>

          {/* Total silver value banner */}
          <div className="mt-2 bg-[#f5f5f5] border border-[#d0d0d0] rounded-2xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider">Your Silver Value Today</p>
              <p className="text-[22px] font-extrabold text-[#5a5a5a] tabular-nums">
                ₹{silverVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-[#9a8060] mt-0.5">
                {balanceSilverGrams.toFixed(2)}g × ₹{priceSilverPerGramInr.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/g
              </p>
            </div>
            <span className="text-[28px]">🥈</span>
          </div>
        </div>

        {/* ── Rate Card ── */}
        {(rateCard.gold10g24k > 0 || rateCard.silver10g > 0) && (
          <div className="card p-4">
            <p className="text-[14px] font-bold text-[#1c1208] mb-3">Today&apos;s Rate Card</p>
            {rateCard.gold10g24k > 0 && (
              <>
                <p className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider mb-2">🥇 Gold Rates</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-[#fdf3d0] border border-[#e8c84a] rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-[#9a8060] uppercase tracking-wider">10g · 24K</p>
                    <p className="text-[18px] font-extrabold text-[#b8860b] tabular-nums mt-1">₹{rateCard.gold10g24k.toLocaleString("en-IN")}</p>
                    <p className="text-[10px] text-[#9a8060] mt-0.5">24 Karat · 999 purity</p>
                  </div>
                  <div className="bg-[#fdf3d0] border border-[#e8c84a] rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-[#9a8060] uppercase tracking-wider">10g · 22K</p>
                    <p className="text-[18px] font-extrabold text-[#b8860b] tabular-nums mt-1">₹{rateCard.gold10g22k.toLocaleString("en-IN")}</p>
                    <p className="text-[10px] text-[#9a8060] mt-0.5">22 Karat · 916 purity</p>
                  </div>
                </div>
              </>
            )}
            {rateCard.silver10g > 0 && (
              <>
                <p className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider mb-2">🥈 Silver Rates</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#f5f5f5] border border-[#d0d0d0] rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-[#9a8060] uppercase tracking-wider">10g · 999</p>
                    <p className="text-[18px] font-extrabold text-[#5a5a5a] tabular-nums mt-1">₹{rateCard.silver10g.toLocaleString("en-IN")}</p>
                    <p className="text-[10px] text-[#9a8060] mt-0.5">Fine Silver · 999</p>
                  </div>
                  <div className="bg-[#f5f5f5] border border-[#d0d0d0] rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-[#9a8060] uppercase tracking-wider">50g · 999</p>
                    <p className="text-[18px] font-extrabold text-[#5a5a5a] tabular-nums mt-1">₹{rateCard.silver50g.toLocaleString("en-IN")}</p>
                    <p className="text-[10px] text-[#9a8060] mt-0.5">Fine Silver · 999</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}


        {/* ── Savings Slab ── */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[14px] font-bold text-[#1c1208]">Savings Slab Benefits</p>
            <span className="badge-gold">Up to 5%</span>
          </div>
          <p className="text-[11px] text-[#9a8060] mb-4">Invest more, save more on every purchase</p>
          <div className="flex flex-col gap-3">
            {SLABS.map(s => (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-semibold text-[#5a4a2a]">{s.label}</span>
                  <span className="text-[13px] font-bold text-[#b8860b]">{s.pct}% off</span>
                </div>
                <div className="h-2 rounded-full bg-[#f0e8d8] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${s.bar}%`, background: "linear-gradient(90deg,#d4a017,#b8860b)" }} />
                </div>
              </div>
            ))}
          </div>
          <Link href="/trade" className="btn-gold w-full mt-4 text-[14px]">Start Buying Gold</Link>
        </div>

        {/* ── SIP Banner ── */}
        <Link href="/plan" className="card p-4 flex items-center gap-3 active:scale-[0.98] transition-transform">
          <div className="w-12 h-12 rounded-2xl bg-[#fdf3d0] border border-[#e8c84a] flex items-center justify-center shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#b8860b" strokeWidth="2" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-[#1c1208]">{sip.active ? "Gold SIP Active ✓" : "Start a Gold SIP"}</p>
            <p className="text-[12px] text-[#9a8060] mt-0.5">{sip.active ? `₹${sip.amountInr} / ${sip.frequency}` : "Automate your gold savings"}</p>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c8b090" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </Link>

        {/* ── Trust ── */}
        <div className="card p-4 bg-[#f0fdf4] border-[#bbf7d0] flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div>
            <p className="text-[13px] font-bold text-emerald-800">100% Secure & Insured</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">MMTC-PAMP certified vaults · RBI regulated</p>
          </div>
        </div>

      </div>
    </div>
  );
}
