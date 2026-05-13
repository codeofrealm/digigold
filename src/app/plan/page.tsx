"use client";
import { useState } from "react";
import type { Metal } from "@/context/GoldDemoProvider";
import { useGoldDemo } from "@/context/GoldDemoProvider";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

type Tab = "sip" | "gift" | "delivery";

export default function PlanPage() {
  const { sip, setSip, nextSipLabel, giftMetalGrams, createRedeemOrder, orders, markOrderStatus, balanceGrams, balanceSilverGrams } = useGoldDemo();
  const [tab, setTab] = useState<Tab>("sip");

  // Gift
  const [gMetal, setGMetal] = useState<Metal>("gold");
  const [gGrams, setGGrams] = useState("0.25");
  const [gTo, setGTo] = useState("");
  const [gMsg, setGMsg] = useState<string | null>(null);
  const [gOk, setGOk] = useState(false);

  // Delivery
  const [dMetal, setDMetal] = useState<Metal>("gold");
  const [dGrams, setDGrams] = useState("1");
  const [dProduct, setDProduct] = useState("1g 24K Coin");
  const [dLine, setDLine] = useState("");
  const [dCity, setDCity] = useState("");
  const [dPin, setDPin] = useState("");
  const [dMsg, setDMsg] = useState<string | null>(null);
  const [dOk, setDOk] = useState(false);

  const TABS: { key: Tab; label: string }[] = [
    { key: "sip", label: "Auto SIP" },
    { key: "gift", label: "Gift" },
    { key: "delivery", label: "Delivery" },
  ];

  return (
    <div className="page-enter flex flex-col gap-0 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#7b1c1c] to-[#b8860b] px-4 pt-4 pb-5">
        <h1 className="text-[22px] font-extrabold text-white">Invest & Manage</h1>
        <p className="text-[12px] text-white/60 mt-0.5">SIP · Gift · Physical Delivery</p>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-[#ede0c4] flex px-4 gap-1">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-[13px] font-bold border-b-2 transition-all ${
              tab === t.key ? "border-[#b8860b] text-[#b8860b]" : "border-transparent text-[#9a8060]"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 flex flex-col gap-4 mt-4">

        {/* ── SIP ── */}
        {tab === "sip" && (
          <div className="card p-5 relative overflow-hidden">
            <div className="absolute inset-0 shimmer" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${sip.active ? "bg-[#dcfce7] border-[#bbf7d0]" : "bg-[#f5f0e8] border-[#e8e0d0]"}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={sip.active ? "#15803d" : "#9a8060"} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  </div>
                  <div>
                    <p className="text-[16px] font-bold text-[#1c1208]">Auto SIP</p>
                    <p className={`text-[12px] font-semibold mt-0.5 ${sip.active ? "text-[#15803d]" : "text-[#9a8060]"}`}>
                      {sip.active ? "Active" : "Paused"}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => setSip({ active: !sip.active })}
                  className={`toggle-track ${sip.active ? "bg-[#15803d]" : "bg-[#d0c8b8]"}`}>
                  <div className={`toggle-thumb ${sip.active ? "left-[25px]" : "left-[3px]"}`} />
                </button>
              </div>

              {sip.active && <p className="text-[11px] text-[#9a8060] mb-4">{nextSipLabel.replace(" (demo)", "")}</p>}

              <div className="mb-4">
                <label className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider block mb-2">Amount per cycle</label>
                <div className="flex gap-2 flex-wrap">
                  {[500, 1000, 2500, 5000, 10000].map((n) => (
                    <button key={n} type="button" onClick={() => setSip({ amountInr: n })}
                      className={`chip ${sip.amountInr === n ? "chip-on" : "chip-off"} active:scale-95 transition-transform`}>
                      {fmt(n)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider block mb-2">Frequency</label>
                <div className="flex gap-2">
                  {(["daily", "weekly", "monthly"] as const).map((f) => (
                    <button key={f} type="button" onClick={() => setSip({ frequency: f })}
                      className={`chip flex-1 ${sip.frequency === f ? "chip-on" : "chip-off"} active:scale-95 transition-transform`}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider block mb-2">Metal</label>
                <div className="flex gap-2">
                  {(["gold", "silver"] as const).map((m) => (
                    <button key={m} type="button" onClick={() => setSip({ metal: m })}
                      className={`chip flex-1 ${sip.metal === m ? "chip-on" : "chip-off"} active:scale-95 transition-transform`}>
                      {m === "gold" ? "🥇 Gold 24K" : "🥈 Silver 999"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── GIFT ── */}
        {tab === "gift" && (
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#fce7f3] border border-[#fbcfe8] flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#be185d" strokeWidth="2" strokeLinecap="round">
                  <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/>
                  <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
                </svg>
              </div>
              <div>
                <p className="text-[16px] font-bold text-[#1c1208]">Send Gold as Gift</p>
                <p className="text-[12px] text-[#9a8060] mt-0.5">Share the joy of gold</p>
              </div>
            </div>

            <div className="flex gap-2 mb-3">
              {(["gold", "silver"] as const).map((m) => (
                <button key={m} type="button" onClick={() => setGMetal(m)}
                  className={`chip flex-1 ${gMetal === m ? "chip-on" : "chip-off"} active:scale-95 transition-transform`}>
                  {m === "gold" ? "Gold" : "Silver"}
                </button>
              ))}
            </div>

            <input className="input-field mb-3" placeholder="Recipient name or phone" value={gTo} onChange={(e) => setGTo(e.target.value)} />
            <input className="input-field mb-2" inputMode="decimal" placeholder="Grams to gift" value={gGrams} onChange={(e) => setGGrams(e.target.value)} />
            <p className="text-[11px] text-[#9a8060] mb-3">
              Available: <span className="font-bold text-[#5a4a2a]">{gMetal === "gold" ? balanceGrams.toFixed(4) : balanceSilverGrams.toFixed(2)} g</span>
            </p>

            {gMsg && <div className={`rounded-xl px-3 py-2 text-[12px] font-semibold mb-3 ${gOk ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#fee2e2] text-[#b91c1c]"}`}>{gMsg}</div>}

            <button type="button" className="btn-gold w-full" onClick={() => {
              const r = giftMetalGrams(gMetal, Number(gGrams), gTo);
              if (r.ok) { setGMsg("Gift sent successfully! 🎁"); setGOk(true); setGTo(""); setGGrams("0.25"); }
              else { setGMsg(r.reason); setGOk(false); }
            }}>Send Gift</button>
          </div>
        )}

        {/* ── DELIVERY ── */}
        {tab === "delivery" && (
          <>
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-[#fdf3d0] border border-[#e8c84a] flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#b8860b" strokeWidth="2" strokeLinecap="round">
                    <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                    <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[16px] font-bold text-[#1c1208]">Physical Delivery</p>
                  <p className="text-[12px] text-[#9a8060] mt-0.5">Get gold delivered to your door</p>
                </div>
              </div>

              <div className="flex gap-2 mb-3">
                {(["gold", "silver"] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setDMetal(m)}
                    className={`chip flex-1 ${dMetal === m ? "chip-on" : "chip-off"} active:scale-95 transition-transform`}>
                    {m === "gold" ? "Gold" : "Silver"}
                  </button>
                ))}
              </div>

              <input className="input-field mb-3" inputMode="decimal" placeholder="Grams to redeem" value={dGrams} onChange={(e) => setDGrams(e.target.value)} />
              <input className="input-field mb-3" placeholder="Product (e.g. 1g Coin, 5g Bar)" value={dProduct} onChange={(e) => setDProduct(e.target.value)} />
              <input className="input-field mb-3" placeholder="Delivery address" value={dLine} onChange={(e) => setDLine(e.target.value)} />
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input className="input-field" placeholder="City" value={dCity} onChange={(e) => setDCity(e.target.value)} />
                <input className="input-field" inputMode="numeric" placeholder="PIN Code" maxLength={6} value={dPin} onChange={(e) => setDPin(e.target.value)} />
              </div>
              <p className="text-[11px] text-[#9a8060] mb-3">
                Gold: <span className="font-bold text-[#5a4a2a]">{balanceGrams.toFixed(3)}g</span> · Silver: <span className="font-bold text-[#5a4a2a]">{balanceSilverGrams.toFixed(2)}g</span>
              </p>

              {dMsg && <div className={`rounded-xl px-3 py-2 text-[12px] font-semibold mb-3 ${dOk ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#fee2e2] text-[#b91c1c]"}`}>{dMsg}</div>}

              <button type="button" className="btn-gold w-full" onClick={() => {
                const r = createRedeemOrder({ metal: dMetal, grams: Number(dGrams), productLabel: dProduct, addressLine: dLine, city: dCity, pin: dPin });
                if (r.ok) { setDMsg("Order placed! 📦"); setDOk(true); setDLine(""); setDCity(""); setDPin(""); }
                else { setDMsg(r.reason); setDOk(false); }
              }}>Place Order</button>
            </div>

            {orders.length > 0 && (
              <div>
                <p className="text-[14px] font-bold text-[#1c1208] mb-2">My Orders</p>
                <div className="flex flex-col gap-2">
                  {orders.map((o) => (
                    <div key={o.id} className="card p-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[14px] font-semibold text-[#1c1208]">{o.productLabel}</p>
                        <span className={o.status === "delivered" ? "badge-green" : o.status === "shipped" ? "badge-blue" : "badge-amber"}>
                          {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#9a8060] mb-3">{o.grams}g {o.metal} · {o.addressLine}, {o.city}</p>
                      <div className="flex gap-2">
                        {(["processing", "shipped", "delivered"] as const).map((s) => (
                          <button key={s} type="button" onClick={() => markOrderStatus(o.id, s)}
                            className={`flex-1 py-2 rounded-xl text-[11px] font-semibold border transition-all active:scale-95 ${
                              o.status === s ? "bg-[#fdf3d0] text-[#b8860b] border-[#e8c84a]" : "bg-[#f5f0e8] text-[#9a8060] border-[#e8e0d0]"
                            }`}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
