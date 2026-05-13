import type { Metadata, Viewport } from "next";
import { GoldDemoProvider } from "@/context/GoldDemoProvider";
import { AuthProvider } from "@/context/AuthContext";
import { MobileShell } from "@/components/MobileShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "DigiGold – Buy & Save Digital Gold",
  description: "Buy, Sell, SIP digital gold & silver. Secure, insured, MMTC-PAMP certified.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#f7f3ec",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-[#f7f3ec]">
        <AuthProvider>
          <GoldDemoProvider>
            <MobileShell>{children}</MobileShell>
          </GoldDemoProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
