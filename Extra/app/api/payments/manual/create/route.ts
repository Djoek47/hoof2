import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json()

    // Create order in Printify with manual payment
    const printifyResponse = await fetch(
      `https://api.printify.com/v1/shops/${process.env.PRINTIFY_SHOP_ID}/orders.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PRINTIFY_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          external_id: `manual_${Date.now()}`,
          line_items: orderData.items.map((item: any) => ({
            product_id: item.productId,
            variant_id: item.variantId,
            quantity: item.quantity,
          })),
          shipping_method: 1,
          send_shipping_notification: false, // Don't send notification for manual orders
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
      console.error("Printify manual order creation failed:", errorText)
      throw new Error(`Printify API error: ${printifyResponse.status}`)
    }

    const printifyOrder = await printifyResponse.json()

    return NextResponse.json({
      success: true,
      orderId: printifyOrder.id,
      order: printifyOrder,
      message: "Order created successfully. Payment processing will be handled manually.",
    })
  } catch (error) {
    console.error("Error creating manual order:", error)
    return NextResponse.json(
      {
        error: "Failed to create order",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
