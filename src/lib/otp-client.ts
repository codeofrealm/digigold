import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const RESEND_API_KEY = "re_4t9qWQYW_NbqpYtZchEZz3Mhv7MY3Za6f";
const FROM_EMAIL = "DigiGold <onboarding@resend.dev>";
const RESEND_TO_OVERRIDE = "rahul91598308@gmail.com"; // free plan — sends to verified email only

type OtpRecord = {
  otp: string;
  email: string;
  name: string;
  expiresAt: Timestamp;
};

type CapacitorWindow = Window & {
  Capacitor?: { isNativePlatform?: () => boolean };
};

function cleanPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isNativeApp() {
  if (typeof window === "undefined") return false;
  const cap = (window as CapacitorWindow).Capacitor;
  return (
    Boolean(cap?.isNativePlatform?.()) ||
    window.location.protocol === "capacitor:" ||
    window.location.protocol === "file:"
  );
}

async function sendEmailViaResend(to: string, name: string, otp: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject: `${otp} is your DigiGold OTP — valid 10 mins`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e8c84a;">
          <div style="background:linear-gradient(135deg,#7b1c1c,#b8860b);padding:28px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:24px;">🥇 DigiGold</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">Buy & Save Digital Gold</p>
          </div>
          <div style="padding:28px;">
            <p style="color:#5a4a2a;font-size:16px;font-weight:700;">Hi ${name} 👋</p>
            <p style="color:#9a8060;font-size:14px;">Your One-Time Password for DigiGold:</p>
            <div style="background:#fff8e8;border:2px solid #e8c84a;border-radius:12px;padding:24px;text-align:center;margin:20px 0;">
              <p style="margin:0;color:#b8860b;font-size:44px;font-weight:900;letter-spacing:12px;font-family:monospace;">${otp}</p>
              <p style="margin:10px 0 0;color:#9a8060;font-size:12px;">⏱ Valid for <strong>10 minutes</strong> only</p>
            </div>
            <p style="color:#9a8060;font-size:12px;">🔒 Never share this OTP. DigiGold will never ask for your OTP.</p>
          </div>
        </div>
      `,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || "Failed to send email");
  }
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function sendOtp(input: { email: string; phone: string; name: string }) {
  const phone = cleanPhone(input.phone);

  if (!isNativeApp()) {
    try {
      const data = await postJson("/api/otp/send", { ...input, phone });
      if (data.ok) return { ok: true as const };
      return { ok: false as const, error: data.error || "Failed to send OTP." };
    } catch {
      return { ok: false as const, error: "Network error. Please check your connection." };
    }
  }

  // Android — Firestore + Resend
  try {
    const otp = generateOtp();
    const expiresAt = Timestamp.fromMillis(Date.now() + 10 * 60 * 1000);

    await setDoc(doc(db, "otp", phone), {
      otp, email: input.email, name: input.name,
      expiresAt, createdAt: serverTimestamp(),
    });

    await sendEmailViaResend(input.email, input.name, otp);
    return { ok: true as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to send OTP.";
    return { ok: false as const, error: msg };
  }
}

export async function verifyOtp(input: { phone: string; otp: string }) {
  const phone = cleanPhone(input.phone);

  if (!isNativeApp()) {
    try {
      const data = await postJson("/api/otp/verify", { phone, otp: input.otp });
      if (data.ok) return { ok: true as const, name: data.name as string | undefined, email: data.email as string | undefined };
      return { ok: false as const, error: data.error || "Incorrect OTP. Please try again." };
    } catch {
      return { ok: false as const, error: "Network error. Please check your connection." };
    }
  }

  // Android — verify from Firestore
  try {
    const ref = doc(db, "otp", phone);
    const snap = await getDoc(ref);

    if (!snap.exists()) return { ok: false as const, error: "OTP not found. Please request a new one." };

    const record = snap.data() as OtpRecord;

    if (record.expiresAt.toMillis() < Date.now()) {
      await deleteDoc(ref).catch(() => {});
      return { ok: false as const, error: "OTP expired. Please request a new one." };
    }

    if (record.otp !== input.otp) return { ok: false as const, error: "Incorrect OTP. Please try again." };

    await deleteDoc(ref).catch(() => {});
    return { ok: true as const, name: record.name, email: record.email };
  } catch {
    return { ok: false as const, error: "Verification failed. Please try again." };
  }
}
