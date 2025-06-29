import { NextResponse } from "next/server"
import { PrintifyAPI } from "@/lib/printify"

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const orderId = params.id

    if (!orderId || orderId.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid order ID",
        },
        { status: 400 },
      )
    }

    console.log(`Fetching order with ID: ${orderId}`)

    const printifyAPI = new PrintifyAPI()
    const order = await printifyAPI.getOrder(orderId)

    console.log(`Successfully retrieved order: ${order.external_id}`)

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        external_id: order.external_id,
        status: order.status,
        total_price: order.total_price / 100,
        total_shipping: order.total_shipping / 100,
        total_tax: order.total_tax / 100,
        created_at: order.created_at,
        sent_to_production_at: order.sent_to_production_at,
        fulfilled_at: order.fulfilled_at,
        line_items: order.line_items.map((item) => ({
          ...item,
          cost: item.cost / 100,
          shipping_cost: item.shipping_cost / 100,
        })),
        address_to: order.address_to,
        shipments: order.shipments,
      },
    })
  } catch (error) {
    console.error("Error fetching order:", error)

    let errorMessage = "Failed to fetch order"
    let statusCode = 500

    if (error instanceof Error) {
      errorMessage = error.message

      if (error.message.includes("Not Found")) {
        statusCode = 404
      } else if (error.message.includes("Unauthorized")) {
        statusCode = 401
      } else if (error.message.includes("Forbidden")) {
        statusCode = 403
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: statusCode },
    )
  }
}
