"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCart } from "@/context/cart-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CreditCard, Clock } from "lucide-react"
import StripePaymentForm from "@/components/checkout/stripe-payment-form"

interface PaymentMethod {
  id: string
  name: string
  description: string
  type: string
  enabled: boolean
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

export const EnhancedCheckoutForm = () => {
  const { state, dispatch } = useCart()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [showStripeForm, setShowStripeForm] = useState(false)

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
    country: "US",
  })

  // Load payment methods
  useEffect(() => {
    const loadPaymentMethods = async () => {
      try {
        const response = await fetch("/api/payments/methods")
        const data = await response.json()
        setPaymentMethods(data.methods || [])

        // Auto-select first available method
        if (data.methods && data.methods.length > 0) {
          setSelectedPaymentMethod(data.methods[0].id)
        }
      } catch (error) {
        console.error("Failed to load payment methods:", error)
        setPaymentMethods([
          {
            id: "manual",
            name: "Manual Processing",
            description: "Create order for manual payment processing",
            type: "manual",
            enabled: true,
          },
        ])
        setSelectedPaymentMethod("manual")
      }
    }

    loadPaymentMethods()
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Only redirect if not coming from a successful payment
  useEffect(() => {
    const isSuccess = window.location.pathname.startsWith("/success")
    if (mounted && state.items.length === 0 && !isSuccess) {
      router.push("/")
    }
  }, [mounted, state.items.length, router])

  const calculateTotal = () => {
    return state.items.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const handleAddressChange = (field: keyof ShippingAddress, value: string) => {
    setShippingAddress((prev) => ({ ...prev, [field]: value }))
  }

  const validateForm = () => {
    const required = ["firstName", "lastName", "email", "address1", "city", "state", "zipCode", "country"]
    for (const field of required) {
      if (!shippingAddress[field as keyof ShippingAddress]) {
        setError(`${field.charAt(0).toUpperCase() + field.slice(1)} is required`)
        return false
      }
    }

    if (!selectedPaymentMethod) {
      setError("Please select a payment method")
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!validateForm()) {
      setIsLoading(false)
      return
    }

    try {
      const orderData = {
        items: state.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          price: item.price,
        })),
        shippingAddress,
      }

      if (selectedPaymentMethod === "stripe") {
        // Create Stripe payment intent
        const intentResponse = await fetch("/api/payments/stripe/create-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: calculateTotal(),
            metadata: {
              customerEmail: shippingAddress.email,
              orderItems: JSON.stringify(orderData.items),
            },
          }),
        })

        if (!intentResponse.ok) {
          throw new Error("Failed to create payment intent")
        }

        const { clientSecret } = await intentResponse.json()
        setClientSecret(clientSecret)
        setShowStripeForm(true)
      } else if (selectedPaymentMethod === "manual") {
        // Create manual order
        const response = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cartItems: state.items,
            shippingAddress,
            processPayment: false,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to create order")
        }

        // Clear cart after a short delay
        setTimeout(() => {
          dispatch({ type: "CLEAR_CART" })
        }, 100)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleStripeSuccess = async (paymentIntentId: string) => {
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: state.items,
          shippingAddress,
          processPayment: true,
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Clear cart after a short delay
        setTimeout(() => {
          dispatch({ type: "CLEAR_CART" })
        }, 100)
      } else {
        setError(result.error || "Payment confirmation failed")
      }
    } catch (error) {
      setError("Failed to confirm payment")
    }
  }

  const handleStripeError = (error: string) => {
    setError(error)
    setShowStripeForm(false)
  }

  if (state.items.length === 0) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <p>Your cart is empty</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Shipping Address */}
        <Card>
          <CardHeader>
            <CardTitle>Shipping Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={shippingAddress.firstName}
                  onChange={(e) => handleAddressChange("firstName", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={shippingAddress.lastName}
                  onChange={(e) => handleAddressChange("lastName", e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={shippingAddress.email}
                onChange={(e) => handleAddressChange("email", e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={shippingAddress.phone}
                onChange={(e) => handleAddressChange("phone", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="address1">Address</Label>
              <Input
                id="address1"
                value={shippingAddress.address1}
                onChange={(e) => handleAddressChange("address1", e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="address2">Address 2 (Optional)</Label>
              <Input
                id="address2"
                value={shippingAddress.address2}
                onChange={(e) => handleAddressChange("address2", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={shippingAddress.city}
                  onChange={(e) => handleAddressChange("city", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={shippingAddress.state}
                  onChange={(e) => handleAddressChange("state", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  value={shippingAddress.zipCode}
                  onChange={(e) => handleAddressChange("zipCode", e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="country">Country</Label>
              <Select value={shippingAddress.country} onValueChange={(value) => handleAddressChange("country", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="GB">United Kingdom</SelectItem>
                  <SelectItem value="AU">Australia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedPaymentMethod === method.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => setSelectedPaymentMethod(method.id)}
              >
                <div className="flex items-center space-x-3">
                  {method.type === "card" && <CreditCard className="h-5 w-5" />}
                  {method.type === "manual" && <Clock className="h-5 w-5" />}
                  <div>
                    <div className="font-medium">{method.name}</div>
                    <div className="text-sm text-gray-600">{method.description}</div>
                  </div>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    checked={selectedPaymentMethod === method.id}
                    onChange={() => setSelectedPaymentMethod(method.id)}
                    className="ml-auto"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {state.items.map((item, index) => (
              <div key={index} className="flex justify-between py-2">
                <span>
                  {item.name} x {item.quantity}
                </span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!showStripeForm && (
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Place Order"
            )}
          </Button>
        )}
      </form>

      {/* Stripe Payment Form */}
      {showStripeForm && clientSecret && (
        <Card>
          <CardHeader>
            <CardTitle>Complete Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <StripePaymentForm
              clientSecret={clientSecret}
              onSuccess={handleStripeSuccess}
              onError={handleStripeError}
              amount={calculateTotal() * 100} // Convert to cents
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default EnhancedCheckoutForm 