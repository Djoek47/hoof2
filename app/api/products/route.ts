import { NextResponse } from "next/server"
import { PrintifyAPI } from "@/lib/printify"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    const printifyAPI = new PrintifyAPI()
    const response = await printifyAPI.getProducts(page, limit)

    // Transform Printify products to match your existing format
    const transformedProducts = response.data.map((product) => {
      const defaultImage = product.images.find((img) => img.is_default)?.src || product.images[0]?.src
      const enabledVariants = product.variants.filter((v) => v.is_enabled)
      const minPrice = Math.min(...enabledVariants.map((v) => v.price)) / 100

      return {
        id: product.id.toString(),
        name: product.title,
        description: product.description,
        price: minPrice,
        image1: defaultImage,
        image2: product.images[1]?.src || defaultImage,
        variants: enabledVariants.map((v) => ({
          id: v.id,
          price: v.price / 100,
          is_enabled: v.is_enabled,
        })),
        images: product.images,
        options: product.options,
        visible: product.visible,
      }
    })

    return NextResponse.json({
      products: transformedProducts,
      pagination: {
        current_page: response.current_page,
        last_page: response.last_page,
        total: response.total,
        per_page: response.per_page,
      },
    })
  } catch (error) {
    console.error("Error fetching Printify products:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch products",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
} 