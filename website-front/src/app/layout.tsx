import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ChatWidget from "../components/ChatWidget";
import CookieConsent from "../components/CookieConsent";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ['400', '500', '700', '800'],
  variable: '--font-manrope',
});

export const metadata: Metadata = {
  title: "AdsAI - Simplify Facebook Data. Gain Valuable Insights.",
  description: "Built by marketers, for marketers. The easy-to-use platform to compare performance, conduct research, and create custom reports with AI-driven insights.",
  keywords: ["facebook ads", "ai marketing", "ad analytics", "marketing automation", "roas optimization"],
  openGraph: {
    title: "AdsAI - The Brain Behind Your Facebook Ads",
    description: "Stop guessing with your budget. Start scaling with confidence.",
    type: "website",
    url: "https://adsai.com",
  }
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=block" />
      </head>
      <body className={`${manrope.variable} font-sans bg-[#f6f6f8] dark:bg-[#101622] text-slate-900 dark:text-white antialiased`}>
        <Navbar />
        <main>{children}</main>
        <Footer />
        <ChatWidget />
        <CookieConsent />
      </body>
    </html>
  );
}
