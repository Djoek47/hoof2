import { NextResponse } from "next/server"
import { PrintifyPaymentProcessor } from "@/lib/printify-payments"

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const paymentIntentId = params.id

    if (!paymentIntentId) {
      return NextResponse.json({ error: "Payment intent ID is required" }, { status: 400 })
    }

    const paymentProcessor = new PrintifyPaymentProcessor()
    const paymentStatus = await paymentProcessor.getPaymentStatus(paymentIntentId)

    if (!paymentStatus) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      payment: paymentStatus,
    })
  } catch (error) {
    console.error("Payment status check error:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to check payment status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
