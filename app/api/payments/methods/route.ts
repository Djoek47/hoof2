import { NextResponse } from "next/server"

export async function GET() {
  try {
    const methods = []

    // Check if Stripe is configured
    if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && process.env.STRIPE_SECRET_KEY) {
      methods.push({
        id: "stripe",
        name: "Credit/Debit Card",
        description: "Pay securely with your credit or debit card via Stripe",
        type: "card",
        enabled: true,
      })
    }

    // Check if PayPal is configured
    if (process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
      methods.push({
        id: "paypal",
        name: "PayPal",
        description: "Pay with your PayPal account",
        type: "paypal",
        enabled: true,
      })
    }

    // Always include manual processing as fallback
    methods.push({
      id: "manual",
      name: "Manual Processing",
      description: "Create order for manual payment processing",
      type: "manual",
      enabled: true,
    })

    return NextResponse.json({ methods })
  } catch (error) {
    console.error("Error fetching payment methods:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch payment methods",
        methods: [
          {
            id: "manual",
            name: "Manual Processing",
            description: "Create order for manual payment processing",
            type: "manual",
            enabled: true,
          },
        ],
      },
      { status: 500 },
    )
  }
} 