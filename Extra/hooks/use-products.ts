"use client"

import { useState, useEffect } from "react"

interface Product {
  id: string
  name: string
  price: number
  description: string
  image1: string
  image2: string
  variants: any[]
  options: any[]
  tags: string[]
  visible: boolean
  defaultVariantId?: number
}

interface ProductsResponse {
  products: Product[]
  pagination: {
    currentPage: number
    totalPages: number
    total: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export function useProducts(page = 1, limit = 10) {
  const [data, setData] = useState<ProductsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true)
        setError(null)

        console.log(`Fetching products from API: page=${page}, limit=${limit}`)

        const response = await fetch(`/api/products?page=${page}&limit=${limit}`)

        console.log(`API response status: ${response.status}`)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP ${response.status}`)
        }

        const result = await response.json()
        console.log(`Received products:`, result)
        setData(result)
      } catch (err) {
        console.error("Error fetching products:", err)
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [page, limit])

  return { data, loading, error }
}
