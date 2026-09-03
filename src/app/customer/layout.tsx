"use client";

import Script from "next/script";
import { CustomerAuthProvider } from "@/contexts/CustomerAuthContext";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <CustomerAuthProvider>
      {children}
      <Script src="https://pay.google.com/gp/p/js/pay.js" strategy="lazyOnload" />
    </CustomerAuthProvider>
  );
}
