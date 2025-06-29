interface PrintifyProduct {
  id: number
  title: string
  description: string
  tags: string[]
  options: Array<{
    name: string
    type: string
    values: Array<{
      id: number
      title: string
    }>
  }>
  variants: Array<{
    id: number
    price: number
    is_enabled: boolean
  }>
  images: Array<{
    src: string
    variant_ids: number[]
    position: string
    is_default: boolean
  }>
  created_at: string
  updated_at: string
  visible: boolean
  is_locked: boolean
  blueprint_id: number
  user_id: number
  shop_id: number
  print_provider_id: number
  print_areas: any[]
  print_details: any[]
  sales_channel_properties: any[]
}

interface PrintifyApiResponse {
  current_page: number
  data: PrintifyProduct[]
  first_page_url: string
  from: number
  last_page: number
  last_page_url: string
  links: Array<{
    url: string | null
    label: string
    active: boolean
  }>
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  to: number
  total: number
}

interface PrintifyOrderItem {
  product_id: string
  variant_id: number
  quantity: number
}

interface PrintifyShippingAddress {
  first_name: string
  last_name: string
  email: string
  phone: string
  country: string
  region: string
  address1: string
  address2?: string
  city: string
  zip: string
}

interface PrintifyOrderRequest {
  external_id?: string
  label?: string
  line_items: PrintifyOrderItem[]
  shipping_method?: number
  is_printify_express?: boolean
  send_shipping_notification: boolean
  address_to: PrintifyShippingAddress
}

interface PrintifyOrder {
  id: string
  external_id: string
  label: string
  line_items: Array<{
    product_id: string
    variant_id: number
    quantity: number
  }>
  address_to: {
    first_name: string
    last_name: string
    email: string
    phone: string
    country: string
    region: string
    address1: string
    address2: string
    city: string
    zip: string
  }
  send_shipping_notification: boolean
  created_at: string
  updated_at: string
  status: string
}

interface PrintifyShippingRate {
  id: number
  name: string
  rate: number
  currency: string
}

interface PrintifyShippingCalculation {
  standard: number
  express?: number
  priority?: number
}

interface RateLimitInfo {
  requestCount: number
  windowStart: number
  isLimited: boolean
}

// Printify API Error Types
interface PrintifyErrorResponse {
  message: string
  errors?: Record<string, string[]>
  code?: number
}

export class PrintifyAPI {
  private baseURL = "https://api.printify.com/v1"
  private apiToken: string
  private shopId: string
  private rateLimitInfo: RateLimitInfo = {
    requestCount: 0,
    windowStart: Date.now(),
    isLimited: false,
  }

  // Rate limit: 600 requests per minute
  private readonly RATE_LIMIT = 600
  private readonly RATE_WINDOW = 60 * 1000 // 1 minute in milliseconds
  private readonly MAX_ERROR_RATE = 0.05 // 5% error rate limit

  constructor() {
    this.apiToken = process.env.PRINTIFY_API_TOKEN!
    this.shopId = process.env.PRINTIFY_SHOP_ID!

    if (!this.apiToken) {
      throw new Error("PRINTIFY_API_TOKEN environment variable is required")
    }
    if (!this.shopId) {
      throw new Error("PRINTIFY_SHOP_ID environment variable is required")
    }
  }

