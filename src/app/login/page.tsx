"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const ADMIN_PHONE = "9999999999";

export default function LoginPage() {
  const router = useRouter();
  const { login, verifyPin, hasPin } = useAuth();
  const [tab, setTab]       = useState<"login" | "register">("login");

  // ── Login state ──
  const [lPhone, setLPhone] = useState("");
  const [lPin, setLPin]     = useState(["", "", "", ""]);
  const [lError, setLError] = useState("");
  const [lLoading, setLLoading] = useState(false);
  const lRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Register state ──
  const [rName, setRName]   = useState("");
  const [rPhone, setRPhone] = useState("");
  const [rError, setRError] = useState("");
  const [rLoading, setRLoading] = useState(false);

  // ── Login PIN handlers ──
  function handlePinKey(i: number, val: string) {
    if (!/^\d?$/.test(val)) return;
    const next = [...lPin]; next[i] = val; setLPin(next); setLError("");
    if (val && i < 3) lRefs.current[i + 1]?.focus();
    if (next.every(d => d) && next.join("").length === 4) submitLogin(next.join(""));
  }

  function handlePinBack(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !lPin[i] && i > 0) lRefs.current[i - 1]?.focus();
  }

  function submitLogin(pinCode?: string) {
    const code  = pinCode ?? lPin.join("");
    const phone = lPhone.replace(/\D/g, "");

    if (phone.length !== 10) { setLError("Enter a valid 10-digit mobile number."); return; }
    if (code.length < 4)     { setLError("Enter your 4-digit PIN."); return; }

    setLLoading(true);

    // Admin shortcut
    if (phone === ADMIN_PHONE) {
      if (code !== "1234") {
        setLError("Incorrect PIN. Admin default PIN is 1234.");
        setLPin(["", "", "", ""]); setLLoading(false); return;
      }
      login(phone, "Admin", "admin");
      router.replace("/admin");
      return;
    }

    // Check PIN stored for this phone
    const pinKey = localStorage.getItem("dg-pin-v1");
    if (!pinKey) {
      setLError("No account found. Please register first.");
      setLPin(["", "", "", ""]); setLLoading(false); return;
    }

    const { phone: storedPhone } = JSON.parse(pinKey);
    if (storedPhone !== phone) {
      setLError("No account found for this number. Please register.");
      setLPin(["", "", "", ""]); setLLoading(false); return;
    }

    // Get saved name before temporary login overwrites it
    const savedName = (() => {
      try {
        const raw = localStorage.getItem("dg-auth-v2");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.phone === phone && parsed.name && parsed.name !== "User") return parsed.name;
        }
      } catch { /* ignore */ }
      return null;
    })();

    // Temporarily set user to verify PIN
    login(phone, savedName || "User", "user");

    setTimeout(() => {
      if (verifyPin(code)) {
        if (savedName) login(phone, savedName, "user");
        sessionStorage.setItem("dg-pin-asked", "1");
        router.replace("/");
      } else {
        setLError("Incorrect PIN. Please try again.");
        setLPin(["", "", "", ""]);
        setLLoading(false);
        setTimeout(() => lRefs.current[0]?.focus(), 100);
      }
    }, 300);
  }

  // ── Register handler ──
  function handleRegister() {
    const phone = rPhone.replace(/\D/g, "");
    if (!rName.trim())        { setRError("Enter your full name."); return; }
    if (phone.length !== 10)  { setRError("Enter a valid 10-digit mobile number."); return; }
    setRError(""); setRLoading(true);
    sessionStorage.setItem("dg-reg-name", rName.trim());
    sessionStorage.setItem("dg-reg-phone", phone);
    setTimeout(() => { setRLoading(false); router.push("/register"); }, 400);
  }

  const filled = lPin.filter(d => d).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f3ec]">

      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-[#7b1c1c] via-[#a52a2a] to-[#b8860b] px-6 pt-14 pb-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
            <polygon points="12,2 15.5,8.5 23,9.5 17.5,14.5 19,22 12,18.5 5,22 6.5,14.5 1,9.5 8.5,8.5" fill="#F5C842" stroke="#b8860b" strokeWidth="1"/>
          </svg>
        </div>
        <h1 className="text-[28px] font-extrabold text-white tracking-tight">DigiGold</h1>
        <p className="text-[13px] text-white/70 mt-1">Buy & Save Digital Gold · Secure · Insured</p>
      </div>

      {/* ── Promo strip ── */}
      <div className="bg-[#fdf3d0] border-b border-[#e8c84a] px-4 py-2.5 flex items-center gap-2">
        <span className="text-[14px]">🥇</span>
        <p className="text-[12px] font-semibold text-[#7b4a00]">Start with ₹10 · 24K 999 purity · MMTC-PAMP certified</p>
      </div>

      {/* ── Tab switcher ── */}
      <div className="px-5 pt-5">
        <div className="flex rounded-2xl bg-[#f0e8d8] p-1 border border-[#ede0c4] max-w-sm mx-auto">
          <button type="button" onClick={() => { setTab("login"); setLError(""); setLPin(["","","",""]); }}
            className={`flex-1 py-2.5 rounded-[14px] text-[14px] font-bold transition-all ${
              tab === "login" ? "bg-gradient-to-r from-[#7b1c1c] to-[#b8860b] text-white shadow-sm" : "text-[#9a8060]"
            }`}>
            Login
          </button>
          <button type="button" onClick={() => { setTab("register"); setRError(""); }}
            className={`flex-1 py-2.5 rounded-[14px] text-[14px] font-bold transition-all ${
              tab === "register" ? "bg-gradient-to-r from-[#7b1c1c] to-[#b8860b] text-white shadow-sm" : "text-[#9a8060]"
            }`}>
            Register
          </button>
        </div>
      </div>

      <div className="flex-1 px-5 pt-5 pb-10">

        {/* ══════════ LOGIN TAB ══════════ */}
        {tab === "login" && (
          <div className="card p-6 max-w-sm mx-auto">
            <h2 className="text-[18px] font-bold text-[#1c1208] mb-1">Welcome Back 👋</h2>
            <p className="text-[13px] text-[#9a8060] mb-5">Enter your mobile number and PIN</p>

            {/* Mobile */}
            <label className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider block mb-2">Mobile Number</label>
            <div className="flex items-center gap-2 mb-5">
              <div className="flex items-center gap-1.5 px-3 py-3.5 rounded-xl bg-[#fdfaf4] border-[1.5px] border-[#ede0c4] shrink-0">
                <span className="text-[15px]">🇮🇳</span>
                <span className="text-[14px] font-semibold text-[#5a4a2a]">+91</span>
              </div>
              <input
                className="input-field"
                inputMode="numeric"
                maxLength={10}
                placeholder="98765 43210"
                value={lPhone}
                onChange={e => { setLPhone(e.target.value.replace(/\D/g, "")); setLError(""); }}
              />
            </div>

            {/* PIN */}
            <label className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider block mb-2">4-Digit PIN</label>

            {/* PIN dots */}
            <div className="flex gap-4 justify-center mb-3">
              {[0,1,2,3].map(i => (
                <div key={i} className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-200 ${
                  i < filled ? "bg-[#b8860b] border-[#b8860b]" : "bg-transparent border-[#c8b090]"
                }`} />
              ))}
            </div>

            <div className="flex gap-3 justify-center mb-2">
              {lPin.map((d, i) => (
                <input
                  key={i}
                  ref={el => { lRefs.current[i] = el; }}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handlePinKey(i, e.target.value)}
                  onKeyDown={e => handlePinBack(i, e)}
                  className={`w-14 h-14 text-center text-[22px] font-bold rounded-2xl border-[2px] outline-none transition-all bg-[#fdfaf4]
                    ${d ? "border-[#b8860b] bg-[#fdf3d0]" : "border-[#ede0c4]"}
                    focus:border-[#b8860b] focus:shadow-[0_0_0_3px_rgba(184,134,11,0.12)]`}
                />
              ))}
            </div>

            {lError && <p className="text-[12px] text-[#b91c1c] text-center mt-1 mb-2">{lError}</p>}

            <button type="button" onClick={() => submitLogin()} disabled={lLoading}
              className="btn-gold w-full mt-4 gap-2">
              {lLoading ? (
                <svg className="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10"/>
                </svg>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <span>Login with PIN</span>
                </>
              )}
            </button>

            {/* Forgot PIN */}
            <div className="mt-4 pt-4 border-t border-[#ede0c4] text-center">
              <p className="text-[12px] text-[#9a8060]">Forgot PIN?</p>
              <button type="button"
                onClick={() => {
                  const phone = lPhone.replace(/\D/g, "");
                  if (phone.length === 10) {
                    sessionStorage.setItem("dg-reg-phone", phone);
                    sessionStorage.setItem("dg-reg-name", "User");
                    router.push("/register");
                  } else {
                    setLError("Enter your mobile number first.");
                  }
                }}
                className="text-[13px] font-semibold text-[#b8860b] underline underline-offset-2 mt-1 block mx-auto">
                Login with OTP
              </button>
            </div>
          </div>
        )}

        {/* ══════════ REGISTER TAB ══════════ */}
        {tab === "register" && (
          <div className="card p-6 max-w-sm mx-auto">
            <h2 className="text-[18px] font-bold text-[#1c1208] mb-1">Create Account ✨</h2>
            <p className="text-[13px] text-[#9a8060] mb-5">Step 1 of 3 · Enter your details</p>

            {/* Name */}
            <label className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider block mb-2">Full Name</label>
            <input
              className="input-field mb-4"
              placeholder="e.g. Rahul Kumar"
              value={rName}
              onChange={e => { setRName(e.target.value); setRError(""); }}
              onKeyDown={e => e.key === "Enter" && handleRegister()}
            />

            {/* Phone */}
            <label className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider block mb-2">Mobile Number</label>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex items-center gap-1.5 px-3 py-3.5 rounded-xl bg-[#fdfaf4] border-[1.5px] border-[#ede0c4] shrink-0">
                <span className="text-[15px]">🇮🇳</span>
                <span className="text-[14px] font-semibold text-[#5a4a2a]">+91</span>
              </div>
              <input
                className="input-field"
                inputMode="numeric"
                maxLength={10}
                placeholder="98765 43210"
                value={rPhone}
                onChange={e => { setRPhone(e.target.value.replace(/\D/g, "")); setRError(""); }}
                onKeyDown={e => e.key === "Enter" && handleRegister()}
              />
            </div>

            {rError && <p className="text-[12px] text-[#b91c1c] mt-1 mb-2">{rError}</p>}

            <button type="button" onClick={handleRegister} disabled={rLoading}
              className="btn-gold w-full mt-5 gap-2">
              {rLoading ? (
                <svg className="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10"/>
                </svg>
              ) : (
                <>
                  <span>Next</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </>
              )}
            </button>

            {/* Steps preview */}
            <div className="mt-5 pt-4 border-t border-[#ede0c4]">
              <p className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider mb-3">Registration Steps</p>
              {[
                { step: "1", label: "Name & Mobile", done: true },
                { step: "2", label: "Gmail for OTP", done: false },
                { step: "3", label: "Verify OTP", done: false },
                { step: "4", label: "Set 4-digit PIN", done: false },
              ].map(s => (
                <div key={s.step} className="flex items-center gap-3 mb-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                    s.done ? "bg-[#b8860b] text-white" : "bg-[#f0e8d8] text-[#9a8060]"
                  }`}>
                    {s.done ? "✓" : s.step}
                  </div>
                  <span className={`text-[13px] font-medium ${s.done ? "text-[#b8860b]" : "text-[#9a8060]"}`}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trust badges */}
        <div className="grid grid-cols-3 gap-3 mt-5 max-w-sm mx-auto">
          {[{ icon: "🔒", label: "100% Secure" }, { icon: "🏅", label: "MMTC-PAMP" }, { icon: "📦", label: "Home Delivery" }].map(b => (
            <div key={b.label} className="card p-3 flex flex-col items-center gap-1 text-center">
              <span className="text-[20px]">{b.icon}</span>
              <span className="text-[11px] font-semibold text-[#5a4a2a]">{b.label}</span>
            </div>
          ))}
        </div>

        <p className="text-center text-[11px] text-[#9a8060] mt-5">
          By continuing you agree to our <span className="text-[#b8860b] font-semibold">Terms & Privacy Policy</span>
        </p>
      </div>
    </div>
  );
}
