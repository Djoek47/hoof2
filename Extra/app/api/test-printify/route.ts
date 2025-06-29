import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Check environment variables
    const apiToken = process.env.PRINTIFY_API_TOKEN
    const shopId = process.env.PRINTIFY_SHOP_ID

    if (!apiToken) {
      return NextResponse.json({
        success: false,
        error: "PRINTIFY_API_TOKEN environment variable is not set",
        config: {
          hasApiToken: false,
          hasShopId: !!shopId,
        },
      })
    }

    if (!shopId) {
      return NextResponse.json({
        success: false,
        error: "PRINTIFY_SHOP_ID environment variable is not set",
        config: {
          hasApiToken: true,
          hasShopId: false,
        },
      })
    }

    // Test API connection
    const response = await fetch(`https://api.printify.com/v1/shops/${shopId}/products.json?limit=1`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({
        success: false,
        error: `Printify API error: ${response.status} ${response.statusText}`,
        details: errorText,
        config: {
          hasApiToken: true,
          hasShopId: true,
          apiTokenLength: apiToken.length,
          shopId: shopId,
        },
      })
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      message: "Printify API connection successful",
      productCount: data.total || 0,
      config: {
        hasApiToken: true,
        hasShopId: true,
        apiTokenLength: apiToken.length,
        shopId: shopId,
      },
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "Failed to test Printify connection",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