  private checkRateLimit(): void {
    const now = Date.now()
    const windowElapsed = now - this.rateLimitInfo.windowStart

    // Reset window if more than 1 minute has passed
    if (windowElapsed >= this.RATE_WINDOW) {
      this.rateLimitInfo = {
        requestCount: 0,
        windowStart: now,
        isLimited: false,
      }
    }

    // Check if we're approaching the rate limit
    if (this.rateLimitInfo.requestCount >= this.RATE_LIMIT) {
      this.rateLimitInfo.isLimited = true
      const timeToWait = this.RATE_WINDOW - windowElapsed
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(timeToWait / 1000)} seconds before retrying.`)
    }

    this.rateLimitInfo.requestCount++
  }

  private handlePrintifyError(status: number, errorData: any): Error {
    // Handle specific Printify error codes based on documentation
    switch (status) {
      case 400:
        // Check for specific error codes
        if (errorData.code === 8502) {
          return new Error(`Order Processing Error: ${errorData.errors?.reason || errorData.message}`)
        }
        return new Error(
          `Bad Request: ${errorData.message || "The request encoding is invalid; the request can't be parsed as a valid JSON"}`,
        )

      case 401:
        return new Error(
          "Unauthorized: Accessing a protected resource without authorization or with invalid credentials",
        )

      case 402:
        return new Error(
          "Payment Required: The account associated with the API key making requests hits a quota that can be increased by upgrading the Printify API account plan",
        )

      case 403:
        return new Error(
          "Forbidden: Accessing a protected resource with API credentials that don't have access to that resource",
        )

      case 404:
        return new Error(
          "Not Found: Route or resource is not found. This error is returned when the request hits an undefined route, or if the resource doesn't exist",
        )

      case 413:
        return new Error(
          "Request Entity Too Large: The request exceeded the maximum allowed payload size. You shouldn't encounter this under normal use",
        )

      case 422:
        const validationErrors = errorData.errors
          ? Object.entries(errorData.errors)
              .map(([field, errors]) => `${field}: ${(errors as string[]).join(", ")}`)
              .join("; ")
          : errorData.message || "Invalid Request"
        return new Error(`Validation Error: ${validationErrors}`)

      case 429:
        return new Error("Too Many Requests: You have sent too many requests in a given amount of time (rate limiting)")

      case 500:
        return new Error("Internal Server Error: The server encountered an unexpected condition")

      case 502:
        return new Error(
          "Bad Gateway: Printify's servers are restarting or an unexpected outage is in progress. You should generally not receive this error, and requests are safe to retry",
        )

      case 503:
        return new Error(
          "Service Unavailable: The server could not process your request in time. The server could be temporarily unavailable, or it could have timed out processing your request. You should retry",
        )

      default:
        return new Error(`Printify API error: ${status} - ${errorData.message || "Unknown error"}`)
    }
  }

  private async makeRequest(endpoint: string, options?: RequestInit) {
    try {
      // Check rate limit before making request
      this.checkRateLimit()

      console.log(`Making Printify API request to: ${this.baseURL}${endpoint}`)
      console.log(`Rate limit status: ${this.rateLimitInfo.requestCount}/${this.RATE_LIMIT} requests in current window`)

      // Add timeout and better error handling
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 45000) // Increased to 45 seconds

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
          "User-Agent": "SDFM-Store/1.0",
          ...options?.headers,
        },
        ...options,
      })

      clearTimeout(timeoutId)
      console.log(`Printify API response status: ${response.status}`)

      if (!response.ok) {
        let errorData: PrintifyErrorResponse

        try {
          const errorText = await response.text()
          console.log(`Printify API error response body:`, errorText)
          errorData = JSON.parse(errorText)
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError)
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` }
        }

        // Log the full request details for debugging
        console.error(`Printify API error details:`, {
          url: `${this.baseURL}${endpoint}`,
          method: options?.method || "GET",
          status: response.status,
          statusText: response.statusText,
          requestBody: options?.body,
          errorData,
        })

        throw this.handlePrintifyError(response.status, errorData)
      }

      const data = await response.json()
      console.log(`Printify API response received successfully`)
      return data
    } catch (error) {
      console.error("Printify API request failed:", error)

      // Handle specific fetch errors
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error("Request timeout: Printify API took too long to respond (45s)")
        }
        if (error.message.includes("fetch") || error.message.includes("Failed to fetch")) {
          throw new Error(`Network error: Unable to connect to Printify API. This could be due to:
- Internet connectivity issues
- Printify API being temporarily unavailable
- DNS resolution problems
- Firewall or proxy blocking the request
Please check your connection and try again.`)
        }
        if (error.message.includes("ENOTFOUND") || error.message.includes("ECONNREFUSED")) {
          throw new Error("DNS/Connection error: Cannot reach Printify servers. Please check your internet connection.")
        }
        if (error.message.includes("ETIMEDOUT")) {
          throw new Error("Connection timeout: Printify API is taking too long to respond. Please try again.")
        }
      }

      throw error
    }
  }

  // Retry mechanism with proper error handling
  private async makeRequestWithRetry(endpoint: string, options?: RequestInit, maxRetries = 3): Promise<any> {
    let lastError: Error

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.makeRequest(endpoint, options)
      } catch (error) {
        lastError = error as Error
        console.log(`Request attempt ${attempt} failed:`, error)

        // Don't retry on client errors (4xx) except rate limiting and server errors
        if (error instanceof Error) {
          if (error.message.includes("Too Many Requests")) {
            // Wait before retrying rate limited requests
            const waitTime = 60000 // 1 minute
            console.log(`Rate limited. Waiting ${waitTime / 1000} seconds before retry...`)
            await new Promise((resolve) => setTimeout(resolve, waitTime))
            continue
          }

          // Don't retry on permanent client errors
          if (
            error.message.includes("Bad Request") ||
            error.message.includes("Unauthorized") ||
            error.message.includes("Forbidden") ||
            error.message.includes("Not Found") ||
            error.message.includes("Validation Error")
          ) {
            throw error
          }

          // Don't retry on network errors that are unlikely to resolve quickly
          if (error.message.includes("DNS/Connection error") || error.message.includes("ENOTFOUND")) {
            throw error
          }
        }

        // Retry on server errors (5xx) and temporary network issues
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000 // Exponential backoff
          console.log(`Server/network error. Waiting ${waitTime / 1000} seconds before retry ${attempt + 1}...`)
          await new Promise((resolve) => setTimeout(resolve, waitTime))
        }
      }
    }

    throw lastError!
  }

  // GET /v1/shops/{shop_id}/products.json - Retrieve a list of all products
  async getProducts(page = 1, limit = 10): Promise<PrintifyApiResponse> {
    return this.makeRequestWithRetry(`/shops/${this.shopId}/products.json?page=${page}&limit=${limit}`)
  }

  // GET /v1/shops/{shop_id}/products/{product_id}.json - Retrieve a product
  async getProduct(productId: string): Promise<PrintifyProduct | null> {
    try {
      const response = await this.makeRequestWithRetry(`/shops/${this.shopId}/products/${productId}.json`)
      return response
    } catch (error) {
      console.error(`Failed to fetch product ${productId}:`, error)
      return null
    }
  }

  // Transform Printify product to our store format
  transformProduct(product: PrintifyProduct) {
    const defaultImage = product.images.find((img) => img.is_default) || product.images[0]
    const secondaryImage = product.images.find((img) => !img.is_default) || product.images[1] || defaultImage

    // Get enabled and available variants
    const enabledVariants = product.variants.filter((v) => v.is_enabled)
    const minPrice = enabledVariants.length > 0 ? Math.min(...enabledVariants.map((v) => v.price)) / 100 : 0

    // Get default variant ID (prefer the one marked as default, otherwise first enabled)
    const defaultVariant = enabledVariants[0]
    const defaultVariantId = defaultVariant?.id

    return {
      id: product.id,
      name: product.title,
      price: minPrice,
      description: product.description,
      image1: defaultImage?.src || "/placeholder.svg?height=400&width=400",
      image2: secondaryImage?.src || "/placeholder.svg?height=400&width=400",
      variants: enabledVariants,
      options: product.options,
      tags: product.tags,
      visible: product.visible,
      defaultVariantId,
    }
  }

  // POST /v1/shops/{shop_id}/orders/shipping.json - Calculate shipping cost with robust fallback
  async calculateShippingCost(
    lineItems: PrintifyOrderItem[],
    address: PrintifyShippingAddress,
  ): Promise<PrintifyShippingCalculation> {
    try {
      console.log("Attempting to calculate shipping cost via Printify API...")

      const response = await this.makeRequestWithRetry(`/shops/${this.shopId}/orders/shipping.json`, {
        method: "POST",
        body: JSON.stringify({
          line_items: lineItems,
          address_to: address,
        }),
      })

      console.log("Shipping calculation response:", response)

      return {
        standard: response.standard || response.shipping_cost || 500,
        express: response.express,
        priority: response.priority,
      }
    } catch (error) {
      console.error("Shipping calculation failed, using intelligent fallback:", error)

      // More intelligent fallback based on destination and items
      const itemCount = lineItems.reduce((sum, item) => sum + item.quantity, 0)

      // Base shipping rates by region (in cents)
      let baseShipping = 500 // Default $5.00

      switch (address.country) {
        case "US":
          baseShipping = 500 // $5.00
          break
        case "CA":
          baseShipping = 800 // $8.00
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
          baseShipping = 1200 // $12.00 for Europe
          break
        case "AU":
        case "NZ":
          baseShipping = 1500 // $15.00 for Oceania
          break
        default:
          baseShipping = 1800 // $18.00 for other international
      }

      // Additional cost per extra item
      const perItemShipping = 200 // $2.00 per additional item
      const expeditedMultiplier = 2.5

      const standardShipping = baseShipping + Math.max(0, itemCount - 1) * perItemShipping

      console.log(
        `Using intelligent fallback shipping: ${standardShipping} cents for ${itemCount} items to ${address.country}`,
      )

      return {
        standard: standardShipping,
        express: Math.round(standardShipping * expeditedMultiplier),
      }
    }
  }

  // Calculate order costs with comprehensive validation and fallback
  async calculateOrderCost(lineItems: PrintifyOrderItem[], address: PrintifyShippingAddress) {
    try {
      console.log("Calculating order cost for line items:", lineItems)

      // Validate and calculate product costs
      let totalCost = 0
      const calculatedLineItems = []

      for (const item of lineItems) {
        try {
          const product = await this.getProduct(item.product_id)
          if (!product) {
            throw new Error(`Product ${item.product_id} not found`)
          }
          const variant = product.variants.find((v) => v.id === item.variant_id && v.is_enabled)

          if (!variant) {
            throw new Error(`Variant ${item.variant_id} not found or not enabled for product ${item.product_id}`)
          }

          const itemCost = variant.price * item.quantity
          totalCost += itemCost

          calculatedLineItems.push({
            product_id: item.product_id,
            variant_id: item.variant_id,
            quantity: item.quantity,
            cost: variant.price,
          })
        } catch (productError) {
          console.error(`Error calculating cost for product ${item.product_id}:`, productError)
          throw new Error(`Invalid product or variant: ${item.product_id}`)
        }
      }

      // Get shipping costs with fallback
      let shippingCosts: PrintifyShippingCalculation
      try {
        shippingCosts = await this.calculateShippingCost(lineItems, address)
      } catch (shippingError) {
        console.error("Shipping calculation failed, using fallback:", shippingError)
        // Use fallback shipping calculation
        const itemCount = lineItems.reduce((sum, item) => sum + item.quantity, 0)
        const baseShipping = address.country === "US" ? 500 : 1000
        shippingCosts = {
          standard: baseShipping + Math.max(0, itemCount - 1) * 200,
          express: Math.round((baseShipping + Math.max(0, itemCount - 1) * 200) * 2.5),
        }
      }

      const shippingCost = shippingCosts.standard

      // Estimate tax (8% for US, adjust based on country if needed)
      const taxRate = address.country === "US" ? 0.08 : 0.0
      const estimatedTax = Math.round(totalCost * taxRate)

      return {
        line_items: calculatedLineItems,
        shipping_cost: shippingCost,
        total_shipping: shippingCost,
        total_tax: estimatedTax,
        total_cost: totalCost + shippingCost + estimatedTax,
        currency: "USD",
        shipping_options: shippingCosts,
      }
    } catch (error) {
      console.error("Cost calculation failed:", error)
      throw error
    }
  }

  // Get shipping rates with proper endpoint usage and fallback
  async getShippingRates(
    lineItems?: PrintifyOrderItem[],
    address?: PrintifyShippingAddress,
  ): Promise<PrintifyShippingRate[]> {
    if (lineItems && address) {
      try {
        const shippingCosts = await this.calculateShippingCost(lineItems, address)
        const rates: PrintifyShippingRate[] = [
          {
            id: 1,
            name: "Standard Shipping",
            rate: shippingCosts.standard,
            currency: "USD",
          },
        ]

        if (shippingCosts.express) {
          rates.push({
            id: 2,
            name: "Express Shipping",
            rate: shippingCosts.express,
            currency: "USD",
          })
        }

        if (shippingCosts.priority) {
          rates.push({
            id: 3,
            name: "Priority Shipping",
            rate: shippingCosts.priority,
            currency: "USD",
          })
        }

        return rates
      } catch (error) {
        console.error("Failed to get real shipping rates, using fallback:", error)
      }
    }

    // Enhanced fallback shipping options based on destination
    const country = address?.country || "US"
    let standardRate = 500
    let expressRate = 1500

    switch (country) {
      case "US":
        standardRate = 500
        expressRate = 1500
        break
      case "CA":
        standardRate = 800
        expressRate = 2000
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
        standardRate = 1200
        expressRate = 3000
        break
      case "AU":
      case "NZ":
        standardRate = 1500
        expressRate = 3500
        break
      default:
        standardRate = 1800
        expressRate = 4000
    }

    return [
      {
        id: 1,
        name: "Standard Shipping",
        rate: standardRate,
        currency: "USD",
      },
      {
        id: 2,
        name: "Express Shipping",
        rate: expressRate,
        currency: "USD",
      },
    ]
  }

  // GET /v1/shops/{shop_id}/orders.json - Retrieve a list of orders
  async getOrders(page = 1, limit = 10): Promise<any> {
    return this.makeRequestWithRetry(`/shops/${this.shopId}/orders.json?page=${page}&limit=${limit}`)
  }

  // GET /v1/shops/{shop_id}/orders/{order_id}.json - Get order details by ID
  async getOrder(orderId: string): Promise<PrintifyOrder | null> {
    try {
      const response = await this.makeRequestWithRetry(`/shops/${this.shopId}/orders/${orderId}.json`)
      return response
    } catch (error) {
      console.error(`Failed to fetch order ${orderId}:`, error)
      return null
    }
  }

  // POST /v1/shops/{shop_id}/orders.json - Submit an order
  async createOrder(orderData: PrintifyOrderRequest): Promise<PrintifyOrder> {
    // Validate order data before sending
    if (!orderData.line_items || orderData.line_items.length === 0) {
      throw new Error("Order must contain at least one line item")
    }

    if (!orderData.address_to) {
      throw new Error("Shipping address is required")
    }

    // Validate each line item
    for (const item of orderData.line_items) {
      if (!item.product_id || !item.variant_id || !item.quantity) {
        throw new Error(`Invalid line item: ${JSON.stringify(item)}`)
      }
      if (item.quantity <= 0) {
        throw new Error(`Invalid quantity for product ${item.product_id}: ${item.quantity}`)
      }
    }

    // Validate address fields
    const requiredFields = ["first_name", "last_name", "email", "country", "region", "address1", "city", "zip"]
    for (const field of requiredFields) {
      if (!orderData.address_to[field as keyof PrintifyShippingAddress]) {
        throw new Error(`Missing required address field: ${field}`)
      }
    }

    const cleanOrderData = {
      ...orderData,
      send_shipping_notification: true,
    }

    // Remove shipping_method if it's undefined or invalid
    if (!cleanOrderData.shipping_method) {
      delete cleanOrderData.shipping_method
    }

    console.log("Creating order with validated data:", JSON.stringify(cleanOrderData, null, 2))

    return this.makeRequestWithRetry(`/shops/${this.shopId}/orders.json`, {
      method: "POST",
      body: JSON.stringify(cleanOrderData),
    })
  }

  // POST /v1/shops/{shop_id}/orders/{order_id}/send_to_production.json - Send an existing order to production
  async submitOrderForProduction(orderId: string): Promise<void> {
    const order = await this.getOrder(orderId)
    console.log(`Order ${orderId} current status: ${order?.status}`)

    // Only send to production if order is in draft status
    if (order?.status === "draft") {
      return this.makeRequestWithRetry(`/shops/${this.shopId}/orders/${orderId}/send_to_production.json`, {
        method: "POST",
      })
    } else if (order?.status === "pending") {
      throw new Error(`Order ${orderId} is pending payment. Cannot send to production until payment is completed.`)
    } else if (order?.status === "in_production" || order?.status === "shipped" || order?.status === "delivered") {
      throw new Error(`Order ${orderId} is already in production or completed. Status: ${order?.status}`)
    } else {
      throw new Error(`Order ${orderId} cannot be sent to production. Current status: ${order?.status}`)
    }
  }

  // POST /v1/shops/{shop_id}/orders/{order_id}/cancel.json - Cancel an unpaid order
  async cancelOrder(orderId: string): Promise<void> {
    return this.makeRequestWithRetry(`/shops/${this.shopId}/orders/${orderId}/cancel.json`, {
      method: "POST",
    })
  }

  // Get current rate limit status
  getRateLimitStatus(): RateLimitInfo {
    return { ...this.rateLimitInfo }
  }

  // Health check method to test API connectivity
  async healthCheck(): Promise<{ status: string; message: string; details?: any }> {
    try {
      console.log("Performing Printify API health check...")

      // Try a simple API call with minimal data
      const response = await this.makeRequest(`/shops/${this.shopId}/products.json?limit=1`)

      return {
        status: "healthy",
        message: "Printify API is accessible",
        details: {
          productCount: response.total || 0,
          shopId: this.shopId,
        },
      }
    } catch (error) {
      console.error("Printify API health check failed:", error)

      return {
        status: "unhealthy",
        message: error instanceof Error ? error.message : "Unknown error",
        details: {
          shopId: this.shopId,
          timestamp: new Date().toISOString(),
        },
      }
    }
  }
}
