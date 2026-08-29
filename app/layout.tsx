import type { Metadata } from "next";
import { headers } from "next/headers";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const description =
  "서로 다른 역사 분야를 하나의 시간축에서 엮는, 내가 만들어가는 역사 지도";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");

  return {
    metadataBase: new URL(`${protocol}://${host}`),
    title: "Kairosia: HistoryBuilder",
    description,
    icons: { icon: "/favicon.svg" },
    openGraph: {
      title: "Kairosia: HistoryBuilder",
      description,
      images: [{ url: "/og-kairosia.png", width: 1200, height: 630 }],
      locale: "ko_KR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Kairosia: HistoryBuilder",
      description,
      images: ["/og-kairosia.png"],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
