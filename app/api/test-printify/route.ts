import { NextResponse } from "next/server"
import { PrintifyAPI } from "@/lib/printify"

export async function GET() {
  try {
    const printifyAPI = new PrintifyAPI()
    const healthCheck = await printifyAPI.healthCheck()

    return NextResponse.json({
      success: healthCheck.status === "healthy",
      message: healthCheck.message,
      config: {
        hasApiToken: !!process.env.PRINTIFY_API_TOKEN,
        hasShopId: !!process.env.PRINTIFY_SHOP_ID,
        shopId: process.env.PRINTIFY_SHOP_ID,
      },
      details: healthCheck.details,
    })
  } catch (error) {
    console.error("Printify test error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      config: {
        hasApiToken: !!process.env.PRINTIFY_API_TOKEN,
        hasShopId: !!process.env.PRINTIFY_SHOP_ID,
        shopId: process.env.PRINTIFY_SHOP_ID,
      },
    })
  }
} 