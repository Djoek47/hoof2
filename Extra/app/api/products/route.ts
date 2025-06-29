import { NextResponse } from "next/server"
import { PrintifyAPI } from "@/lib/printify"

export async function GET(request: Request) {
  try {
    console.log("Products API route called")

    // Check environment variables
    if (!process.env.PRINTIFY_API_TOKEN) {
      console.error("PRINTIFY_API_TOKEN is not set")
      return NextResponse.json({ error: "Printify API token is not configured" }, { status: 500 })
    }

    if (!process.env.PRINTIFY_SHOP_ID) {
      console.error("PRINTIFY_SHOP_ID is not set")
      return NextResponse.json({ error: "Printify shop ID is not configured" }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    console.log(`Fetching products: page=${page}, limit=${limit}`)

    const printifyAPI = new PrintifyAPI()
    const response = await printifyAPI.getProducts(page, limit)

    console.log(`Received ${response.data.length} products from Printify`)

    // Transform products to our store format
    const transformedProducts = response.data
      .filter((product) => product.visible) // Only show visible products
      .map((product) => {
        try {
          return printifyAPI.transformProduct(product)
        } catch (transformError) {
          console.error(`Error transforming product ${product.id}:`, transformError)
          return null
        }
      })
      .filter(Boolean) // Remove null entries

    console.log(`Transformed ${transformedProducts.length} products`)

    return NextResponse.json({
      products: transformedProducts,
      pagination: {
        currentPage: response.current_page,
        totalPages: response.last_page,
        total: response.total,
        hasNext: !!response.next_page_url,
        hasPrev: !!response.prev_page_url,
      },
    })
  } catch (error) {
    console.error("Error fetching products:", error)

    let errorMessage = "Failed to fetch products"
    let statusCode = 500

    if (error instanceof Error) {
      errorMessage = error.message

      // Check for specific Printify API errors
      if (error.message.includes("401")) {
        errorMessage = "Invalid Printify API token"
        statusCode = 401
      } else if (error.message.includes("403")) {
        errorMessage = "Printify API access forbidden - check your permissions"
        statusCode = 403
      } else if (error.message.includes("404")) {
        errorMessage = "Printify shop not found - check your shop ID"
        statusCode = 404
      } else if (error.message.includes("fetch")) {
        errorMessage = "Unable to connect to Printify API"
        statusCode = 502
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}
