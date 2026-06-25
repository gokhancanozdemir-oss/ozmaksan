import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ÖZMAKSAN | Akıllı Depo & Üretim Takip",
  description:
    "QR kod tabanlı hammadde sarfiyat takibi ve proje maliyetlendirme sistemi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
