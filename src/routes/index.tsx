import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useMutation as useConvexMutation } from "convex/react"
import { convexQuery } from "@convex-dev/react-query"
import { SignedIn, SignedOut } from "@clerk/tanstack-react-start"
import { format } from "date-fns"
import { Plus, Wallet, AlertTriangle, Clock, TrendingDown, Bell, Check, CheckCheck, Trash2 } from "lucide-react"
import { useState } from "react"

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
    console.error("Error formatting currency:", error)
    return `${amount.toFixed(2)} ${currency}`
  }
}

import { api } from "../../convex/_generated/api"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export const Route = createFileRoute("/")({
  component: Home,
})

function Home() {
  return (
    <div>
      <SignedOut>
        <WelcomePage />
      </SignedOut>
      <SignedIn>
        <Dashboard />
      </SignedIn>
    </div>
  )
}

function WelcomePage() {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <Wallet className="h-16 w-16 text-muted-foreground" />
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Welcome to Spend Tracker</h1>
        <p className="text-muted-foreground max-w-md">
          Track your budgets across multiple currencies, set daily spending limits,
          and keep your finances under control.
        </p>
      </div>
      <div className="text-sm text-muted-foreground">
        Sign in to get started
      </div>
    </div>
  )
}

function Dashboard() {
  const clientToday = getTodayTimestamp()
  const [alertsOpen, setAlertsOpen] = useState(false)
  const { data: budgets, isLoading } = useQuery(convexQuery(api.budgets.list, {}))
  const { data: summary } = useQuery(
    convexQuery(api.budgets.getDashboardSummary, { clientToday })
  )
  const { data: unreadAlerts } = useQuery(convexQuery(api.alerts.list, {}))
  const { data: allAlerts } = useQuery(convexQuery(api.alerts.listAll, {}))

  const markAsRead = useConvexMutation(api.alerts.markAsRead)
  const markAllAsRead = useConvexMutation(api.alerts.markAllAsRead)
  const removeAlert = useConvexMutation(api.alerts.remove)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading budgets...</div>
      </div>
    )
  }

  if (!budgets || budgets.length === 0) {
    return (
      <div className="flex flex-col  items-center justify-center py-12 space-y-6">
        <Wallet className="h-16 w-16 text-muted-foreground" />
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">No budgets yet</h2>
          <p className="text-muted-foreground">
            Create your first budget to start tracking your spending.
          </p>
        </div>
        <Button asChild>
          <Link to="/budgets/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Budget
          </Link>
        </Button>
      </div>
    )
  }

  const unreadCount = unreadAlerts?.length || 0

  return (
    <div className="space-y-6">
      {summary && <DashboardSummary summary={summary} />}

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Your Budgets</h1>
        <div className="flex items-center gap-2">
          <Dialog open={alertsOpen} onOpenChange={setAlertsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[500px] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Alerts</DialogTitle>
                <DialogDescription>
                  Stay updated on your budget status
                </DialogDescription>
              </DialogHeader>
              {allAlerts && allAlerts.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAllAsRead({})}
                    >
                      <CheckCheck className="mr-2 h-4 w-4" />
                      Mark All Read
                    </Button>
                  </div>
                  {allAlerts.map((alert) => (
                    <div
                      key={alert._id}
                      className={`p-4 rounded-lg border ${
                        alert.isRead ? "bg-muted/50" : "bg-background"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <Link
                            to="/budgets/$budgetId"
                            params={{ budgetId: alert.budgetId }}
                            className="hover:underline"
                            onClick={() => setAlertsOpen(false)}
                          >
                            <p className="text-sm font-medium">{alert.message}</p>
                          </Link>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(alert.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {!alert.isRead && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => markAsRead({ id: alert._id as any })}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeAlert({ id: alert._id as any })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No alerts yet
                </div>
              )}
            </DialogContent>
          </Dialog>
          <Button asChild>
            <Link to="/budgets/new">
              <Plus className="mr-2 h-4 w-4" />
              New Budget
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {budgets.map((budget) => (
          <BudgetCard key={budget._id} budget={budget} />
        ))}
      </div>
    </div>
  )
}

type DashboardSummaryData = {
  budgetCount: number
  overBudgetCount: number
  endingSoonCount: number
  budgets: Array<{
    budgetId: string
    name?: string
    mainCurrency: string
    remainingToday: number
    spentToday: number
    isOverToday: boolean
    endDate: number
  }>
}

function DashboardSummary({ summary }: { summary: DashboardSummaryData }) {
  // Group budgets by currency for totals
  const currencyGroups = summary.budgets.reduce(
    (acc, budget) => {
      const currency = budget.mainCurrency
      if (!acc[currency]) {
        acc[currency] = { remainingToday: 0, spentToday: 0 }
      }
      acc[currency].remainingToday += budget.remainingToday
      acc[currency].spentToday += budget.spentToday
      return acc
    },
    {} as Record<string, { remainingToday: number; spentToday: number }>
  )

  const currencies = Object.keys(currencyGroups)
  const isSingleCurrency = currencies.length === 1
  const singleCurrency = isSingleCurrency ? currencies[0] : null

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {/* Active Budgets */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Active Budgets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.budgetCount}</div>
        </CardContent>
      </Card>

      {/* Remaining Today */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Remaining Today
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSingleCurrency && singleCurrency ? (
            <div
              className={`text-2xl font-bold ${
                currencyGroups[singleCurrency].remainingToday < 0
                  ? "text-destructive"
                  : "text-green-600 dark:text-green-400"
              }`}
            >
              {formatCurrency(
                currencyGroups[singleCurrency].remainingToday,
                singleCurrency
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {currencies.map((currency) => (
                <div
                  key={currency}
                  className={`text-sm font-medium ${
                    currencyGroups[currency].remainingToday < 0
                      ? "text-destructive"
                      : "text-green-600 dark:text-green-400"
                  }`}
                >
                  {currency}: {formatCurrency(currencyGroups[currency].remainingToday, currency)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Over Budget Today */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Over Budget Today
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${
              summary.overBudgetCount > 0 ? "text-destructive" : ""
            }`}
          >
            {summary.overBudgetCount}
          </div>
        </CardContent>
      </Card>

      {/* Ending Soon */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Ending Soon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${
              summary.endingSoonCount > 0 ? "text-amber-600 dark:text-amber-400" : ""
            }`}
          >
            {summary.endingSoonCount}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function BudgetCard({
  budget,
}: {
  budget: {
    _id: string
    name?: string
    startDate: number
    endDate: number
    totalAmount?: number
    mainCurrency: string
  }
}) {
  const clientToday = getTodayTimestamp()
  const { data: dailyLimit } = useQuery(
    convexQuery(api.budgets.getDailyLimit, { budgetId: budget._id as any, clientToday })
  )

  return (
    <Link to="/budgets/$budgetId" params={{ budgetId: budget._id }}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            {budget.name || "Unnamed Budget"}
          </CardTitle>
          <CardDescription>
            {format(new Date(budget.startDate), "MMM d, yyyy")} -{" "}
            {format(new Date(budget.endDate), "MMM d, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {dailyLimit && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Budget</span>
                <span className="font-medium">
                  {formatCurrency(dailyLimit.effectiveTotalBudget, dailyLimit.mainCurrency)}
                </span>
              </div>
            )}
            {dailyLimit && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Today's Limit</span>
                  <span className="font-medium text-primary">
                    {formatCurrency(dailyLimit.adjustedDailyLimit, dailyLimit.mainCurrency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Remaining Today</span>
                  <span
                    className={`font-medium ${
                      dailyLimit.remainingToday < 0
                        ? "text-destructive"
                        : "text-green-600 dark:text-green-400"
                    }`}
                  >
                    {formatCurrency(dailyLimit.remainingToday, dailyLimit.mainCurrency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Days Left</span>
                  <span className="font-medium">{dailyLimit.daysLeft}</span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
