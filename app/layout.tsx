import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { AuthModal } from "@/components/AuthModal";
import { BottomNavigation } from "@/components/BottomNavigation";
import { CartDrawer } from "@/components/CartDrawer";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

export const metadata: Metadata = {
  title: "QuickBasket | Grocery Delivery in Minutes",
  description: "Quick-commerce grocery storefront for fast browsing, instant carting, and speedy delivery."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans bg-white`}>
        <AuthProvider>
          <CartProvider>
            <div className="min-h-screen">
              <Header />
              <main className="pb-24 lg:pb-0">{children}</main>
              <Footer />
              <CartDrawer />
              <AuthModal />
              <BottomNavigation />
            </div>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
