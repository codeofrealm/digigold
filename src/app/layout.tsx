import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { GoldDemoProvider } from "@/context/GoldDemoProvider";
import { MobileShell } from "@/components/MobileShell";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-geist-sans", // keeping variable name to avoid changing css
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DigiGold | Premium Digital Gold",
  description:
    "The ultimate platform to Buy, Sell, and SIP digital gold.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DigiGold",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-black">
        <GoldDemoProvider>
          <MobileShell>{children}</MobileShell>
        </GoldDemoProvider>
      </body>
    </html>
  );
}
