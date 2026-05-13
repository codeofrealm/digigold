"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function SetPinPage() {
  const router = useRouter();
  const { user, setPin } = useAuth();
  const [step, setStep]       = useState<"set" | "confirm">("set");
  const [pin, setPin1]        = useState(["", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", ""]);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);
  const refs1 = useRef<(HTMLInputElement | null)[]>([]);
  const refs2 = useRef<(HTMLInputElement | null)[]>([]);

  function handleKey(
    i: number, val: string,
    arr: string[], setArr: (v: string[]) => void,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>
  ) {
    if (!/^\d?$/.test(val)) return;
    const next = [...arr]; next[i] = val; setArr(next); setError("");
    if (val && i < 3) refs.current[i + 1]?.focus();
    if (next.every(d => d) && next.join("").length === 4) {
      if (step === "set") {
        setStep("confirm");
        setTimeout(() => refs2.current[0]?.focus(), 100);
      } else {
        handleConfirm(next.join(""));
      }
    }
  }

  function handleBackspace(
    i: number, e: React.KeyboardEvent,
    arr: string[],
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>
  ) {
    if (e.key === "Backspace" && !arr[i] && i > 0) refs.current[i - 1]?.focus();
  }

  function handleConfirm(confirmCode: string) {
    const pinCode = pin.join("");
    if (pinCode !== confirmCode) {
      setError("PINs don't match. Please try again.");
      setConfirmPin(["", "", "", ""]);
      setTimeout(() => refs2.current[0]?.focus(), 100);
      return;
    }
    setPin(pinCode);
    setSuccess(true);
    setTimeout(() => router.replace("/"), 1200);
  }

  function resetToSet() {
    setStep("set");
    setPin1(["", "", "", ""]);
    setConfirmPin(["", "", "", ""]);
    setError("");
    setTimeout(() => refs1.current[0]?.focus(), 100);
  }

  const PinDots = ({ filled }: { filled: number }) => (
    <div className="flex gap-4 justify-center my-4">
      {[0,1,2,3].map(i => (
        <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
          i < filled ? "bg-[#b8860b] border-[#b8860b] scale-110" : "bg-transparent border-[#c8b090]"
        }`} />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f3ec]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#7b1c1c] via-[#a52a2a] to-[#b8860b] px-6 pt-14 pb-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F5C842" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h1 className="text-[26px] font-extrabold text-white">Set Your PIN</h1>
        <p className="text-[13px] text-white/70 mt-1">
          {success ? "PIN set successfully! 🎉" : step === "set" ? "Create a 4-digit security PIN" : "Confirm your PIN"}
        </p>
      </div>

      <div className="flex-1 px-5 pt-8 pb-10">
        <div className="card p-6 max-w-sm mx-auto">

          {success ? (
            <div className="flex flex-col items-center py-6 gap-4">
              <div className="w-16 h-16 rounded-full bg-[#dcfce7] flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <p className="text-[16px] font-bold text-[#15803d]">PIN Set Successfully!</p>
              <p className="text-[13px] text-[#9a8060] text-center">Taking you to DigiGold...</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-2">
                <p className="text-[15px] font-bold text-[#1c1208]">
                  {step === "set" ? "Enter 4-digit PIN" : "Confirm PIN"}
                </p>
                <p className="text-[12px] text-[#9a8060] mt-1">
                  {step === "set"
                    ? "You'll use this PIN every time you open DigiGold"
                    : "Re-enter your PIN to confirm"}
                </p>
              </div>

              {/* PIN dots indicator */}
              <PinDots filled={step === "set" ? pin.filter(d => d).length : confirmPin.filter(d => d).length} />

              {/* Hidden PIN inputs */}
              {step === "set" ? (
                <div className="flex gap-3 justify-center">
                  {pin.map((d, i) => (
                    <input
                      key={i}
                      ref={el => { refs1.current[i] = el; }}
                      type="password"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={e => handleKey(i, e.target.value, pin, setPin1, refs1)}
                      onKeyDown={e => handleBackspace(i, e, pin, refs1)}
                      className={`w-14 h-14 text-center text-[24px] font-bold rounded-2xl border-[2px] outline-none transition-all bg-[#fdfaf4]
                        ${d ? "border-[#b8860b] bg-[#fdf3d0]" : "border-[#ede0c4]"}
                        focus:border-[#b8860b] focus:shadow-[0_0_0_3px_rgba(184,134,11,0.12)]`}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex gap-3 justify-center">
                  {confirmPin.map((d, i) => (
                    <input
                      key={i}
                      ref={el => { refs2.current[i] = el; }}
                      type="password"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={e => handleKey(i, e.target.value, confirmPin, setConfirmPin, refs2)}
                      onKeyDown={e => handleBackspace(i, e, confirmPin, refs2)}
                      className={`w-14 h-14 text-center text-[24px] font-bold rounded-2xl border-[2px] outline-none transition-all bg-[#fdfaf4]
                        ${d ? "border-[#b8860b] bg-[#fdf3d0]" : "border-[#ede0c4]"}
                        focus:border-[#b8860b] focus:shadow-[0_0_0_3px_rgba(184,134,11,0.12)]`}
                    />
                  ))}
                </div>
              )}

              {error && (
                <p className="text-[12px] text-[#b91c1c] text-center mt-3">{error}</p>
              )}

              {step === "confirm" && (
                <button type="button" onClick={resetToSet}
                  className="mt-4 w-full text-center text-[13px] text-[#9a8060] font-medium">
                  ← Change PIN
                </button>
              )}

              {/* Info */}
              <div className="mt-5 bg-[#fdf3d0] border border-[#e8c84a] rounded-xl px-4 py-3">
                <p className="text-[12px] text-[#7b4a00] font-semibold mb-1">🔒 PIN Security Tips</p>
                <ul className="text-[11px] text-[#9a8060] space-y-1">
                  <li>• Don&apos;t use 1234 or 0000</li>
                  <li>• Never share your PIN with anyone</li>
                  <li>• PIN is stored securely on your device</li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Skip option */}
        {!success && (
          <div className="text-center mt-4">
            <button type="button" onClick={() => router.replace("/")}
              className="text-[13px] text-[#9a8060] underline underline-offset-2">
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
