import type { Metadata, Viewport } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Mohammad — AI Systems Portfolio",
  description:
    "Professional interactive portfolio for Mohammad, a Computer Science student building AI-assisted systems, interactive interfaces, and product-oriented technical workflows.",
  metadataBase: new URL("https://mohammad.dev"),
  openGraph: {
    title: "Mohammad — AI Systems Portfolio",
    description:
      "AI systems, technical case studies, GitHub activity, product direction, and implementation notes from Mohammad.",
    type: "website"
  },
  icons: {
    icon: "/icon.svg"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#050507"
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
