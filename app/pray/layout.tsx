import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Prayer Request",
  manifest: "/manifest-pray.json",
  appleWebApp: {
    capable: true,
    title: "Prayer",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1A4A2E",
};

export default function PrayLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
