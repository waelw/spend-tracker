import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useQuery, useMutation, useAction } from "convex/react"
import { useState, useRef } from "react"
import { format } from "date-fns"
import { Plus, Trash2, ArrowLeft, Edit2, Calendar, TrendingUp, TrendingDown, DollarSign, Check, X, RefreshCw, ArrowRightLeft, Wallet, Filter, FilterX } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"

// Parse date string as local time (not UTC)
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number)
  return new Date(year, month - 1, day)
}

// Get today's date at midnight in local timezone
function getTodayTimestamp(): number {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
}

// Format currency with Intl
function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch (error) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }
}

import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Default expense categories
const EXPENSE_CATEGORIES = [
  "Food",
  "Transport",
  "Entertainment",
  "Shopping",
  "Bills",
  "Health",
  "Education",
  "Travel",
  "Other",
] as const

export const Route = createFileRoute("/budgets/$budgetId")({
  component: BudgetDetail,
})

function BudgetDetail() {
  const { budgetId } = Route.useParams()
  const navigate = useNavigate()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [showExpenseFilters, setShowExpenseFilters] = useState(false)
  const [expenseFilters, setExpenseFilters] = useState({
    startDate: "",
    endDate: "",
    minAmount: "",
    maxAmount: "",
    search: "",
  })
  const [showIncomeFilters, setShowIncomeFilters] = useState(false)
  const [incomeFilters, setIncomeFilters] = useState({
    startDate: "",
    endDate: "",
    minAmount: "",
    maxAmount: "",
    search: "",
  })
  const nameInputRef = useRef<HTMLInputElement>(null)

  const clientToday = getTodayTimestamp()
  const budget = useQuery(api.budgets.get, { id: budgetId as Id<"budgets"> })
  const dailyLimit = useQuery(api.budgets.getDailyLimit, { budgetId: budgetId as Id<"budgets">, clientToday })
  const dailyBreakdown = useQuery(api.budgets.getDailyBreakdown, { budgetId: budgetId as Id<"budgets">, clientToday })
  const currencies = useQuery(api.budgetCurrencies.listByBudget, {
    budgetId: budgetId as Id<"budgets">,
  })
  const assets = useQuery(api.budgetAssets.listByBudget, {
    budgetId: budgetId as Id<"budgets">,
  })
  const transfers = useQuery(api.budgetAssets.listTransfers, {
    budgetId: budgetId as Id<"budgets">,
  })
  const expenses = useQuery(api.expenses.listByBudget, {
    budgetId: budgetId as Id<"budgets">,
    category: categoryFilter === "all" ? undefined : categoryFilter === "uncategorized" ? "" : categoryFilter,
    startDate: expenseFilters.startDate ? parseLocalDate(expenseFilters.startDate).getTime() : undefined,
    endDate: expenseFilters.endDate ? (() => {
      const date = new Date(expenseFilters.endDate)
      date.setHours(23, 59, 59, 999)
      return date.getTime()
    })() : undefined,
    minAmount: expenseFilters.minAmount ? parseFloat(expenseFilters.minAmount) : undefined,
    maxAmount: expenseFilters.maxAmount ? parseFloat(expenseFilters.maxAmount) : undefined,
    search: expenseFilters.search || undefined,
  })
  const incomeList = useQuery(api.income.listByBudget, {
    budgetId: budgetId as Id<"budgets">,
    startDate: incomeFilters.startDate ? parseLocalDate(incomeFilters.startDate).getTime() : undefined,
    endDate: incomeFilters.endDate ? (() => {
      const date = new Date(incomeFilters.endDate)
      date.setHours(23, 59, 59, 999)
      return date.getTime()
    })() : undefined,
    minAmount: incomeFilters.minAmount ? parseFloat(incomeFilters.minAmount) : undefined,
    maxAmount: incomeFilters.maxAmount ? parseFloat(incomeFilters.maxAmount) : undefined,
    search: incomeFilters.search || undefined,
  })

  const deleteBudgetMutation = useMutation(api.budgets.remove)
  const updateBudgetMutation = useMutation(api.budgets.update)

  const handleDeleteBudget = async () => {
    setIsDeleting(true)
    try {
      await deleteBudgetMutation({ id: budgetId as Id<"budgets"> })
      navigate({ to: "/" })
    } catch (error) {
      console.error("Failed to delete budget:", error)
      setIsDeleting(false)
    }
  }

  const handleStartEditingName = () => {
    setEditedName(budget?.name || "")
    setIsEditingName(true)
    setTimeout(() => nameInputRef.current?.focus(), 0)
  }

  const handleSaveName = async () => {
    try {
      await updateBudgetMutation({
        id: budgetId as Id<"budgets">,
        name: editedName || undefined,
      })
      setIsEditingName(false)
    } catch (error) {
      console.error("Failed to update budget name:", error)
    }
  }

  const handleCancelEditingName = () => {
    setIsEditingName(false)
    setEditedName("")
  }

  if (budget === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (budget === null) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <p className="text-muted-foreground">Budget not found</p>
        <Button variant="outline" onClick={() => navigate({ to: "/" })}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  ref={nameInputRef}
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName()
                    if (e.key === "Escape") handleCancelEditingName()
                  }}
                  className="text-2xl font-bold h-auto py-1"
                  placeholder="Budget name"
                />
                <Button size="icon" variant="ghost" onClick={handleSaveName}>
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button size="icon" variant="ghost" onClick={handleCancelEditingName}>
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ) : (
              <h1
                className="text-2xl font-bold cursor-pointer hover:text-primary transition-colors"
                onDoubleClick={handleStartEditingName}
                title="Double-click to edit"
              >
                {budget.name || "Unnamed Budget"}
              </h1>
            )}
            <p className="text-sm text-muted-foreground">
              {format(new Date(budget.startDate), "MMM d, yyyy")} -{" "}
              {format(new Date(budget.endDate), "MMM d, yyyy")}
            </p>
          </div>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Budget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Budget</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this budget? This will also delete
                all associated currencies and expenses. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="destructive"
                onClick={handleDeleteBudget}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Daily Limit Summary */}
      {dailyLimit && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Today's Budget</CardDescription>
                <CardTitle className="text-2xl text-primary">
                  {formatCurrency(dailyLimit.adjustedDailyLimit, dailyLimit.mainCurrency)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Base: {formatCurrency(dailyLimit.baseDailyLimit, dailyLimit.mainCurrency)}/day
                {dailyLimit.savingsFromPreviousDays > 0 && (
                  <span className="text-green-600 dark:text-green-400">
                    {" "}(+{formatCurrency(dailyLimit.savingsFromPreviousDays, dailyLimit.mainCurrency)} rollover)
                  </span>
                )}
                {dailyLimit.savingsFromPreviousDays < 0 && (
                  <span className="text-destructive">
                    {" "}({formatCurrency(Math.abs(dailyLimit.savingsFromPreviousDays), dailyLimit.mainCurrency)} overspent)
                  </span>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Spent Today</CardDescription>
                <CardTitle className="text-2xl">
                  {formatCurrency(dailyLimit.spentToday, dailyLimit.mainCurrency)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Remaining Today</CardDescription>
                <CardTitle
                  className={`text-2xl ${
                    dailyLimit.remainingToday < 0
                      ? "text-destructive"
                      : "text-green-600 dark:text-green-400"
                  }`}
                >
                  {formatCurrency(dailyLimit.remainingToday, dailyLimit.mainCurrency)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Remaining</CardDescription>
                <CardTitle className="text-2xl">
                  {formatCurrency(dailyLimit.remainingBudget, dailyLimit.mainCurrency)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {dailyLimit.daysLeft} days left
              </CardContent>
            </Card>
          </div>

          {/* Progress bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Budget Progress</span>
                  <span>{((dailyLimit.totalSpent / dailyLimit.effectiveTotalBudget) * 100).toFixed(1)}% spent</span>
                </div>
                <div className="h-3 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${Math.min(100, (dailyLimit.totalSpent / dailyLimit.effectiveTotalBudget) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatCurrency(dailyLimit.totalSpent, dailyLimit.mainCurrency)} spent</span>
                  <span>{formatCurrency(dailyLimit.remainingBudget, dailyLimit.mainCurrency)} left</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Currency Assets */}
      {assets && currencies && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>Currency Assets</CardTitle>
                  <CardDescription>Your available balance in each currency</CardDescription>
                </div>
              </div>
              {currencies.length > 1 && (
                <TransferDialog
                  budgetId={budgetId as Id<"budgets">}
                  assets={assets}
                  currencies={currencies}
                />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assets.map((asset) => {
                const currency = currencies.find((c) => c.currencyCode === asset.currencyCode)
                const rateToMain = currency?.rateToMain ?? 1
                const valueInMain = asset.amount * rateToMain
                const isMainCurrency = asset.currencyCode === budget.mainCurrency

                return (
                  <div
                    key={asset._id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isMainCurrency ? "bg-primary/5 border-primary/20" : "bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="font-medium">
                        {asset.currencyCode}
                        {isMainCurrency && (
                          <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                            Main
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(asset.amount, asset.currencyCode)}
                      </div>
                      {!isMainCurrency && (
                        <div className="text-xs text-muted-foreground">
                          = {formatCurrency(valueInMain, budget.mainCurrency)}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              {assets.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No assets yet. Add currencies and set initial amounts.
                </p>
              )}
            </div>

            {/* Transfer History */}
            {transfers && transfers.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <h4 className="text-sm font-medium mb-3">Recent Transfers</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {transfers.slice(0, 5).map((transfer) => (
                    <div
                      key={transfer._id}
                      className="flex items-center justify-between text-sm p-2 rounded bg-muted/30"
                    >
                      <div className="flex items-center gap-2">
                        <span>{formatCurrency(transfer.fromAmount, transfer.fromCurrency)}</span>
                        <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                        <span>{formatCurrency(transfer.toAmount, transfer.toCurrency)}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(transfer.date), "MMM d")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Budget Balance Chart */}
      {dailyBreakdown && dailyLimit && (
        <Card>
          <CardHeader>
            <CardTitle>Budget Balance</CardTitle>
            <CardDescription>Track how your balance changes with expenses and income</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={(() => {
                    // Calculate running balance for each day
                    // Start with initial budget (before any income)
                    let runningBalance = dailyBreakdown.initialBudget
                    let cumulativeIncome = 0

                    const chartData = dailyBreakdown.days
                      .filter(d => d.isPast || d.isToday)
                      .map((d, index) => {
                        // Add income first, then subtract expenses
                        runningBalance = runningBalance + d.income - d.spent
                        cumulativeIncome += d.income

                        // Expected balance is based on effective budget (with all income)
                        // minus expected spending up to this day
                        const expectedBalance = dailyLimit.effectiveTotalBudget - (dailyBreakdown.baseDailyLimit * (index + 1))

                        return {
                          date: format(new Date(d.date), "MMM d"),
                          balance: runningBalance,
                          spent: d.spent,
                          income: d.income,
                          expectedBalance,
                        }
                      })

                    // Add starting point
                    return [
                      {
                        date: "Start",
                        balance: dailyBreakdown.initialBudget,
                        spent: 0,
                        income: 0,
                        expectedBalance: dailyLimit.effectiveTotalBudget,
                      },
                      ...chartData,
                    ]
                  })()}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    tickFormatter={(value) => {
                      if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
                      return value.toFixed(0)
                    }}
                    width={60}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const balance = payload.find(p => p.dataKey === "balance")?.value as number
                        const expected = payload.find(p => p.dataKey === "expectedBalance")?.value as number
                        const spent = payload.find(p => p.dataKey === "spent")?.value as number
                        const income = payload.find(p => p.dataKey === "income")?.value as number
                        const diff = balance - expected
                        return (
                          <div className="bg-popover border rounded-lg shadow-lg p-3 space-y-1">
                            <p className="font-medium">{label}</p>
                            <p className="text-sm text-green-600">
                              Balance: {formatCurrency(balance, dailyBreakdown.mainCurrency)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Expected: {formatCurrency(expected, dailyBreakdown.mainCurrency)}
                            </p>
                            {income > 0 && (
                              <p className="text-sm text-green-600">
                                +{formatCurrency(income, dailyBreakdown.mainCurrency)} income
                              </p>
                            )}
                            {spent > 0 && (
                              <p className="text-sm text-destructive">
                                -{formatCurrency(spent, dailyBreakdown.mainCurrency)} spent
                              </p>
                            )}
                            <p className={`text-sm font-medium ${diff >= 0 ? "text-green-600" : "text-destructive"}`}>
                              {diff >= 0 ? "+" : ""}{formatCurrency(diff, dailyBreakdown.mainCurrency)} vs expected
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="expectedBalance"
                    stroke="#3b82f6"
                    strokeDasharray="5 5"
                    fillOpacity={1}
                    fill="url(#colorExpected)"
                    name="Expected Balance"
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorBalance)"
                    name="Actual Balance"
                  />
                  <ReferenceLine
                    y={0}
                    stroke="#ef4444"
                    strokeWidth={2}
                    label={{ value: "Zero", position: "right", fill: "#ef4444", fontSize: 12 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Actual Balance</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500 opacity-50" />
                <span>Expected Balance</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Breakdown */}
      {dailyBreakdown && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle>Daily Breakdown</CardTitle>
            </div>
            <CardDescription>
              Day-by-day spending limits with rollover. Base daily limit: {formatCurrency(dailyBreakdown.baseDailyLimit, dailyBreakdown.mainCurrency)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {dailyBreakdown.days.map((day) => (
                <div
                  key={day.date}
                  className={`p-3 rounded-lg border ${
                    day.isToday
                      ? "bg-primary/10 border-primary"
                      : day.isPast
                      ? "bg-muted/50"
                      : "bg-background"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`text-sm font-medium ${day.isToday ? "text-primary" : ""}`}>
                        {format(new Date(day.date), "EEE, MMM d")}
                        {day.isToday && (
                          <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                            Today
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatCurrency(day.dailyLimit, dailyBreakdown.mainCurrency)}
                        {day.dailyLimitSecondary !== null && dailyBreakdown.secondaryCurrency && (
                          <span className="text-muted-foreground ml-2">
                            ({formatCurrency(day.dailyLimitSecondary, dailyBreakdown.secondaryCurrency)})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">
                        Spent: <span className="text-foreground">{formatCurrency(day.spent, dailyBreakdown.mainCurrency)}</span>
                      </span>
                      {(day.isPast || day.isToday) && (
                        <span className={day.remaining >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}>
                          {day.remaining >= 0 ? (
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              +{formatCurrency(day.remaining, dailyBreakdown.mainCurrency)} saved
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <TrendingDown className="h-3 w-3" />
                              {formatCurrency(Math.abs(day.remaining), dailyBreakdown.mainCurrency)} over
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    {day.isFuture && (
                      <span className="text-muted-foreground text-xs">
                        Available to spend
                      </span>
                    )}
                  </div>
                  {/* Progress bar for each day */}
                  {(day.isPast || day.isToday) && day.dailyLimit > 0 && (
                    <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          day.spent > day.dailyLimit ? "bg-destructive" : "bg-primary"
                        }`}
                        style={{ width: `${Math.min(100, (day.spent / day.dailyLimit) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Currencies Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Currencies</CardTitle>
                <CardDescription>
                  Manage exchange rates for this budget
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <UpdateRatesButton
                  budgetId={budgetId as Id<"budgets">}
                  hasNonMainCurrencies={currencies ? currencies.some(c => c.currencyCode !== budget.mainCurrency) : false}
                />
                <AddCurrencyDialog budgetId={budgetId as Id<"budgets">} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Currency</TableHead>
                  <TableHead>Rate to {budget.mainCurrency}</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currencies?.map((currency) => (
                  <CurrencyRow
                    key={currency._id}
                    currency={currency}
                    isMain={currency.currencyCode === budget.mainCurrency}
                  />
                ))}
              </TableBody>
            </Table>

            {/* Switch Main Currency */}
            {currencies && currencies.length > 1 && (
              <SwitchMainCurrencyForm
                budgetId={budgetId as Id<"budgets">}
                currencies={currencies}
                currentMainCurrency={budget.mainCurrency}
              />
            )}
          </CardContent>
        </Card>

        {/* Add Expense Section */}
        <Card>
          <CardHeader>
            <CardTitle>Add Expense</CardTitle>
            <CardDescription>Record a new expense</CardDescription>
          </CardHeader>
          <CardContent>
            <AddExpenseForm
              budgetId={budgetId as Id<"budgets">}
              currencies={currencies || []}
              assets={assets || []}
            />
          </CardContent>
        </Card>

        {/* Add Income Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <CardTitle>Add Income</CardTitle>
                <CardDescription>Add extra funds to your budget</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <AddIncomeForm
              budgetId={budgetId as Id<"budgets">}
              currencies={currencies || []}
            />
          </CardContent>
        </Card>
      </div>

      {/* Income List */}
      {incomeList && incomeList.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <CardTitle>Income</CardTitle>
                  <CardDescription>Additional funds added to this budget</CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowIncomeFilters(!showIncomeFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </div>
            {showIncomeFilters && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Advanced Filters</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIncomeFilters({ startDate: "", endDate: "", minAmount: "", maxAmount: "", search: "" })
                    }}
                    className="text-xs"
                  >
                    <FilterX className="mr-1 h-3 w-3" />
                    Clear All
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="search-income">Search Description</Label>
                    <Input
                      id="search-income"
                      placeholder="e.g., salary, bonus"
                      value={incomeFilters.search}
                      onChange={(e) => setIncomeFilters({ ...incomeFilters, search: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date Range</Label>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={incomeFilters.startDate}
                        onChange={(e) => setIncomeFilters({ ...incomeFilters, startDate: e.target.value })}
                        placeholder="From"
                      />
                      <Input
                        type="date"
                        value={incomeFilters.endDate}
                        onChange={(e) => setIncomeFilters({ ...incomeFilters, endDate: e.target.value })}
                        placeholder="To"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount Range</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Min"
                        value={incomeFilters.minAmount}
                        onChange={(e) => setIncomeFilters({ ...incomeFilters, minAmount: e.target.value })}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Max"
                        value={incomeFilters.maxAmount}
                        onChange={(e) => setIncomeFilters({ ...incomeFilters, maxAmount: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px] sm:w-auto">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-[50px] sm:w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomeList.map((income) => (
                  <IncomeRow key={income._id} income={income} currencies={currencies || []} />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>Expenses</CardTitle>
              <CardDescription>All expenses for this budget</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {expenses && expenses.length > 0 && (
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="uncategorized">Uncategorized</SelectItem>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExpenseFilters(!showExpenseFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </div>
          </div>
          {showExpenseFilters && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Advanced Filters</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setExpenseFilters({ startDate: "", endDate: "", minAmount: "", maxAmount: "", search: "" })
                  }}
                  className="text-xs"
                >
                  <FilterX className="mr-1 h-3 w-3" />
                  Clear All
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search-expense">Search Description</Label>
                  <Input
                    id="search-expense"
                    placeholder="e.g., grocery, coffee"
                    value={expenseFilters.search}
                    onChange={(e) => setExpenseFilters({ ...expenseFilters, search: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={expenseFilters.startDate}
                      onChange={(e) => setExpenseFilters({ ...expenseFilters, startDate: e.target.value })}
                      placeholder="From"
                    />
                    <Input
                      type="date"
                      value={expenseFilters.endDate}
                      onChange={(e) => setExpenseFilters({ ...expenseFilters, endDate: e.target.value })}
                      placeholder="To"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Amount Range</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Min"
                      value={expenseFilters.minAmount}
                      onChange={(e) => setExpenseFilters({ ...expenseFilters, minAmount: e.target.value })}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Max"
                      value={expenseFilters.maxAmount}
                      onChange={(e) => setExpenseFilters({ ...expenseFilters, maxAmount: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {expenses && expenses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px] sm:w-auto">Date</TableHead>
                  <TableHead className="hidden sm:table-cell">Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-[50px] sm:w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <ExpenseRow key={expense._id} expense={expense} currencies={currencies || []} />
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No expenses recorded yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function UpdateRatesButton({
  budgetId,
  hasNonMainCurrencies,
}: {
  budgetId: Id<"budgets">
  hasNonMainCurrencies: boolean
}) {
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

function AddCurrencyDialog({ budgetId }: { budgetId: Id<"budgets"> }) {
  const [open, setOpen] = useState(false)
  const [currencyCode, setCurrencyCode] = useState("")
  const [rateToMain, setRateToMain] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  const addCurrencyMutation = useMutation(api.budgetCurrencies.add)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const rate = parseFloat(rateToMain)
    if (isNaN(rate) || rate <= 0) return

    setIsAdding(true)
    try {
      await addCurrencyMutation({
        budgetId,
        currencyCode: currencyCode.toUpperCase(),
        rateToMain: rate,
      })
      setOpen(false)
      setCurrencyCode("")
      setRateToMain("")
    } catch (error) {
      console.error("Failed to add currency:", error)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Currency
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Currency</DialogTitle>
          <DialogDescription>
            Add a new currency with its exchange rate to the main currency.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currencyCode">Currency Code</Label>
            <Input
              id="currencyCode"
              placeholder="e.g., EUR"
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
              maxLength={3}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rateToMain">Exchange Rate to Main Currency</Label>
            <Input
              id="rateToMain"
              type="number"
              step="0.0001"
              min="0"
              placeholder="e.g., 1.08"
              value={rateToMain}
              onChange={(e) => setRateToMain(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              1 unit of this currency equals how many units of the main currency?
            </p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isAdding}>
              {isAdding ? "Adding..." : "Add Currency"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CurrencyRow({
  currency,
  isMain,
}: {
  currency: {
    _id: Id<"budgetCurrencies">
    currencyCode: string
    rateToMain: number
  }
  isMain: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [newRate, setNewRate] = useState(currency.rateToMain.toString())
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const updateRateMutation = useMutation(api.budgetCurrencies.updateRate)
  const deleteCurrencyMutation = useMutation(api.budgetCurrencies.remove)

  const handleUpdateRate = async () => {
    setIsUpdating(true)
    try {
      await updateRateMutation({
        id: currency._id,
        rateToMain: parseFloat(newRate),
      })
      setEditing(false)
    } catch (error) {
      console.error("Failed to update rate:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteCurrencyMutation({ id: currency._id })
    } catch (error) {
      console.error("Failed to delete currency:", error)
      setIsDeleting(false)
    }
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{currency.currencyCode}</TableCell>
      <TableCell>
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.0001"
              min="0"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              className="w-24"
            />
            <Button size="sm" onClick={handleUpdateRate} disabled={isUpdating}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          currency.rateToMain
        )}
      </TableCell>
      <TableCell>
        {!isMain && !editing && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setEditing(true)}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
        {isMain && <span className="text-xs text-muted-foreground">Main</span>}
      </TableCell>
    </TableRow>
  )
}

function SwitchMainCurrencyForm({
  budgetId,
  currencies,
  currentMainCurrency,
}: {
  budgetId: Id<"budgets">
  currencies: { currencyCode: string }[]
  currentMainCurrency: string
}) {
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

function AddExpenseForm({
  budgetId,
  currencies,
  assets,
}: {
  budgetId: Id<"budgets">
  currencies: { currencyCode: string }[]
  assets: { currencyCode: string; amount: number }[]
}) {
  const [amount, setAmount] = useState("")
  const [currencyCode, setCurrencyCode] = useState(currencies[0]?.currencyCode || "")
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addExpenseMutation = useMutation(api.expenses.add)
  const today = format(new Date(), "yyyy-MM-dd")

  // Get current asset balance for selected currency
  const currentAsset = assets.find((a) => a.currencyCode === currencyCode)
  const availableBalance = currentAsset?.amount ?? 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) return

    // Validate date is not in the future
    if (date > today) {
      setError("Cannot add expenses for future dates")
      return
    }

    setIsAdding(true)
    try {
      await addExpenseMutation({
        budgetId,
        amount: amountNum,
        currencyCode,
        date: parseLocalDate(date).getTime(),
        description: description || undefined,
        category: category || undefined,
      })
      setAmount("")
      setDescription("")
      setCategory("")
      setDate(format(new Date(), "yyyy-MM-dd"))
    } catch (err) {
      console.error("Failed to add expense:", err)
      setError(err instanceof Error ? err.message : "Failed to add expense")
    } finally {
      setIsAdding(false)
    }
  }

  // Update currency when currencies list changes
  if (currencies.length > 0 && !currencies.find((c) => c.currencyCode === currencyCode)) {
    setCurrencyCode(currencies[0].currencyCode)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expense-amount">Amount</Label>
          <Input
            id="expense-amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expense-currency">Currency</Label>
          <Select value={currencyCode} onValueChange={setCurrencyCode}>
            <SelectTrigger id="expense-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((c) => {
                const asset = assets.find((a) => a.currencyCode === c.currencyCode)
                return (
                  <SelectItem key={c.currencyCode} value={c.currencyCode}>
                    {c.currencyCode} ({formatCurrency(asset?.amount ?? 0, c.currencyCode)})
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          <p className={`text-xs ${availableBalance > 0 ? "text-muted-foreground" : "text-destructive"}`}>
            Available: {formatCurrency(availableBalance, currencyCode)}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expense-date">Date</Label>
          <Input
            id="expense-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={today}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expense-category">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="expense-category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="expense-description">Description (optional)</Label>
        <Input
          id="expense-description"
          placeholder="e.g., Groceries"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isAdding || currencies.length === 0}>
        {isAdding ? "Adding..." : "Add Expense"}
      </Button>
    </form>
  )
}

function ExpenseRow({
  expense,
  currencies,
}: {
  expense: {
    _id: Id<"expenses">
    amount: number
    currencyCode: string
    date: number
    description?: string
    category?: string
  }
  currencies: { currencyCode: string }[]
}) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editAmount, setEditAmount] = useState(expense.amount.toString())
  const [editCurrency, setEditCurrency] = useState(expense.currencyCode)
  const [editDate, setEditDate] = useState(format(new Date(expense.date), "yyyy-MM-dd"))
  const [editDescription, setEditDescription] = useState(expense.description || "")
  const [editCategory, setEditCategory] = useState(expense.category || "")
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteExpenseMutation = useMutation(api.expenses.remove)
  const updateExpenseMutation = useMutation(api.expenses.update)
  const today = format(new Date(), "yyyy-MM-dd")

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteExpenseMutation({ id: expense._id })
    } catch (error) {
      console.error("Failed to delete expense:", error)
      setIsDeleting(false)
    }
  }

  const handleStartEdit = () => {
    setEditAmount(expense.amount.toString())
    setEditCurrency(expense.currencyCode)
    setEditDate(format(new Date(expense.date), "yyyy-MM-dd"))
    setEditDescription(expense.description || "")
    setEditCategory(expense.category || "")
    setError(null)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setError(null)
  }

  const handleSaveEdit = async () => {
    setError(null)
    const amountNum = parseFloat(editAmount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be greater than 0")
      return
    }

    if (editDate > today) {
      setError("Cannot set expense for future dates")
      return
    }

    setIsUpdating(true)
    try {
      await updateExpenseMutation({
        id: expense._id,
        amount: amountNum,
        currencyCode: editCurrency,
        date: parseLocalDate(editDate).getTime(),
        description: editDescription || undefined,
        category: editCategory || undefined,
      })
      setIsEditing(false)
    } catch (err) {
      console.error("Failed to update expense:", err)
      setError(err instanceof Error ? err.message : "Failed to update expense")
    } finally {
      setIsUpdating(false)
    }
  }

  if (isEditing) {
    return (
      <TableRow>
        <TableCell colSpan={5} className="p-2">
          <div className="space-y-3 p-2 bg-muted/50 rounded-lg">
            {error && (
              <div className="p-2 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor={`edit-expense-amount-${expense._id}`} className="text-xs">Amount</Label>
                <Input
                  id={`edit-expense-amount-${expense._id}`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`edit-expense-currency-${expense._id}`} className="text-xs">Currency</Label>
                <Select value={editCurrency} onValueChange={setEditCurrency}>
                  <SelectTrigger id={`edit-expense-currency-${expense._id}`} className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c.currencyCode} value={c.currencyCode}>
                        {c.currencyCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor={`edit-expense-date-${expense._id}`} className="text-xs">Date</Label>
                <Input
                  id={`edit-expense-date-${expense._id}`}
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  max={today}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`edit-expense-category-${expense._id}`} className="text-xs">Category</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger id={`edit-expense-category-${expense._id}`} className="h-8">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`edit-expense-desc-${expense._id}`} className="text-xs">Description</Label>
              <Input
                id={`edit-expense-desc-${expense._id}`}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Optional"
                className="h-8"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                disabled={isUpdating}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={isUpdating}
              >
                <Check className="h-4 w-4 mr-1" />
                {isUpdating ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <TableRow>
      <TableCell className="whitespace-nowrap">
        <span className="hidden sm:inline">{format(new Date(expense.date), "MMM d, yyyy")}</span>
        <span className="sm:hidden">{format(new Date(expense.date), "M/d")}</span>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        {expense.category ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
            {expense.category}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="max-w-[120px] truncate sm:max-w-none">
        {expense.description || "-"}
        {expense.category && (
          <span className="sm:hidden text-xs text-muted-foreground ml-1">
            ({expense.category})
          </span>
        )}
      </TableCell>
      <TableCell className="text-right font-medium whitespace-nowrap">
        {formatCurrency(expense.amount, expense.currencyCode)}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleStartEdit}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function AddIncomeForm({
  budgetId,
  currencies,
}: {
  budgetId: Id<"budgets">
  currencies: { currencyCode: string }[]
}) {
  const [amount, setAmount] = useState("")
  const [currencyCode, setCurrencyCode] = useState(currencies[0]?.currencyCode || "")
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [description, setDescription] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addIncomeMutation = useMutation(api.income.add)
  const today = format(new Date(), "yyyy-MM-dd")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) return

    if (date > today) {
      setError("Cannot add income for future dates")
      return
    }

    setIsAdding(true)
    try {
      await addIncomeMutation({
        budgetId,
        amount: amountNum,
        currencyCode,
        date: parseLocalDate(date).getTime(),
        description: description || undefined,
      })
      setAmount("")
      setDescription("")
      setDate(format(new Date(), "yyyy-MM-dd"))
    } catch (err) {
      console.error("Failed to add income:", err)
      setError(err instanceof Error ? err.message : "Failed to add income")
    } finally {
      setIsAdding(false)
    }
  }

  if (currencies.length > 0 && !currencies.find((c) => c.currencyCode === currencyCode)) {
    setCurrencyCode(currencies[0].currencyCode)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="income-amount">Amount</Label>
          <Input
            id="income-amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="income-currency">Currency</Label>
          <Select value={currencyCode} onValueChange={setCurrencyCode}>
            <SelectTrigger id="income-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((c) => (
                <SelectItem key={c.currencyCode} value={c.currencyCode}>
                  {c.currencyCode}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="income-date">Date</Label>
        <Input
          id="income-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={today}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="income-description">Description (optional)</Label>
        <Input
          id="income-description"
          placeholder="e.g., Salary, Gift"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={isAdding || currencies.length === 0}>
        {isAdding ? "Adding..." : "Add Income"}
      </Button>
    </form>
  )
}

function IncomeRow({
  income,
  currencies,
}: {
  income: {
    _id: Id<"income">
    amount: number
    currencyCode: string
    date: number
    description?: string
  }
  currencies: { currencyCode: string }[]
}) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editAmount, setEditAmount] = useState(income.amount.toString())
  const [editCurrency, setEditCurrency] = useState(income.currencyCode)
  const [editDate, setEditDate] = useState(format(new Date(income.date), "yyyy-MM-dd"))
  const [editDescription, setEditDescription] = useState(income.description || "")
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteIncomeMutation = useMutation(api.income.remove)
  const updateIncomeMutation = useMutation(api.income.update)
  const today = format(new Date(), "yyyy-MM-dd")

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteIncomeMutation({ id: income._id })
    } catch (error) {
      console.error("Failed to delete income:", error)
      setIsDeleting(false)
    }
  }

  const handleStartEdit = () => {
    setEditAmount(income.amount.toString())
    setEditCurrency(income.currencyCode)
    setEditDate(format(new Date(income.date), "yyyy-MM-dd"))
    setEditDescription(income.description || "")
    setError(null)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setError(null)
  }

  const handleSaveEdit = async () => {
    setError(null)
    const amountNum = parseFloat(editAmount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be greater than 0")
      return
    }

    if (editDate > today) {
      setError("Cannot set income for future dates")
      return
    }

    setIsUpdating(true)
    try {
      await updateIncomeMutation({
        id: income._id,
        amount: amountNum,
        currencyCode: editCurrency,
        date: parseLocalDate(editDate).getTime(),
        description: editDescription || undefined,
      })
      setIsEditing(false)
    } catch (err) {
      console.error("Failed to update income:", err)
      setError(err instanceof Error ? err.message : "Failed to update income")
    } finally {
      setIsUpdating(false)
    }
  }

  if (isEditing) {
    return (
      <TableRow>
        <TableCell colSpan={4} className="p-2">
          <div className="space-y-3 p-2 bg-muted/50 rounded-lg">
            {error && (
              <div className="p-2 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor={`edit-income-amount-${income._id}`} className="text-xs">Amount</Label>
                <Input
                  id={`edit-income-amount-${income._id}`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`edit-income-currency-${income._id}`} className="text-xs">Currency</Label>
                <Select value={editCurrency} onValueChange={setEditCurrency}>
                  <SelectTrigger id={`edit-income-currency-${income._id}`} className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c.currencyCode} value={c.currencyCode}>
                        {c.currencyCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor={`edit-income-date-${income._id}`} className="text-xs">Date</Label>
                <Input
                  id={`edit-income-date-${income._id}`}
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  max={today}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`edit-income-desc-${income._id}`} className="text-xs">Description</Label>
                <Input
                  id={`edit-income-desc-${income._id}`}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Optional"
                  className="h-8"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                disabled={isUpdating}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={isUpdating}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-1" />
                {isUpdating ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <TableRow>
      <TableCell className="whitespace-nowrap">
        <span className="hidden sm:inline">{format(new Date(income.date), "MMM d, yyyy")}</span>
        <span className="sm:hidden">{format(new Date(income.date), "M/d")}</span>
      </TableCell>
      <TableCell className="max-w-[120px] truncate sm:max-w-none">{income.description || "-"}</TableCell>
      <TableCell className="text-right font-medium text-green-600 whitespace-nowrap">
        +{formatCurrency(income.amount, income.currencyCode)}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleStartEdit}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function TransferDialog({
  budgetId,
  assets,
  currencies,
}: {
  budgetId: Id<"budgets">
  assets: { _id: Id<"budgetAssets">; currencyCode: string; amount: number }[]
  currencies: { currencyCode: string; rateToMain: number }[]
}) {
  const [open, setOpen] = useState(false)
  const [fromCurrency, setFromCurrency] = useState(assets[0]?.currencyCode || "")
  const [toCurrency, setToCurrency] = useState(assets[1]?.currencyCode || assets[0]?.currencyCode || "")
  const [amount, setAmount] = useState("")
  const [isTransferring, setIsTransferring] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const transferMutation = useMutation(api.budgetAssets.transfer)

  const fromAsset = assets.find((a) => a.currencyCode === fromCurrency)
  const fromRate = currencies.find((c) => c.currencyCode === fromCurrency)?.rateToMain ?? 1
  const toRate = currencies.find((c) => c.currencyCode === toCurrency)?.rateToMain ?? 1

  const amountNum = parseFloat(amount) || 0
  const exchangeRate = fromRate / toRate
  const toAmount = amountNum * exchangeRate

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (fromCurrency === toCurrency) {
      setError("Cannot transfer to the same currency")
      return
    }

    if (amountNum <= 0) {
      setError("Amount must be greater than 0")
      return
    }

    if (fromAsset && amountNum > fromAsset.amount) {
      setError(`Insufficient balance. Available: ${fromAsset.amount.toFixed(2)} ${fromCurrency}`)
      return
    }

    setIsTransferring(true)
    try {
      await transferMutation({
        budgetId,
        fromCurrency,
        toCurrency,
        fromAmount: amountNum,
      })
      setOpen(false)
      setAmount("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to transfer")
    } finally {
      setIsTransferring(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ArrowRightLeft className="mr-2 h-4 w-4" />
          Transfer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Between Currencies</DialogTitle>
          <DialogDescription>
            Convert funds from one currency to another using the current exchange rates.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>From</Label>
            <div className="flex gap-2">
              <Select value={fromCurrency} onValueChange={setFromCurrency}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((a) => (
                    <SelectItem key={a.currencyCode} value={a.currencyCode}>
                      {a.currencyCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1"
              />
            </div>
            {fromAsset && (
              <p className="text-xs text-muted-foreground">
                Available: {formatCurrency(fromAsset.amount, fromCurrency)}
              </p>
            )}
          </div>

          <div className="flex justify-center">
            <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <Label>To</Label>
            <div className="flex gap-2">
              <Select value={toCurrency} onValueChange={setToCurrency}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((a) => (
                    <SelectItem key={a.currencyCode} value={a.currencyCode}>
                      {a.currencyCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="text"
                value={amountNum > 0 ? toAmount.toFixed(2) : ""}
                disabled
                placeholder="You'll receive"
                className="flex-1 bg-muted"
              />
            </div>
            {fromCurrency !== toCurrency && amountNum > 0 && (
              <p className="text-xs text-muted-foreground">
                Rate: 1 {fromCurrency} = {exchangeRate.toFixed(4)} {toCurrency}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isTransferring}>
              {isTransferring ? "Transferring..." : "Transfer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
