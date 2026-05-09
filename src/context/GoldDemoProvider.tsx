"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  InAppNotification,
  Metal,
  PriceAlert,
  ProfileState,
  RedeemOrder,
  SettingsState,
  SipFrequency,
  SipState,
  Transaction,
  TxType,
} from "@/context/gold-types";

export type {
  InAppNotification,
  Metal,
  PriceAlert,
  ProfileState,
  RedeemOrder,
  SettingsState,
  SipFrequency,
  SipState,
  Transaction,
  TxType,
} from "@/context/gold-types";

const WEB_STORAGE_KEY_V2 = "gold-saver-web-v2";
const WEB_STORAGE_KEY_V1 = "gold-saver-web-v1";

type GoldDemoValue = {
  pricePerGramInr: number;
  priceSilverPerGramInr: number;
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
  buyMetalInr: (
    metal: Metal,
    inr: number,
  ) => { ok: true } | { ok: false; reason: string };
  sellMetalGrams: (
    metal: Metal,
    grams: number,
  ) => { ok: true } | { ok: false; reason: string };
  giftMetalGrams: (
    metal: Metal,
    grams: number,
    recipient: string,
  ) => { ok: true } | { ok: false; reason: string };
  createRedeemOrder: (input: {
    metal: Metal;
    grams: number;
    productLabel: string;
    addressLine: string;
    city: string;
    pin: string;
  }) => { ok: true } | { ok: false; reason: string };
  addPriceAlert: (
    metal: Metal,
    targetInrPerGram: number,
  ) => { ok: true } | { ok: false; reason: string };
  removePriceAlert: (id: string) => void;
  togglePriceAlert: (id: string, active: boolean) => void;
  setSip: (next: Partial<SipState>) => void;
  updateProfile: (next: Partial<ProfileState>) => void;
  updateSettings: (next: Partial<SettingsState>) => void;
  markOrderStatus: (id: string, status: RedeemOrder["status"]) => void;
  dismissNotification: (id: string) => void;
};

const GoldDemoContext = createContext<GoldDemoValue | null>(null);

