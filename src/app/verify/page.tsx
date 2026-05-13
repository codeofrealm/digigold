"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { sendOtp, verifyOtp } from "@/lib/otp-client";

const ADMIN_PHONE = "9999999999";

export default function VerifyPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [phone, setPhone]   = useState("");
  const [name, setName]     = useState("");
  const [gmail, setGmail]   = useState("");
  const [otp, setOtp]       = useState(["", "", "", "", "", ""]);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSec, setResendSec] = useState(30);

  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const p = sessionStorage.getItem("dg-otp-phone") || "";
    const n = sessionStorage.getItem("dg-reg-name")  || "User";
    const g = sessionStorage.getItem("dg-reg-gmail") || "";
    if (!p) { router.replace("/login"); return; }
    setPhone(p); setName(n); setGmail(g);

    refs.current[0]?.focus();
  }, [router]);

  useEffect(() => {
    if (resendSec <= 0) return;
    const t = setTimeout(() => setResendSec(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendSec]);

  function handleKey(i: number, val: string) {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp]; next[i] = val; setOtp(next); setError("");
    if (val && i < 5) refs.current[i + 1]?.focus();
    if (next.every(d => d) && next.join("").length === 6) verify(next.join(""));
  }

  function handleBackspace(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[i] && i > 0) refs.current[i - 1]?.focus();
  }

  async function verify(code: string) {
    setLoading(true);
    setError("");

    const isAdmin = phone === ADMIN_PHONE;

    try {
      if (isAdmin) {
        // Admin uses demo OTP 123456
        if (code !== "123456") {
          setError("Incorrect OTP. Use 123456 for admin demo.");
          setLoading(false);
          return;
        }
      } else {
        const data = await verifyOtp({ phone, otp: code });
        if (!data.ok) {
          setError(data.error || "Incorrect OTP. Please try again.");
          setLoading(false);
          return;
        }
      }

      // OTP verified — save user to Firestore
      const role = isAdmin ? "admin" : "user";
      const displayName = isAdmin ? "Admin" : name;

      await setDoc(doc(db, "users", phone), {
        name: displayName,
        phone: `+91 ${phone}`,
        gmail: gmail || "",
        role,
        kycTier: "none",
        balanceGrams: 0,
        balanceSilverGrams: 0,
        walletInr: 10000,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Login and redirect
      login(phone, displayName, role);
      sessionStorage.removeItem("dg-otp-phone");
      sessionStorage.removeItem("dg-reg-name");
      sessionStorage.removeItem("dg-reg-gmail");
      router.replace(isAdmin ? "/admin" : "/");

    } catch (err) {
      console.error(err);
      setError("Verification failed. Please try again.");
      setLoading(false);
    }
  }

  function handleVerify() {
    const code = otp.join("");
    if (code.length < 6) { setError("Enter all 6 digits."); return; }
    verify(code);
  }

  async function handleResend() {
    if (!gmail || phone === ADMIN_PHONE) { setResendSec(30); return; }
    setResendLoading(true);
    try {
      const data = await sendOtp({ email: gmail, phone, name });
      if (data.ok) {
        setResendSec(30);
        setOtp(["", "", "", "", "", ""]);
        setError("");
        refs.current[0]?.focus();
      } else {
        setError("Failed to resend OTP.");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setResendLoading(false);
  }

  const masked = phone ? `+91 ${phone.slice(0, 2)}XXXXX${phone.slice(-3)}` : "";
  const isAdmin = phone === ADMIN_PHONE;

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f3ec]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#7b1c1c] via-[#a52a2a] to-[#b8860b] px-6 pt-14 pb-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F5C842" strokeWidth="2" strokeLinecap="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.11 12 19.79 19.79 0 0 1 1.07 3.4 2 2 0 0 1 3.04 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
        </div>
        <h1 className="text-[24px] font-extrabold text-white">Verify OTP</h1>
        <p className="text-[13px] text-white/70 mt-1">
          {isAdmin ? `Admin login · ${masked}` : `OTP sent to ${gmail || masked}`}
        </p>

        {/* Steps */}
        <div className="flex items-center justify-center gap-2 mt-5">
          {["Details", "Gmail", "OTP"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold bg-white text-[#b8860b]">
                {i < 2 ? "✓" : "3"}
              </div>
              <span className="text-[11px] font-semibold text-white">{s}</span>
              {i < 2 && <div className="w-6 h-[1px] bg-white/30" />}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 px-5 pt-8 pb-10">
        <div className="card p-6 max-w-sm mx-auto">
          <h2 className="text-[18px] font-bold text-[#1c1208] mb-1">Enter OTP</h2>
          <p className="text-[13px] text-[#9a8060] mb-2">Step 3 of 3 · Verify your identity</p>

          {isAdmin ? (
            <div className="bg-[#fdf3d0] border border-[#e8c84a] rounded-xl px-3 py-2 mb-5">
              <p className="text-[12px] text-[#7b4a00] font-semibold">
                Admin demo OTP: <span className="font-mono text-[#b8860b] text-[14px]">123456</span>
              </p>
            </div>
          ) : (
            <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl px-3 py-2 mb-5">
              <p className="text-[12px] text-emerald-700 font-semibold">
                📧 OTP sent to <span className="text-emerald-800">{gmail}</span>
              </p>
              <p className="text-[11px] text-emerald-600 mt-0.5">Check your inbox · Valid for 10 minutes</p>

            </div>
          )}

          {/* OTP boxes */}
          <div className="flex gap-2 justify-center mb-2">
            {otp.map((d, i) => (
              <input
                key={i}
                ref={el => { refs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleKey(i, e.target.value)}
                onKeyDown={e => handleBackspace(i, e)}
                className={`w-11 h-12 text-center text-[20px] font-bold rounded-xl border-[2px] outline-none transition-all bg-[#fdfaf4]
                  ${d ? "border-[#b8860b] text-[#b8860b]" : "border-[#ede0c4] text-[#1c1208]"}
                  focus:border-[#b8860b] focus:shadow-[0_0_0_3px_rgba(184,134,11,0.12)]`}
              />
            ))}
          </div>

          {error && <p className="text-[12px] text-[#b91c1c] text-center mt-1 mb-2">{error}</p>}

          <button type="button" onClick={handleVerify} disabled={loading} className="btn-gold w-full mt-5 gap-2">
            {loading ? (
              <div className="flex items-center gap-2">
                <svg className="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10"/>
                </svg>
                <span>Verifying...</span>
              </div>
            ) : "Verify & Continue →"}
          </button>

          <div className="mt-4 text-center">
            {resendSec > 0 ? (
              <p className="text-[12px] text-[#9a8060]">
                Resend OTP in <span className="font-bold text-[#b8860b]">{resendSec}s</span>
              </p>
            ) : (
              <button type="button" onClick={handleResend} disabled={resendLoading}
                className="text-[13px] font-semibold text-[#b8860b] underline underline-offset-2">
                {resendLoading ? "Sending..." : "Resend OTP"}
              </button>
            )}
          </div>

          <button type="button" onClick={() => router.back()}
            className="mt-3 w-full text-center text-[13px] text-[#9a8060] font-medium">
            ← Change details
          </button>
        </div>

        {/* User summary */}
        {name && !isAdmin && (
          <div className="card p-4 max-w-sm mx-auto mt-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#d4a017] to-[#b8860b] flex items-center justify-center shrink-0">
              <span className="text-[16px] font-bold text-white">{name[0]}</span>
            </div>
            <div>
              <p className="text-[14px] font-bold text-[#1c1208]">{name}</p>
              <p className="text-[12px] text-[#9a8060]">{masked}</p>
              {gmail && <p className="text-[11px] text-[#b8860b] mt-0.5">{gmail}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
