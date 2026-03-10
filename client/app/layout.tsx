import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { AppProviders } from "@/components/layout/app-providers";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getRequestLocale } from "@/lib/auth";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--loom-font-sans"
});

export const metadata: Metadata = {
  title: "Loom",
  description: "Family management app"
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <AppProviders locale={locale} dictionary={dictionary}>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
