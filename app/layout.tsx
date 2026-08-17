import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BRAND } from "@/lib/brand";
import { getServerLocale } from "@/lib/i18n-server";
import { isRTL } from "@/lib/i18n";
import { I18nProvider } from "@/components/I18nProvider";

// One crisp grotesk family, used with tight tracking — the Stripe signature.
const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: BRAND.name,
  description: BRAND.description,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getServerLocale();
  return (
    <html lang={locale} dir={isRTL(locale) ? "rtl" : "ltr"} className={sans.variable}>
      <body className="min-h-screen font-sans antialiased">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
