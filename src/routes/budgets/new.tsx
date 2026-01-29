import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useMutation } from "convex/react"
import { useState } from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

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
  const [totalAmount, setTotalAmount] = useState("")
  const [mainCurrency, setMainCurrency] = useState("USD")
  const [isCreating, setIsCreating] = useState(false)

  const createBudgetMutation = useMutation(api.budgets.create)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(totalAmount)
    if (isNaN(amount) || amount <= 0) {
      return
    }

    setIsCreating(true)
    try {
      const budgetId = await createBudgetMutation({
        name: name || undefined,
        startDate: parseLocalDate(startDate).getTime(),
        endDate: parseLocalDate(endDate).getTime(),
        totalAmount: amount,
        mainCurrency: mainCurrency.toUpperCase(),
      })
      navigate({ to: "/budgets/$budgetId", params: { budgetId } })
    } catch (error) {
      console.error("Failed to create budget:", error)
      setIsCreating(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create New Budget</CardTitle>
          <CardDescription>
            Set up a new budget with your spending limits and date range.
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalAmount">Total Budget Amount</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mainCurrency">Main Currency</Label>
                <Input
                  id="mainCurrency"
                  placeholder="USD"
                  value={mainCurrency}
                  onChange={(e) => setMainCurrency(e.target.value)}
                  maxLength={3}
                  required
                />
              </div>
            </div>

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
