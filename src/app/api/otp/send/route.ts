import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { adminDb } from "@/lib/firebase-admin";

// Use global store so verify route can access same data
declare global {
  // eslint-disable-next-line no-var
  var __otpStore: Map<string, { otp: string; email: string; name: string; expiresAt: number }> | undefined;
}
if (!global.__otpStore) {
  global.__otpStore = new Map();
}
const otpStore = global.__otpStore;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function createTransporter() {
  const user = process.env.OTP_GMAIL_USER;
  const pass = process.env.OTP_GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error("OTP Gmail credentials are not configured on the server.");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function otpEmailTemplate(name: string, otp: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f7f3ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ec;padding:30px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(184,134,11,0.12);">
        
        <tr>
          <td style="background:linear-gradient(135deg,#7b1c1c,#b8860b);padding:32px;text-align:center;">
            <div style="font-size:36px;margin-bottom:12px;">🥇</div>
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;">DigiGold</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">Buy & Save Digital Gold</p>
          </td>
        </tr>

        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;color:#5a4a2a;font-size:16px;font-weight:700;">Hi ${name} 👋</p>
            <p style="margin:0 0 24px;color:#9a8060;font-size:14px;line-height:1.6;">
              Your One-Time Password (OTP) for DigiGold account verification:
            </p>

            <div style="background:linear-gradient(135deg,#fdf3d0,#fff8e8);border:2px solid #e8c84a;border-radius:16px;padding:28px;text-align:center;margin:0 0 24px;">
              <p style="margin:0 0 8px;color:#9a8060;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;">Your OTP Code</p>
              <p style="margin:0;color:#b8860b;font-size:48px;font-weight:900;letter-spacing:14px;font-family:'Courier New',monospace;">${otp}</p>
              <p style="margin:14px 0 0;color:#9a8060;font-size:12px;">⏱ Valid for <strong>10 minutes</strong> only</p>
            </div>

            <div style="background:#fff8e8;border-left:4px solid #b8860b;border-radius:8px;padding:14px 16px;margin:0 0 24px;">
              <p style="margin:0;color:#7b4a00;font-size:12px;line-height:1.6;">
                🔒 <strong>Never share this OTP</strong> with anyone.<br/>
                DigiGold will never ask for your OTP via call or message.
              </p>
            </div>

            <p style="margin:0;color:#9a8060;font-size:13px;line-height:1.6;">
              If you didn't request this, please ignore this email. Your account is safe.
            </p>
          </td>
        </tr>

        <tr>
          <td style="background:#fdfaf4;border-top:1px solid #ede0c4;padding:20px 32px;text-align:center;">
            <p style="margin:0 0 4px;color:#9a8060;font-size:12px;">🏅 MMTC-PAMP Certified &nbsp;·&nbsp; 🔒 RBI Regulated &nbsp;·&nbsp; 📦 Home Delivery</p>
            <p style="margin:0;color:#c8b090;font-size:11px;">© 2025 DigiGold &nbsp;·&nbsp; Made with ❤️ in India</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const { email, phone, name } = await req.json();

    if (!email || !phone || !name) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400, headers: corsHeaders });
    }
    if (!email.includes("@")) {
      return NextResponse.json({ ok: false, error: "Invalid email address" }, { status: 400, headers: corsHeaders });
    }

    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 min

    if (adminDb) {
      await adminDb.collection("otp").doc(phone).set({
        otp,
        email,
        name,
        expiresAt,
        createdAt: Date.now(),
      });
    } else {
      otpStore.set(phone, { otp, email, name, expiresAt });
    }

    // Send email
    await createTransporter().sendMail({
      from: `"DigiGold" <${process.env.OTP_GMAIL_USER}>`,
      to: email,
      subject: `${otp} is your DigiGold OTP — valid 10 mins`,
      html: otpEmailTemplate(name, otp),
    });

    console.log(`✅ OTP sent to ${email} for phone ${phone}`);
    return NextResponse.json({ ok: true, message: "OTP sent to your email" }, { headers: corsHeaders });

  } catch (err: unknown) {
    console.error("OTP send error:", err);
    const msg = err instanceof Error ? err.message : "Failed to send OTP";
    return NextResponse.json({ ok: false, error: msg }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
