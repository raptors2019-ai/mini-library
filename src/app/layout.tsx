import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ActionProvider } from "@/providers/action-provider";
import { NotificationProvider } from "@/providers/notification-provider";
import { Header } from "@/components/header";
import { Toaster } from "@/components/ui/sonner";
import { ChatWidget } from "@/components/chat";
import { SimulationBanner } from "@/components/simulation-banner";
import { Footer } from "@/components/footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AILibrary | AI-Powered Book Management",
  description: "A modern library management system with AI-powered search and recommendations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background flex flex-col`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
        >
          <Suspense fallback={null}>
            <NotificationProvider>
              <ActionProvider>
                <SimulationBanner />
                <Header />
                <main className="container py-6 flex-1">
                  {children}
                </main>
                <Footer />
                <Toaster />
                <ChatWidget />
              </ActionProvider>
            </NotificationProvider>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
