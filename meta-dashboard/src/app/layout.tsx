import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Facebook Ads Analytics Dashboard",
  description: "Multi-language analytics platform for Facebook Ads performance",
};

// Root layout - just passes through to locale-specific layout
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
