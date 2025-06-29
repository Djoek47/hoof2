"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useCart } from "@/contexts/cart-context"
import { Loader2, ArrowLeft, ShoppingCart } from "lucide-react"

interface ProductVariant {
  id: number
  price: number
  is_enabled: boolean
}

interface ProductOption {
  name: string
  type: string
  values: Array<{
    id: number
    title: string
  }>
}

interface ProductImage {
  src: string
  variant_ids: number[]
  position: string
  is_default: boolean
}

interface Product {
  id: string
  name: string
  description: string
  price: number
  image1: string
  image2: string
  variants: ProductVariant[]
  options: ProductOption[]
  images: ProductImage[]
  tags: string[]
}

export default function ProductPage() {
  const params = useParams()
  const router = useRouter()
  const { dispatch } = useCart()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({})
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true)
        const response = await fetch(`/api/products/${params.id}`)

        if (!response.ok) {
          throw new Error("Product not found")
        }

        const productData = await response.json()
        setProduct(productData)

        // Set default variant to the first enabled variant
        if (productData.variants && productData.variants.length > 0) {
          const enabledVariants = productData.variants.filter((v: ProductVariant) => v.is_enabled)
          if (enabledVariants.length > 0) {
            setSelectedVariant(enabledVariants[0].id)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load product")
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchProduct()
    }
  }, [params.id])

  const handleOptionChange = (optionName: string, valueId: number) => {
    setSelectedOptions((prev) => ({ ...prev, [optionName]: valueId }))

    // Find matching variant based on selected options
    if (product?.variants) {
      // This is a simplified variant matching - you might need more complex logic
      const enabledVariants = product.variants.filter((variant) => variant.is_enabled)
      const matchingVariant = enabledVariants.find((variant) => variant.is_enabled)
      if (matchingVariant) {
        setSelectedVariant(matchingVariant.id)
      }
    }
  }

  const addToCart = () => {
    if (!product || !selectedVariant) {
      alert("Please select a variant before adding to cart")
      return
    }

    const selectedVariantData = product.variants.find((v) => v.id === selectedVariant)
    if (!selectedVariantData) {
      alert("Selected variant is not available")
      return
    }

    // Get selected option titles for display
    const selectedSize = product.options
      .find((opt) => opt.name.toLowerCase() === "size")
      ?.values.find((val) => val.id === selectedOptions["size"])?.title
    const selectedColor = product.options
      .find((opt) => opt.name.toLowerCase() === "color")
      ?.values.find((val) => val.id === selectedOptions["color"])?.title

    dispatch({
      type: "ADD_ITEM",
      payload: {
        id: product.id,
        productId: product.id,
        name: product.name,
        price: selectedVariantData.price / 100, // Convert cents to dollars
        image: product.image1,
        quantity,
        variantId: selectedVariant,
        size: selectedSize,
        color: selectedColor,
      },
    })

    // Show success feedback
    alert(`Added ${quantity} ${product.name} to cart!`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <span className="text-gray-400">Loading product...</span>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || "Product not found"}</p>
          <Button onClick={() => router.push("/")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Store
          </Button>
        </div>
      </div>
    )
  }

  const productImages =
    product.images && product.images.length > 0
      ? product.images.map((img) => img.src)
      : [product.image1, product.image2].filter(Boolean)

  const enabledVariants = product.variants.filter((v) => v.is_enabled)
  const selectedVariantData = selectedVariant ? enabledVariants.find((v) => v.id === selectedVariant) : null

  return (
    <div className="min-h-screen bg-dark-900 pt-24 pb-12">
      <div className="container mx-auto px-4">
        {/* Back Button */}
        <Button onClick={() => router.push("/")} variant="ghost" className="mb-6 text-gray-400 hover:text-gray-100">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Store
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-dark-800 rounded-lg overflow-hidden">
              <Image
                src={productImages[currentImageIndex] || "/placeholder.svg"}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>

            {/* Image Thumbnails */}
            {productImages.length > 1 && (
              <div className="flex space-x-2">
                {productImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      currentImageIndex === index ? "border-white" : "border-dark-600"
                    }`}
                  >
                    <Image
                      src={image || "/placeholder.svg"}
                      alt={`${product.name} ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-100 mb-2">{product.name}</h1>
              <p className="text-2xl font-semibold text-gray-100">
                ${selectedVariantData ? (selectedVariantData.price / 100).toFixed(2) : product.price.toFixed(2)}
              </p>
            </div>

            {/* Product Description */}
            {product.description && (
              <div>
                <h3 className="text-lg font-semibold text-gray-100 mb-2">Description</h3>
                <p className="text-gray-400 leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Variant Selection */}
            {enabledVariants.length > 1 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-100 mb-3">Variant</h3>
                <div className="flex flex-wrap gap-2">
                  {enabledVariants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant.id)}
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        selectedVariant === variant.id
                          ? "border-white bg-white text-dark-900"
                          : "border-dark-600 bg-dark-800 text-gray-100 hover:border-gray-400"
                      }`}
                    >
                      ${(variant.price / 100).toFixed(2)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Product Options */}
            {product.options &&
              product.options.map((option) => (
                <div key={option.name}>
                  <h3 className="text-lg font-semibold text-gray-100 mb-3">{option.name}</h3>
                  <div className="flex flex-wrap gap-2">
                    {option.values.map((value) => (
                      <button
                        key={value.id}
                        onClick={() => handleOptionChange(option.name.toLowerCase(), value.id)}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          selectedOptions[option.name.toLowerCase()] === value.id
                            ? "border-white bg-white text-dark-900"
                            : "border-dark-600 bg-dark-800 text-gray-100 hover:border-gray-400"
                        }`}
                      >
                        {value.title}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

            {/* Quantity Selector */}
            <div>
              <h3 className="text-lg font-semibold text-gray-100 mb-3">Quantity</h3>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-lg bg-dark-800 border border-dark-600 text-gray-100 hover:bg-dark-700 transition-colors"
                >
                  -
                </button>
                <span className="text-xl font-semibold text-gray-100 w-12 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-lg bg-dark-800 border border-dark-600 text-gray-100 hover:bg-dark-700 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Add to Cart Button */}
            <Button
              onClick={addToCart}
              size="lg"
              className="w-full bg-white text-dark-900 hover:bg-gray-200 font-semibold"
              disabled={!selectedVariant}
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Add to Cart - $
              {selectedVariantData
                ? ((selectedVariantData.price / 100) * quantity).toFixed(2)
                : (product.price * quantity).toFixed(2)}
            </Button>

            {/* Product Tags */}
            {product.tags && product.tags.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-100 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag, index) => (
                    <span key={index} className="px-3 py-1 bg-dark-800 text-gray-400 rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
