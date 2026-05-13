"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function PinPage() {
  const router = useRouter();
  const { user, verifyPin, logout } = useAuth();
  const [pin, setPin]       = useState(["", "", "", ""]);
  const [error, setError]   = useState("");
  const [attempts, setAttempts] = useState(0);
  const [shake, setShake]   = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function handleKey(i: number, val: string) {
    if (!/^\d?$/.test(val)) return;
    const next = [...pin]; next[i] = val; setPin(next); setError("");
    if (val && i < 3) refs.current[i + 1]?.focus();
    if (next.every(d => d) && next.join("").length === 4) {
      checkPin(next.join(""));
    }
  }

  function handleBackspace(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !pin[i] && i > 0) refs.current[i - 1]?.focus();
  }

  function checkPin(code: string) {
    if (verifyPin(code)) {
      router.replace("/");
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPin(["", "", "", ""]);
      setTimeout(() => refs.current[0]?.focus(), 100);

      if (newAttempts >= 5) {
        setError("Too many attempts. Please login again.");
      } else {
        setError(`Incorrect PIN. ${5 - newAttempts} attempts remaining.`);
      }
    }
  }

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  const filled = pin.filter(d => d).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f3ec]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#7b1c1c] via-[#a52a2a] to-[#b8860b] px-6 pt-16 pb-12 text-center">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center mx-auto mb-3">
          <span className="text-[28px] font-extrabold text-white">
            {user?.name?.[0] ?? "U"}
          </span>
        </div>
        <p className="text-[13px] text-white/60 font-medium">Welcome back,</p>
        <h1 className="text-[22px] font-extrabold text-white mt-0.5">{user?.name ?? "User"}</h1>
        <p className="text-[12px] text-white/50 mt-1">+91 {user?.phone}</p>
      </div>

      <div className="flex-1 px-5 pt-8 pb-10">
        <div className="card p-6 max-w-sm mx-auto">
          <div className="text-center mb-2">
            <div className="w-12 h-12 rounded-2xl bg-[#fdf3d0] border border-[#e8c84a] flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#b8860b" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <p className="text-[16px] font-bold text-[#1c1208]">Enter PIN</p>
            <p className="text-[12px] text-[#9a8060] mt-1">Enter your 4-digit security PIN</p>
          </div>

          {/* PIN dots */}
          <div className={`flex gap-4 justify-center my-5 ${shake ? "animate-[shake_0.4s_ease-in-out]" : ""}`}>
            {[0,1,2,3].map(i => (
              <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                i < filled
                  ? "bg-[#b8860b] border-[#b8860b] scale-110"
                  : error
                  ? "bg-transparent border-[#b91c1c]"
                  : "bg-transparent border-[#c8b090]"
              }`} />
            ))}
          </div>

          {/* PIN inputs */}
          <div className="flex gap-3 justify-center">
            {pin.map((d, i) => (
              <input
                key={i}
                ref={el => { refs.current[i] = el; }}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={d}
                autoFocus={i === 0}
                onChange={e => handleKey(i, e.target.value)}
                onKeyDown={e => handleBackspace(i, e)}
                className={`w-14 h-14 text-center text-[24px] font-bold rounded-2xl border-[2px] outline-none transition-all bg-[#fdfaf4]
                  ${d ? "border-[#b8860b] bg-[#fdf3d0]" : error ? "border-[#fecaca]" : "border-[#ede0c4]"}
                  focus:border-[#b8860b] focus:shadow-[0_0_0_3px_rgba(184,134,11,0.12)]`}
              />
            ))}
          </div>

          {error && (
            <div className={`mt-3 rounded-xl px-3 py-2 text-center text-[12px] font-semibold ${
              attempts >= 5 ? "bg-[#fee2e2] text-[#b91c1c]" : "bg-[#fef9c3] text-[#92400e]"
            }`}>
              {error}
            </div>
          )}

          {/* Forgot PIN */}
          <div className="mt-5 text-center">
            <p className="text-[12px] text-[#9a8060]">Forgot PIN?</p>
            <button type="button" onClick={handleLogout}
              className="text-[13px] font-semibold text-[#b8860b] underline underline-offset-2 mt-1">
              Login with OTP instead
            </button>
          </div>
        </div>

        {/* Logout */}
        <div className="text-center mt-4">
          <button type="button" onClick={handleLogout}
            className="text-[13px] text-[#9a8060] font-medium">
            Switch Account
          </button>
        </div>
      </div>
    </div>
  );
}
