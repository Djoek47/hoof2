import { NextResponse } from "next/server"
import { PrintifyAPI } from "@/lib/printify"

export async function POST(request: Request) {
  try {
    console.log("=== Checkout API Called ===")

    const body = await request.json()
    const { cartItems, shippingAddress, shippingMethod, processPayment = true } = body

    console.log("Checkout request:", JSON.stringify({ cartItems, shippingAddress, shippingMethod }, null, 2))

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 })
    }

    if (!shippingAddress) {
      return NextResponse.json({ error: "Shipping address is required" }, { status: 400 })
    }

    // Validate required address fields
    const requiredFields = ["firstName", "lastName", "email", "address1", "city", "state", "zipCode", "country"]
    for (const field of requiredFields) {
      if (!shippingAddress[field] || shippingAddress[field].trim() === "") {
        return NextResponse.json(
          {
            error: "Invalid shipping address",
            details: `Missing required field: ${field}`,
          },
          { status: 400 },
        )
      }
    }

    const printifyAPI = new PrintifyAPI()

    // Transform cart items to Printify format with proper variant validation
    const lineItems = []

    console.log("Validating cart items for checkout...")
    for (const item of cartItems) {
      try {
        console.log(`Validating product ${item.id} for checkout...`)
        const product = await printifyAPI.getProduct(item.id.toString())
        
        if (!product) {
          throw new Error(`Product ${item.name} not found`)
        }
        
        const enabledVariants = product.variants.filter((v) => v.is_enabled)

        // Use the provided variant ID if valid, otherwise use the first enabled variant
        let variantId = item.variantId
        if (!variantId || !enabledVariants.find((v) => v.id === variantId)) {
          variantId = enabledVariants[0]?.id
        }

        if (!variantId) {
          throw new Error(`No valid variants found for product ${item.name}`)
        }

        // Validate quantity
        if (!item.quantity || item.quantity <= 0) {
          throw new Error(`Invalid quantity for product ${item.name}: ${item.quantity}`)
        }

        lineItems.push({
          product_id: item.id.toString(),
          variant_id: variantId,
          quantity: item.quantity,
        })

        console.log(`✓ Product ${item.id} validated for checkout with variant ${variantId}`)
      } catch (productError) {
        console.error(`Error validating product ${item.id} for checkout:`, productError)
        return NextResponse.json(
          {
            error: "Invalid product in cart",
            details: `Product "${item.name}" is no longer available. Please remove it from your cart.`,
          },
          { status: 400 },
        )
      }
    }

    console.log("All products validated for checkout. Line items:", lineItems)

    // Create order data with proper validation
    const orderData = {
      external_id: `FB-${Date.now()}`,
      label: `Faberland Store Order - ${new Date().toLocaleDateString()}`,
      line_items: lineItems,
      send_shipping_notification: true,
      address_to: {
        first_name: shippingAddress.firstName.trim(),
        last_name: shippingAddress.lastName.trim(),
        email: shippingAddress.email.trim(),
        phone: shippingAddress.phone?.trim() || "",
        country: shippingAddress.country.trim(),
        region: shippingAddress.state.trim(),
        address1: shippingAddress.address1.trim(),
        address2: shippingAddress.address2?.trim() || "",
        city: shippingAddress.city.trim(),
        zip: shippingAddress.zipCode.trim(),
      },
    }

    console.log("Final order data:", JSON.stringify(orderData, null, 2))

    // Step 1: Create the order
    console.log("Creating Printify order...")
    const order = await printifyAPI.createOrder(orderData)
    console.log(`Order created successfully with ID: ${order.id}, Status: ${order.status}`)

    let finalOrder = order
    let paymentProcessed = false

    // Step 2: Process payment by submitting to production (only if requested and order is in correct status)
    if (processPayment) {
      try {
        // Wait a moment for the order to be fully processed
        await new Promise((resolve) => setTimeout(resolve, 2000))

        // Get fresh order status
        const currentOrder = await printifyAPI.getOrder(order.id)
        console.log(`Current order status before production: ${currentOrder?.status}`)

        if (currentOrder && (currentOrder.status === "draft" || currentOrder.status === "pending")) {
          await printifyAPI.submitOrderForProduction(order.id)
          paymentProcessed = true
          const updatedOrder = await printifyAPI.getOrder(order.id)
          if (updatedOrder) {
            finalOrder = updatedOrder
          }
          console.log(`Order sent to production. New status: ${finalOrder.status}`)
        } else if (currentOrder) {
          console.log(`Order status ${currentOrder.status} - cannot send to production automatically`)
          finalOrder = currentOrder
        }
      } catch (productionError) {
        console.error("Printify production error:", productionError)

        // Get the current order status
        const updatedOrder = await printifyAPI.getOrder(order.id)
        if (updatedOrder) {
          finalOrder = updatedOrder
        }

        return NextResponse.json({
          success: true,
          paymentProcessed: false,
          order: {
            id: finalOrder.id,
            external_id: finalOrder.external_id,
            status: finalOrder.status,
            created_at: finalOrder.created_at,
          },
          message: `Order created but payment processing failed: ${
            productionError instanceof Error ? productionError.message : "Unknown error"
          }. Please contact support or try again later.`,
        })
      }
    }

    return NextResponse.json({
      success: true,
      paymentProcessed,
      order: {
        id: finalOrder.id,
        external_id: finalOrder.external_id,
        status: finalOrder.status,
        created_at: finalOrder.created_at,
        line_items: finalOrder.line_items,
      },
      message: paymentProcessed
        ? "Order placed and payment processed successfully!"
        : "Order created successfully. Payment processing may require manual intervention.",
    })
  } catch (error) {
    console.error("=== Checkout Error ===")
    console.error("Error details:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")

    let errorMessage = "Checkout failed"
    let statusCode = 500

    if (error instanceof Error) {
      errorMessage = error.message

      if (error.message.includes("400")) {
        statusCode = 400
      } else if (error.message.includes("401")) {
        statusCode = 401
      } else if (error.message.includes("403")) {
        statusCode = 403
      } else if (error.message.includes("422")) {
        statusCode = 422
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: statusCode },
    )
  }
} 