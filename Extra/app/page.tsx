"use client"

import { HoodieCard } from "@/components/hoodie-card"
import { AutoSliderBanner } from "@/components/auto-slider-banner"
import { useProducts } from "@/hooks/use-products"
import { DebugPanel } from "@/components/debug-panel"
import { Loader2 } from "lucide-react"

export default function Home() {
  const { data, loading, error } = useProducts(1, 12)

  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      {/* Full-screen Auto-sliding Banner */}
      <AutoSliderBanner />

      {/* Product Section */}
      <section id="product-section" className="w-full py-12 md:py-24 bg-dark-900">
        <div className="container mx-auto px-4">
          <h2 className="mb-8 text-3xl font-bold text-center text-gray-100">Latest Collection</h2>

          {loading && (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-400">Loading products...</span>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-400">Error loading products: {error}</p>
              <p className="text-gray-400 mt-2">Please check your Printify API configuration.</p>
            </div>
          )}

          {data && data.products.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {data.products.map((product) => (
                <HoodieCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  price={product.price}
                  image1={product.image1}
                  image2={product.image2}
                  variantId={product.defaultVariantId}
                />
              ))}
            </div>
          )}

          {data && data.products.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400">
                No products found. Make sure you have visible products in your Printify shop.
              </p>
            </div>
          )}

          {data && data.pagination.totalPages > 1 && (
            <div className="flex justify-center mt-8 space-x-2">
              <p className="text-gray-400">
                Page {data.pagination.currentPage} of {data.pagination.totalPages} ({data.pagination.total} total
                products)
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Debug Panel - Remove this in production */}
      <DebugPanel />
    </main>
  )
}
