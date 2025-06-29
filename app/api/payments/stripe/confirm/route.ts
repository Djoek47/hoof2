import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
})

export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId, orderData } = await request.json()

    if (!paymentIntentId) {
      return NextResponse.json({ error: "Payment intent ID is required" }, { status: 400 })
    }

    // Retrieve the payment intent to verify it succeeded
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
    }

    // Create order in Printify
    try {
      const printifyResponse = await fetch(
        "https://api.printify.com/v1/shops/" + process.env.PRINTIFY_SHOP_ID + "/orders.json",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.PRINTIFY_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            external_id: `stripe_${paymentIntentId}`,
            line_items: orderData.items.map((item: any) => ({
              product_id: item.productId,
              variant_id: item.variantId,
              quantity: item.quantity,
            })),
            shipping_method: 1,
            send_shipping_notification: true,
            address_to: {
              first_name: orderData.shippingAddress.firstName,
              last_name: orderData.shippingAddress.lastName,
              email: orderData.shippingAddress.email,
              phone: orderData.shippingAddress.phone || "",
              country: orderData.shippingAddress.country,
              region: orderData.shippingAddress.state,
              address1: orderData.shippingAddress.address1,
              address2: orderData.shippingAddress.address2 || "",
              city: orderData.shippingAddress.city,
              zip: orderData.shippingAddress.zipCode,
            },
          }),
        },
      )

      if (!printifyResponse.ok) {
        const errorText = await printifyResponse.text()
        console.error("Printify order creation failed:", errorText)
        throw new Error(`Printify API error: ${printifyResponse.status}`)
      }

      const printifyOrder = await printifyResponse.json()

      return NextResponse.json({
        success: true,
        paymentIntentId,
        orderId: printifyOrder.id,
        order: printifyOrder,
      })
    } catch (printifyError) {
      console.error("Error creating Printify order:", printifyError)

      // Payment succeeded but order creation failed
      // You might want to store this for manual processing
      return NextResponse.json({
        success: true,
        paymentIntentId,
        warning: "Payment completed but order creation failed. Please contact support.",
        error: printifyError instanceof Error ? printifyError.message : "Unknown error",
      })
    }
  } catch (error) {
    console.error("Error confirming payment:", error)
    return NextResponse.json({ error: "Failed to confirm payment" }, { status: 500 })
  }
} 