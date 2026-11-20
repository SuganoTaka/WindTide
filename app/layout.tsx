import type { Metadata, Viewport } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "潮見帖 — 全国の漁港・港湾の釣り情報",
  description:
    "全国3,900以上の漁港・港湾を地図から探し、今の時期に港内・堤防で釣れる魚、天気・風・タイドグラフ、現在地からの距離とルートをまとめて確認できる釣り情報アプリ。船釣りは対象外。",
  keywords: ["釣り", "漁港", "港湾", "潮汐", "タイドグラフ", "釣りもの", "堤防"],
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#ecefe6",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
