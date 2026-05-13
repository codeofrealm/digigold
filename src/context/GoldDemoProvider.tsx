"use client";

import React, {
  createContext, useCallback, useContext,
  useEffect, useMemo, useRef, useState,
} from "react";
import type { DocumentSnapshot } from "firebase/firestore";
import {
  doc, setDoc, onSnapshot, collection,
  addDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import type {
  InAppNotification, Metal, PriceAlert, ProfileState,
  RedeemOrder, SettingsState, SipFrequency, SipState,
  Transaction, TxType,
} from "@/context/gold-types";

export type {
  InAppNotification, Metal, PriceAlert, ProfileState, BankDetails, AddressDetails,
  RedeemOrder, SettingsState, SipFrequency, SipState,
  Transaction, TxType,
} from "@/context/gold-types";

// ── Firestore collection paths ──
// prices/live  → { gold, silver, karat, updatedAt, updatedBy }
// users/{uid}  → { balanceGrams, balanceSilverGrams, walletInr, profile, sip, ... }
// users/{uid}/transactions → subcollection
// users/{uid}/orders       → subcollection

const LOCAL_KEY = "dg-v3";

type GoldDemoValue = {
  pricePerGramInr: number;
  priceSilverPerGramInr: number;
  priceKarat: number;
  priceStatus: "live" | "fallback";
  goldChangePct: number;
  silverChangePct: number;
  balanceGrams: number;
  balanceSilverGrams: number;
  walletInr: number;
  sip: SipState;
  transactions: Transaction[];
  orders: RedeemOrder[];
  priceAlerts: PriceAlert[];
  profile: ProfileState;
  settings: SettingsState;
  referralCode: string;
  inAppNotifications: InAppNotification[];
  portfolioInr: number;
  nextSipLabel: string;
  buyMetalInr: (metal: Metal, inr: number) => { ok: true } | { ok: false; reason: string };
  sellMetalGrams: (metal: Metal, grams: number) => { ok: true } | { ok: false; reason: string };
  giftMetalGrams: (metal: Metal, grams: number, recipient: string) => { ok: true } | { ok: false; reason: string };
  createRedeemOrder: (input: { metal: Metal; grams: number; productLabel: string; addressLine: string; city: string; pin: string }) => { ok: true } | { ok: false; reason: string };
  addPriceAlert: (metal: Metal, targetInrPerGram: number) => { ok: true } | { ok: false; reason: string };
  removePriceAlert: (id: string) => void;
  togglePriceAlert: (id: string, active: boolean) => void;
  setSip: (next: Partial<SipState>) => void;
  updateProfile: (next: Partial<ProfileState>) => void;
  updateSettings: (next: Partial<SettingsState>) => void;
  markOrderStatus: (id: string, status: RedeemOrder["status"]) => void;
  dismissNotification: (id: string) => void;
};

const Ctx = createContext<GoldDemoValue | null>(null);

function randomId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
function refCode()  { return `GS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`; }

const nextMonth = new Date(); nextMonth.setMonth(nextMonth.getMonth() + 1);
const defaultSip: SipState     = { active: true, amountInr: 2500, frequency: "monthly", metal: "gold", nextDate: nextMonth.toISOString() };
const defaultProfile: ProfileState = {
  displayName: "Rahul Sharma",
  phone: "+91 98765 43210",
  kycTier: "pan_submitted",
  bank: { accountHolder: "", accountNumber: "", ifsc: "", bankName: "", accountType: "savings" },
  address: { line1: "", line2: "", city: "", state: "", pincode: "" },
};
const defaultSettings: SettingsState = { priceAlertsEnabled: true };

export function GoldDemoProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const { user: authUser } = useAuth();
  // ── Prices (from Firestore prices/live set by admin only) ──
  const [pricePerGramInr,       setPricePerGramInr]       = useState(0);
  const [priceSilverPerGramInr, setPriceSilverPerGramInr] = useState(0);
  const [priceKarat,            setPriceKarat]            = useState(24);
  const [priceStatus,           setPriceStatus]           = useState<"live"|"fallback">("fallback");
  const [goldChangePct,         setGoldChangePct]         = useState(0);
  const [silverChangePct,       setSilverChangePct]       = useState(0);

  // ── User data ──
  const [balanceGrams,       setBalanceGrams]       = useState(0.5);
  const [balanceSilverGrams, setBalanceSilverGrams] = useState(10.0);
  const [walletInr,          setWalletInr]          = useState(10000);
  const [sip,                setSipState]           = useState<SipState>(defaultSip);
  const [transactions,       setTransactions]       = useState<Transaction[]>([]);
  const [orders,             setOrders]             = useState<RedeemOrder[]>([]);
  const [priceAlerts,        setPriceAlerts]        = useState<PriceAlert[]>([]);
  const [profile,            setProfile]            = useState<ProfileState>(defaultProfile);
  const [settings,           setSettings]           = useState<SettingsState>(defaultSettings);
  const [referralCode]                              = useState(refCode);
  const [inAppNotifications, setInAppNotifications] = useState<InAppNotification[]>([]);

  const skipSave   = useRef(true);
  const prevGold   = useRef<number | null>(null);
  const prevSilver = useRef<number | null>(null);

  // ── Sync auth user name → profile ──
  useEffect(() => {
    if (authUser?.name && authUser.name !== "User" && authUser.name !== profile.displayName) {
      setProfile(p => ({ ...p, displayName: authUser.name }));
    }
    if (authUser?.phone) {
      const formatted = authUser.phone.startsWith("+91") ? authUser.phone : `+91 ${authUser.phone}`;
      if (formatted !== profile.phone) setProfile(p => ({ ...p, phone: formatted }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.name, authUser?.phone]);

  // ── 1. Listen to Firestore prices/live (admin sets this — no external API) ──
  useEffect(() => {
    let unsubscribed = false;
    const unsub = onSnapshot(
      doc(db, "prices", "live"),
      (snap: DocumentSnapshot) => {
        if (unsubscribed) return;
        if (snap.exists()) {
          const d = snap.data() as Record<string, number>;
          if (d.gold   && d.gold   > 0) setPricePerGramInr(d.gold);
          if (d.silver && d.silver > 0) setPriceSilverPerGramInr(d.silver);
          if (d.karat)                  setPriceKarat(d.karat);
          setPriceStatus("live");
        }
      },
      () => { /* permission error — keep defaults */ }
    );
    return () => { unsubscribed = true; unsub(); };
  }, []);

  // ── 3. Load user data from localStorage (fast) then sync Firestore ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Record<string, unknown>;
        if (typeof p.balanceGrams       === "number") setBalanceGrams(p.balanceGrams);
        if (typeof p.balanceSilverGrams === "number") setBalanceSilverGrams(p.balanceSilverGrams);
        if (typeof p.walletInr          === "number") setWalletInr(p.walletInr);
        if (Array.isArray(p.transactions)) setTransactions(p.transactions as Transaction[]);
        if (Array.isArray(p.orders))       setOrders(p.orders as RedeemOrder[]);
        if (Array.isArray(p.priceAlerts))  setPriceAlerts(p.priceAlerts as PriceAlert[]);
        if (p.sip && typeof p.sip === "object") {
          const s = p.sip as Record<string, unknown>;
          setSipState({
            active: !!s.active,
            amountInr: typeof s.amountInr === "number" ? s.amountInr : 2500,
            frequency: s.frequency === "daily" || s.frequency === "weekly" ? (s.frequency as SipFrequency) : "monthly",
            metal: s.metal === "silver" ? "silver" : "gold",
            nextDate: typeof s.nextDate === "string" ? s.nextDate : undefined,
          });
        }
        if (p.profile && typeof p.profile === "object") {
          const pr = p.profile as Record<string, unknown>;
          setProfile({
            displayName: String(pr.displayName ?? defaultProfile.displayName),
            phone: String(pr.phone ?? defaultProfile.phone),
            kycTier: pr.kycTier === "verified" || pr.kycTier === "none" ? (pr.kycTier as ProfileState["kycTier"]) : "pan_submitted",
            bank: (pr.bank && typeof pr.bank === "object") ? { ...defaultProfile.bank, ...(pr.bank as object) } : defaultProfile.bank,
            address: (pr.address && typeof pr.address === "object") ? { ...defaultProfile.address, ...(pr.address as object) } : defaultProfile.address,
          });
        }
        if (p.settings && typeof p.settings === "object") {
          const st = p.settings as Record<string, unknown>;
          setSettings({ priceAlertsEnabled: st.priceAlertsEnabled !== false });
        }
        if (Array.isArray(p.inAppNotifications)) setInAppNotifications(p.inAppNotifications as InAppNotification[]);
      }
    } catch { /* ignore */ }
    skipSave.current = false;
  }, []);

  // ── 4. Persist to localStorage ──
  useEffect(() => {
    if (skipSave.current) return;
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify({
        balanceGrams, balanceSilverGrams, walletInr, sip,
        transactions, orders, priceAlerts, profile, settings,
        inAppNotifications, referralCode,
      }));
    } catch { /* ignore */ }
  }, [balanceGrams, balanceSilverGrams, walletInr, sip, transactions, orders, priceAlerts, profile, settings, inAppNotifications, referralCode]);

  // ── 5. Sync user data to Firestore users/{phone} ──
  useEffect(() => {
    if (skipSave.current) return;
    if (authUser?.role === "admin") return;
    const phone = profile.phone.replace(/\D/g, "");
    if (!phone || phone.length < 10) return;
    const ref = doc(db, "users", phone);
    setDoc(ref, {
      name: profile.displayName,
      phone: profile.phone,
      kycTier: profile.kycTier,
      balanceGrams,
      balanceSilverGrams,
      walletInr,
      referralCode,
      updatedAt: serverTimestamp(),
    }, { merge: true }).catch(() => { /* ignore permission errors */ });
  }, [authUser?.role, balanceGrams, balanceSilverGrams, walletInr, profile, referralCode]);

  // ── 6. Sync transactions to Firestore ──
  useEffect(() => {
    if (skipSave.current) return;
    if (authUser?.role === "admin") return;
    const phone = profile.phone.replace(/\D/g, "");
    if (!phone || phone.length < 10 || transactions.length === 0) return;
    const ref = doc(db, "users", phone);
    setDoc(ref, { transactions: transactions.slice(0, 50) }, { merge: true }).catch(() => { /* ignore */ });
  }, [authUser?.role, transactions, profile.phone]);

  useEffect(() => {
    if (skipSave.current) return;
    if (authUser?.role === "admin") return;
    const phone = profile.phone.replace(/\D/g, "");
    if (!phone || phone.length < 10 || orders.length === 0) return;
    const ref = doc(db, "users", phone);
    setDoc(ref, { orders: orders.slice(0, 50) }, { merge: true }).catch(() => { /* ignore */ });
  }, [authUser?.role, orders, profile.phone]);

  // ── 7. Auto SIP ──
  useEffect(() => {
    if (!sip.active) return;
    if (!sip.nextDate) {
      const d = new Date();
      if (sip.frequency === "daily") d.setDate(d.getDate() + 1);
      else if (sip.frequency === "weekly") d.setDate(d.getDate() + 7);
      else d.setMonth(d.getMonth() + 1);
      setSipState(s => ({ ...s, nextDate: d.toISOString() }));
      return;
    }
    const t = window.setInterval(() => {
      const now = Date.now();
      setSipState((cur: SipState) => {
        if (!cur.nextDate || now < new Date(cur.nextDate).getTime()) return cur;
        const rate = cur.metal === "gold" ? pricePerGramInr : priceSilverPerGramInr;
        const amount = cur.amountInr;
        if (walletInr >= amount) {
          const grams = amount / rate;
          setWalletInr((w: number) => w - amount);
          if (cur.metal === "gold") setBalanceGrams((g: number) => g + grams);
          else setBalanceSilverGrams((g: number) => g + grams);
          setTransactions(tx => [{ id: randomId(), type: "sip", metal: cur.metal, at: new Date().toISOString(), inr: amount, grams, note: `Auto SIP (${cur.frequency})` }, ...tx]);
          setInAppNotifications(n => [{ id: randomId(), at: new Date().toISOString(), message: `Auto SIP: Added ${grams.toFixed(4)}g ${cur.metal} for ₹${amount}.` }, ...n].slice(0, 30));
        } else {
          setInAppNotifications(n => [{ id: randomId(), at: new Date().toISOString(), message: `Auto SIP failed: Insufficient balance for ₹${amount}.` }, ...n].slice(0, 30));
        }
        const d = new Date(cur.nextDate!);
        if (cur.frequency === "daily") d.setDate(d.getDate() + 1);
        else if (cur.frequency === "weekly") d.setDate(d.getDate() + 7);
        else d.setMonth(d.getMonth() + 1);
        while (d.getTime() <= Date.now()) {
          if (cur.frequency === "daily") d.setDate(d.getDate() + 1);
          else if (cur.frequency === "weekly") d.setDate(d.getDate() + 7);
          else d.setMonth(d.getMonth() + 1);
        }
        return { ...cur, nextDate: d.toISOString() };
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [sip.active, sip.nextDate, pricePerGramInr, priceSilverPerGramInr, walletInr]);

  // ── 8. Price alert notifications ──
  useEffect(() => {
    if (skipSave.current) return;
    if (prevGold.current === null) { prevGold.current = pricePerGramInr; prevSilver.current = priceSilverPerGramInr; return; }
    if (!settings.priceAlertsEnabled) { prevGold.current = pricePerGramInr; prevSilver.current = priceSilverPerGramInr; return; }
    const pg = prevGold.current, ps = prevSilver.current!;
    const msgs: InAppNotification[] = [];
    for (const a of priceAlerts) {
      if (!a.active) continue;
      if (a.metal === "gold"   && ((pg < a.targetInrPerGram && pricePerGramInr >= a.targetInrPerGram) || (pg > a.targetInrPerGram && pricePerGramInr <= a.targetInrPerGram)))
        msgs.push({ id: randomId(), at: new Date().toISOString(), message: `Gold crossed ₹${a.targetInrPerGram}/g (now ₹${pricePerGramInr}).` });
      if (a.metal === "silver" && ((ps < a.targetInrPerGram && priceSilverPerGramInr >= a.targetInrPerGram) || (ps > a.targetInrPerGram && priceSilverPerGramInr <= a.targetInrPerGram)))
        msgs.push({ id: randomId(), at: new Date().toISOString(), message: `Silver crossed ₹${a.targetInrPerGram}/g (now ₹${priceSilverPerGramInr}).` });
    }
    if (msgs.length) setInAppNotifications(n => [...msgs, ...n].slice(0, 30));
    prevGold.current = pricePerGramInr; prevSilver.current = priceSilverPerGramInr;
  }, [pricePerGramInr, priceSilverPerGramInr, priceAlerts, settings.priceAlertsEnabled]);

  const buyMetalInr = useCallback((metal: Metal, inr: number): { ok: true } | { ok: false; reason: string } => {
    if (!Number.isFinite(inr) || inr < 1) return { ok: false, reason: "Enter a valid amount (₹1+)." };
    if (inr > walletInr) return { ok: false, reason: "Insufficient wallet balance." };
    const rate = metal === "gold" ? pricePerGramInr : priceSilverPerGramInr;
    const grams = inr / rate;
    setWalletInr(w => w - inr);
    if (metal === "gold") setBalanceGrams(g => g + grams); else setBalanceSilverGrams(g => g + grams);
    setTransactions(tx => [{ id: randomId(), type: metal === "gold" ? "buy" : "silver_buy", metal, at: new Date().toISOString(), inr, grams, note: `Buy ${metal}` }, ...tx]);
    return { ok: true };
  }, [pricePerGramInr, priceSilverPerGramInr, walletInr]);

  const sellMetalGrams = useCallback((metal: Metal, grams: number): { ok: true } | { ok: false; reason: string } => {
    if (!Number.isFinite(grams) || grams <= 0) return { ok: false, reason: "Enter grams to sell." };
    const bal = metal === "gold" ? balanceGrams : balanceSilverGrams;
    if (grams > bal + 1e-9) return { ok: false, reason: "You cannot sell more than you hold." };
    const rate = metal === "gold" ? pricePerGramInr : priceSilverPerGramInr;
    const inr = Math.round(grams * rate);
    if (metal === "gold") setBalanceGrams(g => g - grams); else setBalanceSilverGrams(g => g - grams);
    setWalletInr(w => w + inr);
    setTransactions(tx => [{ id: randomId(), type: metal === "gold" ? "sell" : "silver_sell", metal, at: new Date().toISOString(), inr, grams, note: `Sell ${metal}` }, ...tx]);
    return { ok: true };
  }, [balanceGrams, balanceSilverGrams, pricePerGramInr, priceSilverPerGramInr]);

  const giftMetalGrams = useCallback((metal: Metal, grams: number, recipient: string): { ok: true } | { ok: false; reason: string } => {
    const name = recipient.trim();
    if (!name) return { ok: false, reason: "Enter recipient name or phone." };
    if (!Number.isFinite(grams) || grams <= 0) return { ok: false, reason: "Enter grams to gift." };
    const bal = metal === "gold" ? balanceGrams : balanceSilverGrams;
    if (grams > bal + 1e-9) return { ok: false, reason: "Not enough balance to gift." };
    if (metal === "gold") setBalanceGrams(g => g - grams); else setBalanceSilverGrams(g => g - grams);
    setTransactions(tx => [{ id: randomId(), type: "gift_sent", metal, at: new Date().toISOString(), grams, note: `Gift ${metal}`, recipient: name }, ...tx]);
    return { ok: true };
  }, [balanceGrams, balanceSilverGrams]);

  const createRedeemOrder = useCallback((input: { metal: Metal; grams: number; productLabel: string; addressLine: string; city: string; pin: string }): { ok: true } | { ok: false; reason: string } => {
    const pin = input.pin.trim();
    if (!/^\d{6}$/.test(pin)) return { ok: false, reason: "PIN must be 6 digits." };
    if (!input.addressLine.trim() || !input.city.trim()) return { ok: false, reason: "Fill address and city." };
    if (!Number.isFinite(input.grams) || input.grams <= 0) return { ok: false, reason: "Enter grams to redeem." };
    const bal = input.metal === "gold" ? balanceGrams : balanceSilverGrams;
    if (input.grams > bal + 1e-9) return { ok: false, reason: "Not enough metal for this order." };
    const order: RedeemOrder = { id: randomId(), createdAt: new Date().toISOString(), metal: input.metal, grams: input.grams, productLabel: input.productLabel || "Coin / bar", status: "processing", addressLine: input.addressLine.trim(), city: input.city.trim(), pin };
    if (input.metal === "gold") setBalanceGrams(g => g - input.grams); else setBalanceSilverGrams(g => g - input.grams);
    setOrders(o => [order, ...o]);
    addDoc(collection(db, "orders"), {
      userId: profile.phone.replace(/\D/g, "") || profile.phone,
      userName: profile.displayName || authUser?.name || "Customer",
      phone: profile.phone,
      source: "delivery",
      metal: order.metal,
      grams: order.grams,
      productLabel: order.productLabel,
      status: order.status,
      addressLine: order.addressLine,
      city: order.city,
      pin: order.pin,
      createdAt: serverTimestamp(),
      localOrderId: order.id,
    }).catch(() => { /* admin can still read embedded user order */ });
    setTransactions(tx => [{ id: randomId(), type: "redeem_order", metal: input.metal, at: new Date().toISOString(), grams: input.grams, note: `Delivery: ${order.productLabel}` }, ...tx]);
    return { ok: true };
  }, [authUser?.name, balanceGrams, balanceSilverGrams, profile.displayName, profile.phone]);

  const addPriceAlert = useCallback((metal: Metal, targetInrPerGram: number): { ok: true } | { ok: false; reason: string } => {
    if (!Number.isFinite(targetInrPerGram) || targetInrPerGram <= 0) return { ok: false, reason: "Enter a positive target price." };
    setPriceAlerts(a => [{ id: randomId(), metal, targetInrPerGram: Math.round(targetInrPerGram * 100) / 100, active: true, createdAt: new Date().toISOString() }, ...a]);
    return { ok: true };
  }, []);

  const removePriceAlert  = useCallback((id: string) => setPriceAlerts(a => a.filter(x => x.id !== id)), []);
  const togglePriceAlert  = useCallback((id: string, active: boolean) => setPriceAlerts(a => a.map(x => x.id === id ? { ...x, active } : x)), []);
  const updateProfile     = useCallback((next: Partial<ProfileState>) => setProfile(p => ({ ...p, ...next })), []);
  const updateSettings    = useCallback((next: Partial<SettingsState>) => setSettings(s => ({ ...s, ...next })), []);
  const markOrderStatus   = useCallback((id: string, status: RedeemOrder["status"]) => setOrders(o => o.map(x => x.id === id ? { ...x, status } : x)), []);
  const dismissNotification = useCallback((id: string) => setInAppNotifications(n => n.filter(x => x.id !== id)), []);

  const setSip = useCallback((next: Partial<SipState>) => {
    setSipState(s => {
      const updated = { ...s, ...next };
      if ((next.frequency && next.frequency !== s.frequency) || (next.active === true && !s.active)) {
        const d = new Date();
        if (updated.frequency === "daily") d.setDate(d.getDate() + 1);
        else if (updated.frequency === "weekly") d.setDate(d.getDate() + 7);
        else d.setMonth(d.getMonth() + 1);
        updated.nextDate = d.toISOString();
      }
      return updated;
    });
  }, []);

  const nextSipLabel = useMemo(() => {
    if (!sip.active) return "Paused";
    if (!sip.nextDate) return "Calculating...";
    const d = new Date(sip.nextDate);
    return `Next: ${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · ${sip.frequency}`;
  }, [sip.active, sip.frequency, sip.nextDate]);

  const portfolioInr = useMemo(
    () => balanceGrams * pricePerGramInr + balanceSilverGrams * priceSilverPerGramInr + walletInr,
    [balanceGrams, balanceSilverGrams, pricePerGramInr, priceSilverPerGramInr, walletInr]
  );

  const value = useMemo(() => ({
    pricePerGramInr, priceSilverPerGramInr, priceKarat, priceStatus, goldChangePct, silverChangePct,
    balanceGrams, balanceSilverGrams, walletInr, sip, transactions, orders, priceAlerts,
    profile, settings, referralCode, inAppNotifications, portfolioInr, nextSipLabel,
    buyMetalInr, sellMetalGrams, giftMetalGrams, createRedeemOrder,
    addPriceAlert, removePriceAlert, togglePriceAlert,
    setSip, updateProfile, updateSettings, markOrderStatus, dismissNotification,
  }), [
    pricePerGramInr, priceSilverPerGramInr, priceKarat, priceStatus, goldChangePct, silverChangePct,
    balanceGrams, balanceSilverGrams, walletInr, sip, transactions, orders, priceAlerts,
    profile, settings, referralCode, inAppNotifications, portfolioInr, nextSipLabel,
    buyMetalInr, sellMetalGrams, giftMetalGrams, createRedeemOrder,
    addPriceAlert, removePriceAlert, togglePriceAlert,
    setSip, updateProfile, updateSettings, markOrderStatus, dismissNotification,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGoldDemo() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGoldDemo must be used within GoldDemoProvider");
  return ctx;
}
