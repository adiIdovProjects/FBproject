import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata } from 'next';
import Providers from '../../components/Providers';
import "../globals.css";
import "leaflet/dist/leaflet.css";

export const metadata: Metadata = {
  title: "AdSolus: Total Control. Zero Middlemen.",
  description: "AdSolus - Be your own best agency. Total Control. Zero Middlemen.",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

type Params = Promise<{ locale: string }>;

const locales = ['en', 'ar', 'he', 'fr', 'de'];

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client side is the easiest way to get started
  const messages = await getMessages({ locale });

  // Determine if locale is RTL
  const isRTL = locale === 'ar' || locale === 'he';

  return (

    <html lang={locale} dir={isRTL ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <Providers>
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
