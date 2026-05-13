"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useGoldDemo } from "@/context/GoldDemoProvider";
import { useAuth } from "@/context/AuthContext";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export type ProductCategory = "gold_coin" | "gold_biscuit" | "silver_coin" | "silver_biscuit";

export interface ShopProduct {
  id: string;
  name: string;
  category: ProductCategory;
  weightGrams: number;
  priceInr: number;
  purity: string;
  description: string;
  inStock: boolean;
}

const CAT_META: Record<ProductCategory, { label: string; icon: string; color: string; border: string; bg: string }> = {
  gold_coin:      { label: "Gold Coins",      icon: "🥇", color: "text-[#b8860b]", border: "border-[#e8c84a]", bg: "bg-[#fdf3d0]" },
  gold_biscuit:   { label: "Gold Biscuits",   icon: "🏅", color: "text-[#b8860b]", border: "border-[#e8c84a]", bg: "bg-[#fdf3d0]" },
  silver_coin:    { label: "Silver Coins",    icon: "🥈", color: "text-[#5a5a5a]", border: "border-[#d0d0d0]", bg: "bg-[#f5f5f5]" },
  silver_biscuit: { label: "Silver Biscuits", icon: "🔲", color: "text-[#5a5a5a]", border: "border-[#d0d0d0]", bg: "bg-[#f5f5f5]" },
};

const CATS = Object.keys(CAT_META) as ProductCategory[];

