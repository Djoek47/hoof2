"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCart } from "@/contexts/cart-context"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"

interface CheckoutFormProps {
  onClose: () => void
}

interface ShippingAddress {
  firstName: string
  lastName: string
  email: string
  phone: string
  address1: string
  address2: string
  city: string
  state: string
  zipCode: string
  country: string
}

export function CheckoutForm({ onClose }: CheckoutFormProps) {
  const { state, dispatch } = useCart()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [orderComplete, setOrderComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)

  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zipCode: "",
    country: "US", // Default to US
  })

  const handleInputChange = (field: keyof ShippingAddress, value: string) => {
    setShippingAddress((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cartItems: state.items,
          shippingAddress,
          submitToProduction: true, // Automatically submit to production
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.details || result.error || "Checkout failed")
      }

      setOrderId(result.order.external_id)
      setOrderComplete(true)
      dispatch({ type: "CLEAR_CART" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during checkout")
    } finally {
      setIsLoading(false)
    }
  }

  const handleContinueShopping = () => {
    onClose()
    router.push("/")
  }

  if (orderComplete) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-100 mb-2">Order Placed Successfully!</h2>
        <p className="text-gray-400 mb-4">Order ID: {orderId}</p>
        <p className="text-gray-400 mb-6">
          Your order has been submitted to production. You'll receive email updates about your order status.
        </p>
        <Button onClick={handleContinueShopping} className="w-full">
          Continue Shopping
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-bold text-gray-100 mb-4">Shipping Information</h2>

      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-3 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName" className="text-gray-300">
            First Name *
          </Label>
          <Input
            id="firstName"
            value={shippingAddress.firstName}
            onChange={(e) => handleInputChange("firstName", e.target.value)}
            required
            className="bg-dark-700 border-dark-600 text-gray-100"
          />
        </div>
        <div>
          <Label htmlFor="lastName" className="text-gray-300">
            Last Name *
          </Label>
          <Input
            id="lastName"
            value={shippingAddress.lastName}
            onChange={(e) => handleInputChange("lastName", e.target.value)}
            required
            className="bg-dark-700 border-dark-600 text-gray-100"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email" className="text-gray-300">
          Email *
        </Label>
        <Input
          id="email"
          type="email"
          value={shippingAddress.email}
          onChange={(e) => handleInputChange("email", e.target.value)}
          required
          className="bg-dark-700 border-dark-600 text-gray-100"
        />
      </div>

      <div>
        <Label htmlFor="phone" className="text-gray-300">
          Phone
        </Label>
        <Input
          id="phone"
          value={shippingAddress.phone}
          onChange={(e) => handleInputChange("phone", e.target.value)}
          className="bg-dark-700 border-dark-600 text-gray-100"
        />
      </div>

      <div>
        <Label htmlFor="address1" className="text-gray-300">
          Address Line 1 *
        </Label>
        <Input
          id="address1"
          value={shippingAddress.address1}
          onChange={(e) => handleInputChange("address1", e.target.value)}
          required
          className="bg-dark-700 border-dark-600 text-gray-100"
        />
      </div>

      <div>
        <Label htmlFor="address2" className="text-gray-300">
          Address Line 2
        </Label>
        <Input
          id="address2"
          value={shippingAddress.address2}
          onChange={(e) => handleInputChange("address2", e.target.value)}
          className="bg-dark-700 border-dark-600 text-gray-100"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="city" className="text-gray-300">
            City *
          </Label>
          <Input
            id="city"
            value={shippingAddress.city}
            onChange={(e) => handleInputChange("city", e.target.value)}
            required
            className="bg-dark-700 border-dark-600 text-gray-100"
          />
        </div>
        <div>
          <Label htmlFor="state" className="text-gray-300">
            State *
          </Label>
          <Input
            id="state"
            value={shippingAddress.state}
            onChange={(e) => handleInputChange("state", e.target.value)}
            required
            className="bg-dark-700 border-dark-600 text-gray-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="zipCode" className="text-gray-300">
            ZIP Code *
          </Label>
          <Input
            id="zipCode"
            value={shippingAddress.zipCode}
            onChange={(e) => handleInputChange("zipCode", e.target.value)}
            required
            className="bg-dark-700 border-dark-600 text-gray-100"
          />
        </div>
        <div>
          <Label htmlFor="country" className="text-gray-300">
            Country *
          </Label>
          <select
            id="country"
            value={shippingAddress.country}
            onChange={(e) => handleInputChange("country", e.target.value)}
            required
            className="w-full px-3 py-2 bg-dark-700 border border-dark-600 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="GB">United Kingdom</option>
            <option value="AU">Australia</option>
            <option value="DE">Germany</option>
            <option value="FR">France</option>
            <option value="IT">Italy</option>
            <option value="ES">Spain</option>
            <option value="NL">Netherlands</option>
            <option value="BE">Belgium</option>
            <option value="SE">Sweden</option>
            <option value="NO">Norway</option>
            <option value="DK">Denmark</option>
            <option value="FI">Finland</option>
            <option value="PL">Poland</option>
            <option value="CZ">Czech Republic</option>
            <option value="AT">Austria</option>
            <option value="CH">Switzerland</option>
            <option value="IE">Ireland</option>
            <option value="PT">Portugal</option>
          </select>
        </div>
      </div>

      <div className="border-t border-dark-600 pt-4 mt-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-semibold text-gray-100">Total:</span>
          <span className="text-lg font-bold text-gray-100">${state.total.toFixed(2)}</span>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          * Shipping costs will be calculated by Printify based on your location and selected items.
        </p>
      </div>

      <div className="flex space-x-3">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1 bg-transparent">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Processing...
            </>
          ) : (
            "Place Order"
          )}
        </Button>
      </div>
    </form>
  )
}
