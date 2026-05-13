const CF_SEND_URL = process.env.NEXT_PUBLIC_OTP_SEND_URL || "";
const CF_VERIFY_URL = process.env.NEXT_PUBLIC_OTP_VERIFY_URL || "";

type CapacitorWindow = Window & {
  Capacitor?: { isNativePlatform?: () => boolean };
};

function cleanPhone(phone: string) {
  return phone.replace(/\D/g, "");
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
  const native = isNativeApp();
  const url = native ? CF_SEND_URL : "/api/otp/send";

  if (native && !CF_SEND_URL) {
    return { ok: false as const, error: "OTP service not configured. Please contact support." };
  }

  try {
    const data = await postJson(url, { ...input, phone });
    if (data.ok) return { ok: true as const };
    return { ok: false as const, error: data.error || "Failed to send OTP email." };
  } catch {
    return { ok: false as const, error: "Network error. Please check your internet connection." };
  }
}

export async function verifyOtp(input: { phone: string; otp: string }) {
  const phone = cleanPhone(input.phone);
  const native = isNativeApp();
  const url = native ? CF_VERIFY_URL : "/api/otp/verify";

  if (native && !CF_VERIFY_URL) {
    return { ok: false as const, error: "OTP service not configured. Please contact support." };
  }

  try {
    const data = await postJson(url, { phone, otp: input.otp });
    if (data.ok) return { ok: true as const, name: data.name as string | undefined, email: data.email as string | undefined };
    return { ok: false as const, error: data.error || "Incorrect OTP. Please try again." };
  } catch {
    return { ok: false as const, error: "Network error. Please check your internet connection." };
  }
}
