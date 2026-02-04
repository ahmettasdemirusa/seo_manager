import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import GlobalHeader from "@/components/GlobalHeader";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ahmet Tasdemir SEO AI Manager",
  description: "Ultimate AI-powered SEO optimization and analysis platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="min-h-screen selection:bg-indigo-500/30 selection:text-indigo-300">
        <Providers>
          <GlobalHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
