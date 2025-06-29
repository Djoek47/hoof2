import { PrintifyAPI } from "./printify"

export interface PaymentMethod {
  id: string
  type: "printify_direct" | "stripe" | "paypal" | "manual"
  name: string
  description: string
  enabled: boolean
}

export interface PaymentIntent {
  id: string
  amount: number
  currency: string
  status: "pending" | "processing" | "succeeded" | "failed" | "canceled"
  payment_method: string
  order_id?: string
  created_at: string
  metadata?: Record<string, any>
}

export interface PaymentResult {
  success: boolean
  payment_intent_id?: string
  order_id?: string
  status: string
  message: string
  redirect_url?: string
  error?: string
}

export class PrintifyPaymentProcessor {
  private printifyAPI: PrintifyAPI

  constructor() {
    this.printifyAPI = new PrintifyAPI()
  }

  // Get available payment methods
  getAvailablePaymentMethods(): PaymentMethod[] {
    return [
      {
        id: "printify_direct",
        type: "printify_direct",
        name: "Printify Direct Payment",
        description: "Payment processed directly by Printify when order is sent to production",
        enabled: true,
      },
      {
        id: "printify_express",
        type: "printify_direct",
        name: "Printify Express Payment",
        description: "Fast payment processing with Printify Express (2-day delivery)",
        enabled: true,
      },
      {
        id: "manual_review",
        type: "manual",
        name: "Manual Review",
        description: "Order created for manual payment processing",
        enabled: true,
      },
    ]
  }

  // Process payment via Printify Direct
  async processDirectPayment(
    orderData: any,
    paymentMethod: "standard" | "express" = "standard",
  ): Promise<PaymentResult> {
    try {
      console.log(`Processing ${paymentMethod} payment via Printify...`)

      // Step 1: Create the order (always use standard endpoint)
      const order = await this.printifyAPI.createOrder(orderData)
      console.log(`Order created: ${order.id} with status: ${order.status}`)

      // Step 2: Wait for order to be ready and attempt to send to production
      try {
        // Wait longer for order processing
        await new Promise((resolve) => setTimeout(resolve, 5000))

        // Get fresh order status
        const currentOrder = await this.printifyAPI.getOrder(order.id)
        console.log(`Order status before production: ${currentOrder.status}`)

        // Only attempt production if order is in correct status
        if (currentOrder.status === "draft") {
          console.log("Attempting to send order to production...")
          await this.printifyAPI.submitOrderForProduction(order.id)

          // Get final order status
          const finalOrder = await this.printifyAPI.getOrder(order.id)
          console.log(`Order sent to production. Final status: ${finalOrder.status}`)

          return {
            success: true,
            payment_intent_id: `printify_${order.id}`,
            order_id: order.id,
            status: finalOrder.status,
            message: "Payment processed successfully by Printify",
          }
        } else {
          // Order created but needs manual intervention
          return {
            success: true,
            payment_intent_id: `printify_manual_${order.id}`,
            order_id: order.id,
            status: currentOrder.status,
            message: `Order created successfully. Status: ${currentOrder.status}. Manual processing may be required.`,
          }
        }
      } catch (productionError) {
        console.error("Production submission failed:", productionError)

        // Still return success since order was created
        return {
          success: true,
          payment_intent_id: `printify_pending_${order.id}`,
          order_id: order.id,
          status: "pending_production",
          message: "Order created successfully. Payment processing requires manual intervention.",
          error: productionError instanceof Error ? productionError.message : "Production submission failed",
        }
      }
    } catch (error) {
      console.error("Direct payment processing failed:", error)

      return {
        success: false,
        status: "failed",
        message: "Payment processing failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  // Create order for manual payment processing
  async createManualPaymentOrder(orderData: any): Promise<PaymentResult> {
    try {
      console.log("Creating order for manual payment processing...")

      const order = await this.printifyAPI.createOrder(orderData)

      return {
        success: true,
        payment_intent_id: `manual_${order.id}`,
        order_id: order.id,
        status: "pending_payment",
        message: "Order created successfully. Manual payment processing required.",
      }
    } catch (error) {
      console.error("Manual order creation failed:", error)

      return {
        success: false,
        status: "failed",
        message: "Failed to create order",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  // Process manual payment (for admin use)
  async processManualPayment(orderId: string): Promise<PaymentResult> {
    try {
      console.log(`Processing manual payment for order: ${orderId}`)

      const order = await this.printifyAPI.getOrder(orderId)

      if (order.status === "draft" || order.status === "pending") {
        await this.printifyAPI.submitOrderForProduction(orderId)

        const updatedOrder = await this.printifyAPI.getOrder(orderId)

        return {
          success: true,
          payment_intent_id: `manual_processed_${orderId}`,
          order_id: orderId,
          status: updatedOrder.status,
          message: "Manual payment processed successfully",
        }
      } else {
        return {
          success: false,
          order_id: orderId,
          status: order.status,
          message: `Order cannot be processed. Current status: ${order.status}`,
          error: "Invalid order status for payment processing",
        }
      }
    } catch (error) {
      console.error("Manual payment processing failed:", error)

      return {
        success: false,
        status: "failed",
        message: "Manual payment processing failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  // Get payment status
  async getPaymentStatus(paymentIntentId: string): Promise<PaymentIntent | null> {
    try {
      // Extract order ID from payment intent ID
      const orderId = paymentIntentId.replace(/^(printify_|manual_|manual_processed_)/, "")

      const order = await this.printifyAPI.getOrder(orderId)

      let status: PaymentIntent["status"] = "pending"

      switch (order.status) {
        case "draft":
        case "pending":
          status = "pending"
          break
        case "in_production":
        case "shipped":
        case "delivered":
          status = "succeeded"
          break
        case "canceled":
          status = "canceled"
          break
        default:
          status = "processing"
      }

      return {
        id: paymentIntentId,
        amount: order.total_price,
        currency: "USD",
        status,
        payment_method: paymentIntentId.startsWith("manual") ? "manual" : "printify_direct",
        order_id: orderId,
        created_at: order.created_at,
        metadata: {
          external_id: order.external_id,
          line_items_count: order.line_items.length,
        },
      }
    } catch (error) {
      console.error("Failed to get payment status:", error)
      return null
    }
  }

  // Cancel payment/order
  async cancelPayment(paymentIntentId: string): Promise<PaymentResult> {
    try {
      const orderId = paymentIntentId.replace(/^(printify_|manual_|manual_processed_)/, "")

      await this.printifyAPI.cancelOrder(orderId)

      return {
        success: true,
        payment_intent_id: paymentIntentId,
        order_id: orderId,
        status: "canceled",
        message: "Payment and order canceled successfully",
      }
    } catch (error) {
      console.error("Payment cancellation failed:", error)

      return {
        success: false,
        status: "failed",
        message: "Failed to cancel payment",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }
}
