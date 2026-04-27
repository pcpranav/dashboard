import type { Metadata } from "next";
import { DM_Sans, Space_Mono } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DevPulse",
  description: "A personal dashboard for Vercel, Netlify, and Supabase.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${spaceMono.variable} dark`}>
      <body className="relative overflow-x-hidden">
        <div
          className="aurora-orb"
          style={{
            top: "-20%",
            left: "-10%",
            width: "60vw",
            height: "60vw",
            background: "radial-gradient(circle, #3b82f6, transparent 70%)",
            opacity: 0.3,
          }}
        />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
