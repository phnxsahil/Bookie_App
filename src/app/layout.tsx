import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bookie — Your Intelligent Bookmark Manager",
  description: "Bookie bakes your links into organized, AI-enriched insights. Minimalist design, powerful organization.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
