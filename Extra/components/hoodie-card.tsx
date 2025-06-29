"use client"

import Image from "next/image"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface HoodieCardProps {
  id: string
  name: string
  price: number
  image1: string
  image2: string
  variantId?: number // NEW
}

export function HoodieCard({ id, name, price, image1, image2, variantId }: HoodieCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const router = useRouter()

  const viewProduct = () => {
    router.push(`/product/${id}`)
  }

  return (
    <div className="bg-dark-800 rounded-lg overflow-hidden cursor-pointer group">
      <div
        className="relative aspect-square"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={viewProduct}
      >
        <Image
          src={isHovered ? image2 : image1}
          alt={name}
          fill
          className="object-cover transition-opacity duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
          <span className="text-white font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            View Details
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-100 mb-1">{name}</h3>
        <p className="text-gray-400 mb-4">From ${price.toFixed(2)}</p>
        <Button onClick={viewProduct} className="w-full bg-transparent" variant="outline">
          View Product
        </Button>
      </div>
    </div>
  )
}
