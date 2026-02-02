import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useQuery, useMutation } from "convex/react"
import { useState, useRef } from "react"
import { format } from "date-fns"
import { ArrowLeft, Check, X, Calendar, TrendingUp, TrendingDown, DollarSign, ArrowRightLeft, Wallet, Filter, FilterX, Repeat, Trash2 } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"

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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { formatCurrency } from "@/lib/currency-utils"
import { parseLocalDate, getTodayTimestamp } from "@/lib/date-utils"
import { EXPENSE_CATEGORIES } from "@/constants/categories"

import {
  CurrencyRow,
  AddCurrencyDialog,
  SwitchMainCurrencyForm,
  UpdateRatesButton,
  ExpenseRow,
  AddExpenseForm,
  IncomeRow,
  AddIncomeForm,
  RecurringItemRow,
  AddRecurringItemDialog,
  TransferDialog,
  ExportCsvButton,
  DuplicateBudgetDialog,
} from "@/components/budget"

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
  const recurringItems = useQuery(api.recurringItems.listByBudget, {
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
      {/* Header */}
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
        <div className="flex gap-2">
          <DuplicateBudgetDialog budgetId={budgetId as Id<"budgets">} />
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
              <div className="flex items-center gap-2">
                <ExportCsvButton budgetId={budgetId as Id<"budgets">} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowIncomeFilters(!showIncomeFilters)}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                </Button>
              </div>
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

      {/* Recurring Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Recurring Items</CardTitle>
                <CardDescription>Automatic expenses and income that repeat on a schedule</CardDescription>
              </div>
            </div>
            <AddRecurringItemDialog budgetId={budgetId as Id<"budgets">} currencies={currencies || []} />
          </div>
        </CardHeader>
        <CardContent>
          {recurringItems && recurringItems.length > 0 ? (
            <div className="space-y-3">
              {recurringItems.map((item) => (
                <RecurringItemRow
                  key={item._id}
                  item={item}
                  currencies={currencies || []}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No recurring items set up yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Expenses List */}
      <Card>
        <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle>Expenses</CardTitle>
                <CardDescription>All expenses for this budget</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <ExportCsvButton budgetId={budgetId as Id<"budgets">} />
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
