"use client"

import { X, Plus, Minus, Trash2 } from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useRouter } from "next/navigation"

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { state, dispatch } = useCart()
  const router = useRouter()

  const updateQuantity = (id: number, quantity: number) => {
    dispatch({ type: "UPDATE_QUANTITY", payload: { id, quantity } })
  }

  const removeItem = (id: number) => {
    dispatch({ type: "REMOVE_ITEM", payload: id })
  }

  const clearCart = () => {
    dispatch({ type: "CLEAR_CART" })
  }

  const goToCheckout = () => {
    onClose()
    router.push("/checkout")
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-dark-800 z-50 transform transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-dark-600">
            <h2 className="text-xl font-semibold text-gray-100">Shopping Cart</h2>
            <button onClick={onClose} className="p-2 hover:bg-dark-600 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {state.items.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">Your cart is empty</p>
              </div>
            ) : (
              <div className="space-y-4">
                {state.items.map((item) => (
                  <div
                    key={`${item.id}-${item.variantId}`}
                    className="flex items-center space-x-3 bg-dark-700 p-3 rounded-lg"
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
                      <h3 className="text-sm font-medium text-gray-100 truncate">{item.name}</h3>
                      {item.size && <p className="text-xs text-gray-400">Size: {item.size}</p>}
                      {item.color && <p className="text-xs text-gray-400">Color: {item.color}</p>}
                      <p className="text-sm font-semibold text-gray-100">${item.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1 hover:bg-dark-600 rounded"
                      >
                        <Minus className="w-4 h-4 text-gray-400" />
                      </button>
                      <span className="text-gray-100 w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1 hover:bg-dark-600 rounded"
                      >
                        <Plus className="w-4 h-4 text-gray-400" />
                      </button>
                      <button onClick={() => removeItem(item.id)} className="p-1 hover:bg-red-600 rounded ml-2">
                        <Trash2 className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {state.items.length > 0 && (
            <div className="border-t border-dark-600 p-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-100">Subtotal:</span>
                <span className="text-lg font-bold text-gray-100">${state.total.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-400">Shipping and tax calculated at checkout</p>
              <div className="space-y-2">
                <Button className="w-full bg-green-600 hover:bg-green-700" size="lg" onClick={goToCheckout}>
                  Secure Checkout
                </Button>
                <Button variant="outline" className="w-full bg-transparent" onClick={clearCart}>
                  Clear Cart
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
