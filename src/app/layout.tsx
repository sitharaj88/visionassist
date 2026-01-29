import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  themeColor: "#06b6d4",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "VisionAssist - AI-Powered Visual Accessibility",
  description: "An AI-powered visual assistance tool helping visually impaired users understand their surroundings through camera analysis, text reading, object identification, and navigation assistance.",
  keywords: ["accessibility", "vision", "AI", "assistive technology", "visually impaired", "screen reader"],
  authors: [{ name: "VisionAssist Team" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VisionAssist",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "VisionAssist - AI-Powered Visual Accessibility",
    description: "Empowering independence through AI vision technology",
    type: "website",
  },
};

// Inline script to prevent FOUC (Flash of Unstyled Content) on theme load
const themeInitScript = `
  (function() {
    try {
      var stored = localStorage.getItem('visionassist-settings');
      if (stored) {
        var settings = JSON.parse(stored);
        if (settings.darkMode === false) {
          document.documentElement.setAttribute('data-theme', 'light');
        } else {
          document.documentElement.setAttribute('data-theme', 'dark');
        }
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    } catch (e) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
