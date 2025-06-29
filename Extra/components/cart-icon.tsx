"use client"

import { ShoppingCart } from "lucide-react"
import { useState } from "react"
import { useCart } from "@/contexts/cart-context"
import { CartDrawer } from "./cart-drawer"

export function CartIcon() {
  const [isClicked, setIsClicked] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const { state } = useCart()

  const handleClick = () => {
    setIsClicked(true)
    setIsDrawerOpen(true)
    setTimeout(() => setIsClicked(false), 300)
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`relative p-2 rounded-full bg-dark-400 hover:bg-dark-300 transition-colors duration-200 ${
          isClicked ? "animate-click" : ""
        }`}
      >
        <ShoppingCart className="w-6 h-6 text-gray-100" />
        {state.itemCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-white text-dark-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {state.itemCount > 99 ? "99+" : state.itemCount}
          </span>
        )}
      </button>
      <CartDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  )
}
