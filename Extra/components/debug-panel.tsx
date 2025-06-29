"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react"

export function DebugPanel() {
  const [testResult, setTestResult] = useState<any>(null)
  const [testing, setTesting] = useState(false)

  const testConnection = async () => {
    setTesting(true)
    try {
      const response = await fetch("/api/test-printify")
      const result = await response.json()
      setTestResult(result)
    } catch (error) {
      setTestResult({
        success: false,
        error: "Failed to test connection",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 bg-dark-800 border border-dark-600 rounded-lg p-4 max-w-md">
      <h3 className="text-lg font-semibold text-gray-100 mb-2">Printify Debug</h3>

      <Button onClick={testConnection} disabled={testing} className="w-full mb-3 bg-transparent" variant="outline">
        {testing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Testing...
          </>
        ) : (
          "Test Printify Connection"
        )}
      </Button>

      {testResult && (
        <div
          className={`p-3 rounded-lg border ${
            testResult.success ? "bg-green-900/20 border-green-500" : "bg-red-900/20 border-red-500"
          }`}
        >
          <div className="flex items-center space-x-2 mb-2">
            {testResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            <span className={`font-semibold ${testResult.success ? "text-green-400" : "text-red-400"}`}>
              {testResult.success ? "Success" : "Error"}
            </span>
          </div>

          <p className={`text-sm mb-2 ${testResult.success ? "text-green-300" : "text-red-300"}`}>
            {testResult.message || testResult.error}
          </p>

          {testResult.config && (
            <div className="text-xs text-gray-400 space-y-1">
              <div>API Token: {testResult.config.hasApiToken ? "✓" : "✗"}</div>
              <div>Shop ID: {testResult.config.hasShopId ? "✓" : "✗"}</div>
              {testResult.config.shopId && <div>Shop: {testResult.config.shopId}</div>}
              {testResult.productCount !== undefined && <div>Products: {testResult.productCount}</div>}
            </div>
          )}

          {testResult.details && (
            <details className="mt-2">
              <summary className="text-xs text-gray-400 cursor-pointer">Details</summary>
              <pre className="text-xs text-gray-400 mt-1 whitespace-pre-wrap">
                {JSON.stringify(testResult.details, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
