const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const nodemailer = require("nodemailer");

initializeApp();

const db = getFirestore();
const gmailAppPassword = defineSecret("OTP_GMAIL_APP_PASSWORD");
const gmailUser = "rahul63794@gmail.com";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function cleanPhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function json(res, status, body) {
  res.set(corsHeaders);
  res.status(status).json(body);
}

function handleOptions(req, res) {
  if (req.method === "OPTIONS") {
    res.set(corsHeaders);
    res.status(204).send("");
    return true;
  }
  return false;
}

function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailAppPassword.value(),
    },
  });
}

function otpEmailTemplate(name, otp) {
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
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;">DigiGold</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">Buy & Save Digital Gold</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;color:#5a4a2a;font-size:16px;font-weight:700;">Hi ${name}</p>
            <p style="margin:0 0 24px;color:#9a8060;font-size:14px;line-height:1.6;">Your One-Time Password for DigiGold account verification:</p>
            <div style="background:#fff8e8;border:2px solid #e8c84a;border-radius:16px;padding:28px;text-align:center;margin:0 0 24px;">
              <p style="margin:0 0 8px;color:#9a8060;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;">Your OTP Code</p>
              <p style="margin:0;color:#b8860b;font-size:44px;font-weight:900;letter-spacing:10px;font-family:'Courier New',monospace;">${otp}</p>
              <p style="margin:14px 0 0;color:#9a8060;font-size:12px;">Valid for <strong>10 minutes</strong> only</p>
            </div>
            <p style="margin:0;color:#9a8060;font-size:13px;line-height:1.6;">Never share this OTP with anyone. If you did not request this, ignore this email.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

exports.sendOtp = onRequest({ region: "us-central1", cors: true, secrets: [gmailAppPassword] }, async (req, res) => {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method not allowed" });

  try {
    const { email, phone, name } = req.body || {};
    const clean = cleanPhone(phone);
    const displayName = String(name || "User").trim();
    const to = String(email || "").trim().toLowerCase();

    if (!to || !clean || !displayName) return json(res, 400, { ok: false, error: "Missing fields" });
    if (!to.includes("@")) return json(res, 400, { ok: false, error: "Invalid email address" });

    const otp = generateOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    await db.collection("otp").doc(clean).set({
      otp,
      email: to,
      name: displayName,
      expiresAt,
      createdAt: FieldValue.serverTimestamp(),
    });

    await createTransporter().sendMail({
      from: `"DigiGold" <${gmailUser}>`,
      to,
      subject: `${otp} is your DigiGold OTP - valid 10 mins`,
      html: otpEmailTemplate(displayName, otp),
    });

    return json(res, 200, { ok: true, message: "OTP sent to your email" });
  } catch (err) {
    console.error("sendOtp error", err);
    return json(res, 500, { ok: false, error: "Failed to send OTP email" });
  }
});

exports.verifyOtp = onRequest({ region: "us-central1", cors: true }, async (req, res) => {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method not allowed" });

  try {
    const { phone, otp } = req.body || {};
    const clean = cleanPhone(phone);
    const code = String(otp || "").trim();

    if (!clean || !code) return json(res, 400, { ok: false, error: "Missing fields" });

    const ref = db.collection("otp").doc(clean);
    const snap = await ref.get();
    if (!snap.exists) return json(res, 404, { ok: false, error: "OTP not found. Please request a new one." });

    const record = snap.data();
    if (Date.now() > record.expiresAt) {
      await ref.delete().catch(() => {});
      return json(res, 400, { ok: false, error: "OTP expired. Please request a new one." });
    }
    if (record.otp !== code) return json(res, 400, { ok: false, error: "Incorrect OTP. Please try again." });

    await ref.delete().catch(() => {});
    return json(res, 200, { ok: true, name: record.name, email: record.email });
  } catch (err) {
    console.error("verifyOtp error", err);
    return json(res, 500, { ok: false, error: "Verification failed" });
  }
});
