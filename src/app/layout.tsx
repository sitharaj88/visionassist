import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VisionAssist - AI-Powered Visual Accessibility",
  description: "An AI-powered visual assistance tool helping visually impaired users understand their surroundings through camera analysis, text reading, object identification, and navigation assistance.",
  keywords: ["accessibility", "vision", "AI", "assistive technology", "visually impaired", "screen reader"],
  authors: [{ name: "VisionAssist Team" }],
  manifest: "/manifest.json",
  themeColor: "#a855f7",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VisionAssist",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "VisionAssist - AI-Powered Visual Accessibility",
    description: "Empowering independence through AI vision technology",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
