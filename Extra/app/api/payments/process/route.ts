import { NextResponse } from "next/server"
import { PrintifyPaymentProcessor } from "@/lib/printify-payments"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { orderData, paymentMethod = "standard", processingType = "direct" } = body

    console.log("Payment processing request:", { paymentMethod, processingType })

    if (!orderData) {
      return NextResponse.json({ error: "Order data is required" }, { status: 400 })
    }

    const paymentProcessor = new PrintifyPaymentProcessor()
    let result

    switch (processingType) {
      case "direct":
        result = await paymentProcessor.processDirectPayment(orderData, "standard")
        break

      case "manual":
        result = await paymentProcessor.createManualPaymentOrder(orderData)
        break

      default:
        return NextResponse.json({ error: "Invalid processing type" }, { status: 400 })
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        payment: result,
        message: result.message,
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
    console.error("Payment processing error:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Payment processing failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
