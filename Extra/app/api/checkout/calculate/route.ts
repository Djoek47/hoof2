import { NextResponse } from "next/server"
import { PrintifyAPI } from "@/lib/printify"

export async function POST(request: Request) {
  try {
    console.log("=== Checkout Calculate API Called ===")

    const body = await request.json()
    const { cartItems, shippingAddress } = body

    console.log("Request body:", JSON.stringify({ cartItems, shippingAddress }, null, 2))

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 })
    }

    if (!shippingAddress) {
      return NextResponse.json({ error: "Shipping address is required" }, { status: 400 })
    }

    // Validate environment variables
    if (!process.env.PRINTIFY_API_TOKEN) {
      console.error("PRINTIFY_API_TOKEN is missing")
      return NextResponse.json({ error: "Printify API not configured" }, { status: 500 })
    }

    if (!process.env.PRINTIFY_SHOP_ID) {
      console.error("PRINTIFY_SHOP_ID is missing")
      return NextResponse.json({ error: "Printify shop not configured" }, { status: 500 })
    }

    console.log("Environment check passed, initializing Printify API...")

    const printifyAPI = new PrintifyAPI()

    // First, perform a health check to ensure API connectivity
    try {
      const healthCheck = await printifyAPI.healthCheck()
      console.log("Printify API health check:", healthCheck)

      if (healthCheck.status !== "healthy") {
        console.warn("Printify API health check failed, but continuing with fallback calculations")
      }
    } catch (healthError) {
      console.warn("Health check failed, continuing with fallback:", healthError)
    }

    // Transform cart items to Printify format with proper variant validation
    const lineItems = []

    console.log("Validating cart items...")
    for (const item of cartItems) {
      try {
        console.log(`Validating product ${item.id}...`)

        // Try to get product info, but don't fail if it's not available
        let variantId = item.variantId

        try {
          const product = await printifyAPI.getProduct(item.id.toString())
          const enabledVariants = product.variants.filter((v) => v.is_enabled)

          // Use the provided variant ID if valid, otherwise use the first enabled variant
          if (!variantId || !enabledVariants.find((v) => v.id === variantId)) {
            variantId = enabledVariants[0]?.id
          }

          if (!variantId) {
            throw new Error(`No valid variants found for product ${item.name}`)
          }
        } catch (productError) {
          console.warn(`Could not validate product ${item.id}, using provided variant ID:`, productError)
          // Use the provided variant ID as fallback
          if (!variantId) {
            variantId = 1 // Default fallback variant ID
          }
        }

        lineItems.push({
          product_id: item.id.toString(),
          variant_id: variantId,
          quantity: item.quantity,
        })

        console.log(`✓ Product ${item.id} processed with variant ${variantId}`)
      } catch (productError) {
        console.error(`Error processing product ${item.id}:`, productError)

        // Don't fail the entire calculation for one bad product
        // Instead, use fallback values
        lineItems.push({
          product_id: item.id.toString(),
          variant_id: item.variantId || 1,
          quantity: item.quantity,
        })

        console.log(`⚠️ Product ${item.id} processed with fallback values`)
      }
    }

    console.log("All products processed. Line items:", lineItems)

    // Prepare address for Printify
    const address = {
      first_name: shippingAddress.firstName,
      last_name: shippingAddress.lastName,
      email: shippingAddress.email,
      phone: shippingAddress.phone || "",
      country: shippingAddress.country,
      region: shippingAddress.state,
      address1: shippingAddress.address1,
      address2: shippingAddress.address2 || "",
      city: shippingAddress.city,
      zip: shippingAddress.zipCode,
    }

    console.log("Calculating order cost...")

    let orderCalculation
    let shippingRates

    try {
      // Try to calculate order costs using the improved method with real shipping
      orderCalculation = await printifyAPI.calculateOrderCost(lineItems, address)
      console.log("Order calculation completed:", orderCalculation)

      // Get shipping options with real rates
      shippingRates = await printifyAPI.getShippingRates(lineItems, address)
      console.log("Shipping rates:", shippingRates)
    } catch (calculationError) {
      console.error("Printify calculation failed, using fallback calculations:", calculationError)

      // Fallback calculation when Printify API is not available
      const subtotal = cartItems.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0)
      const itemCount = cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0)

      // Intelligent shipping fallback based on destination
      let baseShipping = 5.0 // Default $5.00
      switch (address.country) {
        case "US":
          baseShipping = 5.0
          break
        case "CA":
          baseShipping = 8.0
          break
        case "GB":
        case "DE":
        case "FR":
        case "IT":
        case "ES":
        case "NL":
        case "BE":
        case "AT":
        case "CH":
        case "IE":
        case "PT":
          baseShipping = 12.0
          break
        case "AU":
        case "NZ":
          baseShipping = 15.0
          break
        default:
          baseShipping = 18.0
      }

      const shipping = baseShipping + Math.max(0, itemCount - 1) * 2.0
      const tax = address.country === "US" ? subtotal * 0.08 : 0

      orderCalculation = {
        line_items: lineItems.map((item) => ({
          ...item,
          cost: cartItems.find((ci: any) => ci.id === item.product_id)?.price * 100 || 2000, // Convert to cents
        })),
        shipping_cost: Math.round(shipping * 100),
        total_shipping: Math.round(shipping * 100),
        total_tax: Math.round(tax * 100),
        total_cost: Math.round((subtotal + shipping + tax) * 100),
        currency: "USD",
      }

      shippingRates = [
        {
          id: 1,
          name: "Standard Shipping",
          cost: shipping,
          currency: "USD",
        },
        {
          id: 2,
          name: "Express Shipping",
          cost: shipping * 2.5,
          currency: "USD",
        },
      ]

      console.log("Using fallback calculations:", { orderCalculation, shippingRates })
    }

    return NextResponse.json({
      success: true,
      calculation: {
        subtotal: orderCalculation.line_items.reduce((sum, item) => sum + item.cost * item.quantity, 0) / 100,
        shipping: orderCalculation.total_shipping / 100,
        tax: orderCalculation.total_tax / 100,
        total: orderCalculation.total_cost / 100,
        currency: orderCalculation.currency,
      },
      shippingOptions: shippingRates.map((rate) => ({
        id: rate.id,
        name: rate.name,
        cost: typeof rate.cost === "number" ? rate.cost : rate.rate / 100,
        currency: rate.currency,
      })),
      fallbackUsed: !orderCalculation.line_items[0]?.cost || orderCalculation.line_items[0]?.cost === 2000,
    })
  } catch (error) {
    console.error("=== Checkout Calculate Error ===")
    console.error("Error details:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")

    let errorMessage = "Unexpected error while calculating costs"
    let statusCode = 500

    if (error instanceof Error) {
      errorMessage = error.message

      if (error.message.includes("timeout") || error.message.includes("45s")) {
        statusCode = 504
        errorMessage = "Request timeout: Printify API is taking too long to respond. Please try again."
      } else if (error.message.includes("Network error") || error.message.includes("Failed to fetch")) {
        statusCode = 502
        errorMessage = "Network error: Unable to connect to Printify API. Using fallback calculations."

        // Return fallback calculation instead of error
        try {
          const body = await request.json()
          const { cartItems, shippingAddress } = body

          const subtotal = cartItems.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0)
          const shipping = 5.0 // Basic fallback shipping
          const tax = shippingAddress.country === "US" ? subtotal * 0.08 : 0

          return NextResponse.json({
            success: true,
            calculation: {
              subtotal,
              shipping,
              tax,
              total: subtotal + shipping + tax,
              currency: "USD",
            },
            shippingOptions: [
              {
                id: 1,
                name: "Standard Shipping",
                cost: shipping,
                currency: "USD",
              },
            ],
            fallbackUsed: true,
            message: "Using fallback calculations due to API connectivity issues",
          })
        } catch (fallbackError) {
          // If even fallback fails, return error
        }
      } else if (error.message.includes("DNS")) {
        statusCode = 502
        errorMessage = "Connection error: Cannot reach Printify servers. Please check your internet connection."
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
        debug:
          process.env.NODE_ENV === "development"
            ? {
                originalError: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
              }
            : undefined,
      },
      { status: statusCode, headers: { "content-type": "application/json" } },
    )
  }
}
