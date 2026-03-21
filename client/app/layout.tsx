import type { Metadata, Viewport } from "next";
import { Inter, Wire_One } from "next/font/google";
import type { ReactNode } from "react";
import { AppProviders } from "@/components/layout/app-providers";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getRequestLocale } from "@/lib/auth";
import { getRequestRegionalSettings } from "@/lib/regional/server";
import { getRequestDensity, getRequestTheme, getRequestThemeColorMode } from "@/lib/theme/server";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--loom-font-sans"
});

const wireOne = Wire_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--loom-font-brand"
});

export const metadata: Metadata = {
  title: "Loom",
  description: "Family management app",
  applicationName: "Loom",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Loom",
    statusBarStyle: "default"
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#f7f8fa"
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getRequestLocale();
  const regionalSettings = await getRequestRegionalSettings();
  const theme = await getRequestTheme();
  const density = await getRequestDensity();
  const colorMode = await getRequestThemeColorMode();
  const dictionary = getDictionary(locale);
  const htmlLang = locale === "en" ? "en-GB" : locale === "pt" ? "pt-PT" : locale;

  return (
    <html lang={htmlLang} data-theme={theme} data-density={density} data-color-mode={colorMode}>
      <body className={`${inter.className} ${wireOne.variable}`}>
        <AppProviders locale={locale} dictionary={dictionary} regionalSettings={regionalSettings}>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
