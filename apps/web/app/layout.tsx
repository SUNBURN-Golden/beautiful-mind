import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SoulBound",
  description: "Selective, admission-based trust network built on proof-first verification.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
