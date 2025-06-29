import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { amount, currency = "USD", orderData } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
      return NextResponse.json({ error: "PayPal not configured" }, { status: 500 })
    }

    console.log("Creating PayPal payment for amount:", amount)

    // Get PayPal access token
    const authResponse = await fetch(
      `${process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com"}/v1/oauth2/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64")}`,
        },
        body: "grant_type=client_credentials",
      },
    )

    const authData = await authResponse.json()

    if (!authResponse.ok) {
      throw new Error("Failed to get PayPal access token")
    }

    // Create PayPal order
    const orderResponse = await fetch(
      `${process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com"}/v2/checkout/orders`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authData.access_token}`,
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              amount: {
                currency_code: currency,
                value: amount.toFixed(2),
              },
              description: `SDFM Store Order - ${orderData.external_id}`,
            },
          ],
          application_context: {
            return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success`,
            cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/cancel`,
          },
        }),
      },
    )

    const orderResult = await orderResponse.json()

    if (!orderResponse.ok) {
      throw new Error(orderResult.message || "Failed to create PayPal order")
    }

    const approvalUrl = orderResult.links.find((link: any) => link.rel === "approve")?.href

    console.log("PayPal order created:", orderResult.id)

    return NextResponse.json({
      success: true,
      order_id: orderResult.id,
      approval_url: approvalUrl,
    })
  } catch (error) {
    console.error("PayPal payment creation failed:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create PayPal payment",
      },
      { status: 500 },
    )
  }
}
