"use client";

import { useMemo, useState } from "react";
import type { Metal, Transaction, TxType } from "@/context/GoldDemoProvider";
import { useGoldDemo } from "@/context/GoldDemoProvider";

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

const typeLabels: Record<TxType, string> = {
  buy: "Bought",
  sell: "Sold",
  sip: "SIP",
  gift_sent: "Gift Sent",
  redeem_order: "Delivery",
  silver_buy: "Bought",
  silver_sell: "Sold",
};

const typeIcons: Record<TxType, { color: string; arrow: "up" | "down" | "out" }> = {
  buy: { color: "text-emerald-400", arrow: "down" },
  sell: { color: "text-red-400", arrow: "up" },
  sip: { color: "text-emerald-400", arrow: "down" },
  gift_sent: { color: "text-pink-400", arrow: "out" },
  redeem_order: { color: "text-amber-400", arrow: "out" },
  silver_buy: { color: "text-emerald-400", arrow: "down" },
  silver_sell: { color: "text-red-400", arrow: "up" },
};

function exportCsv(rows: Transaction[]) {
  const header = ["at", "type", "metal", "inr", "grams", "note", "recipient"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.at,
        r.type,
        r.metal,
        r.inr ?? "",
        r.grams ?? "",
        (r.note ?? "").replace(/,/g, " "),
        (r.recipient ?? "").replace(/,/g, " "),
      ].join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `digigold-passbook-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PassbookPage() {
  const { transactions, balanceGrams, balanceSilverGrams, pricePerGramInr, priceSilverPerGramInr } = useGoldDemo();
  const [filter, setFilter] = useState<"all" | "gold" | "silver">("all");

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filter === "all") return true;
      return t.metal === filter;
    });
  }, [transactions, filter]);

  const totalValue = balanceGrams * pricePerGramInr + balanceSilverGrams * priceSilverPerGramInr;

  return (
    <div className="page-enter px-5 py-4 pb-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-white">Transaction History</h1>
          <p className="text-[12px] text-zinc-500 mt-0.5">{filtered.length} transactions</p>
        </div>
        <button
          type="button"
          onClick={() => exportCsv(filtered)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.06] active:scale-95 transition-transform"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span className="text-[12px] font-semibold text-zinc-300">Export</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-3.5">
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Gold Holdings</p>
          <p className="text-[18px] font-bold text-[var(--gold-secondary)] mt-1 tabular-nums">{balanceGrams.toFixed(4)} g</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">{formatInr(balanceGrams * pricePerGramInr)}</p>
        </div>
        <div className="card p-3.5">
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Silver Holdings</p>
          <p className="text-[18px] font-bold text-zinc-200 mt-1 tabular-nums">{balanceSilverGrams.toFixed(2)} g</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">{formatInr(balanceSilverGrams * priceSilverPerGramInr)}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(["all", "gold", "silver"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setFilter(m)}
            className={`chip ${filter === m ? "chip-active" : "chip-inactive"} active:scale-95 transition-transform`}
          >
            {m === "all" ? "All" : m === "gold" ? "Gold" : "Silver"}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="card p-8 flex flex-col items-center justify-center gap-3">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-zinc-700">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p className="text-[13px] text-zinc-600 font-medium">No transactions yet</p>
          </div>
        ) : (
          filtered.map((tx) => {
            const info = typeIcons[tx.type];
            const isCredit = tx.type === "buy" || tx.type === "sip" || tx.type === "silver_buy";
            return (
              <div
                key={tx.id}
                className="card p-3.5 flex items-center gap-3"
              >
                {/* Icon */}
                <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  isCredit ? "bg-emerald-500/10" : tx.type === "gift_sent" ? "bg-pink-500/10" : "bg-red-500/10"
                }`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={info.color}>
                    {info.arrow === "down" ? (
                      <><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></>
                    ) : info.arrow === "up" ? (
                      <><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></>
                    ) : (
                      <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>
                    )}
                  </svg>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[13px] font-semibold text-white truncate">
                      {typeLabels[tx.type]} {tx.metal === "gold" ? "Gold" : "Silver"}
                    </p>
                    {tx.recipient && (
                      <span className="text-[11px] text-zinc-500 truncate">to {tx.recipient}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {new Date(tx.at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {" · "}
                    {new Date(tx.at).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {/* Amount */}
                <div className="shrink-0 text-right">
                  {tx.inr != null && (
                    <p className={`text-[14px] font-bold tabular-nums ${isCredit ? "text-emerald-400" : "text-red-400"}`}>
                      {isCredit ? "+" : "-"}{formatInr(tx.inr)}
                    </p>
                  )}
                  {tx.grams != null && (
                    <p className="text-[11px] text-zinc-500 tabular-nums">{tx.grams.toFixed(4)} g</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
