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
  title: "Tallykai - AI Finance Controller",
  description:
    "AI-powered financial reconciliation engine designed to normalize, match, and resolve multi-source transaction ledgers.",
  keywords: [
    "Tallykai",
    "Razorpay AI Buildathon 2026",
    "Finance Controller",
    "Financial Reconciliation",
    "AI Audit",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-100 min-h-screen selection:bg-indigo-500 selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
