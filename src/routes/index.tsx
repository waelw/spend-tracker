import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { convexQuery } from "@convex-dev/react-query"
import { SignedIn, SignedOut } from "@clerk/tanstack-react-start"
import { format } from "date-fns"
import { Plus, Wallet } from "lucide-react"

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
  const { data: budgets, isLoading } = useQuery(convexQuery(api.budgets.list, {}))

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Your Budgets</h1>
        <Button asChild>
          <Link to="/budgets/new">
            <Plus className="mr-2 h-4 w-4" />
            New Budget
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {budgets.map((budget) => (
          <BudgetCard key={budget._id} budget={budget} />
        ))}
      </div>
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
    totalAmount: number
    mainCurrency: string
  }
}) {
  const clientToday = getTodayTimestamp()
  const { data: dailyLimit } = useQuery(
    convexQuery(api.budgets.getDailyLimit, { budgetId: budget._id as any, clientToday })
  )
  const {data:incomes}= useQuery(convexQuery(api.income.listByBudget, { budgetId: budget._id as any }))
  const totalIncomes = incomes?.reduce((sum, income) => sum + income.amount, 0) ?? 0

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
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Budget</span>
              <span className="font-medium">
                {formatCurrency(budget.totalAmount+totalIncomes, budget.mainCurrency)}
              </span>
            </div>
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
