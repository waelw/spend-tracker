import { useState } from "react"
import { RefreshCw } from "lucide-react"
import { useAction } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"

interface UpdateRatesButtonProps {
  budgetId: Id<"budgets">
  hasNonMainCurrencies: boolean
}

export function UpdateRatesButton({
  budgetId,
  hasNonMainCurrencies,
}: UpdateRatesButtonProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const refreshRatesAction = useAction(api.currencyRates.refreshRates)

  const handleUpdateRates = async () => {
    setIsUpdating(true)
    setMessage(null)

    try {
      const result = await refreshRatesAction({ budgetId })
      setMessage({
        type: result.success ? "success" : "error",
        text: result.message,
      })
      // Clear success message after 3 seconds
      if (result.success) {
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to update rates. Please try again.",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  // Don't show button if there are no non-main currencies
  if (!hasNonMainCurrencies) {
    return null
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={handleUpdateRates}
        disabled={isUpdating}
      >
        <RefreshCw className={`mr-2 h-4 w-4 ${isUpdating ? "animate-spin" : ""}`} />
        {isUpdating ? "Updating..." : "Update Rates"}
      </Button>
      {message && (
        <div
          className={`absolute top-full right-0 mt-2 p-2 rounded-md text-sm whitespace-nowrap z-10 ${
            message.type === "success"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}
