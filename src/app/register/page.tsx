"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { sendOtp } from "@/lib/otp-client";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName]   = useState("");
  const [phone, setPhone] = useState("");
  const [gmail, setGmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const n = sessionStorage.getItem("dg-reg-name");
    const p = sessionStorage.getItem("dg-reg-phone");
    if (!n || !p) { router.replace("/login"); return; }
    setName(n); setPhone(p);
  }, [router]);

  async function handleNext() {
    const clean = gmail.trim().toLowerCase();
    if (!clean) { setError("Please enter your Gmail address."); return; }
    if (!clean.includes("@")) { setError("Enter a valid email address."); return; }
    setError("");
    setLoading(true);

    try {
      const data = await sendOtp({ email: clean, phone, name });

      if (!data.ok) {
        setError(data.error || "Failed to send OTP. Try again.");
        setLoading(false);
        return;
      }

      // Save to session and go to verify
      sessionStorage.setItem("dg-reg-gmail", clean);
      sessionStorage.setItem("dg-otp-phone", phone);
      router.push("/verify");

    } catch {
      setError("Network error. Please check your connection.");
      setLoading(false);
    }
  }

  const masked = phone ? `+91 ${phone.slice(0, 2)}XXXXX${phone.slice(-3)}` : "";

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f3ec]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#7b1c1c] via-[#a52a2a] to-[#b8860b] px-6 pt-14 pb-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
            <polygon points="12,2 15.5,8.5 23,9.5 17.5,14.5 19,22 12,18.5 5,22 6.5,14.5 1,9.5 8.5,8.5" fill="#F5C842" stroke="#b8860b" strokeWidth="1"/>
          </svg>
        </div>
        <h1 className="text-[28px] font-extrabold text-white tracking-tight">DigiGold</h1>
        <p className="text-[13px] text-white/70 mt-1">Hi {name} 👋 · {masked}</p>

        {/* Steps */}
        <div className="flex items-center justify-center gap-2 mt-5">
          {["Details", "Gmail", "OTP"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold ${
                i === 0 ? "bg-white text-[#b8860b]" : i === 1 ? "bg-white text-[#b8860b]" : "bg-white/20 text-white/60"
              }`}>
                {i === 0 ? "✓" : i + 1}
              </div>
              <span className={`text-[11px] font-semibold ${i <= 1 ? "text-white" : "text-white/50"}`}>{s}</span>
              {i < 2 && <div className="w-6 h-[1px] bg-white/30" />}
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-5 pt-8 pb-10">
        <div className="card p-6 max-w-sm mx-auto">
          <h2 className="text-[20px] font-bold text-[#1c1208] mb-1">Link Gmail</h2>
          <p className="text-[13px] text-[#9a8060] mb-6">
            Step 2 of 3 · OTP will be sent to your Gmail
          </p>

          <label className="text-[11px] font-bold text-[#9a8060] uppercase tracking-wider block mb-2">
            Gmail Address
          </label>

          <div className="relative mb-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <input
              className="input-field pl-11"
              type="email"
              inputMode="email"
              placeholder="yourname@gmail.com"
              value={gmail}
              onChange={e => { setGmail(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && handleNext()}
            />
          </div>

          {error && <p className="text-[12px] text-[#b91c1c] mt-1 mb-2">{error}</p>}

          <p className="text-[11px] text-[#9a8060] mt-2 mb-5">
            OTP will be sent to this email. Used for account recovery only.
          </p>

          <button type="button" onClick={handleNext} disabled={loading} className="btn-gold w-full gap-2">
            {loading ? (
              <div className="flex items-center gap-2">
                <svg className="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10"/>
                </svg>
                <span>Sending OTP...</span>
              </div>
            ) : (
              <>
                <span>Send OTP to Gmail</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </>
            )}
          </button>

          <button type="button" onClick={() => router.back()}
            className="mt-3 w-full text-center text-[13px] text-[#9a8060] font-medium">
            ← Back to details
          </button>
        </div>

        {/* Info card */}
        <div className="card p-4 max-w-sm mx-auto mt-4 flex items-start gap-3 bg-[#f0fdf4] border-[#bbf7d0]">
          <span className="text-[20px] mt-0.5">📧</span>
          <div>
            <p className="text-[13px] font-bold text-emerald-800">OTP sent to your Gmail</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">
              A 6-digit OTP with DigiGold branding will be sent to your Gmail inbox. Valid for 10 minutes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
