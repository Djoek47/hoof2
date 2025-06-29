"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useCart } from "@/context/cart-context"
import { EnhancedCheckoutForm } from "@/components/checkout/enhanced-checkout-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ShoppingCart, Shield } from "lucide-react"
import Image from "next/image"

export default function CheckoutPage() {
  const { state } = useCart()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect if cart is empty
  useEffect(() => {
    if (mounted && state.items.length === 0) {
      router.push("/")
    }
  }, [mounted, state.items.length, router])

  if (!mounted) {
    return null // Prevent hydration mismatch
  }

  if (state.items.length === 0) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-100 mb-2">Your cart is empty</h1>
          <p className="text-gray-400 mb-6">Add some items to your cart before checking out.</p>
          <Button onClick={() => router.push("/")} variant="outline">
            Continue Shopping
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-900 pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button onClick={() => router.push("/")} variant="ghost" className="text-gray-400 hover:text-gray-100">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Store
          </Button>
          <h1 className="text-3xl font-bold text-gray-100">Secure Checkout</h1>
          <div className="flex items-center text-green-400">
            <Shield className="w-5 h-5 mr-1" />
            <span className="text-sm">SSL Secured</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Order Summary */}
          <div className="bg-dark-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-100 mb-6">Your Order</h2>

            <div className="space-y-4 mb-6">
              {state.items.map((item) => (
                <div
                  key={`${item.id}-${item.variantId}`}
                  className="flex items-center space-x-4 bg-dark-700 p-4 rounded-lg"
                >
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <Image
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      fill
                      className="object-cover rounded"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-100 truncate">{item.name}</h3>
                    {item.size && <p className="text-sm text-gray-400">Size: {item.size}</p>}
                    {item.color && <p className="text-sm text-gray-400">Color: {item.color}</p>}
                    <p className="text-sm text-gray-400">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-100">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Security Notice */}
            <div className="bg-green-900/20 border border-green-500 rounded-lg p-4 mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-semibold">Secure Payment</span>
              </div>
              <p className="text-green-300 text-sm">
                Your payment is processed securely by Printify. We never store your payment information.
              </p>
            </div>

            {/* Printify Notice */}
            <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
              <h4 className="text-blue-400 font-semibold mb-2">Print-on-Demand Service</h4>
              <p className="text-blue-300 text-sm">
                Your items will be printed and shipped directly from Printify's production facilities. This ensures the
                highest quality and fastest delivery times.
              </p>
            </div>
          </div>

          {/* Checkout Form */}
          <div className="bg-dark-800 rounded-lg p-6">
            <EnhancedCheckoutForm />
          </div>
        </div>
      </div>
    </div>
  )
}
