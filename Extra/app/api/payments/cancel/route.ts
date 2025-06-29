import { NextResponse } from "next/server"
import { PrintifyPaymentProcessor } from "@/lib/printify-payments"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { paymentIntentId } = body

    if (!paymentIntentId) {
      return NextResponse.json({ error: "Payment intent ID is required" }, { status: 400 })
    }

    const paymentProcessor = new PrintifyPaymentProcessor()
    const result = await paymentProcessor.cancelPayment(paymentIntentId)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        payment: result,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || result.message,
          details: result,
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("Payment cancellation error:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Payment cancellation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
