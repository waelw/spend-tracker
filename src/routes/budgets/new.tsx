import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useMutation } from "convex/react"
import { useState } from "react"
import { format } from "date-fns"
import { CalendarIcon, Plus, Trash2 } from "lucide-react"

// Parse date string as local time (not UTC)
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number)
  return new Date(year, month - 1, day)
}

import { api } from "../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface AssetInput {
  id: string
  currencyCode: string
  amount: string
  rateToMain: string
}

export const Route = createFileRoute("/budgets/new")({
  component: NewBudget,
})

function NewBudget() {
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [endDate, setEndDate] = useState(
    format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")
  )
  const [mainCurrency, setMainCurrency] = useState("USD")
  const [assets, setAssets] = useState<AssetInput[]>([
    { id: "1", currencyCode: "USD", amount: "", rateToMain: "1" },
  ])
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createBudgetMutation = useMutation(api.budgets.create)

  const addAsset = () => {
    setAssets([
      ...assets,
      {
        id: Date.now().toString(),
        currencyCode: "",
        amount: "",
        rateToMain: "1",
      },
    ])
  }

  const removeAsset = (id: string) => {
    if (assets.length > 1) {
      setAssets(assets.filter((a) => a.id !== id))
    }
  }

  const updateAsset = (id: string, field: keyof AssetInput, value: string) => {
    setAssets(
      assets.map((a) => {
        if (a.id === id) {
          const updated = { ...a, [field]: value }
          // If updating currency to match main currency, set rate to 1
          if (field === "currencyCode" && value.toUpperCase() === mainCurrency.toUpperCase()) {
            updated.rateToMain = "1"
          }
          return updated
        }
        return a
      })
    )
  }

  const handleMainCurrencyChange = (newMain: string) => {
    const upperMain = newMain.toUpperCase()
    setMainCurrency(newMain)
    // Update rate for any asset that matches the new main currency
    setAssets(
      assets.map((a) => {
        if (a.currencyCode.toUpperCase() === upperMain) {
          return { ...a, rateToMain: "1" }
        }
        return a
      })
    )
  }

  // Calculate total in main currency
  const totalInMainCurrency = assets.reduce((sum, asset) => {
    const amount = parseFloat(asset.amount) || 0
    const rate = parseFloat(asset.rateToMain) || 1
    return sum + amount * rate
  }, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate that main currency has an asset
    const mainAsset = assets.find(
      (a) => a.currencyCode.toUpperCase() === mainCurrency.toUpperCase()
    )
    if (!mainAsset) {
      setError("You must add an asset for the main currency")
      return
    }

    // Validate all assets have valid amounts and currencies
    const validAssets = assets.filter(
      (a) => a.currencyCode.trim() && parseFloat(a.amount) >= 0
    )
    if (validAssets.length === 0) {
      setError("Please add at least one asset with a valid amount")
      return
    }

    setIsCreating(true)
    try {
      const budgetId = await createBudgetMutation({
        name: name || undefined,
        startDate: parseLocalDate(startDate).getTime(),
        endDate: parseLocalDate(endDate).getTime(),
        mainCurrency: mainCurrency.toUpperCase(),
        initialAssets: validAssets.map((a) => ({
          currencyCode: a.currencyCode.toUpperCase(),
          amount: parseFloat(a.amount) || 0,
          rateToMain:
            a.currencyCode.toUpperCase() === mainCurrency.toUpperCase()
              ? undefined
              : parseFloat(a.rateToMain) || 1,
        })),
      })
      navigate({ to: "/budgets/$budgetId", params: { budgetId } })
    } catch (error) {
      console.error("Failed to create budget:", error)
      setError(error instanceof Error ? error.message : "Failed to create budget")
      setIsCreating(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create New Budget</CardTitle>
          <CardDescription>
            Set up a new budget with multiple currency assets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Budget Name (optional)</Label>
              <Input
                id="name"
                placeholder="e.g., Vacation Budget"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="startDate"
                    type="date"
                    className="pl-10"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="endDate"
                    type="date"
                    className="pl-10"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mainCurrency">Main Currency (for display)</Label>
              <Input
                id="mainCurrency"
                placeholder="USD"
                value={mainCurrency}
                onChange={(e) => handleMainCurrencyChange(e.target.value)}
                maxLength={3}
                required
              />
              <p className="text-xs text-muted-foreground">
                Totals and daily limits will be shown in this currency
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Currency Assets</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAsset}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Currency
                </Button>
              </div>

              <div className="space-y-2">
                {assets.map((asset) => {
                  const isMainCurrency =
                    asset.currencyCode.toUpperCase() === mainCurrency.toUpperCase()
                  return (
                    <div
                      key={asset.id}
                      className="flex gap-2 items-start p-3 border rounded-lg bg-muted/30"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Currency</Label>
                            <Input
                              placeholder="USD"
                              value={asset.currencyCode}
                              onChange={(e) =>
                                updateAsset(asset.id, "currencyCode", e.target.value)
                              }
                              maxLength={3}
                              className="uppercase"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Amount</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={asset.amount}
                              onChange={(e) =>
                                updateAsset(asset.id, "amount", e.target.value)
                              }
                            />
                          </div>
                        </div>
                        {!isMainCurrency && asset.currencyCode && (
                          <div>
                            <Label className="text-xs">
                              Rate (1 {asset.currencyCode.toUpperCase() || "?"} ={" "}
                              {asset.rateToMain || "?"} {mainCurrency.toUpperCase()})
                            </Label>
                            <Input
                              type="number"
                              step="0.0001"
                              min="0"
                              placeholder="1.0"
                              value={asset.rateToMain}
                              onChange={(e) =>
                                updateAsset(asset.id, "rateToMain", e.target.value)
                              }
                            />
                          </div>
                        )}
                      </div>
                      {assets.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mt-5"
                          onClick={() => removeAsset(asset.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="text-right text-sm font-medium">
                Total: {totalInMainCurrency.toFixed(2)} {mainCurrency.toUpperCase()}
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate({ to: "/" })}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isCreating}
              >
                {isCreating ? "Creating..." : "Create Budget"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
