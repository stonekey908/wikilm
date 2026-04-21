import type { Metadata } from "next";
import {
  Crimson_Pro,
  EB_Garamond,
  Fraunces,
  Instrument_Serif,
  JetBrains_Mono,
  Playfair_Display,
} from "next/font/google";
import { ProjectProvider } from "@/components/project-switcher";
import { ToastProvider } from "@/components/toast-provider";
import { TweaksProvider } from "@/components/editorial/tweaks-provider";
import { EditorialShell } from "@/components/editorial/editorial-shell";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: "variable",
  axes: ["opsz"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: "variable",
  display: "swap",
});

const crimson = Crimson_Pro({
  variable: "--font-crimson",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: "variable",
  display: "swap",
});

const garamond = EB_Garamond({
  variable: "--font-garamond",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: "variable",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "WikiLM — Editorial",
  description: "Personal wiki grown by an LLM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${playfair.variable} ${crimson.variable} ${garamond.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <TweaksProvider>
          <ProjectProvider>
            <ToastProvider>
              <EditorialShell>{children}</EditorialShell>
            </ToastProvider>
          </ProjectProvider>
        </TweaksProvider>
      </body>
    </html>
  );
}
