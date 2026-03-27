import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Dilling — Naturlige materialer siden 1916",
    template: "%s | Dilling",
  },
  description:
    "Økologisk merinould og bomuld til hele familien. Dansk kvalitet siden 1916.",
  keywords: [
    "Dilling",
    "merinould",
    "merino wool",
    "økologisk",
    "organic",
    "undertøj",
    "underwear",
    "activewear",
    "dansk",
    "Danish",
  ],
  openGraph: {
    type: "website",
    siteName: "Dilling",
    title: "Dilling — Naturlige materialer siden 1916",
    description:
      "Økologisk merinould og bomuld til hele familien. Dansk kvalitet siden 1916.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2C3E2D",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
