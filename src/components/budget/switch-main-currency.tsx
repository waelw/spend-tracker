import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface SwitchMainCurrencyFormProps {
  budgetId: Id<"budgets">
  currencies: { currencyCode: string }[]
  currentMainCurrency: string
}

export function SwitchMainCurrencyForm({
  budgetId,
  currencies,
  currentMainCurrency,
}: SwitchMainCurrencyFormProps) {
  const [selectedCurrency, setSelectedCurrency] = useState(currentMainCurrency)
  const [isSwitching, setIsSwitching] = useState(false)

  const switchMainCurrencyMutation = useMutation(api.budgets.switchMainCurrency)

  const handleSwitch = async () => {
    if (selectedCurrency === currentMainCurrency) return

    setIsSwitching(true)
    try {
      await switchMainCurrencyMutation({
        id: budgetId,
        newMainCurrency: selectedCurrency,
      })
    } catch (error) {
      console.error("Failed to switch main currency:", error)
    } finally {
      setIsSwitching(false)
    }
  }

  const otherCurrencies = currencies.filter(c => c.currencyCode !== currentMainCurrency)

  if (otherCurrencies.length === 0) return null

  return (
    <div className="pt-4 border-t">
      <Label className="text-sm font-medium">Switch Main Currency</Label>
      <p className="text-xs text-muted-foreground mb-2">
        Change the primary currency. All amounts will be converted.
      </p>
      <div className="flex gap-2">
        <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {currencies.map((c) => (
              <SelectItem key={c.currencyCode} value={c.currencyCode}>
                {c.currencyCode} {c.currencyCode === currentMainCurrency && "(current)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={handleSwitch}
          disabled={isSwitching || selectedCurrency === currentMainCurrency}
          variant="outline"
        >
          {isSwitching ? "Switching..." : "Switch"}
        </Button>
      </div>
    </div>
  )
}
