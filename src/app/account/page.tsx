"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Metal, BankDetails, AddressDetails } from "@/context/GoldDemoProvider";
import { useGoldDemo } from "@/context/GoldDemoProvider";
import { useAuth } from "@/context/AuthContext";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
function fmtExact(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export default function AccountPage() {
  const { user, logout, hasPin } = useAuth();
  const router = useRouter();
  const {
    profile, updateProfile, referralCode,
    settings, updateSettings,
    priceAlerts, addPriceAlert, removePriceAlert, togglePriceAlert,
    pricePerGramInr, priceSilverPerGramInr,
    balanceGrams, balanceSilverGrams, walletInr, portfolioInr,
    inAppNotifications, dismissNotification,
  } = useGoldDemo();

  const [alertMetal, setAlertMetal] = useState<Metal>("gold");
  const [alertTarget, setAlertTarget] = useState("");
  const [alertMsg, setAlertMsg]   = useState<string | null>(null);
  const [alertOk, setAlertOk]     = useState(false);
  const [copied, setCopied]       = useState(false);

  // Bank edit state
  const [editBank, setEditBank] = useState(false);
  const [bankForm, setBankForm] = useState<BankDetails>({ ...profile.bank });
  const [bankSaved, setBankSaved] = useState(false);

  // Address edit state
  const [editAddr, setEditAddr] = useState(false);
  const [addrForm, setAddrForm] = useState<AddressDetails>({ ...profile.address });
  const [addrSaved, setAddrSaved] = useState(false);

  function saveBank() {
    updateProfile({ bank: { ...bankForm } });
    setEditBank(false);
    setBankSaved(true);
    setTimeout(() => setBankSaved(false), 2500);
  }

  function saveAddr() {
    updateProfile({ address: { ...addrForm } });
    setEditAddr(false);
    setAddrSaved(true);
    setTimeout(() => setAddrSaved(false), 2500);
  }

  const kycBadge = {
    none:          { cls: "badge-red",   text: "Not Verified",  icon: "❌" },
    pan_submitted: { cls: "badge-amber", text: "PAN Submitted", icon: "⏳" },
    verified:      { cls: "badge-green", text: "KYC Verified",  icon: "✅" },
  };

  const goldValue   = balanceGrams * pricePerGramInr;
  const silverValue = balanceSilverGrams * priceSilverPerGramInr;

  function handleLogout() { logout(); router.replace("/login"); }

  function copyReferral() {
    navigator.clipboard?.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Get gmail from sessionStorage or profile
  const gmail = typeof window !== "undefined"
    ? sessionStorage.getItem("dg-reg-gmail") || ""
    : "";

  return (
    <div className="page-enter flex flex-col gap-0 pb-8">

      {/* ── Profile Header ── */}
      <div className="bg-gradient-to-br from-[#7b1c1c] via-[#a52a2a] to-[#b8860b] px-4 pt-4 pb-6">
        <div className="flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-white/20 border-[3px] border-white/40 flex items-center justify-center mb-3 shadow-xl">
            <span className="text-[32px] font-extrabold text-white">
              {(user?.name ?? profile.displayName)[0]?.toUpperCase()}
            </span>
          </div>

          {/* Name */}
          <h2 className="text-[22px] font-extrabold text-white leading-tight">
            {user?.name ?? profile.displayName}
          </h2>

          {/* Phone */}
          <p className="text-[13px] text-white/70 mt-1 flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.11 12 19.79 19.79 0 0 1 1.07 3.4 2 2 0 0 1 3.04 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            +91 {user?.phone ?? profile.phone}
          </p>

          {/* Gmail if available */}
          {gmail && (
            <p className="text-[12px] text-white/60 mt-0.5 flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
              {gmail}
            </p>
          )}

          {/* Badges row */}
          <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
            <span className={kycBadge[profile.kycTier].cls}>
              {kycBadge[profile.kycTier].icon} {kycBadge[profile.kycTier].text}
            </span>
            {hasPin() && (
              <span className="badge-green">🔒 PIN Active</span>
            )}
            {user?.role === "admin" && (
              <span className="badge-blue">👑 Admin</span>
            )}
          </div>
        </div>

        {/* Portfolio summary inside header */}
        <div className="mt-5 bg-white/10 border border-white/20 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-2">My Portfolio</p>
          <p className="text-[26px] font-extrabold text-white tabular-nums">{fmt(portfolioInr)}</p>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-white/10 rounded-xl p-2 text-center">
              <p className="text-[9px] font-bold text-[#F5C842]/70 uppercase tracking-wider">Gold</p>
              <p className="text-[13px] font-bold text-[#F5C842]">{balanceGrams.toFixed(4)}g</p>
              <p className="text-[9px] text-white/40">{fmt(goldValue)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-2 text-center">
              <p className="text-[9px] font-bold text-white/50 uppercase tracking-wider">Silver</p>
              <p className="text-[13px] font-bold text-white/90">{balanceSilverGrams.toFixed(2)}g</p>
              <p className="text-[9px] text-white/40">{fmt(silverValue)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-2 text-center">
              <p className="text-[9px] font-bold text-white/50 uppercase tracking-wider">Wallet</p>
              <p className="text-[13px] font-bold text-white/90">{fmt(walletInr)}</p>
              <p className="text-[9px] text-white/40">Balance</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 flex flex-col gap-4 mt-4">

        {/* ── Account Info (read-only from login) ── */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-[#fdf3d0] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b8860b" strokeWidth="2" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <p className="text-[14px] font-bold text-[#1c1208]">Account Info</p>
          </div>

          {/* Info rows */}
          {[
            { label: "Full Name",     value: user?.name ?? profile.displayName, icon: "👤" },
            { label: "Mobile",        value: `+91 ${user?.phone ?? profile.phone}`, icon: "📱" },
            { label: "Gmail",         value: gmail || "Not linked",              icon: "📧" },
            { label: "Account Type",  value: user?.role === "admin" ? "Admin" : "User", icon: "🏷️" },
            { label: "PIN Security",  value: hasPin() ? "PIN Set ✓" : "Not Set", icon: "🔒" },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-[#f5f0e8] last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-[14px]">{row.icon}</span>
                <span className="text-[12px] font-semibold text-[#9a8060]">{row.label}</span>
              </div>
              <span className="text-[13px] font-bold text-[#1c1208] text-right max-w-[55%] truncate">{row.value}</span>
            </div>
          ))}
        </div>

        {/* ── Bank Details ── */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#fdf3d0] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b8860b" strokeWidth="2" strokeLinecap="round">
                  <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
                </svg>
              </div>
              <p className="text-[14px] font-bold text-[#1c1208]">Bank Details</p>
            </div>
            <button type="button" onClick={() => { setBankForm({ ...profile.bank }); setEditBank(e => !e); }}
              className="text-[12px] font-bold text-[#b8860b] px-3 py-1.5 rounded-xl bg-[#fdf3d0] border border-[#e8c84a] active:scale-95 transition-transform">
              {editBank ? "Cancel" : profile.bank.accountNumber ? "Edit" : "+ Add"}
            </button>
          </div>

          {bankSaved && (
            <div className="flex items-center gap-2 bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl px-3 py-2 mb-3">
              <span>✅</span>
              <p className="text-[12px] font-bold text-emerald-700">Bank details saved!</p>
            </div>
          )}

          {!editBank && !profile.bank.accountNumber && (
            <div className="bg-[#fdf3d0] rounded-xl px-4 py-3 text-center">
              <p className="text-[12px] text-[#9a8060]">No bank account linked yet.</p>
              <p className="text-[11px] text-[#b8860b] mt-1 font-medium">Required for gold sell payouts</p>
            </div>
          )}

          {!editBank && profile.bank.accountNumber && (
            <div className="flex flex-col gap-2">
              {[
                { label: "Account Holder", value: profile.bank.accountHolder },
                { label: "Account Number", value: `XXXX XXXX ${profile.bank.accountNumber.slice(-4)}` },
                { label: "IFSC Code",      value: profile.bank.ifsc },
                { label: "Bank Name",      value: profile.bank.bankName },
                { label: "Account Type",   value: profile.bank.accountType === "savings" ? "Savings" : "Current" },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between py-2 border-b border-[#f5f0e8] last:border-0">
                  <span className="text-[12px] font-semibold text-[#9a8060]">{r.label}</span>
                  <span className="text-[13px] font-bold text-[#1c1208]">{r.value}</span>
                </div>
              ))}
            </div>
          )}

          {editBank && (
            <div className="flex flex-col gap-3">
              {([
                { key: "accountHolder", label: "Account Holder Name", placeholder: "As per bank records" },
                { key: "accountNumber", label: "Account Number",       placeholder: "Enter account number", inputMode: "numeric" },
                { key: "ifsc",          label: "IFSC Code",            placeholder: "e.g. SBIN0001234" },
                { key: "bankName",      label: "Bank Name",            placeholder: "e.g. State Bank of India" },
              ] as { key: keyof BankDetails; label: string; placeholder: string; inputMode?: string }[]).map(f => (
                <div key={f.key}>
                  <label className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider block mb-1">{f.label}</label>
                  <input
                    className="input-field"
                    placeholder={f.placeholder}
                    inputMode={(f.inputMode as "numeric" | undefined) ?? "text"}
                    value={bankForm[f.key] as string}
                    onChange={e => setBankForm(b => ({ ...b, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
              <div>
                <label className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider block mb-1">Account Type</label>
                <div className="flex gap-2">
                  {(["savings", "current"] as const).map(t => (
                    <button key={t} type="button" onClick={() => setBankForm(b => ({ ...b, accountType: t }))}
                      className={`chip flex-1 capitalize ${bankForm.accountType === t ? "chip-on" : "chip-off"} active:scale-95 transition-transform`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <button type="button" onClick={saveBank}
                className="btn-gold w-full mt-1">💾 Save Bank Details</button>
            </div>
          )}
        </div>

        {/* ── Address ── */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#fdf3d0] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b8860b" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <p className="text-[14px] font-bold text-[#1c1208]">Delivery Address</p>
            </div>
            <button type="button" onClick={() => { setAddrForm({ ...profile.address }); setEditAddr(e => !e); }}
              className="text-[12px] font-bold text-[#b8860b] px-3 py-1.5 rounded-xl bg-[#fdf3d0] border border-[#e8c84a] active:scale-95 transition-transform">
              {editAddr ? "Cancel" : profile.address.line1 ? "Edit" : "+ Add"}
            </button>
          </div>

          {addrSaved && (
            <div className="flex items-center gap-2 bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl px-3 py-2 mb-3">
              <span>✅</span>
              <p className="text-[12px] font-bold text-emerald-700">Address saved!</p>
            </div>
          )}

          {!editAddr && !profile.address.line1 && (
            <div className="bg-[#fdf3d0] rounded-xl px-4 py-3 text-center">
              <p className="text-[12px] text-[#9a8060]">No delivery address added yet.</p>
              <p className="text-[11px] text-[#b8860b] mt-1 font-medium">Required for physical gold delivery</p>
            </div>
          )}

          {!editAddr && profile.address.line1 && (
            <div className="bg-[#fdf3d0] border border-[#e8c84a] rounded-xl px-4 py-3">
              <p className="text-[13px] font-bold text-[#1c1208]">{profile.address.line1}</p>
              {profile.address.line2 && <p className="text-[12px] text-[#5a4a2a] mt-0.5">{profile.address.line2}</p>}
              <p className="text-[12px] text-[#5a4a2a] mt-0.5">{profile.address.city}{profile.address.state ? `, ${profile.address.state}` : ""} – {profile.address.pincode}</p>
            </div>
          )}

          {editAddr && (
            <div className="flex flex-col gap-3">
              {([
                { key: "line1",   label: "Address Line 1", placeholder: "House / Flat / Building" },
                { key: "line2",   label: "Address Line 2", placeholder: "Street / Area (optional)" },
                { key: "city",    label: "City",           placeholder: "e.g. Chennai" },
                { key: "state",   label: "State",          placeholder: "e.g. Tamil Nadu" },
                { key: "pincode", label: "PIN Code",       placeholder: "6-digit PIN", inputMode: "numeric" },
              ] as { key: keyof AddressDetails; label: string; placeholder: string; inputMode?: string }[]).map(f => (
                <div key={f.key}>
                  <label className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider block mb-1">{f.label}</label>
                  <input
                    className="input-field"
                    placeholder={f.placeholder}
                    inputMode={(f.inputMode as "numeric" | undefined) ?? "text"}
                    maxLength={f.key === "pincode" ? 6 : undefined}
                    value={addrForm[f.key]}
                    onChange={e => setAddrForm(a => ({ ...a, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
              <button type="button" onClick={saveAddr}
                className="btn-gold w-full mt-1">💾 Save Address</button>
            </div>
          )}
        </div>

        {/* ── KYC Status ── */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-[#fdf3d0] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b8860b" strokeWidth="2" strokeLinecap="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <p className="text-[14px] font-bold text-[#1c1208]">KYC Verification</p>
          </div>
          <div className="flex gap-2">
            {(["none", "pan_submitted", "verified"] as const).map(t => (
              <button key={t} type="button" onClick={() => updateProfile({ kycTier: t })}
                className={`chip flex-1 text-[11px] ${profile.kycTier === t ? "chip-on" : "chip-off"} active:scale-95 transition-transform`}>
                {t === "none" ? "None" : t === "pan_submitted" ? "PAN" : "Verified"}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[#9a8060] mt-2">
            Current: <span className="font-bold text-[#b8860b]">{kycBadge[profile.kycTier].text}</span>
          </p>
        </div>

        {/* ── Live Prices ── */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-[#fdf3d0] flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#b8860b] live-dot" />
            </div>
            <p className="text-[14px] font-bold text-[#1c1208]">Live Prices</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#fdf3d0] rounded-xl p-3 border border-[#e8c84a]">
              <p className="text-[10px] font-bold text-[#9a8060] uppercase tracking-wider">🥇 Gold 24K/g</p>
              <p className="text-[16px] font-extrabold text-[#b8860b] mt-1">{fmtExact(pricePerGramInr)}</p>
            </div>
            <div className="bg-[#f5f5f5] rounded-xl p-3 border border-[#e0e0e0]">
              <p className="text-[10px] font-bold text-[#9a8060] uppercase tracking-wider">🥈 Silver/g</p>
              <p className="text-[16px] font-extrabold text-[#5a5a5a] mt-1">{fmtExact(priceSilverPerGramInr)}</p>
            </div>
          </div>
        </div>

        {/* ── Referral ── */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-[#fdf3d0] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b8860b" strokeWidth="2" strokeLinecap="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            </div>
            <p className="text-[14px] font-bold text-[#1c1208]">Refer & Earn 🎁</p>
          </div>
          <p className="text-[12px] text-[#9a8060] mb-3">Share your code — earn gold when friends join</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-xl bg-[#fdf3d0] border border-[#e8c84a] px-4 py-3 text-center">
              <span className="font-mono text-[20px] font-extrabold tracking-[0.25em] text-[#b8860b]">{referralCode}</span>
            </div>
            <button type="button" onClick={copyReferral}
              className={`w-12 h-12 rounded-xl border flex items-center justify-center active:scale-90 transition-all shrink-0 ${
                copied ? "bg-[#dcfce7] border-[#bbf7d0]" : "bg-[#fdf3d0] border-[#e8c84a]"
              }`}>
              {copied
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b8860b" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              }
            </button>
          </div>
          {copied && <p className="text-[11px] text-[#15803d] font-semibold mt-2 text-center">✓ Copied to clipboard!</p>}
        </div>

        {/* ── Price Alerts ── */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#fdf3d0] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b8860b" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </div>
              <p className="text-[14px] font-bold text-[#1c1208]">Price Alerts</p>
            </div>
            <button type="button" onClick={() => updateSettings({ priceAlertsEnabled: !settings.priceAlertsEnabled })}
              className={`toggle-track ${settings.priceAlertsEnabled ? "bg-[#15803d]" : "bg-[#d0c8b8]"}`}>
              <div className={`toggle-thumb ${settings.priceAlertsEnabled ? "left-[25px]" : "left-[3px]"}`} />
            </button>
          </div>

          <div className="flex gap-2 mb-3">
            {(["gold", "silver"] as const).map(m => (
              <button key={m} type="button" onClick={() => setAlertMetal(m)}
                className={`chip flex-1 ${alertMetal === m ? "chip-on" : "chip-off"} active:scale-95 transition-transform`}>
                {m === "gold" ? "🥇 Gold" : "🥈 Silver"}
              </button>
            ))}
          </div>
          <input className="input-field mb-3" inputMode="decimal" value={alertTarget}
            onChange={e => setAlertTarget(e.target.value)}
            placeholder={`Target price/g (current: ${fmt(alertMetal === "gold" ? pricePerGramInr : priceSilverPerGramInr)})`} />
          {alertMsg && (
            <div className={`rounded-xl px-3 py-2 text-[12px] font-semibold mb-3 ${alertOk ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#fee2e2] text-[#b91c1c]"}`}>
              {alertMsg}
            </div>
          )}
          <button type="button" className="btn-gold w-full mb-3" onClick={() => {
            const r = addPriceAlert(alertMetal, Number(alertTarget));
            if (r.ok) { setAlertMsg("✓ Alert created!"); setAlertOk(true); setAlertTarget(""); }
            else { setAlertMsg(r.reason); setAlertOk(false); }
          }}>
            + Create Alert
          </button>

          {priceAlerts.length > 0 && (
            <div className="flex flex-col gap-2">
              {priceAlerts.map(a => (
                <div key={a.id} className="flex items-center gap-2 rounded-xl bg-[#fdfaf4] border border-[#ede0c4] px-3 py-2.5">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${a.active ? "bg-[#15803d]" : "bg-[#d0c8b8]"}`} />
                  <span className="flex-1 text-[13px] font-medium text-[#5a4a2a]">
                    {a.metal === "gold" ? "🥇 Gold" : "🥈 Silver"} @ {fmt(a.targetInrPerGram)}
                  </span>
                  <button type="button" onClick={() => togglePriceAlert(a.id, !a.active)}
                    className={`toggle-track shrink-0 ${a.active ? "bg-[#15803d]" : "bg-[#d0c8b8]"}`} style={{ width: 40, height: 22 }}>
                    <div className={`toggle-thumb ${a.active ? "left-[20px]" : "left-[2px]"}`} style={{ width: 18, height: 18 }} />
                  </button>
                  <button type="button" onClick={() => removePriceAlert(a.id)}
                    className="w-7 h-7 rounded-lg bg-[#fee2e2] flex items-center justify-center active:scale-90 transition-transform shrink-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Notifications ── */}
        {inAppNotifications.length > 0 && (
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-bold text-[#1c1208]">🔔 Notifications</p>
              <span className="badge-gold">{inAppNotifications.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {inAppNotifications.slice(0, 5).map(n => (
                <div key={n.id} className="flex items-start gap-2 rounded-xl bg-[#fdfaf4] border border-[#ede0c4] px-3 py-2.5">
                  <div className="w-2 h-2 rounded-full bg-[#b8860b] mt-1.5 shrink-0 live-dot" />
                  <span className="flex-1 text-[12px] text-[#5a4a2a] leading-relaxed">{n.message}</span>
                  <button type="button" onClick={() => dismissNotification(n.id)}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-[#f0e8d8] active:scale-90 transition-transform shrink-0">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9a8060" strokeWidth="3" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Security ── */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-[#fdf3d0] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b8860b" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <p className="text-[14px] font-bold text-[#1c1208]">Security</p>
          </div>
          <button type="button" onClick={() => router.push("/setpin")}
            className="w-full flex items-center justify-between py-3 border-b border-[#f0e8d8] active:bg-[#fdfaf4] rounded-lg px-1 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-[16px]">🔒</span>
              <span className="text-[13px] font-medium text-[#5a4a2a]">
                {hasPin() ? "Change PIN" : "Set PIN"}
              </span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c8b090" strokeWidth="2" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        {/* ── Support ── */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-[#fdf3d0] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b8860b" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <p className="text-[14px] font-bold text-[#1c1208]">Help & Support</p>
          </div>
          {[
            { href: "mailto:rahul63794@gmail.com", icon: "✉️", label: "Email Support" },
            { href: "tel:+911800123456",           icon: "📞", label: "Call: 1800-123-456" },
          ].map(s => (
            <a key={s.href} href={s.href}
              className="flex items-center justify-between py-3 border-b border-[#f0e8d8] last:border-0 active:bg-[#fdfaf4] rounded-lg px-1 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-[16px]">{s.icon}</span>
                <span className="text-[13px] font-medium text-[#5a4a2a]">{s.label}</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c8b090" strokeWidth="2" strokeLinecap="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </a>
          ))}
        </div>

        {/* ── Logout ── */}
        <button type="button" onClick={handleLogout} className="btn-maroon w-full gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Logout
        </button>

        <p className="text-center text-[11px] text-[#9a8060]">DigiGold v1.0.0 · Made with ❤️ in India</p>
      </div>
    </div>
  );
}
