import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "麻雀",
  description: "4人麻雀 CPU 対戦",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
