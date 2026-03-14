import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";

import { AuthModal } from "@/components/AuthModal";
import { BottomNavigation } from "@/components/BottomNavigation";
import { CartBar } from "@/components/CartBar";
import { CartDrawer } from "@/components/CartDrawer";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { DeliveryProvider } from "@/context/DeliveryContext";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
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
      <body className={`${inter.variable} ${poppins.variable} font-sans bg-white`}>
        <AuthProvider>
          <DeliveryProvider>
            <CartProvider>
              <div className="min-h-screen">
                <Header />
                <main className="pb-28 lg:pb-6">{children}</main>
                <CartBar />
                <Footer />
                <CartDrawer />
                <AuthModal />
                <BottomNavigation />
              </div>
            </CartProvider>
          </DeliveryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
