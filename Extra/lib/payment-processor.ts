export interface PaymentMethod {
  id: string
  type: string
  name: string
  description: string
  enabled: boolean
  icon: string
}

export class PaymentProcessor {
  private baseUrl: string

  constructor() {
    this.baseUrl = typeof window !== "undefined" ? window.location.origin : ""
  }

  getAvailablePaymentMethods(): PaymentMethod[] {
    const methods: PaymentMethod[] = []

    // Check if Stripe is configured
    if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      methods.push({
        id: "stripe_card",
        type: "stripe",
        name: "Credit/Debit Card",
        description: "Pay securely with your credit or debit card via Stripe",
        enabled: true,
        icon: "credit-card",
      })
    }

    // Always include manual processing as fallback
    methods.push({
      id: "printify_manual",
      type: "printify_manual",
      name: "Manual Processing",
      description: "Create order for manual payment processing",
      enabled: true,
      icon: "clock",
    })

    return methods
  }

  async createStripePayment(amount: number, currency: string, orderData: any, customerEmail: string) {
    try {
      const response = await fetch("/api/payments/stripe/create-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to cents
          currency,
          orderData,
          customerEmail,
        }),
      })

      const result = await response.json()
      return result
    } catch (error) {
      console.error("Failed to create Stripe payment:", error)
      return { success: false, error: "Failed to create payment" }
    }
  }

  async confirmStripePayment(paymentIntentId: string) {
    try {
      const response = await fetch("/api/payments/stripe/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment_intent_id: paymentIntentId,
        }),
      })

      const result = await response.json()
      return result
    } catch (error) {
      console.error("Failed to confirm Stripe payment:", error)
      return { success: false, error: "Failed to confirm payment" }
    }
  }

  async createManualOrder(orderData: any) {
    try {
      const response = await fetch("/api/payments/manual/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderData }),
      })

      const result = await response.json()
      return result
    } catch (error) {
      console.error("Failed to create manual order:", error)
      return { success: false, error: "Failed to create order" }
    }
  }
}
