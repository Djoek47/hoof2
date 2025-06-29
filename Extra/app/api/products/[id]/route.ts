import { NextResponse } from "next/server"
import { PrintifyAPI } from "@/lib/printify"

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const productId = params.id

    // Validate product ID format (should be a valid string)
    if (!productId || productId.trim() === "") {
      return NextResponse.json({ error: "Invalid product ID format" }, { status: 400 })
    }

    console.log(`Fetching product with ID: ${productId}`)

    const printifyAPI = new PrintifyAPI()
    const product = await printifyAPI.getProduct(productId)

    // Transform the product and include all necessary data
    const transformed = {
      ...printifyAPI.transformProduct(product),
      description: product.description,
      images: product.images,
      variants: product.variants.filter((v) => v.is_enabled && v.is_available),
      options: product.options,
      blueprint_id: product.blueprint_id,
      print_provider_id: product.print_provider_id,
    }

    console.log(`Successfully transformed product: ${transformed.name}`)

    return NextResponse.json(transformed)
  } catch (error) {
    console.error("Error fetching product:", error)

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes("404")) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 })
      }
      if (error.message.includes("401")) {
        return NextResponse.json({ error: "Unauthorized - check API token" }, { status: 401 })
      }
      if (error.message.includes("403")) {
        return NextResponse.json({ error: "Forbidden - check permissions" }, { status: 403 })
      }
    }

    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 })
  }
}
