import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TallyKai — AI Finance Controller",
  description:
    "High-precision AI financial reconciliation engine designed to normalize, match, and resolve multi-source transaction ledgers.",
  keywords: [
    "TallyKai",
    "Razorpay AI Buildathon 2026",
    "Finance Controller",
    "Financial Reconciliation",
    "AI Audit",
    "FinOps",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900 min-h-screen selection:bg-emerald-600 selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
