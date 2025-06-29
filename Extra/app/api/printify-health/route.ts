import { NextResponse } from "next/server"
import { PrintifyAPI } from "@/lib/printify"

export async function GET() {
  try {
    // Check environment variables first
    if (!process.env.PRINTIFY_API_TOKEN) {
      return NextResponse.json({
        status: "error",
        message: "PRINTIFY_API_TOKEN environment variable is not set",
        healthy: false,
      })
    }

    if (!process.env.PRINTIFY_SHOP_ID) {
      return NextResponse.json({
        status: "error",
        message: "PRINTIFY_SHOP_ID environment variable is not set",
        healthy: false,
      })
    }

    // Test API connectivity
    const printifyAPI = new PrintifyAPI()
    const healthCheck = await printifyAPI.healthCheck()

    return NextResponse.json({
      ...healthCheck,
      healthy: healthCheck.status === "healthy",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Printify health check failed:", error)

    return NextResponse.json({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
      healthy: false,
      timestamp: new Date().toISOString(),
    })
  }
}
