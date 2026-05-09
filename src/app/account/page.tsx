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

export default function AccountPage() {
  const {
    profile,
    updateProfile,
    referralCode,
    settings,
    updateSettings,
    priceAlerts,
    addPriceAlert,
    removePriceAlert,
    togglePriceAlert,
    pricePerGramInr,
    priceSilverPerGramInr,
    inAppNotifications,
    dismissNotification,
  } = useGoldDemo();

  const [alertMetal, setAlertMetal] = useState<Metal>("gold");
  const [alertTarget, setAlertTarget] = useState(String(8500));
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [alertSuccess, setAlertSuccess] = useState(false);

  const kycLabels = {
    none: { text: "Not Verified", color: "text-red-400 bg-red-500/10 border-red-500/20" },
    pan_submitted: { text: "PAN Submitted", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    verified: { text: "Verified", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  };

  const kyc = kycLabels[profile.kycTier];

  return (
    <div className="page-enter px-5 py-4 pb-6 flex flex-col gap-4">
      {/* Profile Header */}
      <div className="card p-5 flex flex-col items-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,200,66,0.08)_0%,transparent_60%)]" />
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--gold-primary)]/20 to-transparent" />

        <div className="relative w-[72px] h-[72px] rounded-full bg-gradient-to-br from-[var(--gold-primary)] to-[var(--gold-dark)] flex items-center justify-center mb-3 shadow-lg shadow-[var(--gold-primary)]/20">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>

        <h2 className="text-[18px] font-bold text-white relative">{profile.displayName}</h2>
        <p className="text-[13px] text-zinc-400 mt-0.5 relative">{profile.phone}</p>

        <div className={`mt-3 px-3 py-1 rounded-full text-[11px] font-semibold border relative ${kyc.color}`}>
          {kyc.text}
        </div>
      </div>

      {/* Profile Edit */}
      <div className="card p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 mb-1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
          <h3 className="text-[14px] font-bold text-white">Personal Details</h3>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Full Name</label>
          <input
            className="input-field"
            value={profile.displayName}
            onChange={(e) => updateProfile({ displayName: e.target.value })}
            placeholder="Enter your name"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Phone Number</label>
          <input
            className="input-field"
            value={profile.phone}
            onChange={(e) => updateProfile({ phone: e.target.value })}
            placeholder="+91 XXXXX XXXXX"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">KYC Status</label>
          <div className="flex gap-2">
            {(["none", "pan_submitted", "verified"] as const).map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => updateProfile({ kycTier: tier })}
                className={`chip flex-1 justify-center text-[11px] active:scale-95 transition-transform ${
                  profile.kycTier === tier ? "chip-active" : "chip-inactive"
                }`}
              >
                {tier === "none" ? "None" : tier === "pan_submitted" ? "PAN" : "Verified"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Referral */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          <h3 className="text-[14px] font-bold text-white">Refer & Earn</h3>
        </div>
        <p className="text-[12px] text-zinc-500 mb-3">Share your referral code and earn rewards when friends sign up</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-xl bg-black/40 border border-white/[0.08] px-4 py-3 text-center">
            <span className="font-mono text-[18px] font-bold tracking-[0.2em] text-[var(--gold-secondary)]">{referralCode}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(referralCode);
              }
            }}
            className="shrink-0 w-12 h-12 rounded-xl bg-[var(--gold-primary)]/15 border border-[var(--gold-primary)]/20 flex items-center justify-center active:scale-90 transition-transform"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Settings */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <h3 className="text-[14px] font-bold text-white">Settings</h3>
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-[13px] font-semibold text-zinc-200">Price Alerts</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Get notified when prices change</p>
          </div>
          <button
            type="button"
            onClick={() => updateSettings({ priceAlertsEnabled: !settings.priceAlertsEnabled })}
            className={`relative w-[52px] h-[30px] rounded-full transition-all duration-300 ${
              settings.priceAlertsEnabled ? "bg-emerald-500" : "bg-zinc-700"
            }`}
          >
            <div className={`absolute top-[3px] w-[24px] h-[24px] rounded-full bg-white shadow-md transition-all duration-300 ${
              settings.priceAlertsEnabled ? "left-[25px]" : "left-[3px]"
            }`} />
          </button>
        </div>
      </div>

      {/* Price Alerts */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <h3 className="text-[14px] font-bold text-white">Price Alerts</h3>
        </div>
        <p className="text-[11px] text-zinc-500 mb-3">
          Gold {formatInr(pricePerGramInr)}/g · Silver {formatInr(priceSilverPerGramInr)}/g
        </p>

        <div className="flex gap-2 mb-3">
          {(["gold", "silver"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setAlertMetal(m)}
              className={`chip flex-1 justify-center active:scale-95 transition-transform ${
                alertMetal === m ? "chip-active" : "chip-inactive"
              }`}
            >
              {m === "gold" ? "Gold" : "Silver"}
            </button>
          ))}
        </div>

        <input
          inputMode="decimal"
          className="input-field mb-3"
          value={alertTarget}
          onChange={(e) => setAlertTarget(e.target.value)}
          placeholder="Target price per gram"
        />

        {alertMsg && (
          <div className={`rounded-xl px-3 py-2 text-[12px] font-medium mb-3 ${
            alertSuccess ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
          }`}>
            {alertMsg}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setAlertMsg(null);
            setAlertSuccess(false);
            const t = Number(alertTarget);
            const r = addPriceAlert(alertMetal, t);
            if (r.ok) {
              setAlertMsg("Alert created successfully!");
              setAlertSuccess(true);
            } else {
              setAlertMsg(r.reason);
            }
          }}
          className="w-full btn-gold text-center mb-3"
        >
          Create Alert
        </button>

        {priceAlerts.length > 0 && (
          <div className="flex flex-col gap-2">
            {priceAlerts.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 rounded-xl bg-black/30 border border-white/[0.06] px-3 py-2.5">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={`w-2 h-2 rounded-full ${a.active ? "bg-emerald-400" : "bg-zinc-600"}`} />
                  <span className="text-[13px] font-medium text-zinc-200 truncate">
                    {a.metal === "gold" ? "Gold" : "Silver"} @ {formatInr(a.targetInrPerGram)}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => togglePriceAlert(a.id, !a.active)}
                    className={`relative w-[40px] h-[22px] rounded-full transition-all duration-300 ${
                      a.active ? "bg-emerald-500" : "bg-zinc-700"
                    }`}
                  >
                    <div className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-all duration-300 ${
                      a.active ? "left-[20px]" : "left-[2px]"
                    }`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removePriceAlert(a.id)}
                    className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notifications */}
      {inAppNotifications.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
              </svg>
              <h3 className="text-[14px] font-bold text-white">Notifications</h3>
            </div>
            <span className="text-[11px] font-semibold text-zinc-500">{inAppNotifications.length}</span>
          </div>
          <div className="flex flex-col gap-2">
            {inAppNotifications.slice(0, 5).map((n) => (
              <div key={n.id} className="flex items-start gap-2 rounded-xl bg-black/30 border border-white/[0.06] px-3 py-2.5">
                <div className="shrink-0 w-2 h-2 rounded-full bg-[var(--gold-primary)] mt-1.5" />
                <span className="flex-1 text-[12px] text-zinc-300 leading-relaxed">{n.message}</span>
                <button
                  type="button"
                  onClick={() => dismissNotification(n.id)}
                  className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-white/[0.05] active:scale-90 transition-transform"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-zinc-500">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Support */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <h3 className="text-[14px] font-bold text-white">Help & Support</h3>
        </div>
        <div className="flex flex-col gap-1">
          <a href="mailto:support@digigold.in" className="flex items-center justify-between py-2.5 active:bg-white/[0.03] rounded-lg px-1 transition-colors">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-zinc-500">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
              </svg>
              <span className="text-[13px] text-zinc-300">Email Support</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-zinc-600">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </a>
          <a href="tel:+911800123456" className="flex items-center justify-between py-2.5 active:bg-white/[0.03] rounded-lg px-1 transition-colors">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-zinc-500">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span className="text-[13px] text-zinc-300">Call Us: 1800-123-456</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-zinc-600">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </a>
        </div>
      </div>

      {/* App Info */}
      <div className="flex flex-col items-center gap-1 py-4">
        <p className="text-[11px] font-bold text-zinc-600 tracking-wider uppercase">DigiGold v1.0.0</p>
        <p className="text-[10px] text-zinc-700">Made with care in India</p>
      </div>
    </div>
  );
}
