/** @type {import('next').NextConfig} */
const isMobileExport = process.env.CAPACITOR_BUILD === "true";

const nextConfig = {
  distDir: isMobileExport ? ".next" : ".next-server",
  env: {
    NEXT_PUBLIC_OTP_SEND_URL: process.env.NEXT_PUBLIC_OTP_SEND_URL || "",
    NEXT_PUBLIC_OTP_VERIFY_URL: process.env.NEXT_PUBLIC_OTP_VERIFY_URL || "",
  },
  images: { unoptimized: true },
  compress: true,
  poweredByHeader: false,
  ...(isMobileExport ? { output: "export" } : {}),
};

module.exports = nextConfig;
