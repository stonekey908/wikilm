import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/toast-provider";
import { ProjectProvider } from "@/components/project-switcher";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "WikiLM",
  description: "AI-powered knowledge base",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="h-screen overflow-hidden font-sans">
        <ThemeProvider>
          <ProjectProvider>
            <ToastProvider>
              <div className="flex h-screen">
                <Sidebar />
                <main className="flex flex-1 flex-col overflow-hidden min-w-0">
                  <div className="flex-1 overflow-y-auto">
                    {children}
                  </div>
                </main>
              </div>
            </ToastProvider>
          </ProjectProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
