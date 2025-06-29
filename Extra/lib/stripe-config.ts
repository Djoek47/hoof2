// Stripe configuration for payment processing
export const STRIPE_CONFIG = {
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
  secretKey: process.env.STRIPE_SECRET_KEY || "",
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
}

export const PAYMENT_METHODS = {
  STRIPE: "stripe",
  PAYPAL: "paypal",
  PRINTIFY_MANUAL: "printify_manual",
} as const

export type PaymentMethodType = (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS]
