import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { BRAND } from "@/lib/brand";
import { getServerLocale } from "@/lib/i18n-server";
import { isRTL } from "@/lib/i18n";
import { I18nProvider } from "@/components/I18nProvider";
import FirstTouch from "@/components/FirstTouch";
import CookieNotice from "@/components/CookieNotice";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/orgs";
import { TenantProvider, type TenantBrand } from "@/components/TenantProvider";

// One crisp grotesk family, used with tight tracking — the Stripe signature.
const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

// A high-contrast display serif for the biggest headings — an editorial,
// premium counterpoint to the sans UI. Used only on hero/page-title moments.
const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
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

  // Resolve the signed-in user's active white-label org, so shared UI themes to
  // it. Best-effort: never let a branding lookup break the shell.
  let brand: TenantBrand = null;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const org = await getActiveOrg(user);
      if (org) brand = { name: org.name, logoUrl: org.logo_url, color: org.primary_color, slug: org.slug };
    }
  } catch {}

  return (
    <html lang={locale} dir={isRTL(locale) ? "rtl" : "ltr"} className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        {brand?.color && <style dangerouslySetInnerHTML={{ __html: `:root{--brand:${brand.color};}` }} />}
        <TenantProvider value={brand}>
          <FirstTouch />
          <I18nProvider locale={locale}>{children}</I18nProvider>
          <CookieNotice />
        </TenantProvider>
      </body>
    </html>
  );
}
