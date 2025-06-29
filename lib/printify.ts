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
        return new Error("Unauthorized: Invalid API token")
      case 403:
        return new Error("Forbidden: Insufficient permissions")
      case 404:
        return new Error("Not Found: The requested resource doesn't exist")
      case 422:
        return new Error(`Validation Error: ${errorData.message || "Invalid data provided"}`)
      case 429:
        return new Error("Rate Limit Exceeded: Too many requests")
      case 500:
        return new Error("Internal Server Error: Printify server error")
      case 502:
        return new Error("Bad Gateway: Printify service temporarily unavailable")
      case 503:
        return new Error("Service Unavailable: Printify service is down")
      default:
        return new Error(`HTTP ${status}: ${errorData.message || "Unknown error"}`)
    }
  }

  private async makeRequest(endpoint: string, options?: RequestInit) {
    this.checkRateLimit()

    const url = `${this.baseURL}${endpoint}`
    const headers = {
      "Authorization": `Bearer ${this.apiToken}`,
      "Content-Type": "application/json",
      ...options?.headers,
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      if (!response.ok) {
        let errorData: any
        try {
          errorData = await response.json()
        } catch {
          errorData = { message: `HTTP ${response.status}` }
        }

        throw this.handlePrintifyError(response.status, errorData)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error("Network error occurred")
    }
  }

  private async makeRequestWithRetry(endpoint: string, options?: RequestInit, maxRetries = 3): Promise<any> {
    let lastError: Error

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.makeRequest(endpoint, options)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown error")

        // Don't retry on client errors (4xx)
        if (lastError.message.includes("400") || lastError.message.includes("401") || lastError.message.includes("403") || lastError.message.includes("404") || lastError.message.includes("422")) {
          throw lastError
        }

        // Don't retry on rate limit errors
        if (lastError.message.includes("Rate Limit")) {
          throw lastError
        }

        if (attempt === maxRetries) {
          throw lastError
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    throw lastError!
  }

  async getProducts(page = 1, limit = 10): Promise<PrintifyApiResponse> {
    return this.makeRequestWithRetry(`/shops/${this.shopId}/products.json?page=${page}&limit=${limit}`)
  }

  async getProduct(productId: string): Promise<PrintifyProduct | null> {
    try {
      return await this.makeRequestWithRetry(`/shops/${this.shopId}/products/${productId}.json`)
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        return null
      }
      throw error
    }
  }

  transformProduct(product: PrintifyProduct) {
    const defaultImage = product.images.find((img) => img.is_default)?.src || product.images[0]?.src
    const enabledVariants = product.variants.filter((v) => v.is_enabled)

    return {
      id: product.id.toString(),
      name: product.title,
      description: product.description,
      price: enabledVariants[0]?.price / 100 || 0, // Convert cents to dollars
      image: defaultImage,
      variants: enabledVariants.map((v) => ({
        id: v.id,
        price: v.price / 100,
        is_enabled: v.is_enabled,
      })),
      images: product.images,
      options: product.options,
    }
  }

  async calculateShippingCost(
    lineItems: PrintifyOrderItem[],
    address: PrintifyShippingAddress,
  ): Promise<PrintifyShippingCalculation> {
    try {
      const response = await this.makeRequestWithRetry(`/shops/${this.shopId}/orders/shipping.json`, {
        method: "POST",
        body: JSON.stringify({
          line_items: lineItems,
          address_to: address,
        }),
      })

      return {
        standard: response.standard / 100,
        express: response.express ? response.express / 100 : undefined,
        priority: response.priority ? response.priority / 100 : undefined,
      }
    } catch (error) {
      console.error("Error calculating shipping:", error)
      // Return default shipping cost
      return {
        standard: 5.99,
      }
    }
  }

  async calculateOrderCost(lineItems: PrintifyOrderItem[], address: PrintifyShippingAddress) {
    try {
      const response = await this.makeRequestWithRetry(`/shops/${this.shopId}/orders/calculate.json`, {
        method: "POST",
        body: JSON.stringify({
          line_items: lineItems,
          address_to: address,
        }),
      })

      return {
        total_price: response.total_price / 100,
        total_shipping: response.total_shipping / 100,
        total_tax: response.total_tax / 100,
        total_cost: response.total_cost / 100,
      }
    } catch (error) {
      console.error("Error calculating order cost:", error)
      throw new Error("Failed to calculate order cost")
    }
  }

  async getShippingRates(
    lineItems?: PrintifyOrderItem[],
    address?: PrintifyShippingAddress,
  ): Promise<PrintifyShippingRate[]> {
    try {
      const response = await this.makeRequestWithRetry(`/shops/${this.shopId}/orders/shipping.json`, {
        method: "POST",
        body: JSON.stringify({
          line_items: lineItems || [],
          address_to: address || {
            first_name: "",
            last_name: "",
            email: "",
            phone: "",
            country: "US",
            region: "",
            address1: "",
            city: "",
            zip: "",
          },
        }),
      })

      return response.map((rate: any) => ({
        id: rate.id,
        name: rate.name,
        rate: rate.rate / 100,
        currency: rate.currency,
      }))
    } catch (error) {
      console.error("Error getting shipping rates:", error)
      // Return default shipping options
      return [
        { id: 1, name: "Standard Shipping", rate: 5.99, currency: "USD" },
        { id: 2, name: "Express Shipping", rate: 12.99, currency: "USD" },
      ]
    }
  }

  async getOrders(page = 1, limit = 10): Promise<any> {
    return this.makeRequestWithRetry(`/shops/${this.shopId}/orders.json?page=${page}&limit=${limit}`)
  }

  async getOrder(orderId: string): Promise<PrintifyOrder | null> {
    try {
      return await this.makeRequestWithRetry(`/shops/${this.shopId}/orders/${orderId}.json`)
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        return null
      }
      throw error
    }
  }

  async createOrder(orderData: PrintifyOrderRequest): Promise<PrintifyOrder> {
    return this.makeRequestWithRetry(`/shops/${this.shopId}/orders.json`, {
      method: "POST",
      body: JSON.stringify(orderData),
    })
  }

  async submitOrderForProduction(orderId: string): Promise<void> {
    await this.makeRequestWithRetry(`/shops/${this.shopId}/orders/${orderId}/send_to_production.json`, {
      method: "POST",
    })
  }

  async cancelOrder(orderId: string): Promise<void> {
    await this.makeRequestWithRetry(`/shops/${this.shopId}/orders/${orderId}/cancel.json`, {
      method: "POST",
    })
  }

  getRateLimitStatus(): RateLimitInfo {
    return { ...this.rateLimitInfo }
  }

  async healthCheck(): Promise<{ status: string; message: string; details?: any }> {
    try {
      const products = await this.getProducts(1, 1)
      return {
        status: "healthy",
        message: "Printify API is working correctly",
        details: {
          productCount: products.total,
          shopId: this.shopId,
          hasApiToken: !!this.apiToken,
        },
      }
    } catch (error) {
      return {
        status: "unhealthy",
        message: error instanceof Error ? error.message : "Unknown error",
        details: {
          shopId: this.shopId,
          hasApiToken: !!this.apiToken,
        },
      }
    }
  }
} 