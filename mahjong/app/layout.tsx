import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "麻雀対戦卓",
  description: "4人リーチ麻雀のCPU対戦卓",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
