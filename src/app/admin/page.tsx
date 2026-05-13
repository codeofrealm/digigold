"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { doc, setDoc, onSnapshot, serverTimestamp, collection, addDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function formatInrExact(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

interface Transaction {
  id: string;
  type: string;
  metal: "gold" | "silver";
  at: string;
  inr: number;
  grams: number;
  note?: string;
}

interface UserOrder {
  id: string;
  createdAt: string;
  metal: "gold" | "silver";
  grams: number;
  productLabel: string;
  status: "processing" | "shipped" | "delivered" | string;
  addressLine: string;
  city: string;
  pin: string;
}

interface AdminOrder extends UserOrder {
  userId: string;
  userName: string;
  phone: string;
  source: "shop" | "delivery";
  hasOrderDoc?: boolean;
  localOrderId?: string;
  priceInr?: number;
  paymentMode?: string;
  state?: string;
  purity?: string;
}

interface User {
  id: string;
  name: string;
  phone: string;
  kyc: string;
  gold: number;
  silver: number;
  wallet: number;
  joined: string;
  transactions: Transaction[];
  orders: UserOrder[];
}

const TABS = ["Dashboard", "Transactions", "Users", "Orders", "Prices", "Shop"] as const;
type Tab = typeof TABS[number];

export default function AdminPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Dashboard");
  const [goldPrice, setGoldPrice] = useState(0);
  const [silverPrice, setSilverPrice] = useState(0);
  const [priceKarat, setPriceKarat] = useState(24);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dbUsers, setDbUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Load real users from Firestore
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "users"),
      (snap) => {
        const list: User[] = snap.docs.map((d) => {
          const data = d.data();
          const kycMap: Record<string, string> = {
            verified: "Verified",
            pan_submitted: "PAN Submitted",
            none: "Not Verified",
          };
          const joinedAt = data.updatedAt?.toDate?.() ?? new Date();
          return {
            id: d.id,
            name: data.name || data.displayName || "Unknown",
            phone: data.phone || d.id,
            kyc: kycMap[data.kycTier] ?? "Not Verified",
            gold: typeof data.balanceGrams === "number" ? data.balanceGrams : 0,
            silver: typeof data.balanceSilverGrams === "number" ? data.balanceSilverGrams : 0,
            wallet: typeof data.walletInr === "number" ? data.walletInr : 0,
            joined: joinedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
            transactions: Array.isArray(data.transactions) ? data.transactions : [],
            orders: Array.isArray(data.orders) ? data.orders : [],
          };
        });
        setDbUsers(list);
        setUsersLoading(false);
      },
      () => {
        setDbUsers([]);
        setUsersLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Price editor state
  const [inputGold, setInputGold] = useState("");
  const [inputSilver, setInputSilver] = useState("");
  const [priceSaving, setPriceSaving] = useState(false);
  const [priceSaved, setPriceSaved] = useState(false);
  const [priceSource, setPriceSource] = useState<"admin" | "api">("api");
  const [priceUpdatedAt, setPriceUpdatedAt] = useState<string | null>(null);

  // Rate card state (gold: 10g 24K, 10g 22K | silver: 10g, 50g)
  interface RateCard { gold10g24k: number; gold10g22k: number; silver10g: number; silver50g: number; }
  const [rateCard, setRateCard] = useState<RateCard>({ gold10g24k: 0, gold10g22k: 0, silver10g: 0, silver50g: 0 });
  const [rcInput, setRcInput] = useState({ gold10g24k: "", gold10g22k: "", silver10g: "", silver50g: "" });
  const [rcSaving, setRcSaving] = useState(false);
  const [rcSaved, setRcSaved] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "prices", "ratecard"), (snap) => {
      if (snap.exists()) {
        const d = snap.data() as RateCard;
        setRateCard({ gold10g24k: d.gold10g24k || 0, gold10g22k: d.gold10g22k || 0, silver10g: d.silver10g || 0, silver50g: d.silver50g || 0 });
      }
    }, () => {});
    return () => unsub();
  }, []);

  async function handleSaveRateCard() {
    const vals = {
      gold10g24k: parseFloat(rcInput.gold10g24k) || rateCard.gold10g24k,
      gold10g22k: parseFloat(rcInput.gold10g22k) || rateCard.gold10g22k,
      silver10g:  parseFloat(rcInput.silver10g)  || rateCard.silver10g,
      silver50g:  parseFloat(rcInput.silver50g)  || rateCard.silver50g,
    };
    setRcSaving(true);
    try {
      await setDoc(doc(db, "prices", "ratecard"), { ...vals, updatedAt: serverTimestamp() }, { merge: true });
      setRcInput({ gold10g24k: "", gold10g22k: "", silver10g: "", silver50g: "" });
      setRcSaved(true);
      setTimeout(() => setRcSaved(false), 3000);
    } catch (e) { console.error("Rate card save failed:", e); }
    setRcSaving(false);
  }

  // Shop products state
  type ProductCategory = "gold_coin" | "gold_biscuit" | "silver_coin" | "silver_biscuit";
  interface ShopProduct { id: string; name: string; category: ProductCategory; weightGrams: number; priceInr: number; purity: string; description: string; inStock: boolean; }
  const [shopProducts, setShopProducts] = useState<ShopProduct[]>([]);
  const [shopLoading, setShopLoading] = useState(true);
  const [shopOrders, setShopOrders] = useState<AdminOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productSaving, setProductSaving] = useState(false);
  const [newProduct, setNewProduct] = useState<Omit<ShopProduct, "id">>({ name: "", category: "gold_coin", weightGrams: 1, priceInr: 0, purity: "24K 999", description: "", inStock: true });

  const CAT_LABELS: Record<ProductCategory, string> = { gold_coin: "Gold Coin", gold_biscuit: "Gold Biscuit", silver_coin: "Silver Coin", silver_biscuit: "Silver Biscuit" };
  const CAT_ICONS: Record<ProductCategory, string> = { gold_coin: "🥇", gold_biscuit: "🏅", silver_coin: "🥈", silver_biscuit: "🔲" };

  const [editProduct, setEditProduct] = useState<ShopProduct | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  async function handleEditSave() {
    if (!editProduct || !editProduct.name.trim() || editProduct.priceInr <= 0) return;
    setEditSaving(true);
    try {
      await setDoc(doc(db, "shop_products", editProduct.id), {
        name: editProduct.name,
        category: editProduct.category,
        weightGrams: editProduct.weightGrams,
        priceInr: editProduct.priceInr,
        purity: editProduct.purity,
        description: editProduct.description,
        inStock: editProduct.inStock,
      }, { merge: true });
      setEditProduct(null);
    } catch(e) { console.error("Edit save failed:", e); }
    setEditSaving(false);
  }

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "shop_products"), (snap) => {
      setShopProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as ShopProduct)));
      setShopLoading(false);
    }, () => setShopLoading(false));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "orders"), (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        const created = data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || new Date().toISOString();
        return {
          id: d.id,
          userId: data.userId || data.phone || "unknown",
          userName: data.userName || "Customer",
          phone: data.phone || data.userId || "",
          source: data.source === "delivery" ? "delivery" : "shop",
          hasOrderDoc: true,
          localOrderId: data.localOrderId,
          createdAt: created,
          metal: data.metal === "silver" ? "silver" : "gold",
          grams: typeof data.grams === "number" ? data.grams : 0,
          productLabel: data.productLabel || data.productName || "Shop order",
          status: data.status || "processing",
          addressLine: data.addressLine || "",
          city: data.city || "",
          state: data.state || "",
          pin: data.pin || "",
          priceInr: typeof data.priceInr === "number" ? data.priceInr : undefined,
          paymentMode: data.paymentMode,
          purity: data.purity,
        } as AdminOrder;
      });
      setShopOrders(list);
      setOrdersLoading(false);
    }, () => setOrdersLoading(false));
    return () => unsub();
  }, []);

  async function handleAddProduct() {
    if (!newProduct.name.trim() || newProduct.priceInr <= 0) return;
    setProductSaving(true);
    try {
      await addDoc(collection(db, "shop_products"), { ...newProduct, createdAt: serverTimestamp() });
      setNewProduct({ name: "", category: "gold_coin", weightGrams: 1, priceInr: 0, purity: "24K 999", description: "", inStock: true });
      setShowAddProduct(false);
    } catch { alert("Failed to add product."); }
    setProductSaving(false);
  }

  async function toggleStock(p: ShopProduct) {
    await setDoc(doc(db, "shop_products", p.id), { inStock: !p.inStock }, { merge: true }).catch(() => {});
  }

  async function deleteProduct(id: string) {
    await deleteDoc(doc(db, "shop_products", id)).catch((e) => console.error("Delete failed:", e));
  }

  async function handleOrderStatusUpdate(order: AdminOrder, status: UserOrder["status"]) {
    try {
      if (order.hasOrderDoc) {
        await setDoc(doc(db, "orders", order.id), { status, updatedAt: serverTimestamp() }, { merge: true });
      }

      if (order.source === "delivery") {
        const userDoc = dbUsers.find(u => u.id === order.userId || u.phone === order.phone);
        if (userDoc) {
          const localId = order.localOrderId || order.id;
          await setDoc(doc(db, "users", userDoc.id), {
            orders: userDoc.orders.map(o => o.id === localId ? { ...o, status } : o),
          }, { merge: true });
        }
      }
    } catch (e) {
      console.error("Order status update failed:", e);
      alert("Failed to update order status. Check Firestore permissions.");
    }
  }

  // Listen to Firestore prices/live
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "prices", "live"), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.gold   > 0) setGoldPrice(d.gold);
        if (d.silver > 0) setSilverPrice(d.silver);
        setPriceSource(d.updatedBy === "admin" ? "admin" : "api");
        if (d.updatedAt?.toDate) setPriceUpdatedAt(d.updatedAt.toDate().toLocaleString("en-IN"));
      } else {
        
      }
    }, () => {
      
    });
    return () => unsub();
  }, []);

  async function handleSavePrices() {
    const g = parseFloat(inputGold);
    const s = parseFloat(inputSilver);
    if ((!inputGold || isNaN(g) || g <= 0) && (!inputSilver || isNaN(s) || s <= 0)) return;
    setPriceSaving(true);
    try {
      await setDoc(doc(db, "prices", "live"), {
        ...(inputGold   && !isNaN(g) && g > 0 ? { gold:   Math.round(g * 100) / 100 } : {}),
        ...(inputSilver && !isNaN(s) && s > 0 ? { silver: Math.round(s * 100) / 100 } : {}),
        karat: 24,
        updatedBy: "admin",
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setInputGold("");
      setInputSilver("");
      setPriceSaved(true);
      setTimeout(() => setPriceSaved(false), 3000);
    } catch (e) {
      alert("Failed to save prices. Check Firestore permissions.");
    }
    setPriceSaving(false);
  }

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f3ec]">
      <svg className="spin" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#b8860b" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
    </div>
  );

  const totalUsers = dbUsers.length;
  const totalGoldGrams = dbUsers.reduce((s, u) => s + u.gold, 0);
  const totalGoldInr = totalGoldGrams * goldPrice;
  const totalSilver = dbUsers.reduce((s, u) => s + u.silver, 0);
  const totalWallet = dbUsers.reduce((s, u) => s + u.wallet, 0);
  const allTransactions = dbUsers.flatMap(u => u.transactions.map(t => ({ ...t, userId: u.id, userName: u.name })))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const embeddedOrders: AdminOrder[] = dbUsers.flatMap(u => u.orders.map(o => ({
    ...o,
    userId: u.id,
    userName: u.name,
    phone: u.phone,
    source: "delivery" as const,
    hasOrderDoc: false,
  })));
  const orderIds = new Set(shopOrders.map(o => o.localOrderId || o.id));
  const allOrders = [...shopOrders, ...embeddedOrders.filter(o => !orderIds.has(o.id))]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const processingOrders = allOrders.filter(o => o.status === "processing").length;
  const shippedOrders = allOrders.filter(o => o.status === "shipped").length;
  const deliveredOrders = allOrders.filter(o => o.status === "delivered").length;
  
  if (selectedUser) {
    const selectedUserOrders = allOrders.filter(o => o.userId === selectedUser.id || o.phone === selectedUser.phone);
    return (
      <div className="min-h-screen bg-[#f7f3ec] flex flex-col">
        <div className="bg-gradient-to-r from-[#7b1c1c] to-[#b8860b] px-4 pt-10 pb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSelectedUser(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 border border-white/20 text-white text-[12px] font-semibold active:scale-95 transition-transform"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 19l-7-7 7-7"/></svg>
            Back
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#d4a017] to-[#b8860b] flex items-center justify-center">
              <span className="text-[16px] font-bold text-white">{selectedUser.name[0]}</span>
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-bold text-white">{selectedUser.name}</p>
              <p className="text-[11px] text-white/70">{selectedUser.id}</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 flex flex-col gap-3 overflow-y-auto flex-1">
          <div className="card p-4">
            <p className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider mb-3">Details</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <p className="text-[10px] text-[#9a8060] mb-1">Phone</p>
                <p className="text-[13px] font-bold text-[#1c1208]">+91 {selectedUser.phone}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#9a8060] mb-1">KYC</p>
                <span className={selectedUser.kyc === "Verified" ? "badge-green" : selectedUser.kyc === "PAN Submitted" ? "badge-amber" : "badge-red"}>
                  {selectedUser.kyc}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-[#9a8060] mb-1">Joined</p>
                <p className="text-[13px] font-bold text-[#1c1208]">{selectedUser.joined}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#9a8060] mb-1">Wallet</p>
                <p className="text-[13px] font-bold text-[#15803d]">{formatInr(selectedUser.wallet)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#fdf3d0] rounded-xl p-3 text-center">
                <p className="text-[10px] font-bold text-[#9a8060] uppercase mb-1">Gold</p>
                <p className="text-[16px] font-bold text-[#b8860b]">{selectedUser.gold.toFixed(2)}g</p>
                <p className="text-[10px] text-[#9a8060] mt-1">{formatInr(selectedUser.gold * goldPrice)}</p>
              </div>
              <div className="bg-[#f5f5f5] rounded-xl p-3 text-center">
                <p className="text-[10px] font-bold text-[#9a8060] uppercase mb-1">Silver</p>
                <p className="text-[16px] font-bold text-[#5a5a5a]">{selectedUser.silver.toFixed(2)}g</p>
                <p className="text-[10px] text-[#9a8060] mt-1">{formatInr(selectedUser.silver * silverPrice)}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[14px] font-bold text-[#1c1208] mb-3">{selectedUserOrders.length} Orders</p>
            {selectedUserOrders.length === 0 && (
              <div className="bg-[#f0e8d8] rounded-xl p-4 text-center mb-3">
                <p className="text-[12px] text-[#9a8060] font-medium">No orders for this user yet.</p>
              </div>
            )}
            <div className="flex flex-col gap-2 mb-4">
              {selectedUserOrders.map((o, index) => {
                const statusClass = o.status === "delivered" ? "badge-green" : o.status === "shipped" ? "badge-blue" : "badge-amber";
                const date = new Date(o.createdAt);
                return (
                  <div key={`user-order-${o.source}-${o.id}-${index}`} className="card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-[#1c1208] truncate">{o.productLabel}</p>
                        <p className="text-[11px] text-[#9a8060] capitalize">{o.metal} · {o.grams}g · {date.toLocaleDateString("en-IN")}</p>
                      </div>
                      <span className={statusClass}>{o.status.charAt(0).toUpperCase() + o.status.slice(1)}</span>
                    </div>
                    <p className="text-[11px] text-[#9a8060] mt-2">{o.addressLine}{o.addressLine && ", "}{o.city}{o.pin ? ` - ${o.pin}` : ""}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[14px] font-bold text-[#1c1208] mb-3">{selectedUser.transactions.length} Transactions</p>
            <div className="flex flex-col gap-2 pb-4">
              {selectedUser.transactions.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).map((tx, index) => {
                const date = new Date(tx.at);
                const dateStr = date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                const timeStr = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
                const txIcon = tx.type === "buy" ? "🟢" : tx.type === "sell" ? "🔴" : "⚙️";
                return (
                  <div key={`${selectedUser.id}-${tx.id}-${index}`} className="card p-3 flex items-center gap-3">
                    <div className="text-[20px]">{txIcon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-[#1c1208] capitalize">{tx.type} {tx.metal === "gold" ? "🥇" : "🥈"}</p>
                      <p className="text-[11px] text-[#9a8060]">{dateStr} · {timeStr}</p>
                      {tx.note && <p className="text-[10px] text-[#b8860b] mt-1 font-medium">{tx.note}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[13px] font-bold text-[#1c1208]">{tx.grams.toFixed(3)}g</p>
                      <p className="text-[11px] text-[#9a8060]">{formatInrExact(tx.inr)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f3ec] flex flex-col">
      <div className="bg-gradient-to-r from-[#7b1c1c] to-[#b8860b] px-4 pt-10 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><polygon points="12,2 15.5,8.5 23,9.5 17.5,14.5 19,22 12,18.5 5,22 6.5,14.5 1,9.5 8.5,8.5" fill="#F5C842"/></svg>
          </div>
          <div>
            <p className="text-[10px] text-white/60 font-semibold uppercase tracking-wider">Admin</p>
            <p className="text-[16px] font-extrabold text-white leading-tight">DigiGold</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { logout(); router.replace("/login"); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 border border-white/20 text-white text-[12px] font-semibold active:scale-95 transition-transform"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Logout
        </button>
      </div>

      <div className="bg-white border-b border-[#ede0c4] px-3 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`shrink-0 px-4 py-3 text-[13px] font-semibold border-b-2 transition-all ${
              tab === t ? "border-[#b8860b] text-[#b8860b]" : "border-transparent text-[#9a8060]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-8 flex flex-col gap-4">
        {tab === "Dashboard" && (
          <>
            <div className="card p-5 bg-gradient-to-br from-[#fdf3d0] to-[#f9e6a6] border-2 border-[#e8c84a]">
              <div className="flex items-start justify-between mb-2">
                <p className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider">Total Gold Holdings</p>
                <span className="text-[28px]">🥇</span>
              </div>
              <p className="text-[32px] font-extrabold text-[#b8860b]">{totalGoldGrams.toFixed(2)}g</p>
              <p className="text-[18px] font-bold text-[#7b1c1c]">{formatInr(totalGoldInr)}</p>
              <p className="text-[10px] text-[#9a8060] mt-2">At ₹{goldPrice}/g</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Users", value: totalUsers, icon: "👥", color: "#1d4ed8" },
                { label: "Total Wallet", value: formatInr(totalWallet), icon: "💰", color: "#15803d" },
                { label: "Silver Held", value: `${totalSilver.toFixed(2)}g`, icon: "🥈", color: "#5a5a5a" },
                { label: "Orders", value: allOrders.length, icon: "📦", color: "#b8860b" },
                { label: "Processing", value: processingOrders, icon: "⏳", color: "#d97706" },
                { label: "Shipped", value: shippedOrders, icon: "🚚", color: "#2563eb" },
                { label: "Delivered", value: deliveredOrders, icon: "✓", color: "#15803d" },
              ].map((s) => (
                <div key={s.label} className="card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[20px]">{s.icon}</span>
                    <span className="text-[10px] font-bold text-[#9a8060] uppercase tracking-wider">{s.label}</span>
                  </div>
                  <p className="text-[20px] font-extrabold" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="text-[13px] font-bold text-[#1c1208] mb-2">Recent Transactions</p>
              <div className="flex flex-col gap-2">
                {allTransactions.slice(0, 5).map((tx: any, index) => {
                  const date = new Date(tx.at);
                  const dateStr = date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
                  const txIcon = tx.type === "buy" ? "🟢" : tx.type === "sell" ? "🔴" : "⚙️";
                  return (
                    <div key={`${tx.userId}-${tx.id}-${index}`} className="card p-3 flex items-center gap-3">
                      <div className="text-[18px]">{txIcon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-[#1c1208] truncate">{tx.userName} · {tx.type.toUpperCase()} {tx.metal === "gold" ? "🥇" : "🥈"}</p>
                        <p className="text-[10px] text-[#9a8060]">{dateStr}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[12px] font-bold text-[#1c1208]">{tx.grams.toFixed(3)}g</p>
                        <p className="text-[10px] text-[#9a8060]">{formatInr(tx.inr)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {tab === "Transactions" && (
          <>
            <p className="text-[15px] font-bold text-[#1c1208]">{allTransactions.length} All Transactions</p>
            <div className="flex flex-col gap-2">
              {allTransactions.map((tx: any, index) => {
                const date = new Date(tx.at);
                const dateStr = date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                const timeStr = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
                const txIcon = tx.type === "buy" ? "🟢" : tx.type === "sell" ? "🔴" : "⚙️";
                return (
                  <div key={`${tx.userId}-${tx.id}-${index}`} className="card p-3.5 flex items-center gap-3">
                    <div className="text-[20px]">{txIcon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-[#1c1208] capitalize truncate">
                        {tx.userName} · {tx.type} {tx.metal === "gold" ? "🥇" : "🥈"}
                      </p>
                      <p className="text-[11px] text-[#9a8060]">{dateStr} · {timeStr}</p>
                      {tx.note && <p className="text-[10px] text-[#b8860b] mt-0.5 font-medium">{tx.note}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[13px] font-bold text-[#1c1208]">{tx.grams.toFixed(3)}g</p>
                      <p className="text-[11px] text-[#9a8060]">{formatInr(tx.inr)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === "Users" && (
          <>
            <p className="text-[15px] font-bold text-[#1c1208]">{totalUsers} Registered Users</p>
            {usersLoading && (
              <div className="flex items-center justify-center py-10">
                <svg className="spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b8860b" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
              </div>
            )}
            {!usersLoading && dbUsers.length === 0 && (
              <div className="bg-[#f0e8d8] rounded-xl p-5 text-center">
                <p className="text-[13px] text-[#9a8060] font-medium">No users found in database.</p>
              </div>
            )}
            <div className="flex flex-col gap-3">
              {dbUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelectedUser(u)}
                  className="card p-4 text-left hover:shadow-md transition-shadow active:scale-95"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#d4a017] to-[#b8860b] flex items-center justify-center shrink-0">
                        <span className="text-[16px] font-bold text-white">{u.name[0]}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-bold text-[#1c1208]">{u.name}</p>
                        <p className="text-[12px] text-[#9a8060]">+91 {u.phone}</p>
                      </div>
                    </div>
                    <span className={u.kyc === "Verified" ? "badge-green" : u.kyc === "PAN Submitted" ? "badge-amber" : "badge-red"}>
                      {u.kyc}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="bg-[#fdf3d0] rounded-xl p-2.5 text-center">
                      <p className="text-[10px] font-bold text-[#9a8060] uppercase">Gold</p>
                      <p className="text-[13px] font-bold text-[#b8860b]">{u.gold}g</p>
                    </div>
                    <div className="bg-[#f5f5f5] rounded-xl p-2.5 text-center">
                      <p className="text-[10px] font-bold text-[#9a8060] uppercase">Silver</p>
                      <p className="text-[13px] font-bold text-[#5a5a5a]">{u.silver}g</p>
                    </div>
                    <div className="bg-[#dcfce7] rounded-xl p-2.5 text-center">
                      <p className="text-[10px] font-bold text-[#9a8060] uppercase">Wallet</p>
                      <p className="text-[13px] font-bold text-[#15803d]">₹{(u.wallet / 1000).toFixed(0)}K</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-[#9a8060]">Joined: {u.joined}</p>
                    <span className="text-[12px] text-[#b8860b] font-semibold">{u.transactions.length} txns →</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {tab === "Orders" && (
          <>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[15px] font-bold text-[#1c1208]">All Orders</p>
              <span className="text-[12px] text-[#b8860b] font-bold">{allOrders.length} total</span>
            </div>

            {ordersLoading && (
              <div className="flex items-center justify-center py-8">
                <svg className="spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b8860b" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
              </div>
            )}

            {!ordersLoading && allOrders.length === 0 && (
              <div className="bg-[#f0e8d8] rounded-lg p-4 text-center">
                <p className="text-[13px] text-[#9a8060] font-medium">No order data available yet</p>
              </div>
            )}

            {!ordersLoading && allOrders.length > 0 && (
              <div className="flex flex-col gap-2">
                {allOrders.map((o, index) => {
                  const date = new Date(o.createdAt);
                  const dateStr = date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                  const timeStr = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
                  const isGold = o.metal === "gold";
                  const statusClass = o.status === "delivered" ? "badge-green" : o.status === "shipped" ? "badge-blue" : "badge-amber";
                  return (
                    <div key={`${o.source}-${o.userId}-${o.id}-${index}`} className={`card p-3.5 border-l-4 ${isGold ? "border-l-[#e8c84a]" : "border-l-[#a3a3a3]"}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl ${isGold ? "bg-[#fdf3d0] text-[#b8860b]" : "bg-[#f5f5f5] text-[#5a5a5a]"} flex items-center justify-center shrink-0 text-[20px]`}>
                          {isGold ? "🥇" : "🥈"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[13px] font-extrabold text-[#1c1208] truncate">{o.productLabel}</p>
                              <p className="text-[11px] text-[#9a8060]">{o.userName} · {o.phone || o.userId}</p>
                            </div>
                            <span className={statusClass}>{o.status.charAt(0).toUpperCase() + o.status.slice(1)}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-3">
                            <div>
                              <p className="text-[10px] font-bold text-[#9a8060] uppercase">Metal</p>
                              <p className="text-[12px] font-bold text-[#1c1208] capitalize">{o.metal} · {o.grams}g</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-[#9a8060] uppercase">Amount</p>
                              <p className="text-[12px] font-bold text-[#1c1208]">{o.priceInr ? formatInr(o.priceInr) : "Delivery"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-[#9a8060] uppercase">Date</p>
                              <p className="text-[12px] font-bold text-[#1c1208]">{dateStr} · {timeStr}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-[#9a8060] uppercase">Payment</p>
                              <p className="text-[12px] font-bold text-[#1c1208] capitalize">{o.paymentMode || o.source}</p>
                            </div>
                          </div>

                          <p className="text-[11px] text-[#9a8060] mt-3">
                            {o.addressLine}{o.addressLine && ", "}{o.city}{o.state ? `, ${o.state}` : ""}{o.pin ? ` - ${o.pin}` : ""}
                          </p>

                          <div className="grid grid-cols-3 gap-2 mt-3">
                            {(["processing", "shipped", "delivered"] as const).map((status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => handleOrderStatusUpdate(o, status)}
                                className={`py-2 rounded-xl text-[11px] font-bold border transition-all active:scale-95 ${
                                  o.status === status
                                    ? "bg-[#fdf3d0] text-[#b8860b] border-[#e8c84a]"
                                    : "bg-[#f5f0e8] text-[#9a8060] border-[#e8e0d0]"
                                }`}
                              >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === "Shop" && (
          <>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[15px] font-bold text-[#1c1208]">Shop Products</p>
              <button type="button" onClick={() => setShowAddProduct(s => !s)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#7b1c1c] to-[#b8860b] text-white text-[12px] font-bold active:scale-95 transition-transform">
                {showAddProduct ? "✕ Cancel" : "+ Add Product"}
              </button>
            </div>

            {/* Add product form */}
            {showAddProduct && (
              <div className="card p-4 flex flex-col gap-3 border-2 border-[#e8c84a]">
                <p className="text-[13px] font-bold text-[#1c1208]">New Product</p>

                <div>
                  <label className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider block mb-1">Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["gold_coin","gold_biscuit","silver_coin","silver_biscuit"] as ProductCategory[]).map(c => (
                      <button key={c} type="button" onClick={() => setNewProduct(p => ({ ...p, category: c }))}
                        className={`py-2 rounded-xl text-[11px] font-bold border transition-all active:scale-95 ${
                          newProduct.category === c ? "bg-[#fdf3d0] text-[#b8860b] border-[#e8c84a]" : "bg-[#f5f0e8] text-[#9a8060] border-[#e8e0d0]"
                        }`}>
                        {CAT_LABELS[c]}
                      </button>
                    ))}
                  </div>
                </div>

                {([
                  { key: "name",        label: "Product Name",   placeholder: "e.g. 1g Gold Coin",    type: "text" },
                  { key: "purity",     label: "Purity",         placeholder: "e.g. 24K 999",         type: "text" },
                  { key: "description",label: "Description",    placeholder: "Short description",    type: "text" },
                ] as { key: keyof typeof newProduct; label: string; placeholder: string; type: string }[]).map(f => (
                  <div key={f.key}>
                    <label className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider block mb-1">{f.label}</label>
                    <input className="input-field" placeholder={f.placeholder}
                      value={newProduct[f.key] as string}
                      onChange={e => setNewProduct(p => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider block mb-1">Weight (grams)</label>
                    <input className="input-field" inputMode="decimal" placeholder="e.g. 1"
                      value={newProduct.weightGrams || ""}
                      onChange={e => setNewProduct(p => ({ ...p, weightGrams: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider block mb-1">Price (₹)</label>
                    <input className="input-field" inputMode="numeric" placeholder="e.g. 7500"
                      value={newProduct.priceInr || ""}
                      onChange={e => setNewProduct(p => ({ ...p, priceInr: parseFloat(e.target.value) || 0 }))} />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-[#5a4a2a]">In Stock</span>
                  <button type="button" onClick={() => setNewProduct(p => ({ ...p, inStock: !p.inStock }))}
                    className={`toggle-track ${newProduct.inStock ? "bg-[#15803d]" : "bg-[#d0c8b8]"}`}>
                    <div className={`toggle-thumb ${newProduct.inStock ? "left-[25px]" : "left-[3px]"}`} />
                  </button>
                </div>

                <button type="button" onClick={handleAddProduct} disabled={productSaving || !newProduct.name.trim() || newProduct.priceInr <= 0}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#7b1c1c] to-[#b8860b] text-white text-[14px] font-bold active:scale-95 transition-transform disabled:opacity-50">
                  {productSaving ? "Saving..." : "💾 Save Product"}
                </button>
              </div>
            )}

            {/* Product list */}
            {shopLoading && (
              <div className="flex items-center justify-center py-8">
                <svg className="spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b8860b" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
              </div>
            )}

            {!shopLoading && shopProducts.length === 0 && (
              <div className="bg-[#f0e8d8] rounded-xl p-5 text-center">
                <p className="text-[13px] text-[#9a8060]">No products yet. Add your first product above.</p>
              </div>
            )}

            {!shopLoading && (["gold_coin","gold_biscuit","silver_coin","silver_biscuit"] as ProductCategory[]).map(cat => {
              const catProducts = shopProducts.filter(p => p.category === cat);
              if (catProducts.length === 0) return null;
              return (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[16px]">{CAT_ICONS[cat]}</span>
                    <p className="text-[12px] font-bold text-[#9a8060] uppercase tracking-wider">{CAT_LABELS[cat]}</p>
                    <span className="text-[11px] text-[#b8860b] font-semibold">{catProducts.length}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {catProducts.map(p => (
                      <div key={p.id}>
                        {/* View row */}
                        {editProduct?.id !== p.id && (
                          <div className="card p-3.5">
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className="text-[13px] font-bold text-[#1c1208] truncate">{p.name}</p>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.inStock ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#fee2e2] text-[#b91c1c]"}`}>
                                    {p.inStock ? "In Stock" : "Out"}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#9a8060]">{p.weightGrams}g · {p.purity} · ₹{p.priceInr.toLocaleString("en-IN")}</p>
                                {p.description ? <p className="text-[10px] text-[#b8860b] mt-0.5 truncate">{p.description}</p> : null}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {/* Stock toggle */}
                                <button type="button" onClick={() => toggleStock(p)}
                                  className={`toggle-track ${p.inStock ? "bg-[#15803d]" : "bg-[#d0c8b8]"}`}>
                                  <div className={`toggle-thumb ${p.inStock ? "left-[25px]" : "left-[3px]"}`} />
                                </button>
                                {/* Edit */}
                                <button type="button" onClick={() => setEditProduct({ ...p })}
                                  className="w-8 h-8 rounded-lg bg-[#fdf3d0] border border-[#e8c84a] flex items-center justify-center active:scale-90 transition-transform">
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#b8860b" strokeWidth="2.5" strokeLinecap="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                  </svg>
                                </button>
                                {/* Delete */}
                                <button type="button" onClick={() => deleteProduct(p.id)}
                                  className="w-8 h-8 rounded-lg bg-[#fee2e2] border border-[#fecaca] flex items-center justify-center active:scale-90 transition-transform">
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2.5" strokeLinecap="round">
                                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Inline edit form */}
                        {editProduct?.id === p.id && (
                          <div className="card p-4 flex flex-col gap-3 border-2 border-[#b8860b]">
                            <div className="flex items-center justify-between">
                              <p className="text-[13px] font-bold text-[#1c1208]">Edit Product</p>
                              <button type="button" onClick={() => setEditProduct(null)}
                                className="text-[11px] font-bold text-[#9a8060] px-2 py-1 rounded-lg bg-[#f0e8d8] active:scale-95">
                                Cancel
                              </button>
                            </div>

                            {/* Category */}
                            <div className="grid grid-cols-2 gap-2">
                              {(["gold_coin","gold_biscuit","silver_coin","silver_biscuit"] as ProductCategory[]).map(c => (
                                <button key={c} type="button" onClick={() => setEditProduct(ep => ep ? { ...ep, category: c } : ep)}
                                  className={`py-2 rounded-xl text-[11px] font-bold border transition-all active:scale-95 ${
                                    editProduct.category === c ? "bg-[#fdf3d0] text-[#b8860b] border-[#e8c84a]" : "bg-[#f5f0e8] text-[#9a8060] border-[#e8e0d0]"
                                  }`}>
                                  {CAT_ICONS[c]} {CAT_LABELS[c]}
                                </button>
                              ))}
                            </div>

                            {/* Text fields */}
                            {([
                              { key: "name",        label: "Product Name",  placeholder: "e.g. 1g Gold Coin" },
                              { key: "purity",      label: "Purity",        placeholder: "e.g. 24K 999" },
                              { key: "description", label: "Description",   placeholder: "Short description" },
                            ] as { key: keyof ShopProduct; label: string; placeholder: string }[]).map(f => (
                              <div key={f.key}>
                                <label className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider block mb-1">{f.label}</label>
                                <input className="input-field" placeholder={f.placeholder}
                                  value={editProduct[f.key] as string}
                                  onChange={e => setEditProduct(ep => ep ? { ...ep, [f.key]: e.target.value } : ep)} />
                              </div>
                            ))}

                            {/* Weight & Price */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider block mb-1">Weight (g)</label>
                                <input className="input-field" inputMode="decimal"
                                  value={editProduct.weightGrams || ""}
                                  onChange={e => setEditProduct(ep => ep ? { ...ep, weightGrams: parseFloat(e.target.value) || 0 } : ep)} />
                              </div>
                              <div>
                                <label className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider block mb-1">Price (₹)</label>
                                <input className="input-field" inputMode="numeric"
                                  value={editProduct.priceInr || ""}
                                  onChange={e => setEditProduct(ep => ep ? { ...ep, priceInr: parseFloat(e.target.value) || 0 } : ep)} />
                              </div>
                            </div>

                            {/* In Stock */}
                            <div className="flex items-center justify-between">
                              <span className="text-[12px] font-semibold text-[#5a4a2a]">In Stock</span>
                              <button type="button" onClick={() => setEditProduct(ep => ep ? { ...ep, inStock: !ep.inStock } : ep)}
                                className={`toggle-track ${editProduct.inStock ? "bg-[#15803d]" : "bg-[#d0c8b8]"}`}>
                                <div className={`toggle-thumb ${editProduct.inStock ? "left-[25px]" : "left-[3px]"}`} />
                              </button>
                            </div>

                            <button type="button" onClick={handleEditSave}
                              disabled={editSaving || !editProduct.name.trim() || editProduct.priceInr <= 0}
                              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#7b1c1c] to-[#b8860b] text-white text-[14px] font-bold active:scale-95 transition-transform disabled:opacity-50">
                              {editSaving ? "Saving..." : "💾 Update Product"}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {tab === "Prices" && (
          <>
            <p className="text-[15px] font-bold text-[#1c1208] mb-1">Set Metal Prices</p>
            <p className="text-[12px] text-[#9a8060] mb-3">Admin enters prices below. Users see these instantly.</p>

            {/* Current saved prices */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#fdf3d0] border-2 border-[#e8c84a] rounded-2xl p-4 text-center">
                <p className="text-[10px] font-bold text-[#9a8060] uppercase tracking-wider mb-1">Gold / gram</p>
                <p className="text-[24px] font-extrabold text-[#b8860b]">₹{goldPrice.toLocaleString("en-IN")}</p>
                <p className="text-[11px] text-[#9a8060] mt-1">{priceKarat}K purity</p>
              </div>
              <div className="bg-[#f5f5f5] border-2 border-[#d0d0d0] rounded-2xl p-4 text-center">
                <p className="text-[10px] font-bold text-[#9a8060] uppercase tracking-wider mb-1">Silver / gram</p>
                <p className="text-[24px] font-extrabold text-[#5a5a5a]">₹{silverPrice.toLocaleString("en-IN")}</p>
                <p className="text-[11px] text-[#9a8060] mt-1">999 purity</p>
              </div>
            </div>

            {priceUpdatedAt && (
              <div className="flex items-center gap-2 bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl px-3 py-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <p className="text-[11px] font-semibold text-emerald-700">
                  {priceSource === "admin" ? "Set by Admin" : "Auto"} · {priceUpdatedAt}
                </p>
              </div>
            )}

            {/* Gold price input */}
            <div className="card p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[20px]">🥇</span>
                <p className="text-[14px] font-bold text-[#1c1208]">Gold Price</p>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider block mb-1">Price per gram (₹)</label>
                <input
                  type="number" inputMode="decimal"
                  placeholder={"Current: " + goldPrice.toLocaleString("en-IN")}
                  value={inputGold}
                  onChange={e => setInputGold(e.target.value)}
                  className="w-full border-2 border-[#e8c84a] rounded-xl px-4 py-3 text-[18px] font-bold text-[#1c1208] bg-[#fdf3d0] focus:outline-none focus:border-[#b8860b] placeholder:text-[#c8b090] placeholder:font-normal placeholder:text-[14px]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider block mb-2">Karat</label>
                <div className="flex gap-2">
                  {([24, 22, 18] as const).map(k => (
                    <button key={k} type="button"
                      onClick={() => setDoc(doc(db, "prices", "live"), { karat: k, updatedBy: "admin", updatedAt: serverTimestamp() }, { merge: true }).catch(() => {})}
                      className={"flex-1 py-2.5 rounded-xl text-[13px] font-bold border transition-all active:scale-95 " + (priceKarat === k ? "bg-[#fdf3d0] text-[#b8860b] border-[#e8c84a]" : "bg-[#f5f0e8] text-[#9a8060] border-[#e8e0d0]")}>
                      {k}K
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Silver price input */}
            <div className="card p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[20px]">🥈</span>
                <p className="text-[14px] font-bold text-[#1c1208]">Silver Price</p>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider block mb-1">Price per gram (₹)</label>
                <input
                  type="number" inputMode="decimal"
                  placeholder={"Current: " + silverPrice.toLocaleString("en-IN")}
                  value={inputSilver}
                  onChange={e => setInputSilver(e.target.value)}
                  className="w-full border-2 border-[#d0d0d0] rounded-xl px-4 py-3 text-[18px] font-bold text-[#1c1208] bg-[#f5f5f5] focus:outline-none focus:border-[#5a5a5a] placeholder:text-[#a0a0a0] placeholder:font-normal placeholder:text-[14px]"
                />
              </div>
            </div>

            {/* Rate Card */}
            <div className="card p-4 flex flex-col gap-3">
              <div>
                <p className="text-[14px] font-bold text-[#1c1208]">Rate Card</p>
                <p className="text-[11px] text-[#9a8060] mt-0.5">Shown on user dashboard as weight-based prices</p>
              </div>

              {(rateCard.gold10g24k > 0 || rateCard.silver10g > 0) && (
                <div className="grid grid-cols-2 gap-2">
                  {rateCard.gold10g24k > 0 && (
                    <div className="bg-[#fdf3d0] border border-[#e8c84a] rounded-xl p-3 text-center">
                      <p className="text-[10px] font-bold text-[#9a8060] uppercase">10g · 24K</p>
                      <p className="text-[15px] font-extrabold text-[#b8860b]">₹{rateCard.gold10g24k.toLocaleString("en-IN")}</p>
                    </div>
                  )}
                  {rateCard.gold10g22k > 0 && (
                    <div className="bg-[#fdf3d0] border border-[#e8c84a] rounded-xl p-3 text-center">
                      <p className="text-[10px] font-bold text-[#9a8060] uppercase">10g · 22K</p>
                      <p className="text-[15px] font-extrabold text-[#b8860b]">₹{rateCard.gold10g22k.toLocaleString("en-IN")}</p>
                    </div>
                  )}
                  {rateCard.silver10g > 0 && (
                    <div className="bg-[#f5f5f5] border border-[#d0d0d0] rounded-xl p-3 text-center">
                      <p className="text-[10px] font-bold text-[#9a8060] uppercase">10g · Silver</p>
                      <p className="text-[15px] font-extrabold text-[#5a5a5a]">₹{rateCard.silver10g.toLocaleString("en-IN")}</p>
                    </div>
                  )}
                  {rateCard.silver50g > 0 && (
                    <div className="bg-[#f5f5f5] border border-[#d0d0d0] rounded-xl p-3 text-center">
                      <p className="text-[10px] font-bold text-[#9a8060] uppercase">50g · Silver</p>
                      <p className="text-[15px] font-extrabold text-[#5a5a5a]">₹{rateCard.silver50g.toLocaleString("en-IN")}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: "gold10g24k", label: "Gold 10g 24K", gold: true },
                  { key: "gold10g22k", label: "Gold 10g 22K", gold: true },
                  { key: "silver10g",  label: "Silver 10g",   gold: false },
                  { key: "silver50g",  label: "Silver 50g",   gold: false },
                ] as { key: keyof typeof rcInput; label: string; gold: boolean }[]).map(f => (
                  <div key={f.key}>
                    <label className="text-[10px] font-bold text-[#9a8060] uppercase tracking-wider block mb-1">{f.label}</label>
                    <input
                      inputMode="numeric"
                      placeholder={rateCard[f.key] > 0 ? String(rateCard[f.key].toLocaleString("en-IN")) : "Enter price"}
                      value={rcInput[f.key]}
                      onChange={e => setRcInput(r => ({ ...r, [f.key]: e.target.value }))}
                      className={"w-full border-2 rounded-xl px-3 py-2.5 text-[14px] font-bold text-[#1c1208] focus:outline-none placeholder:text-[12px] placeholder:font-normal " + (f.gold ? "border-[#e8c84a] bg-[#fdf3d0] focus:border-[#b8860b] placeholder:text-[#c8b090]" : "border-[#d0d0d0] bg-[#f5f5f5] focus:border-[#5a5a5a] placeholder:text-[#a0a0a0]")}
                    />
                  </div>
                ))}
              </div>

              {rcSaved && <p className="text-[12px] font-bold text-emerald-700">✓ Rate card saved!</p>}
              <button type="button" onClick={handleSaveRateCard} disabled={rcSaving}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#7b1c1c] to-[#b8860b] text-white text-[14px] font-bold active:scale-95 transition-transform disabled:opacity-50">
                {rcSaving ? "Saving..." : "Save Rate Card"}
              </button>
            </div>

            {priceSaved && (
              <div className="flex items-center gap-2 bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl px-4 py-3">
                <span className="text-[18px]">✓</span>
                <p className="text-[13px] font-bold text-emerald-700">Prices saved! All users see updated prices instantly.</p>
              </div>
            )}

            <button
              type="button" onClick={handleSavePrices}
              disabled={priceSaving || ((!inputGold || isNaN(parseFloat(inputGold))) && (!inputSilver || isNaN(parseFloat(inputSilver))))}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#7b1c1c] to-[#b8860b] text-white text-[15px] font-extrabold active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed shadow-lg">
              {priceSaving ? "Saving..." : "Save Gold & Silver Prices"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
