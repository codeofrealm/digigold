"use client";
import { useMemo, useState } from "react";
import type { Metal, Transaction, TxType } from "@/context/GoldDemoProvider";
import { useGoldDemo } from "@/context/GoldDemoProvider";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function startOf(period: "day" | "week" | "month" | "year") {
  const d = new Date();
  if (period === "day")   { d.setHours(0,0,0,0); }
  if (period === "week")  { d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay()); }
  if (period === "month") { d.setHours(0,0,0,0); d.setDate(1); }
  if (period === "year")  { d.setHours(0,0,0,0); d.setMonth(0,1); }
  return d.getTime();
}

const LABELS: Record<TxType, string> = { buy: "Bought", sell: "Sold", sip: "SIP", gift_sent: "Gift Sent", redeem_order: "Delivery", silver_buy: "Bought", silver_sell: "Sold" };
const ICONS: Record<TxType, { bg: string; color: string; dir: "up" | "down" | "out" }> = {
  buy:          { bg: "bg-[#dcfce7]", color: "text-[#15803d]", dir: "down" },
  sell:         { bg: "bg-[#fee2e2]", color: "text-[#b91c1c]", dir: "up"   },
  sip:          { bg: "bg-[#dcfce7]", color: "text-[#15803d]", dir: "down" },
  gift_sent:    { bg: "bg-[#fce7f3]", color: "text-[#be185d]", dir: "out"  },
  redeem_order: { bg: "bg-[#fdf3d0]", color: "text-[#b8860b]", dir: "out"  },
  silver_buy:   { bg: "bg-[#dcfce7]", color: "text-[#15803d]", dir: "down" },
  silver_sell:  { bg: "bg-[#fee2e2]", color: "text-[#b91c1c]", dir: "up"   },
};

function exportCsv(rows: Transaction[]) {
  const lines = [["at","type","metal","inr","grams","note","recipient"].join(","),
    ...rows.map((r) => [r.at,r.type,r.metal,r.inr??"",r.grams??"", (r.note??"").replace(/,/g," "),(r.recipient??"").replace(/,/g," ")].join(","))];
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
  a.download = `digigold-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

export default function PassbookPage() {
  const { transactions, balanceGrams, balanceSilverGrams, pricePerGramInr, priceSilverPerGramInr } = useGoldDemo();
  const [filter, setFilter] = useState<"all" | Metal>("all");

  const filtered = useMemo(() => transactions.filter((t) => filter === "all" || t.metal === filter), [transactions, filter]);

  // Wallet invested stats per period (buy + sip only)
  const BUY_TYPES = ["buy", "sip", "silver_buy"];
  const walletStats = useMemo(() => (
    (["day", "week", "month", "year"] as const).map(p => {
      const from = startOf(p);
      const txs = transactions.filter(t => BUY_TYPES.includes(t.type) && new Date(t.at).getTime() >= from);
      return {
        label: p === "day" ? "Today" : p === "week" ? "This Week" : p === "month" ? "This Month" : "This Year",
        inr: txs.reduce((s, t) => s + (t.inr ?? 0), 0),
        grams: txs.reduce((s, t) => s + (t.grams ?? 0), 0),
      };
    })
  ), [transactions]);

  const totalInvested = useMemo(() => transactions.filter(t => BUY_TYPES.includes(t.type)).reduce((s, t) => s + (t.inr ?? 0), 0), [transactions]);
  const totalWithdrawn = useMemo(() => transactions.filter(t => ["sell","silver_sell"].includes(t.type)).reduce((s, t) => s + (t.inr ?? 0), 0), [transactions]);

  return (
    <div className="page-enter flex flex-col gap-0 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#7b1c1c] to-[#b8860b] px-4 pt-4 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-extrabold text-white">Passbook</h1>
            <p className="text-[12px] text-white/60 mt-0.5">{filtered.length} transactions</p>
          </div>
          <button type="button" onClick={() => exportCsv(filtered)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 border border-white/20 active:scale-95 transition-transform">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span className="text-[12px] font-bold text-white">Export</span>
          </button>
        </div>

        {/* Holdings */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="bg-white/10 border border-white/20 rounded-xl p-3">
            <p className="text-[10px] font-bold text-[#F5C842]/70 uppercase tracking-wider">Gold Holdings</p>
            <p className="text-[16px] font-extrabold text-[#F5C842]">{balanceGrams.toFixed(4)} g</p>
            <p className="text-[10px] text-white/40">{fmt(balanceGrams * pricePerGramInr)}</p>
          </div>
          <div className="bg-white/10 border border-white/20 rounded-xl p-3">
            <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Silver Holdings</p>
            <p className="text-[16px] font-extrabold text-white/90">{balanceSilverGrams.toFixed(2)} g</p>
            <p className="text-[10px] text-white/40">{fmt(balanceSilverGrams * priceSilverPerGramInr)}</p>
          </div>
        </div>
      </div>

      <div className="px-4 flex flex-col gap-3 mt-4">
        {/* Wallet Invested Summary */}
        <div className="card p-4">
          <p className="text-[13px] font-bold text-[#1c1208] mb-1">💰 Wallet Invested Summary</p>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] text-[#9a8060]">Total invested: <span className="font-bold text-[#b8860b]">{fmt(totalInvested)}</span></p>
            <p className="text-[11px] text-[#9a8060]">Withdrawn: <span className="font-bold text-[#b91c1c]">{fmt(totalWithdrawn)}</span></p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {walletStats.map(s => (
              <div key={s.label} className="bg-[#fdf3d0] border border-[#e8c84a] rounded-xl p-3">
                <p className="text-[10px] font-bold text-[#9a8060] uppercase tracking-wider mb-1">{s.label}</p>
                <p className="text-[17px] font-extrabold text-[#b8860b] tabular-nums">{fmt(s.inr)}</p>
                <p className="text-[10px] text-[#9a8060] mt-0.5">{s.grams.toFixed(4)}g purchased</p>
              </div>
            ))}
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {(["all", "gold", "silver"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setFilter(m)}
              className={`chip ${filter === m ? "chip-on" : "chip-off"} active:scale-95 transition-transform`}>
              {m === "all" ? "All" : m === "gold" ? "🥇 Gold" : "🥈 Silver"}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="card p-10 flex flex-col items-center gap-3">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#c8b090" strokeWidth="1.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <p className="text-[13px] text-[#9a8060] font-medium">No transactions yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((tx) => {
              const info = ICONS[tx.type];
              const isCredit = tx.type === "buy" || tx.type === "sip" || tx.type === "silver_buy";
              return (
                <div key={tx.id} className="card p-3.5 flex items-center gap-3">
                  <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${info.bg}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={info.color}>
                      {info.dir === "down" ? <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></> :
                       info.dir === "up"   ? <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></> :
                                             <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>}
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#1c1208] truncate">
                      {LABELS[tx.type]} {tx.metal === "gold" ? "Gold" : "Silver"}
                      {tx.recipient && <span className="text-[#9a8060] font-normal"> → {tx.recipient}</span>}
                    </p>
                    <p className="text-[11px] text-[#9a8060] mt-0.5" suppressHydrationWarning>
                      {new Date(tx.at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      {" · "}
                      {new Date(tx.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {tx.inr != null && (
                      <p className={`text-[14px] font-bold tabular-nums ${isCredit ? "text-[#15803d]" : "text-[#b91c1c]"}`}>
                        {isCredit ? "+" : "-"}{fmt(tx.inr)}
                      </p>
                    )}
                    {tx.grams != null && <p className="text-[11px] text-[#9a8060] tabular-nums">{tx.grams.toFixed(4)}g</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