function randomId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function refCode() {
  return `GS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

const d = new Date();
d.setMonth(d.getMonth() + 1);
const defaultSip: SipState = {
  active: true,
  amountInr: 2500,
  frequency: "monthly",
  metal: "gold",
  nextDate: d.toISOString(),
};

const defaultProfile: ProfileState = {
  displayName: "Rahul Sharma",
  phone: "+91 98765 43210",
  kycTier: "pan_submitted",
};

const defaultSettings: SettingsState = {
  priceAlertsEnabled: true,
};

const seedTx: Transaction[] = [
  {
    id: "seed-sip-1",
    type: "sip",
    metal: "gold",
    at: new Date(Date.now() - 86400000 * 5).toISOString(),
    inr: 2500,
    grams: 0.296,
    note: "Monthly SIP",
  },
  {
    id: "seed-buy-1",
    type: "buy",
    metal: "gold",
    at: new Date(Date.now() - 86400000 * 12).toISOString(),
    inr: 5000,
    grams: 0.592,
    note: "Gold purchase",
  },
];

function migrateV1Object(p: Record<string, unknown>): Partial<{
  pricePerGramInr: number;
  balanceGrams: number;
  walletInr: number;
  sip: SipState;
  transactions: Transaction[];
}> {
  const out: Partial<{
    pricePerGramInr: number;
    balanceGrams: number;
    walletInr: number;
    sip: SipState;
    transactions: Transaction[];
  }> = {};
  if (typeof p.pricePerGramInr === "number") out.pricePerGramInr = p.pricePerGramInr;
  if (typeof p.balanceGrams === "number") out.balanceGrams = p.balanceGrams;
  if (typeof p.walletInr === "number") out.walletInr = p.walletInr;
  if (p.sip && typeof p.sip === "object" && p.sip !== null) {
    const s = p.sip as Record<string, unknown>;
    out.sip = {
      active: !!s.active,
      amountInr: typeof s.amountInr === "number" ? s.amountInr : 2500,
      frequency:
        s.frequency === "daily" || s.frequency === "weekly"
          ? s.frequency
          : "monthly",
      metal: s.metal === "silver" ? "silver" : "gold",
      nextDate: typeof s.nextDate === "string" ? s.nextDate : undefined,
    };
  }
  if (Array.isArray(p.transactions)) {
    out.transactions = (p.transactions as Record<string, unknown>[]).map(
      (t) => ({
        id: String(t.id ?? randomId()),
        type: normalizeLegacyType(String(t.type ?? "buy")),
        metal: (t.metal === "silver" ? "silver" : "gold") as Metal,
        at: String(t.at ?? new Date().toISOString()),
        inr: typeof t.inr === "number" ? t.inr : undefined,
        grams: typeof t.grams === "number" ? t.grams : undefined,
        note: typeof t.note === "string" ? t.note : undefined,
        recipient:
          typeof t.recipient === "string" ? t.recipient : undefined,
      }),
    );
  }
  return out;
}

function normalizeLegacyType(t: string): TxType {
  if (t === "sell") return "sell";
  if (t === "sip") return "sip";
  if (t === "silver_buy" || t === "silver_sell") return t as TxType;
  return "buy";
}

export function GoldDemoProvider({ children }: { children: React.ReactNode }) {
  const [pricePerGramInr, setPricePerGramInr] = useState(8420);
  const [priceSilverPerGramInr, setPriceSilverPerGramInr] = useState(118);
  const [balanceGrams, setBalanceGrams] = useState(2.47);
  const [balanceSilverGrams, setBalanceSilverGrams] = useState(12.4);
  const [walletInr, setWalletInr] = useState(48_500);
  const [sip, setSipState] = useState<SipState>(defaultSip);
  const [transactions, setTransactions] = useState<Transaction[]>(seedTx);
  const [orders, setOrders] = useState<RedeemOrder[]>([
    {
      id: "seed-order-1",
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      metal: "gold",
      grams: 1,
      productLabel: "1 g 24K coin",
      status: "shipped",
      addressLine: "221B Demo Street",
      city: "Bengaluru",
      pin: "560001",
    },
  ]);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [profile, setProfile] = useState<ProfileState>(defaultProfile);
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [referralCode, setReferralCode] = useState(refCode);
  const [inAppNotifications, setInAppNotifications] = useState<
    InAppNotification[]
  >([]);
  const skipSave = useRef(true);
  const prevGold = useRef<number | null>(null);
  const prevSilver = useRef<number | null>(null);

  useEffect(() => {
    try {
      const raw2 = localStorage.getItem(WEB_STORAGE_KEY_V2);
      if (raw2) {
        const p = JSON.parse(raw2) as Record<string, unknown>;
        if (typeof p.pricePerGramInr === "number")
          setPricePerGramInr(p.pricePerGramInr);
        if (typeof p.priceSilverPerGramInr === "number")
          setPriceSilverPerGramInr(p.priceSilverPerGramInr);
        if (typeof p.balanceGrams === "number") setBalanceGrams(p.balanceGrams);
        if (typeof p.balanceSilverGrams === "number")
          setBalanceSilverGrams(p.balanceSilverGrams);
        if (typeof p.walletInr === "number") setWalletInr(p.walletInr);
        if (p.sip && typeof p.sip === "object") {
          const s = p.sip as Record<string, unknown>;
          setSipState({
            active: !!s.active,
            amountInr: typeof s.amountInr === "number" ? s.amountInr : 2500,
            frequency:
              s.frequency === "daily" || s.frequency === "weekly"
                ? (s.frequency as SipFrequency)
                : "monthly",
            metal: s.metal === "silver" ? "silver" : "gold",
            nextDate: typeof s.nextDate === "string" ? s.nextDate : undefined,
          });
        }
        if (Array.isArray(p.transactions))
          setTransactions(p.transactions as Transaction[]);
        if (Array.isArray(p.orders)) setOrders(p.orders as RedeemOrder[]);
        if (Array.isArray(p.priceAlerts))
          setPriceAlerts(p.priceAlerts as PriceAlert[]);
        if (p.profile && typeof p.profile === "object") {
          const pr = p.profile as Record<string, unknown>;
          setProfile({
            displayName: String(pr.displayName ?? defaultProfile.displayName),
            phone: String(pr.phone ?? defaultProfile.phone),
            kycTier:
              pr.kycTier === "verified" || pr.kycTier === "none"
                ? (pr.kycTier as ProfileState["kycTier"])
                : "pan_submitted",
          });
        }
        if (p.settings && typeof p.settings === "object") {
          const st = p.settings as Record<string, unknown>;
          setSettings({
            priceAlertsEnabled: st.priceAlertsEnabled !== false,
          });
        }
        if (Array.isArray(p.inAppNotifications))
          setInAppNotifications(p.inAppNotifications as InAppNotification[]);
        if (typeof p.referralCode === "string" && p.referralCode.length > 2)
          setReferralCode(p.referralCode);
      } else {
        const raw1 = localStorage.getItem(WEB_STORAGE_KEY_V1);
        if (raw1) {
          const m = migrateV1Object(JSON.parse(raw1) as Record<string, unknown>);
          if (typeof m.pricePerGramInr === "number")
            setPricePerGramInr(m.pricePerGramInr);
          if (typeof m.balanceGrams === "number")
            setBalanceGrams(m.balanceGrams);
          if (typeof m.walletInr === "number") setWalletInr(m.walletInr);
          if (m.sip) setSipState(m.sip);
          if (m.transactions) setTransactions(m.transactions);
        }
      }
    } catch {
      /* ignore */
    }
    skipSave.current = false;
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => {
      setPricePerGramInr((p) => {
        const delta = (Math.random() - 0.5) * 12;
        return Math.round(Math.max(8000, Math.min(9000, p + delta)));
      });
      setPriceSilverPerGramInr((p) => {
        const delta = (Math.random() - 0.5) * 1.2;
        return Math.round(Math.max(95, Math.min(140, p + delta)) * 10) / 10;
      });
    }, 4000);
    return () => window.clearInterval(t);
  }, []);

  // Background SIP Execution
  useEffect(() => {
    if (!sip.active) return;
    
    // If active but no nextDate, initialize it
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
      const next = new Date(sip.nextDate!).getTime();
      
      if (now >= next) {
        // Execute SIP
        setSipState(currentSip => {
          // Double check to prevent race conditions
          const currentNext = new Date(currentSip.nextDate!).getTime();
          if (now < currentNext) return currentSip;
          
          const rate = currentSip.metal === "gold" ? pricePerGramInr : priceSilverPerGramInr;
          const amount = currentSip.amountInr;
          
          if (walletInr >= amount) {
            const grams = amount / rate;
            setWalletInr(w => w - amount);
            if (currentSip.metal === "gold") setBalanceGrams(g => g + grams);
            else setBalanceSilverGrams(g => g + grams);
            
            setTransactions(tx => [{
              id: randomId(),
              type: "sip",
              metal: currentSip.metal,
              at: new Date().toISOString(),
              inr: amount,
              grams,
              note: `Auto SIP (${currentSip.frequency})`
            }, ...tx]);
            
            setInAppNotifications(n => [{
              id: randomId(),
              at: new Date().toISOString(),
              message: `Auto SIP successful: Added ${grams.toFixed(4)}g ${currentSip.metal} for ₹${amount}.`
            }, ...n].slice(0, 30));
          } else {
            setInAppNotifications(n => [{
              id: randomId(),
              at: new Date().toISOString(),
              message: `Auto SIP failed: Insufficient wallet balance for ₹${amount}.`
            }, ...n].slice(0, 30));
          }
          
          // Calculate next date
          const d = new Date(currentSip.nextDate!);
          if (currentSip.frequency === "daily") d.setDate(d.getDate() + 1);
          else if (currentSip.frequency === "weekly") d.setDate(d.getDate() + 7);
          else d.setMonth(d.getMonth() + 1);
          
          // Fast-forward if user hasn't opened app in a long time
          while (d.getTime() <= Date.now()) {
            if (currentSip.frequency === "daily") d.setDate(d.getDate() + 1);
            else if (currentSip.frequency === "weekly") d.setDate(d.getDate() + 7);
            else d.setMonth(d.getMonth() + 1);
          }
          
          return { ...currentSip, nextDate: d.toISOString() };
        });
      }
    }, 1000); // Check every second
    
    return () => window.clearInterval(t);
  }, [sip.active, sip.nextDate, pricePerGramInr, priceSilverPerGramInr, walletInr]);

  useEffect(() => {
    if (skipSave.current) return;
    if (prevGold.current === null || prevSilver.current === null) {
      prevGold.current = pricePerGramInr;
      prevSilver.current = priceSilverPerGramInr;
      return;
    }
    if (!settings.priceAlertsEnabled) {
      prevGold.current = pricePerGramInr;
      prevSilver.current = priceSilverPerGramInr;
      return;
    }
    const pg = prevGold.current!;
    const ps = prevSilver.current!;
    const goldCross = priceAlerts.filter(
      (a) =>
        a.active &&
        a.metal === "gold" &&
        ((pg < a.targetInrPerGram && pricePerGramInr >= a.targetInrPerGram) ||
          (pg > a.targetInrPerGram && pricePerGramInr <= a.targetInrPerGram)),
    );
    const silverCross = priceAlerts.filter(
      (a) =>
        a.active &&
        a.metal === "silver" &&
        ((ps < a.targetInrPerGram &&
          priceSilverPerGramInr >= a.targetInrPerGram) ||
          (ps > a.targetInrPerGram &&
            priceSilverPerGramInr <= a.targetInrPerGram)),
    );
    const msgs: InAppNotification[] = [];
    for (const a of goldCross) {
      msgs.push({
        id: randomId(),
        at: new Date().toISOString(),
        message: `Gold price crossed ₹${a.targetInrPerGram}/g (now ₹${pricePerGramInr}).`,
      });
    }
    for (const a of silverCross) {
      msgs.push({
        id: randomId(),
        at: new Date().toISOString(),
        message: `Silver price crossed ₹${a.targetInrPerGram}/g (now ₹${priceSilverPerGramInr}).`,
      });
    }
    if (msgs.length) {
      setInAppNotifications((n) => [...msgs, ...n].slice(0, 30));
    }
    prevGold.current = pricePerGramInr;
    prevSilver.current = priceSilverPerGramInr;
  }, [pricePerGramInr, priceSilverPerGramInr, priceAlerts, settings.priceAlertsEnabled]);

  useEffect(() => {
    if (skipSave.current) return;
    try {
      localStorage.setItem(
        WEB_STORAGE_KEY_V2,
        JSON.stringify({
          version: 2,
          pricePerGramInr,
          priceSilverPerGramInr,
          balanceGrams,
          balanceSilverGrams,
          walletInr,
          sip,
          transactions,
          orders,
          priceAlerts,
          profile,
          settings,
          inAppNotifications,
          referralCode,
        }),
      );
    } catch {
      /* ignore */
    }
  }, [
    pricePerGramInr,
    priceSilverPerGramInr,
    balanceGrams,
    balanceSilverGrams,
    walletInr,
    sip,
    transactions,
    orders,
    priceAlerts,
    profile,
    settings,
    inAppNotifications,
    referralCode,
  ]);

  const buyMetalInr = useCallback(
    (metal: Metal, inr: number): { ok: true } | { ok: false; reason: string } => {
      if (!Number.isFinite(inr) || inr < 1) {
        return { ok: false, reason: "Enter a valid amount (₹1+)." };
      }
      if (inr > walletInr) {
        return { ok: false, reason: "Insufficient wallet balance." };
      }
      const rate = metal === "gold" ? pricePerGramInr : priceSilverPerGramInr;
      const grams = inr / rate;
      setWalletInr((w) => w - inr);
      if (metal === "gold") setBalanceGrams((g) => g + grams);
      else setBalanceSilverGrams((g) => g + grams);
      const type: TxType = metal === "gold" ? "buy" : "silver_buy";
      setTransactions((tx) => [
        {
          id: randomId(),
          type,
          metal,
          at: new Date().toISOString(),
          inr,
          grams,
          note: metal === "gold" ? "Buy gold" : "Buy silver",
        },
        ...tx,
      ]);
      return { ok: true };
    },
    [pricePerGramInr, priceSilverPerGramInr, walletInr],
  );

  const sellMetalGrams = useCallback(
    (
      metal: Metal,
      grams: number,
    ): { ok: true } | { ok: false; reason: string } => {
      if (!Number.isFinite(grams) || grams <= 0) {
        return { ok: false, reason: "Enter grams to sell." };
      }
      const bal = metal === "gold" ? balanceGrams : balanceSilverGrams;
      if (grams > bal + 1e-9) {
        return { ok: false, reason: "You cannot sell more than you hold." };
      }
      const rate = metal === "gold" ? pricePerGramInr : priceSilverPerGramInr;
      const inr = Math.round(grams * rate);
      if (metal === "gold") setBalanceGrams((g) => g - grams);
      else setBalanceSilverGrams((g) => g - grams);
      setWalletInr((w) => w + inr);
      const type: TxType = metal === "gold" ? "sell" : "silver_sell";
      setTransactions((tx) => [
        {
          id: randomId(),
          type,
          metal,
          at: new Date().toISOString(),
          inr,
          grams,
          note: metal === "gold" ? "Sell gold" : "Sell silver",
        },
        ...tx,
      ]);
      return { ok: true };
    },
    [balanceGrams, balanceSilverGrams, pricePerGramInr, priceSilverPerGramInr],
  );

  const giftMetalGrams = useCallback(
    (
      metal: Metal,
      grams: number,
      recipient: string,
    ): { ok: true } | { ok: false; reason: string } => {
      const name = recipient.trim();
      if (!name) return { ok: false, reason: "Enter recipient name or phone." };
      const bal = metal === "gold" ? balanceGrams : balanceSilverGrams;
      if (!Number.isFinite(grams) || grams <= 0) {
        return { ok: false, reason: "Enter grams to gift." };
      }
      if (grams > bal + 1e-9) {
        return { ok: false, reason: "Not enough balance to gift." };
      }
      if (metal === "gold") setBalanceGrams((g) => g - grams);
      else setBalanceSilverGrams((g) => g - grams);
      setTransactions((tx) => [
        {
          id: randomId(),
          type: "gift_sent",
          metal,
          at: new Date().toISOString(),
          grams,
          note: `Gift ${metal}`,
          recipient: name,
        },
        ...tx,
      ]);
      return { ok: true };
    },
    [balanceGrams, balanceSilverGrams],
  );

  const createRedeemOrder = useCallback(
    (input: {
      metal: Metal;
      grams: number;
      productLabel: string;
      addressLine: string;
      city: string;
      pin: string;
    }): { ok: true } | { ok: false; reason: string } => {
      const pin = input.pin.trim();
      if (!/^\d{6}$/.test(pin)) {
        return { ok: false, reason: "PIN must be 6 digits." };
      }
      if (!input.addressLine.trim() || !input.city.trim()) {
        return { ok: false, reason: "Fill address and city." };
      }
      const grams = input.grams;
      const bal = input.metal === "gold" ? balanceGrams : balanceSilverGrams;
      if (!Number.isFinite(grams) || grams <= 0) {
        return { ok: false, reason: "Enter grams to redeem." };
      }
      if (grams > bal + 1e-9) {
        return { ok: false, reason: "Not enough metal for this order." };
      }
      const id = randomId();
      const order: RedeemOrder = {
        id,
        createdAt: new Date().toISOString(),
        metal: input.metal,
        grams,
        productLabel: input.productLabel || "Coin / bar",
        status: "processing",
        addressLine: input.addressLine.trim(),
        city: input.city.trim(),
        pin,
      };
      if (input.metal === "gold") setBalanceGrams((g) => g - grams);
      else setBalanceSilverGrams((g) => g - grams);
      setOrders((o) => [order, ...o]);
      setTransactions((tx) => [
        {
          id: randomId(),
          type: "redeem_order",
          metal: input.metal,
          at: new Date().toISOString(),
          grams,
          note: `Delivery: ${order.productLabel}`,
        },
        ...tx,
      ]);
      return { ok: true };
    },
    [balanceGrams, balanceSilverGrams],
  );

  const addPriceAlert = useCallback(
    (
      metal: Metal,
      targetInrPerGram: number,
    ): { ok: true } | { ok: false; reason: string } => {
      if (!Number.isFinite(targetInrPerGram) || targetInrPerGram <= 0) {
        return { ok: false, reason: "Enter a positive target price." };
      }
      setPriceAlerts((a) => [
        {
          id: randomId(),
          metal,
          targetInrPerGram: Math.round(targetInrPerGram * 100) / 100,
          active: true,
          createdAt: new Date().toISOString(),
        },
        ...a,
      ]);
      return { ok: true };
    },
    [],
  );

  const removePriceAlert = useCallback((id: string) => {
    setPriceAlerts((a) => a.filter((x) => x.id !== id));
  }, []);

  const togglePriceAlert = useCallback((id: string, active: boolean) => {
    setPriceAlerts((a) =>
      a.map((x) => (x.id === id ? { ...x, active } : x)),
    );
  }, []);

  const setSip = useCallback((next: Partial<SipState>) => {
    setSipState((s) => {
      const updated = { ...s, ...next };
      // Recalculate nextDate if frequency changes or if turned on
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

  const updateProfile = useCallback((next: Partial<ProfileState>) => {
    setProfile((p) => ({ ...p, ...next }));
  }, []);

  const updateSettings = useCallback((next: Partial<SettingsState>) => {
    setSettings((s) => ({ ...s, ...next }));
  }, []);

  const markOrderStatus = useCallback((id: string, status: RedeemOrder["status"]) => {
    setOrders((o) =>
      o.map((x) => (x.id === id ? { ...x, status } : x)),
    );
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setInAppNotifications((n) => n.filter((x) => x.id !== id));
  }, []);

  const nextSipLabel = useMemo(() => {
    if (!sip.active) return "Paused";
    if (!sip.nextDate) return "Calculating...";
    const d = new Date(sip.nextDate);
    const dateStr = d.toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = d.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' });
    const freq = sip.frequency.charAt(0).toUpperCase() + sip.frequency.slice(1);
    return `Next debit: ${dateStr} at ${timeStr} · ${freq}`;
  }, [sip.active, sip.frequency, sip.nextDate]);

  const portfolioInr = useMemo(
    () =>
      balanceGrams * pricePerGramInr +
      balanceSilverGrams * priceSilverPerGramInr +
      walletInr,
    [
      balanceGrams,
      balanceSilverGrams,
      pricePerGramInr,
      priceSilverPerGramInr,
      walletInr,
    ],
  );

  const value = useMemo(
    () => ({
      pricePerGramInr,
      priceSilverPerGramInr,
      balanceGrams,
      balanceSilverGrams,
      walletInr,
      sip,
      transactions,
      orders,
      priceAlerts,
      profile,
      settings,
      referralCode,
      inAppNotifications,
      portfolioInr,
      nextSipLabel,
      buyMetalInr,
      sellMetalGrams,
      giftMetalGrams,
      createRedeemOrder,
      addPriceAlert,
      removePriceAlert,
      togglePriceAlert,
      setSip,
      updateProfile,
      updateSettings,
      markOrderStatus,
      dismissNotification,
    }),
    [
      pricePerGramInr,
      priceSilverPerGramInr,
      balanceGrams,
      balanceSilverGrams,
      walletInr,
      sip,
      transactions,
      orders,
      priceAlerts,
      profile,
      settings,
      referralCode,
      inAppNotifications,
      portfolioInr,
      nextSipLabel,
      buyMetalInr,
      sellMetalGrams,
      giftMetalGrams,
      createRedeemOrder,
      addPriceAlert,
      removePriceAlert,
      togglePriceAlert,
      setSip,
      updateProfile,
      updateSettings,
      markOrderStatus,
      dismissNotification,
    ],
  );

  return (
    <GoldDemoContext.Provider value={value}>
      {children}
    </GoldDemoContext.Provider>
  );
}

export function useGoldDemo() {
  const ctx = useContext(GoldDemoContext);
  if (!ctx) {
    throw new Error("useGoldDemo must be used within GoldDemoProvider");
  }
  return ctx;
}
