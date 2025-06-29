import { NextResponse } from "next/server"
import { PrintifyAPI } from "@/lib/printify"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    console.log(`Fetching orders: page=${page}, limit=${limit}`)

    const printifyAPI = new PrintifyAPI()
    const orders = await printifyAPI.getOrders(page, limit)

    console.log(`Retrieved ${orders.data?.length || 0} orders`)

    return NextResponse.json({
      success: true,
      orders: orders.data || [],
      pagination: {
        currentPage: orders.current_page || page,
        totalPages: orders.last_page || 1,
        total: orders.total || 0,
        hasNext: !!orders.next_page_url,
        hasPrev: !!orders.prev_page_url,
      },
    })
  } catch (error) {
    console.error("Error fetching orders:", error)

    let errorMessage = "Failed to fetch orders"
    let statusCode = 500

    if (error instanceof Error) {
      errorMessage = error.message

      if (error.message.includes("Unauthorized")) {
        statusCode = 401
      } else if (error.message.includes("Forbidden")) {
        statusCode = 403
      } else if (error.message.includes("Too Many Requests")) {
        statusCode = 429
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
