"use client"

import { useState, useEffect } from "react"

interface PrintifyProduct {
  id: string
  name: string
  description: string
  price: number
  image1: string
  image2: string
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
  options: Array<{
    name: string
    type: string
    values: Array<{
      id: number
      title: string
    }>
  }>
  visible: boolean
}

interface UsePrintifyProductsReturn {
  products: PrintifyProduct[]
  loading: boolean
  error: string | null
  pagination: {
    current_page: number
    last_page: number
    total: number
    per_page: number
  } | null
  refetch: () => void
}

export function usePrintifyProducts(page = 1, limit = 20): UsePrintifyProductsReturn {
  const [products, setProducts] = useState<PrintifyProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<any>(null)

  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/products?page=${page}&limit=${limit}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch products")
      }

      setProducts(data.products)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch products")
      console.error("Error fetching Printify products:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [page, limit])

  const refetch = () => {
    fetchProducts()
  }

  return {
    products,
    loading,
    error,
    pagination,
    refetch,
  }
} 