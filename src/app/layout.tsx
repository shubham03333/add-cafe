import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adda Cafe Orders",
  description: "Cafe order management system",
  icons: {
    icon: '/favicon.ico',
    apple: '/logo.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
  },
};

export const viewport = {
  themeColor: '#fafafa',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ colorScheme: 'light' }}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
