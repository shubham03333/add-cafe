import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { CustomerAuthProvider } from "@/contexts/CustomerAuthContext";

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
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <CustomerAuthProvider>
          {children}
        </CustomerAuthProvider>
        <Script src="https://pay.google.com/gp/p/js/pay.js" strategy="beforeInteractive" />
      </body>
    </html>
  );
}
