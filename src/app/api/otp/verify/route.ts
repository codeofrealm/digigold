import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// Import the same in-memory store from send route
// Since Next.js API routes share module scope in the same process
declare global {
  // eslint-disable-next-line no-var
  var __otpStore: Map<string, { otp: string; email: string; name: string; expiresAt: number }> | undefined;
}

// Use global to persist across hot reloads in dev
if (!global.__otpStore) {
  global.__otpStore = new Map();
}
const otpStore = global.__otpStore;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function POST(req: NextRequest) {
  try {
    const { phone, otp } = await req.json();

    if (!phone || !otp) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400, headers: corsHeaders });
    }

    let record = otpStore.get(phone);
    let fromFirestore = false;

    if (adminDb) {
      const snap = await adminDb.collection("otp").doc(phone).get();
      if (snap.exists) {
        const data = snap.data() as { otp: string; email: string; name: string; expiresAt: number };
        record = data;
        fromFirestore = true;
      }
    }

    if (!record) {
      return NextResponse.json({ ok: false, error: "OTP not found. Please request a new one." }, { status: 404, headers: corsHeaders });
    }

    if (Date.now() > record.expiresAt) {
      if (fromFirestore && adminDb) await adminDb.collection("otp").doc(phone).delete().catch(() => {});
      else otpStore.delete(phone);
      return NextResponse.json({ ok: false, error: "OTP expired. Please request a new one." }, { status: 400, headers: corsHeaders });
    }

    if (record.otp !== otp) {
      return NextResponse.json({ ok: false, error: "Incorrect OTP. Please try again." }, { status: 400, headers: corsHeaders });
    }

    // OTP verified — delete it
    if (fromFirestore && adminDb) await adminDb.collection("otp").doc(phone).delete().catch(() => {});
    else otpStore.delete(phone);

    return NextResponse.json({ ok: true, name: record.name, email: record.email }, { headers: corsHeaders });

  } catch (err) {
    console.error("OTP verify error:", err);
    return NextResponse.json({ ok: false, error: "Verification failed" }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
