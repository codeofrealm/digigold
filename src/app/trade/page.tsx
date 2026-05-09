"use client";

import { useMemo, useState } from "react";
import type { Metal } from "@/context/GoldDemoProvider";
import { useGoldDemo } from "@/context/GoldDemoProvider";

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

type Mode = "buy" | "sell";

export default function TradePage() {
  const {
    buyMetalInr,
    sellMetalGrams,
    walletInr,
    pricePerGramInr,
    priceSilverPerGramInr,
    balanceGrams,
    balanceSilverGrams,
  } = useGoldDemo();

  const [metal, setMetal] = useState<Metal>("gold");
  const [mode, setMode] = useState<Mode>("buy");
  const [amount, setAmount] = useState("1000");
  const [grams, setGrams] = useState("0.5");
  const [msg, setMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const rate = metal === "gold" ? pricePerGramInr : priceSilverPerGramInr;
  const balance = metal === "gold" ? balanceGrams : balanceSilverGrams;

  const previewBuyGrams = useMemo(() => {
    const inr = Number(amount.replace(/,/g, ""));
    return Number.isFinite(inr) && inr > 0 ? inr / rate : 0;
  }, [amount, rate]);

  const previewSellInr = useMemo(() => {
    const g = Number(grams.replace(/,/g, ""));
    return Number.isFinite(g) && g > 0 ? Math.round(g * rate) : 0;
  }, [grams, rate]);

  function submit() {
    setMsg(null);
    setSuccess(false);
    if (mode === "buy") {
      const inr = Number(amount.replace(/,/g, ""));
      const r = buyMetalInr(metal, inr);
      if (!r.ok) { setMsg(r.reason); return; }
      setMsg(`Successfully bought ${metal}!`);
      setSuccess(true);
      setAmount("1000");
      return;
    }
    const g = Number(grams.replace(/,/g, ""));
    const r = sellMetalGrams(metal, g);
    if (!r.ok) { setMsg(r.reason); return; }
    setMsg(`Successfully sold ${metal}!`);
    setSuccess(true);
    setGrams("0.25");
  }

  return (
    <div className="page-enter px-5 py-4 pb-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-white">Trade</h1>
          <p className="text-[12px] text-zinc-500 mt-0.5">Buy & sell at live market prices</p>
        </div>
        <div className="px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.06]">
          <span className="text-[12px] font-semibold text-zinc-300">Wallet: {formatInr(walletInr)}</span>
        </div>
      </div>

      {/* Metal Selector */}
      <div className="flex gap-2">
        {(["gold", "silver"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMetal(m)}
            className={`flex-1 py-3 rounded-2xl text-[14px] font-semibold transition-all active:scale-[0.97] ${
              metal === m
                ? m === "gold"
                  ? "bg-[var(--gold-primary)]/15 text-[var(--gold-secondary)] border border-[var(--gold-primary)]/25"
                  : "bg-zinc-400/15 text-zinc-200 border border-zinc-400/25"
                : "bg-white/[0.03] text-zinc-500 border border-white/[0.06]"
            }`}
          >
            {m === "gold" ? "Gold 24K" : "Silver 999"}
          </button>
        ))}
      </div>

      {/* Buy/Sell Toggle */}
      <div className="flex rounded-2xl bg-white/[0.04] p-1 border border-white/[0.06]">
        {(["buy", "sell"] as const).map((x) => (
          <button
            key={x}
            type="button"
            onClick={() => { setMode(x); setMsg(null); }}
            className={`flex-1 py-2.5 rounded-[14px] text-[14px] font-semibold transition-all ${
              mode === x
                ? x === "buy"
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                  : "bg-red-500 text-white shadow-lg shadow-red-500/20"
                : "text-zinc-500"
            }`}
          >
            {x === "buy" ? "Buy" : "Sell"}
          </button>
        ))}
      </div>

      {/* Rate Card */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Live {metal} rate</p>
            <p className="text-[24px] font-extrabold text-white tabular-nums mt-1">
              {formatInr(rate)}
              <span className="text-[13px] font-normal text-zinc-500 ml-1">/g</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">You hold</p>
            <p className="text-[16px] font-bold text-zinc-200 tabular-nums mt-1">
              {balance.toFixed(metal === "gold" ? 4 : 2)} g
            </p>
          </div>
        </div>
      </div>

      {/* Input Section */}
      {mode === "buy" ? (
        <div className="card p-4 flex flex-col gap-3">
          <label className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">
            Enter amount (INR)
          </label>
          <input
            inputMode="decimal"
            className="input-field text-[20px] font-bold"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
          />
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-zinc-500">
              You'll get <span className="text-[var(--gold-secondary)] font-semibold">{previewBuyGrams > 0 ? `${previewBuyGrams.toFixed(4)} g` : "—"}</span>
            </p>
          </div>
          <div className="flex gap-2">
            {[500, 1000, 2000, 5000].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setAmount(String(p))}
                className={`flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all active:scale-95 ${
                  amount === String(p)
                    ? "bg-[var(--gold-primary)]/15 text-[var(--gold-secondary)] border border-[var(--gold-primary)]/25"
                    : "bg-white/[0.04] text-zinc-400 border border-white/[0.06]"
                }`}
              >
                {formatInr(p)}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="card p-4 flex flex-col gap-3">
          <label className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">
            Enter grams to sell
          </label>
          <input
            inputMode="decimal"
            className="input-field text-[20px] font-bold"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
            placeholder="Enter grams"
          />
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-zinc-500">
              You'll receive <span className="text-emerald-400 font-semibold">{formatInr(previewSellInr)}</span>
            </p>
          </div>
          <div className="flex gap-2">
            {[0.1, 0.25, 0.5, 1].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setGrams(String(Math.min(p, balance)))}
                className={`flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all active:scale-95 ${
                  grams === String(p)
                    ? "bg-white/10 text-white border border-white/15"
                    : "bg-white/[0.04] text-zinc-400 border border-white/[0.06]"
                }`}
              >
                {p} g
              </button>
            ))}
            <button
              type="button"
              onClick={() => setGrams(balance.toFixed(4))}
              className="flex-1 py-2 rounded-xl text-[12px] font-semibold bg-white/[0.04] text-zinc-400 border border-white/[0.06] active:scale-95 transition-transform"
            >
              Max
            </button>
          </div>
        </div>
      )}

      {/* Message */}
      {msg && (
        <div className={`rounded-2xl px-4 py-3 text-[13px] font-medium flex items-center gap-2 ${
          success
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            : "bg-red-500/10 text-red-400 border border-red-500/20"
        }`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            {success ? (
              <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>
            ) : (
              <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>
            )}
          </svg>
          {msg}
        </div>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={submit}
        className={`w-full py-4 rounded-2xl text-[15px] font-bold transition-all active:scale-[0.97] ${
          mode === "buy"
            ? "btn-gold"
            : "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/20"
        }`}
      >
        {mode === "buy" ? `Buy ${metal === "gold" ? "Gold" : "Silver"}` : `Sell ${metal === "gold" ? "Gold" : "Silver"}`}
      </button>

      {/* Info */}
      <div className="flex items-center gap-2 px-1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-zinc-600 shrink-0">
          <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
        </svg>
        <p className="text-[11px] text-zinc-600">
          Prices update every few seconds. No hidden charges.
        </p>
      </div>
    </div>
  );
}
