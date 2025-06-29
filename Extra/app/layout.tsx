import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import type React from "react"
import { SplashScreen } from "@/components/splash-screen"
import { Logo } from "@/components/logo"
import { CustomCursor } from "@/components/custom-cursor"
import { CartProvider } from "@/contexts/cart-context"
import { CartIcon } from "@/components/cart-icon"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SDFM 2520 - Premium Hoodies",
  description: "Premium streetwear and comfortable hoodies",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className={`${inter.className} bg-dark-900 text-gray-100`}>
        <CartProvider>
          <SplashScreen />
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
            <Logo />
          </div>
          <div className="fixed top-4 right-4 z-50 pointer-events-auto">
            <CartIcon />
          </div>
          {children}
          <footer className="w-full py-6 px-4 bg-dark-600 text-gray-400">
            <div className="container mx-auto text-center">
              <p>&copy; 2023 SDFM 2520. All rights reserved.</p>
            </div>
          </footer>
          <CustomCursor />
        </CartProvider>
      </body>
    </html>
  )
}
