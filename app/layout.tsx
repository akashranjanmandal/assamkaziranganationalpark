import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageEffects } from "@/components/PageEffects";
import { ToastProvider } from "@/components/Toast";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { LanguageSplash, LanguageChangeButton } from "@/components/LanguageSplash";

export const metadata: Metadata = {
  title: "Assam Wild Safari — Elite Safari Experiences",
  description:
    "Guaranteed sightings. Elite naturalists. Wildlife safari in Kaziranga & Manas, Assam.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <I18nProvider>
            <ToastProvider>
              <PageEffects />
              <LanguageSplash />
              <LanguageChangeButton />
              <Navbar />
              <main>{children}</main>
              <Footer />
            </ToastProvider>
          </I18nProvider>
        </Providers>
        <Script src="https://unpkg.com/lucide@latest" strategy="afterInteractive" />
        <Script id="lucide-init" strategy="afterInteractive">
          {`if (typeof window !== 'undefined') { const t = setInterval(() => { if (window.lucide) { window.lucide.createIcons(); clearInterval(t); } }, 200); setTimeout(() => clearInterval(t), 5000); }`}
        </Script>
      </body>
    </html>
  );
}
