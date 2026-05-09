"use client";

import { useState } from "react";
import type { Metal } from "@/context/GoldDemoProvider";
import { useGoldDemo } from "@/context/GoldDemoProvider";

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function PlanPage() {
  const {
    sip,
    setSip,
    nextSipLabel,
    giftMetalGrams,
    createRedeemOrder,
    orders,
    markOrderStatus,
    balanceGrams,
    balanceSilverGrams,
  } = useGoldDemo();

  const [activeTab, setActiveTab] = useState<"sip" | "gift" | "delivery">("sip");

  // Gift form
  const [giftMetal, setGiftMetal] = useState<Metal>("gold");
  const [giftGrams, setGiftGrams] = useState("0.25");
  const [giftTo, setGiftTo] = useState("");
  const [giftMsg, setGiftMsg] = useState<string | null>(null);
  const [giftSuccess, setGiftSuccess] = useState(false);

  // Delivery form
  const [rm, setRm] = useState<Metal>("gold");
  const [rGrams, setRGrams] = useState("1");
  const [rProduct, setRProduct] = useState("1 g 24K Coin");
  const [rLine, setRLine] = useState("");
  const [rCity, setRCity] = useState("");
  const [rPin, setRPin] = useState("");
  const [rMsg, setRMsg] = useState<string | null>(null);
  const [rSuccess, setRSuccess] = useState(false);

  return (
    <div className="page-enter px-5 py-4 pb-6 flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold text-white">Invest & Manage</h1>
        <p className="text-[12px] text-zinc-500 mt-0.5">SIP, gifts & physical delivery</p>
      </div>

      {/* Tab Selector */}
      <div className="flex rounded-2xl bg-white/[0.04] p-1 border border-white/[0.06]">
        {([
          { key: "sip", label: "Auto SIP" },
          { key: "gift", label: "Gift" },
          { key: "delivery", label: "Delivery" },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-2.5 rounded-[14px] text-[13px] font-semibold transition-all ${
              activeTab === key
                ? "bg-[var(--gold-primary)] text-black shadow-lg shadow-[var(--gold-primary)]/20"
                : "text-zinc-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* SIP Tab */}
      {activeTab === "sip" && (
        <div className="flex flex-col gap-4">
          {/* SIP Status Card */}
          <div className="card p-5 relative overflow-hidden">
            <div className="absolute inset-0 shimmer-gold" />
            <div className="relative flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  sip.active
                    ? "bg-emerald-500/15 border border-emerald-500/20"
                    : "bg-zinc-800 border border-zinc-700"
                }`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={sip.active ? "#22c55e" : "#71717a"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                  </svg>
                </div>
                <div>
                  <p className="text-[16px] font-bold text-white">Auto SIP</p>
                  <p className={`text-[12px] font-semibold mt-0.5 ${sip.active ? "text-emerald-400" : "text-zinc-500"}`}>
                    {sip.active ? "Active" : "Paused"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSip({ active: !sip.active })}
                className={`relative w-[52px] h-[30px] rounded-full transition-all duration-300 ${
                  sip.active ? "bg-emerald-500" : "bg-zinc-700"
                }`}
              >
                <div className={`absolute top-[3px] w-[24px] h-[24px] rounded-full bg-white shadow-md transition-all duration-300 ${
                  sip.active ? "left-[25px]" : "left-[3px]"
                }`} />
              </button>
            </div>

            {sip.active && (
              <p className="text-[11px] text-zinc-500 mb-4">{nextSipLabel.replace(' (demo)', '')}</p>
            )}

            {/* Amount */}
            <div className="mb-4">
              <label className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                Amount per cycle
              </label>
              <div className="flex gap-2 flex-wrap">
                {[500, 1000, 2500, 5000, 10000].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSip({ amountInr: n })}
                    className={`chip active:scale-95 transition-transform ${
                      sip.amountInr === n ? "chip-active" : "chip-inactive"
                    }`}
                  >
                    {formatInr(n)}
                  </button>
                ))}
              </div>
            </div>

            {/* Frequency */}
            <div className="mb-4">
              <label className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                Frequency
              </label>
              <div className="flex gap-2">
                {(["daily", "weekly", "monthly"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setSip({ frequency: f })}
                    className={`chip flex-1 justify-center active:scale-95 transition-transform ${
                      sip.frequency === f ? "chip-active" : "chip-inactive"
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Metal */}
            <div>
              <label className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                Metal
              </label>
              <div className="flex gap-2">
                {(["gold", "silver"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSip({ metal: m })}
                    className={`chip flex-1 justify-center active:scale-95 transition-transform ${
                      sip.metal === m ? "chip-active" : "chip-inactive"
                    }`}
                  >
                    {m === "gold" ? "Gold 24K" : "Silver 999"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gift Tab */}
      {activeTab === "gift" && (
        <div className="flex flex-col gap-4">
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/15 border border-pink-500/20 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" />
                  <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                </svg>
              </div>
              <div>
                <p className="text-[16px] font-bold text-white">Send Gold as Gift</p>
                <p className="text-[12px] text-zinc-500 mt-0.5">Share the joy of gold with loved ones</p>
              </div>
            </div>

            <div className="flex gap-2 mb-3">
              {(["gold", "silver"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setGiftMetal(m)}
                  className={`chip flex-1 justify-center active:scale-95 transition-transform ${
                    giftMetal === m ? "chip-active" : "chip-inactive"
                  }`}
                >
                  {m === "gold" ? "Gold" : "Silver"}
                </button>
              ))}
            </div>

            <input
              className="input-field mb-3"
              placeholder="Recipient name or phone number"
              value={giftTo}
              onChange={(e) => setGiftTo(e.target.value)}
            />
            <input
              inputMode="decimal"
              className="input-field mb-3"
              placeholder="Grams to gift"
              value={giftGrams}
              onChange={(e) => setGiftGrams(e.target.value)}
            />

            <p className="text-[11px] text-zinc-500 mb-3">
              Available: <span className="text-zinc-300 font-semibold">{giftMetal === "gold" ? balanceGrams.toFixed(4) : balanceSilverGrams.toFixed(2)} g</span>
            </p>

            {giftMsg && (
              <div className={`rounded-xl px-3 py-2 text-[12px] font-medium mb-3 ${
                giftSuccess ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
              }`}>
                {giftMsg}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setGiftMsg(null);
                setGiftSuccess(false);
                const g = Number(giftGrams);
                const r = giftMetalGrams(giftMetal, g, giftTo);
                if (r.ok) {
                  setGiftMsg("Gift sent successfully!");
                  setGiftSuccess(true);
                  setGiftTo("");
                  setGiftGrams("0.25");
                } else {
                  setGiftMsg(r.reason);
                }
              }}
              className="w-full btn-gold text-center"
            >
              Send Gift
            </button>
          </div>
        </div>
      )}

      {/* Delivery Tab */}
      {activeTab === "delivery" && (
        <div className="flex flex-col gap-4">
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
              <div>
                <p className="text-[16px] font-bold text-white">Physical Delivery</p>
                <p className="text-[12px] text-zinc-500 mt-0.5">Get gold/silver delivered to your doorstep</p>
              </div>
            </div>

            <div className="flex gap-2 mb-3">
              {(["gold", "silver"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setRm(m)}
                  className={`chip flex-1 justify-center active:scale-95 transition-transform ${
                    rm === m ? "chip-active" : "chip-inactive"
                  }`}
                >
                  {m === "gold" ? "Gold" : "Silver"}
                </button>
              ))}
            </div>

            <input
              inputMode="decimal"
              className="input-field mb-3"
              placeholder="Grams to redeem"
              value={rGrams}
              onChange={(e) => setRGrams(e.target.value)}
            />
            <input
              className="input-field mb-3"
              placeholder="Product (e.g. 1g Coin, 5g Bar)"
              value={rProduct}
              onChange={(e) => setRProduct(e.target.value)}
            />
            <input
              className="input-field mb-3"
              placeholder="Delivery address"
              value={rLine}
              onChange={(e) => setRLine(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                className="input-field"
                placeholder="City"
                value={rCity}
                onChange={(e) => setRCity(e.target.value)}
              />
              <input
                inputMode="numeric"
                className="input-field"
                placeholder="PIN Code"
                maxLength={6}
                value={rPin}
                onChange={(e) => setRPin(e.target.value)}
              />
            </div>

            <p className="text-[11px] text-zinc-500 mb-3">
              Available: Gold <span className="text-zinc-300 font-semibold">{balanceGrams.toFixed(3)} g</span> · Silver <span className="text-zinc-300 font-semibold">{balanceSilverGrams.toFixed(2)} g</span>
            </p>

            {rMsg && (
              <div className={`rounded-xl px-3 py-2 text-[12px] font-medium mb-3 ${
                rSuccess ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
              }`}>
                {rMsg}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setRMsg(null);
                setRSuccess(false);
                const r = createRedeemOrder({
                  metal: rm,
                  grams: Number(rGrams),
                  productLabel: rProduct,
                  addressLine: rLine,
                  city: rCity,
                  pin: rPin,
                });
                if (r.ok) {
                  setRMsg("Order placed successfully!");
                  setRSuccess(true);
                  setRLine("");
                  setRCity("");
                  setRPin("");
                } else {
                  setRMsg(r.reason);
                }
              }}
              className="w-full btn-gold text-center"
            >
              Place Order
            </button>
          </div>

          {/* Orders List */}
          {orders.length > 0 && (
            <div>
              <h3 className="text-[15px] font-bold text-white mb-3">My Orders</h3>
              <div className="flex flex-col gap-2">
                {orders.map((o) => {
                  const statusColor =
                    o.status === "delivered" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
                    o.status === "shipped" ? "text-blue-400 bg-blue-500/10 border-blue-500/20" :
                    "text-amber-400 bg-amber-500/10 border-amber-500/20";
                  return (
                    <div key={o.id} className="card p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[14px] font-semibold text-white">{o.productLabel}</p>
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${statusColor} capitalize`}>
                          {o.status}
                        </span>
                      </div>
                      <p className="text-[12px] text-zinc-400">{o.grams} g {o.metal} · {o.addressLine}, {o.city} {o.pin}</p>
                      <div className="flex gap-2 mt-3">
                        {(["processing", "shipped", "delivered"] as const).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => markOrderStatus(o.id, s)}
                            className={`text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all active:scale-95 ${
                              o.status === s
                                ? "bg-white/10 text-white border border-white/15"
                                : "bg-white/[0.03] text-zinc-500 border border-white/[0.06]"
                            }`}
                          >
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
