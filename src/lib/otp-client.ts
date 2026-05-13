import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const OTP_API_BASE_URL = process.env.xxxxxxxxxxxxxxxx || "";
const ENABLE_DEMO_OTP = process.env.NEXT_PUBLIC_ENABLE_DEMO_OTP === "true";

type OtpRecord = {
  otp: string;
  email: string;
  name: string;
  expiresAt: Timestamp;
};

type CapacitorWindow = Window & {
  Capacitor?: {
    isNativePlatform?: () => boolean;
  };
};

function cleanPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isNativeApp() {
  if (typeof window === "undefined") return false;
  const capacitor = (window as CapacitorWindow).Capacitor;
  return Boolean(capacitor?.isNativePlatform?.()) ||
    window.location.protocol === "capacitor:" ||
    window.location.protocol === "file:";
}

function otpApiUrl(path: "/api/otp/send" | "/api/otp/verify") {
  const base = OTP_API_BASE_URL.replace(/\/$/, "");
  return base ? `${base}${path}` : path;
}

async function postOtpApi(path: "/api/otp/send" | "/api/otp/verify", body: unknown) {
  const res = await fetch(otpApiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

function hasOtpApiBaseUrl() {
  return Boolean(OTP_API_BASE_URL.trim());
}

function mobileMailServerError() {
  return "Mobile OTP mail server is not configured. Set NEXT_PUBLIC_OTP_API_BASE_URL to your deployed API URL and rebuild the app.";
}

export async function sendOtp(input: { email: string; phone: string; name: string }) {
  const phone = cleanPhone(input.phone);
  const nativeApp = isNativeApp();

  if (!nativeApp || hasOtpApiBaseUrl()) {
    try {
      const data = await postOtpApi("/api/otp/send", { ...input, phone });
      if (data.ok) return { ok: true as const };
      return { ok: false as const, error: data.error || "Failed to send OTP email." };
    } catch {
      return { ok: false as const, error: "Network error. Please check your connection." };
    }
  }

  if (!ENABLE_DEMO_OTP) {
    return {
      ok: false as const,
      error: mobileMailServerError(),
    };
  }

  const otp = generateOtp();
  const expiresAt = Timestamp.fromMillis(Date.now() + 10 * 60 * 1000);
  await setDoc(doc(db, "otp", phone), {
    otp,
    email: input.email,
    name: input.name,
    expiresAt,
    createdAt: serverTimestamp(),
  });
  sessionStorage.setItem("dg-mobile-otp", otp);
  return { ok: true as const, demoOtp: otp };
}

export async function verifyOtp(input: { phone: string; otp: string }) {
  const phone = cleanPhone(input.phone);
  const nativeApp = isNativeApp();

  if (!nativeApp || hasOtpApiBaseUrl()) {
    try {
      const data = await postOtpApi("/api/otp/verify", { phone, otp: input.otp });
      if (data.ok) return { ok: true as const, name: data.name as string | undefined, email: data.email as string | undefined };
      return { ok: false as const, error: data.error || "Incorrect OTP. Please try again." };
    } catch {
      return { ok: false as const, error: "Network error. Please check your connection." };
    }
  }

  if (!ENABLE_DEMO_OTP) {
    return {
      ok: false as const,
      error: mobileMailServerError(),
    };
  }

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
  sessionStorage.removeItem("dg-mobile-otp");
  return { ok: true as const, name: record.name, email: record.email };
}
