"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, ShoppingBag, CreditCard, Clock, Mail, Shield } from "lucide-react"
import Image from "next/image"

export default function SuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)

  const paymentMethod = searchParams.get("method") || "stripe"
  const orderId = searchParams.get("orderId") || ""

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const getSuccessContent = () => {
    switch (paymentMethod) {
      case "stripe":
        return {
          icon: <CreditCard className="w-16 h-16 text-green-500" />,
          title: "Payment Approved! 🎉",
          subtitle: "Thank you for shopping with us!",
          message: (
            <div className="space-y-4">
              {/* Payment Approved Message - ONLY for Stripe */}
              <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Shield className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 font-semibold">Payment Approved</span>
                </div>
                <p className="text-green-300 text-sm">
                  Your payment has been successfully processed and approved. Thank you for shopping with us!
                </p>
              </div>

              <p className="text-gray-300">
                Your order has been confirmed and is now being prepared for production.
              </p>
              {orderId && (
                <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
                  <p className="text-blue-300 text-sm">
                    <strong>Order ID:</strong> {orderId}
                  </p>
                </div>
              )}
              <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
                <h4 className="text-blue-400 font-semibold mb-2 flex items-center">
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  What happens next?
                </h4>
                <ul className="text-blue-300 text-sm space-y-1">
                  <li>• Your order is sent to our print-on-demand partner</li>
                  <li>• Production begins within 1-2 business days</li>
                  <li>• You'll receive shipping confirmation via email</li>
                  <li>• Delivery typically takes 5-10 business days</li>
                </ul>
              </div>
            </div>
          ),
        }

      case "manual":
        return {
          icon: <Clock className="w-16 h-16 text-yellow-500" />,
          title: "Order Created Successfully! 📋",
          subtitle: "Your order has been submitted for manual payment processing.",
          message: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Thank you for your order! We've created your order and will send you a payment link shortly.
              </p>
              {orderId && (
                <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4">
                  <p className="text-yellow-300 text-sm">
                    <strong>Order ID:</strong> {orderId}
                  </p>
                </div>
              )}
              <div className="bg-purple-900/20 border border-purple-500 rounded-lg p-4">
                <h4 className="text-purple-400 font-semibold mb-2 flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  Payment Link Coming Soon
                </h4>
                <p className="text-purple-300 text-sm mb-3">
                  You'll receive an email with payment options for:
                </p>
                <ul className="text-purple-300 text-sm space-y-1">
                  <li>• 💳 Credit/Debit Card (USD)</li>
                  <li>• 💰 PayPal (USD)</li>
                  <li>• ₿ Cryptocurrency (Bitcoin, Ethereum, etc.)</li>
                </ul>
                <p className="text-purple-300 text-sm mt-3">
                  <strong>Note:</strong> Your order will be processed once payment is received.
                </p>
              </div>
            </div>
          ),
        }

      default:
        return {
          icon: <CheckCircle className="w-16 h-16 text-green-500" />,
          title: "Order Successful! 🎉",
          subtitle: "Your order has been processed successfully.",
          message: (
            <div className="space-y-4">
              <p className="text-gray-300">
                Thank you for your purchase! Your order is being processed and you'll receive updates via email.
              </p>
              {orderId && (
                <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
                  <p className="text-green-300 text-sm">
                    <strong>Order ID:</strong> {orderId}
                  </p>
                </div>
              )}
            </div>
          ),
        }
    }
  }

  const content = getSuccessContent()

  return (
    <div className="min-h-screen bg-dark-900 pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            {content.icon}
          </div>
          <h1 className="text-4xl font-bold text-gray-100 mb-4">{content.title}</h1>
          <p className="text-xl text-gray-300">{content.subtitle}</p>
        </div>

        <Card className="bg-dark-800 border-dark-700">
          <CardHeader>
            <CardTitle className="text-gray-100 text-center">Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {content.message}

            {/* Contact Information */}
            <div className="bg-dark-700 rounded-lg p-4">
              <h4 className="text-gray-200 font-semibold mb-2">Need Help?</h4>
              <p className="text-gray-400 text-sm">
                If you have any questions about your order, please contact us at{" "}
                <a href="mailto:support@yourstore.com" className="text-blue-400 hover:text-blue-300">
                  support@yourstore.com
                </a>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                onClick={() => router.push("/")}
                className="flex-1"
                variant="outline"
              >
                Continue Shopping
              </Button>
              <Button
                onClick={() => router.push("/cart")}
                className="flex-1"
              >
                View Cart
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">
            You'll receive an email confirmation shortly with all the details.
          </p>
        </div>
      </div>
    </div>
  )
} 