export default function ShopPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { walletInr, buyMetalInr, pricePerGramInr, priceSilverPerGramInr, profile } = useGoldDemo();

  const [products, setProducts]     = useState<ShopProduct[]>([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState<ProductCategory>("gold_coin");

  // Order modal state
  const [orderProduct, setOrderProduct] = useState<ShopProduct | null>(null);
  const [addrLine1, setAddrLine1]   = useState("");
  const [addrLine2, setAddrLine2]   = useState("");
  const [addrCity, setAddrCity]     = useState("");
  const [addrState, setAddrState]   = useState("");
  const [addrPin, setAddrPin]       = useState("");
  const [cardName, setCardName]     = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv]       = useState("");
  const [payMode, setPayMode]       = useState<"card" | "wallet">("wallet");
  const [placing, setPlacing]       = useState(false);
  const [orderDone, setOrderDone]   = useState(false);
  const [orderErr, setOrderErr]     = useState("");

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "shop_products"),
      (snap) => { setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as ShopProduct))); setLoading(false); },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  // Pre-fill address from profile
  function openOrder(product: ShopProduct) {
    if (!user) { router.push("/login"); return; }
    setOrderProduct(product);
    setAddrLine1(profile.address.line1 || "");
    setAddrLine2(profile.address.line2 || "");
    setAddrCity(profile.address.city   || "");
    setAddrState(profile.address.state || "");
    setAddrPin(profile.address.pincode || "");
    setCardName(""); setCardNumber(""); setCardExpiry(""); setCardCvv("");
    setPayMode("wallet");
    setOrderDone(false);
    setOrderErr("");
  }

  function closeOrder() { setOrderProduct(null); setOrderDone(false); setOrderErr(""); }

  async function placeOrder() {
    if (!orderProduct) return;
    // Validate address
    if (!addrLine1.trim()) { setOrderErr("Enter delivery address line 1."); return; }
    if (!addrCity.trim())  { setOrderErr("Enter city."); return; }
    if (!/^\d{6}$/.test(addrPin)) { setOrderErr("Enter valid 6-digit PIN code."); return; }
    // Validate payment
    if (payMode === "card") {
      if (!cardName.trim())                    { setOrderErr("Enter cardholder name."); return; }
      if (cardNumber.replace(/\s/g,"").length < 16) { setOrderErr("Enter valid 16-digit card number."); return; }
      if (!cardExpiry.trim())                  { setOrderErr("Enter card expiry (MM/YY)."); return; }
      if (cardCvv.length < 3)                  { setOrderErr("Enter valid CVV."); return; }
    }
    if (payMode === "wallet" && walletInr < orderProduct.priceInr) {
      setOrderErr("Insufficient wallet balance."); return;
    }
    setOrderErr("");
    setPlacing(true);
    const metal = orderProduct.category.startsWith("gold") ? "gold" : "silver";
    const r = buyMetalInr(metal, orderProduct.priceInr);
    window.setTimeout(async () => {
      setPlacing(false);
      if (!r.ok) {
        setOrderErr(r.reason);
        return;
      }

      try {
        await addDoc(collection(db, "orders"), {
          userId: user?.phone || profile.phone,
          userName: user?.name || profile.displayName || "Customer",
          phone: user?.phone || profile.phone,
          metal,
          productId: orderProduct.id,
          productLabel: orderProduct.name,
          category: orderProduct.category,
          grams: orderProduct.weightGrams,
          purity: orderProduct.purity,
          priceInr: orderProduct.priceInr,
          paymentMode: payMode,
          status: "processing",
          addressLine: [addrLine1.trim(), addrLine2.trim()].filter(Boolean).join(", "),
          city: addrCity.trim(),
          state: addrState.trim(),
          pin: addrPin,
          createdAt: serverTimestamp(),
        });
        setOrderDone(true);
      } catch {
        setOrderErr("Order payment done, but admin order save failed. Check Firestore permissions.");
      }
    }, 600);
  }

  const filtered = products.filter(p => p.category === activeTab && p.inStock);

  return (
    <div className="page-enter flex flex-col gap-0 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#7b1c1c] to-[#b8860b] px-4 pt-4 pb-5">
        <h1 className="text-[22px] font-extrabold text-white">Gold & Silver Shop</h1>
        <p className="text-[12px] text-white/60 mt-0.5">Coins · Biscuits · Certified purity</p>
        <div className="mt-3 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <span className="text-[12px] font-semibold text-white/70">Wallet Balance</span>
          <span className="text-[15px] font-extrabold text-[#F5C842]">{fmt(walletInr)}</span>
        </div>
      </div>

      {/* Category tabs */}
      <div className="bg-white border-b border-[#ede0c4] flex overflow-x-auto shrink-0">
        {CATS.map(cat => (
          <button key={cat} type="button" onClick={() => setActiveTab(cat)}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-3 text-[12px] font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === cat ? "border-[#b8860b] text-[#b8860b]" : "border-transparent text-[#9a8060]"
            }`}>
            {CAT_META[cat].icon} {CAT_META[cat].label}
          </button>
        ))}
      </div>

      <div className="px-4 mt-4 flex flex-col gap-3">
        {/* Live price strip */}
        <div className="flex gap-2">
          <div className="flex-1 bg-[#fdf3d0] border border-[#e8c84a] rounded-xl px-3 py-2 flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#9a8060] uppercase">🥇 Gold/g</span>
            <span className="text-[13px] font-extrabold text-[#b8860b]">₹{pricePerGramInr.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex-1 bg-[#f5f5f5] border border-[#d0d0d0] rounded-xl px-3 py-2 flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#9a8060] uppercase">🥈 Silver/g</span>
            <span className="text-[13px] font-extrabold text-[#5a5a5a]">₹{priceSilverPerGramInr.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <svg className="spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b8860b" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10"/>
            </svg>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="card p-8 flex flex-col items-center gap-3 text-center">
            <span className="text-[44px]">{CAT_META[activeTab].icon}</span>
            <p className="text-[14px] font-bold text-[#1c1208]">{CAT_META[activeTab].label}</p>
            <p className="text-[12px] text-[#9a8060]">No products available yet.</p>
          </div>
        )}

        {!loading && filtered.map(product => {
          const m = CAT_META[product.category];
          const isGold = product.category.startsWith("gold");
          return (
            <div key={product.id} className={`card p-4 border-2 ${m.border}`}>
              <div className="flex items-start gap-3">
                <div className={`w-14 h-14 rounded-2xl ${m.bg} border ${m.border} flex items-center justify-center shrink-0`}>
                  <span className="text-[30px]">{m.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-extrabold text-[#1c1208] leading-tight">{product.name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.bg} ${m.color} border ${m.border}`}>{product.weightGrams}g</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.bg} ${m.color} border ${m.border}`}>{product.purity}</span>
                  </div>
                  {product.description ? <p className="text-[11px] text-[#9a8060] mt-1.5">{product.description}</p> : null}
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#f0e8d8]">
                <div>
                  <p className="text-[10px] text-[#9a8060] uppercase tracking-wider">Price</p>
                  <p className={`text-[22px] font-extrabold tabular-nums ${isGold ? "text-[#b8860b]" : "text-[#5a5a5a]"}`}>{fmt(product.priceInr)}</p>
                  <p className="text-[10px] text-[#9a8060] mt-0.5">{product.weightGrams}g · {product.purity}</p>
                </div>
                <button type="button" onClick={() => openOrder(product)}
                  className={`px-5 py-3 rounded-2xl text-[13px] font-extrabold active:scale-95 transition-all shadow-sm ${
                    isGold ? "bg-gradient-to-r from-[#d4a017] to-[#b8860b] text-white" : "bg-gradient-to-r from-[#5a5a5a] to-[#3a3a3a] text-white"
                  }`}>
                  Buy Now
                </button>
              </div>
            </div>
          );
        })}

        {!loading && <div className="card p-3 flex items-center gap-3 bg-[#f0fdf4] border-[#bbf7d0]">
          <span className="text-[20px]">🔒</span>
          <p className="text-[11px] text-emerald-700 font-semibold">MMTC-PAMP certified · BIS Hallmarked · Insured delivery</p>
        </div>}
      </div>

      {/* ── Order Modal ── */}
      {orderProduct && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#f7f3ec] overflow-y-auto">
          {/* Modal header */}
          <div className="bg-gradient-to-r from-[#7b1c1c] to-[#b8860b] px-4 pt-10 pb-4 flex items-center gap-3 shrink-0">
            <button type="button" onClick={closeOrder}
              className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center active:scale-90 transition-transform shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M15 19l-7-7 7-7"/></svg>
            </button>
            <div>
              <p className="text-[16px] font-extrabold text-white">Place Order</p>
              <p className="text-[11px] text-white/60">{orderProduct.name} · {fmt(orderProduct.priceInr)}</p>
            </div>
          </div>

          <div className="px-4 py-4 flex flex-col gap-4 pb-10">

            {/* Order success */}
            {orderDone ? (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <div className="w-20 h-20 rounded-full bg-[#dcfce7] flex items-center justify-center">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
                <p className="text-[20px] font-extrabold text-[#15803d]">Order Placed!</p>
                <p className="text-[13px] text-[#9a8060]">{orderProduct.name} will be delivered to<br/><span className="font-bold text-[#1c1208]">{addrLine1}, {addrCity} – {addrPin}</span></p>
                <button type="button" onClick={closeOrder}
                  className="mt-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-[#7b1c1c] to-[#b8860b] text-white text-[14px] font-bold active:scale-95 transition-transform">
                  Done
                </button>
              </div>
            ) : (
              <>
                {/* Product summary */}
                <div className={`card p-4 flex items-center gap-3 border-2 ${CAT_META[orderProduct.category].border}`}>
                  <span className="text-[32px]">{CAT_META[orderProduct.category].icon}</span>
                  <div className="flex-1">
                    <p className="text-[14px] font-extrabold text-[#1c1208]">{orderProduct.name}</p>
                    <p className="text-[12px] text-[#9a8060]">{orderProduct.weightGrams}g · {orderProduct.purity}</p>
                  </div>
                  <p className={`text-[18px] font-extrabold ${orderProduct.category.startsWith("gold") ? "text-[#b8860b]" : "text-[#5a5a5a]"}`}>
                    {fmt(orderProduct.priceInr)}
                  </p>
                </div>

                {/* Delivery Address */}
                <div className="card p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[18px]">📦</span>
                    <p className="text-[14px] font-bold text-[#1c1208]">Delivery Address</p>
                    {profile.address.line1 && (
                      <button type="button" onClick={() => { setAddrLine1(profile.address.line1); setAddrLine2(profile.address.line2); setAddrCity(profile.address.city); setAddrState(profile.address.state); setAddrPin(profile.address.pincode); }}
                        className="ml-auto text-[11px] font-bold text-[#b8860b] px-2 py-1 rounded-lg bg-[#fdf3d0] border border-[#e8c84a] active:scale-95">
                        Use Saved
                      </button>
                    )}
                  </div>
                  <input className="input-field" placeholder="Address Line 1 *" value={addrLine1} onChange={e => setAddrLine1(e.target.value)} />
                  <input className="input-field" placeholder="Address Line 2 (optional)" value={addrLine2} onChange={e => setAddrLine2(e.target.value)} />
                  <div className="grid grid-cols-2 gap-3">
                    <input className="input-field" placeholder="City *" value={addrCity} onChange={e => setAddrCity(e.target.value)} />
                    <input className="input-field" placeholder="State" value={addrState} onChange={e => setAddrState(e.target.value)} />
                  </div>
                  <input className="input-field" placeholder="PIN Code * (6 digits)" inputMode="numeric" maxLength={6} value={addrPin} onChange={e => setAddrPin(e.target.value.replace(/\D/g, ""))} />
                </div>

                {/* Payment Method */}
                <div className="card p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[18px]">💳</span>
                    <p className="text-[14px] font-bold text-[#1c1208]">Payment Method</p>
                  </div>

                  {/* Pay mode toggle */}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setPayMode("wallet")}
                      className={`flex-1 py-3 rounded-xl text-[13px] font-bold border transition-all active:scale-95 ${payMode === "wallet" ? "bg-[#fdf3d0] text-[#b8860b] border-[#e8c84a]" : "bg-[#f5f0e8] text-[#9a8060] border-[#e8e0d0]"}`}>
                      💰 Wallet
                      <p className="text-[10px] font-normal mt-0.5">{fmt(walletInr)}</p>
                    </button>
                    <button type="button" onClick={() => setPayMode("card")}
                      className={`flex-1 py-3 rounded-xl text-[13px] font-bold border transition-all active:scale-95 ${payMode === "card" ? "bg-[#fdf3d0] text-[#b8860b] border-[#e8c84a]" : "bg-[#f5f0e8] text-[#9a8060] border-[#e8e0d0]"}`}>
                      💳 Card
                      <p className="text-[10px] font-normal mt-0.5">Debit / Credit</p>
                    </button>
                  </div>

                  {/* Wallet info */}
                  {payMode === "wallet" && (
                    <div className={`rounded-xl px-4 py-3 flex items-center justify-between ${walletInr >= orderProduct.priceInr ? "bg-[#f0fdf4] border border-[#bbf7d0]" : "bg-[#fee2e2] border border-[#fecaca]"}`}>
                      <p className="text-[12px] font-semibold text-[#1c1208]">Wallet Balance</p>
                      <p className={`text-[14px] font-extrabold ${walletInr >= orderProduct.priceInr ? "text-[#15803d]" : "text-[#b91c1c]"}`}>{fmt(walletInr)}</p>
                    </div>
                  )}

                  {/* Card fields */}
                  {payMode === "card" && (
                    <div className="flex flex-col gap-3">
                      <input className="input-field" placeholder="Cardholder Name *" value={cardName} onChange={e => setCardName(e.target.value)} />
                      <input className="input-field" placeholder="Card Number * (16 digits)" inputMode="numeric" maxLength={19}
                        value={cardNumber}
                        onChange={e => {
                          const v = e.target.value.replace(/\D/g, "").slice(0, 16);
                          setCardNumber(v.replace(/(.{4})/g, "$1 ").trim());
                        }} />
                      <div className="grid grid-cols-2 gap-3">
                        <input className="input-field" placeholder="Expiry MM/YY *" maxLength={5}
                          value={cardExpiry}
                          onChange={e => {
                            const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                            setCardExpiry(v.length > 2 ? v.slice(0,2) + "/" + v.slice(2) : v);
                          }} />
                        <input className="input-field" placeholder="CVV *" inputMode="numeric" maxLength={3} type="password"
                          value={cardCvv} onChange={e => setCardCvv(e.target.value.replace(/\D/g, ""))} />
                      </div>
                      <div className="flex items-center gap-2 bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl px-3 py-2">
                        <span className="text-[14px]">🔒</span>
                        <p className="text-[11px] text-emerald-700 font-semibold">256-bit SSL encrypted · Secure payment</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Error */}
                {orderErr && (
                  <div className="bg-[#fee2e2] border border-[#fecaca] rounded-xl px-4 py-3">
                    <p className="text-[13px] font-semibold text-[#b91c1c]">{orderErr}</p>
                  </div>
                )}

                {/* Order summary */}
                <div className="bg-[#fdf3d0] border border-[#e8c84a] rounded-2xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider">Total Amount</p>
                    <p className="text-[22px] font-extrabold text-[#b8860b]">{fmt(orderProduct.priceInr)}</p>
                  </div>
                  <span className="text-[28px]">{CAT_META[orderProduct.category].icon}</span>
                </div>

                {/* Place order button */}
                <button type="button" onClick={placeOrder} disabled={placing}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#7b1c1c] to-[#b8860b] text-white text-[15px] font-extrabold active:scale-95 transition-transform disabled:opacity-60 shadow-lg">
                  {placing ? "Placing Order..." : "✓ Confirm & Place Order"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
