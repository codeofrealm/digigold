"use client";
import { useMemo, useState } from "react";
import type { Metal } from "@/context/GoldDemoProvider";
import { useGoldDemo } from "@/context/GoldDemoProvider";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
function fmtExact(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function startOf(period: "day" | "week" | "month" | "year") {
  const d = new Date();
  if (period === "day")   { d.setHours(0,0,0,0); }
  if (period === "week")  { d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay()); }
  if (period === "month") { d.setHours(0,0,0,0); d.setDate(1); }
  if (period === "year")  { d.setHours(0,0,0,0); d.setMonth(0,1); }
  return d.getTime();
}

export default function TradePage() {
  const { buyMetalInr, sellMetalGrams, walletInr, pricePerGramInr, priceSilverPerGramInr, balanceGrams, balanceSilverGrams, transactions } = useGoldDemo();
  const [metal, setMetal] = useState<Metal>("gold");
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("1000");
  const [grams, setGrams] = useState("0.5");
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const rate = metal === "gold" ? pricePerGramInr : priceSilverPerGramInr;
  const bal = metal === "gold" ? balanceGrams : balanceSilverGrams;

  const previewGrams = useMemo(() => {
    const v = Number(amount); return v > 0 ? v / rate : 0;
  }, [amount, rate]);

  const previewInr = useMemo(() => {
    const v = Number(grams); return v > 0 ? Math.round(v * rate) : 0;
  }, [grams, rate]);

  // Purchase stats per period for current metal
  const stats = useMemo(() => {
    const buyTypes = metal === "gold" ? ["buy", "sip"] : ["silver_buy"];
    const periods = ["day", "week", "month", "year"] as const;
    return periods.map(p => {
      const from = startOf(p);
      const txs = transactions.filter(t => buyTypes.includes(t.type) && new Date(t.at).getTime() >= from);
      return {
        label: p === "day" ? "Today" : p === "week" ? "This Week" : p === "month" ? "This Month" : "This Year",
        inr: txs.reduce((s, t) => s + (t.inr ?? 0), 0),
        grams: txs.reduce((s, t) => s + (t.grams ?? 0), 0),
        count: txs.length,
      };
    });
  }, [transactions, metal]);

  function submit() {
    setMsg(null);
    if (mode === "buy") {
      const r = buyMetalInr(metal, Number(amount));
      if (!r.ok) { setMsg(r.reason); setOk(false); return; }
      setMsg(`✓ Bought ${previewGrams.toFixed(4)}g ${metal}!`); setOk(true); setAmount("1000");
    } else {
      const r = sellMetalGrams(metal, Number(grams));
      if (!r.ok) { setMsg(r.reason); setOk(false); return; }
      setMsg(`✓ Sold ${grams}g ${metal} for ${fmt(previewInr)}!`); setOk(true); setGrams("0.25");
    }
  }

  return (
    <div className="page-enter flex flex-col gap-0 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#7b1c1c] to-[#b8860b] px-4 pt-4 pb-5">
        <h1 className="text-[22px] font-extrabold text-white">Trade</h1>
        <p className="text-[12px] text-white/60 mt-0.5">Buy & sell at live market prices</p>
        <div className="mt-3 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <span className="text-[12px] font-semibold text-white/70">Wallet Balance</span>
          <span className="text-[15px] font-extrabold text-[#F5C842]">{fmt(walletInr)}</span>
        </div>
      </div>

      <div className="px-4 flex flex-col gap-4 mt-4">
        {/* Metal selector */}
        <div className="flex gap-2">
          {(["gold", "silver"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMetal(m)}
              className={`flex-1 py-3 rounded-2xl text-[14px] font-bold transition-all active:scale-[0.97] border ${
                metal === m
                  ? m === "gold" ? "bg-[#fdf3d0] text-[#b8860b] border-[#e8c84a] shadow-sm" : "bg-[#f0f0f0] text-[#5a5a5a] border-[#d0d0d0] shadow-sm"
                  : "bg-white text-[#9a8060] border-[#ede0c4]"
              }`}>
              {m === "gold" ? "🥇 Gold 24K" : "🥈 Silver 999"}
            </button>
          ))}
        </div>

        {/* Buy / Sell toggle */}
        <div className="flex rounded-2xl bg-[#f0e8d8] p-1 border border-[#ede0c4]">
          {(["buy", "sell"] as const).map((x) => (
            <button key={x} type="button" onClick={() => { setMode(x); setMsg(null); }}
              className={`flex-1 py-2.5 rounded-[14px] text-[14px] font-bold transition-all ${
                mode === x
                  ? x === "buy" ? "bg-[#15803d] text-white shadow-sm" : "bg-[#b91c1c] text-white shadow-sm"
                  : "text-[#9a8060]"
              }`}>
              {x === "buy" ? "Buy" : "Sell"}
            </button>
          ))}
        </div>

        {/* Rate card */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider">Live {metal === "gold" ? "Gold 24K" : "Silver 999"} Rate</p>
              <p className="text-[26px] font-extrabold text-[#1c1208] tabular-nums mt-0.5">
                {fmtExact(rate)}
                <span className="text-[13px] font-normal text-[#9a8060] ml-1">/g</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider">You hold</p>
              <p className="text-[18px] font-bold text-[#5a4a2a] tabular-nums mt-0.5">{bal.toFixed(metal === "gold" ? 4 : 2)} g</p>
              <p className="text-[11px] text-[#9a8060]">{fmt(bal * rate)}</p>
            </div>
          </div>
          {/* Silver price info strip */}
          {metal === "silver" && (
            <div className="bg-[#f5f5f5] rounded-xl px-3 py-2 flex items-center justify-between">
              <p className="text-[11px] text-[#9a8060] font-medium">Silver 999 purity · per gram</p>
              <p className="text-[13px] font-bold text-[#5a5a5a]">{fmtExact(rate)}</p>
            </div>
          )}
          {metal === "gold" && (
            <div className="bg-[#fdf3d0] rounded-xl px-3 py-2 flex items-center justify-between">
              <p className="text-[11px] text-[#9a8060] font-medium">Gold 24K 999 purity · per gram</p>
              <p className="text-[13px] font-bold text-[#b8860b]">{fmtExact(rate)}</p>
            </div>
          )}
        </div>

        {/* Input */}
        {mode === "buy" ? (
          <div className="card p-4 flex flex-col gap-3">
            <label className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider">Amount (₹)</label>
            <input className="input-field text-[20px] font-bold" inputMode="decimal" value={amount}
              onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" />
            <p className="text-[12px] text-[#9a8060]">
              You&apos;ll get <span className="text-[#b8860b] font-bold">{previewGrams > 0 ? `${previewGrams.toFixed(4)} g` : "—"}</span>
            </p>
            <div className="flex gap-2">
              {[500, 1000, 2000, 5000].map((p) => (
                <button key={p} type="button" onClick={() => setAmount(String(p))}
                  className={`flex-1 py-2 rounded-xl text-[12px] font-bold border transition-all active:scale-95 ${
                    amount === String(p) ? "bg-[#fdf3d0] text-[#b8860b] border-[#e8c84a]" : "bg-[#f5f0e8] text-[#9a8060] border-[#e8e0d0]"
                  }`}>
                  {fmt(p)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="card p-4 flex flex-col gap-3">
            <label className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider">Grams to sell</label>
            <input className="input-field text-[20px] font-bold" inputMode="decimal" value={grams}
              onChange={(e) => setGrams(e.target.value)} placeholder="Enter grams" />
            <p className="text-[12px] text-[#9a8060]">
              You&apos;ll receive <span className="text-[#15803d] font-bold">{fmt(previewInr)}</span>
            </p>
            <div className="flex gap-2">
              {[0.1, 0.25, 0.5, 1].map((p) => (
                <button key={p} type="button" onClick={() => setGrams(String(Math.min(p, bal)))}
                  className={`flex-1 py-2 rounded-xl text-[12px] font-bold border transition-all active:scale-95 ${
                    grams === String(p) ? "bg-[#f0e8d8] text-[#5a4a2a] border-[#c8b090]" : "bg-[#f5f0e8] text-[#9a8060] border-[#e8e0d0]"
                  }`}>
                  {p}g
                </button>
              ))}
              <button type="button" onClick={() => setGrams(bal.toFixed(4))}
                className="flex-1 py-2 rounded-xl text-[12px] font-bold bg-[#f5f0e8] text-[#9a8060] border border-[#e8e0d0] active:scale-95 transition-transform">
                Max
              </button>
            </div>
          </div>
        )}

        {/* Message */}
        {msg && (
          <div className={`rounded-2xl px-4 py-3 text-[13px] font-semibold flex items-center gap-2 ${
            ok ? "bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0]" : "bg-[#fee2e2] text-[#b91c1c] border border-[#fecaca]"
          }`}>
            {msg}
          </div>
        )}

        {/* Submit */}
        <button type="button" onClick={submit}
          className={`w-full py-4 rounded-2xl text-[15px] font-extrabold transition-all active:scale-[0.97] text-white shadow-lg ${
            mode === "buy" ? "bg-gradient-to-r from-[#d4a017] to-[#b8860b]" : "bg-gradient-to-r from-[#dc2626] to-[#b91c1c]"
          }`}>
          {mode === "buy" ? `Buy ${metal === "gold" ? "Gold" : "Silver"}` : `Sell ${metal === "gold" ? "Gold" : "Silver"}`}
        </button>

        <p className="text-[11px] text-[#9a8060] text-center">Prices update every few seconds · No hidden charges</p>

        {/* ── Purchase Summary ── */}
        <div className="card p-4">
          <p className="text-[13px] font-bold text-[#1c1208] mb-3">
            {metal === "gold" ? "🥇" : "🥈"} {metal === "gold" ? "Gold" : "Silver"} Purchase Summary
          </p>
          <div className="grid grid-cols-2 gap-2">
            {stats.map(s => (
              <div key={s.label} className={`rounded-xl p-3 border ${
                metal === "gold" ? "bg-[#fdf3d0] border-[#e8c84a]" : "bg-[#f5f5f5] border-[#d0d0d0]"
              }`}>
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
                  metal === "gold" ? "text-[#9a8060]" : "text-[#7a7a7a]"
                }`}>{s.label}</p>
                <p className={`text-[16px] font-extrabold tabular-nums ${
                  metal === "gold" ? "text-[#b8860b]" : "text-[#5a5a5a]"
                }`}>{fmt(s.inr)}</p>
                <p className="text-[10px] text-[#9a8060] mt-0.5">{s.grams.toFixed(4)}g · {s.count} txn{s.count !== 1 ? "s" : ""}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
