"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CreditCard, Clock, Loader2 } from "lucide-react"
import type { PaymentMethod } from "@/lib/payment-processor"

interface PaymentMethodSelectorProps {
  onMethodSelect: (method: PaymentMethod) => void
  selectedMethod?: PaymentMethod
}

export function PaymentMethodSelector({ onMethodSelect, selectedMethod }: PaymentMethodSelectorProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPaymentMethods()
  }, [])

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/payments/methods")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch payment methods")
      }

      if (data.success && data.payment_methods) {
        const enabledMethods = data.payment_methods.filter((method: PaymentMethod) => method.enabled)
        setPaymentMethods(enabledMethods)

        // Auto-select first available method
        if (enabledMethods.length > 0 && !selectedMethod) {
          onMethodSelect(enabledMethods[0])
        }
      } else {
        throw new Error("Invalid response format")
      }
    } catch (err) {
      console.error("Failed to fetch payment methods:", err)
      setError(err instanceof Error ? err.message : "Failed to load payment methods")

      // Fallback to basic methods
      const fallbackMethods: PaymentMethod[] = [
        {
          id: "printify_manual",
          type: "printify_manual",
          name: "Manual Processing",
          description: "Create order for manual payment processing",
          enabled: true,
          icon: "clock",
        },
      ]
      setPaymentMethods(fallbackMethods)
      if (!selectedMethod) {
        onMethodSelect(fallbackMethods[0])
      }
    } finally {
      setLoading(false)
    }
  }

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "credit-card":
        return <CreditCard className="w-5 h-5" />
      case "clock":
        return <Clock className="w-5 h-5" />
      default:
        return <CreditCard className="w-5 h-5" />
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Loading payment methods...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={fetchPaymentMethods} variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Payment Method</h3>
      <div className="space-y-3">
        {paymentMethods.map((method) => (
          <Card
            key={method.id}
            className={`cursor-pointer transition-colors ${
              selectedMethod?.id === method.id ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : "hover:border-gray-300"
            }`}
            onClick={() => onMethodSelect(method)}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">{getIcon(method.icon)}</div>
                <div className="flex-1">
                  <h4 className="font-medium">{method.name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{method.description}</p>
                </div>
                <div className="flex-shrink-0">
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${
                      selectedMethod?.id === method.id ? "border-blue-500 bg-blue-500" : "border-gray-300"
                    }`}
                  >
                    {selectedMethod?.id === method.id && (
                      <div className="w-full h-full rounded-full bg-white scale-50"></div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
