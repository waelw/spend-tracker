import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { convexQuery } from "@convex-dev/react-query";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  useUser,
} from "@clerk/tanstack-react-start";
import { format } from "date-fns";
import {
  Plus,
  Wallet,
  AlertTriangle,
  Clock,
  TrendingDown,
  Bell,
  Check,
  CheckCheck,
  Trash2,
} from "lucide-react";
import { useState } from "react";

// Get today's date at midnight in local timezone
function getTodayTimestamp(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

// Format currency with Intl
function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    console.error("Error formatting currency:", error);
    return `${amount.toFixed(2)} ${currency}`;
  }
}

import { api } from "../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/")({
  component: Home,
});

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
  );
}

function WelcomePage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-8 min-h-[80vh]">
      <div className="relative">
        <div className="absolute -inset-4 bg-gradient-to-r from-primary via-accent to-secondary rounded-full opacity-30 blur-2xl animate-pulse"></div>
        <div className="relative bg-card p-6 rounded-3xl border border-border/50 shadow-2xl">
          <Wallet className="h-20 w-20 text-primary" />
        </div>
      </div>

      <div className="max-w-2xl space-y-4">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-secondary">
            Master Your Money
          </span>
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed">
          Track your budgets across multiple currencies with beautiful
          precision. Set limits, get alerts, and stay in control.
        </p>
      </div>

      <div className="flex gap-4 pt-4">
        <SignInButton mode="modal">
          <Button
            size="lg"
            className="rounded-full px-8 text-lg bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all shadow-lg hover:shadow-primary/25"
          >
            Get Started
            <TrendingDown className="ml-2 h-5 w-5" />
          </Button>
        </SignInButton>
      </div>
    </div>
  );
}

function Dashboard() {
  const clientToday = getTodayTimestamp();
  const [alertsOpen, setAlertsOpen] = useState(false);
  const { data: budgets, isLoading } = useQuery(
    convexQuery(api.budgets.list, {}),
  );
  const { data: summary } = useQuery(
    convexQuery(api.budgets.getDashboardSummary, { clientToday }),
  );
  const { data: unreadAlerts } = useQuery(convexQuery(api.alerts.list, {}));
  const { data: allAlerts } = useQuery(convexQuery(api.alerts.listAll, {}));

  const markAsRead = useConvexMutation(api.alerts.markAsRead);
  const markAllAsRead = useConvexMutation(api.alerts.markAllAsRead);
  const removeAlert = useConvexMutation(api.alerts.remove);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">
          Loading budgets...
        </div>
      </div>
    );
  }

  if (!budgets || budgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-primary to-secondary rounded-full opacity-20 blur-xl animate-pulse"></div>
          <div className="relative bg-card p-6 rounded-full border shadow-2xl">
            <Wallet className="h-16 w-16 text-primary" />
          </div>
        </div>
        <div className="text-center space-y-3 max-w-md">
          <h2 className="text-3xl font-bold tracking-tight">
            Let's Get Started
          </h2>
          <p className="text-muted-foreground text-lg">
            Create your first budget to start tracking your spending with style.
          </p>
        </div>
        <Button
          asChild
          size="lg"
          className="rounded-full shadow-lg hover:shadow-primary/25 transition-all"
        >
          <Link to="/budgets/new">
            <Plus className="mr-2 h-5 w-5" />
            Create First Budget
          </Link>
        </Button>
      </div>
    );
  }

  const unreadCount = unreadAlerts?.length || 0;
  const { user } = useUser();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Greeting Section */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            {greeting},{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              {user?.firstName || "Friend"}
            </span>
          </h1>
          <p className="text-muted-foreground text-lg">
            {format(new Date(), "EEEE, MMMM do")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={alertsOpen} onOpenChange={setAlertsOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="relative rounded-full h-10 w-10 border-muted hover:border-primary/50 transition-colors shadow-sm"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-white text-[10px] flex items-center justify-center animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[500px] overflow-y-auto glass border-0 shadow-2xl">
              <DialogHeader>
                <DialogTitle>Notifications</DialogTitle>
                <DialogDescription>
                  Your latest budget updates
                </DialogDescription>
              </DialogHeader>
              {allAlerts && allAlerts.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAllAsRead({})}
                      className="text-primary hover:text-primary/80"
                    >
                      <CheckCheck className="mr-2 h-4 w-4" />
                      Mark All Read
                    </Button>
                  </div>
                  {allAlerts.map((alert) => (
                    <div
                      key={alert._id}
                      className={`p-4 rounded-xl border transition-colors ${alert.isRead
                        ? "bg-background/40 border-border/50"
                        : "bg-card border-primary/20 shadow-sm"
                        }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <Link
                            to="/budgets/$budgetId"
                            params={{ budgetId: alert.budgetId }}
                            className="hover:text-primary transition-colors block group"
                            onClick={() => setAlertsOpen(false)}
                          >
                            <p className="text-sm font-medium group-hover:underline decoration-primary/50">
                              {alert.message}
                            </p>
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
                              className="h-7 w-7 hover:bg-primary/10 hover:text-primary"
                              onClick={() =>
                                markAsRead({ id: alert._id as any })
                              }
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() =>
                              removeAlert({ id: alert._id as any })
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="bg-muted/30 p-4 rounded-full inline-block mb-3">
                    <Bell className="h-6 w-6 opacity-50" />
                  </div>
                  <p>No new notifications</p>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Button
            asChild
            className="rounded-full shadow-lg hover:shadow-primary/25 bg-gradient-to-r from-primary to-accent transition-all hover:scale-105"
          >
            <Link to="/budgets/new">
              <Plus className="mr-2 h-4 w-4" />
              New Budget
            </Link>
          </Button>
        </div>
      </div>

      {summary && <DashboardSummary summary={summary} />}

      <div className="space-y-4 pt-4">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary" />
          Your Budgets
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => (
            <BudgetCard key={budget._id} budget={budget} />
          ))}
        </div>
      </div>
    </div>
  );
}

type DashboardSummaryData = {
  budgetCount: number;
  overBudgetCount: number;
  endingSoonCount: number;
  budgets: Array<{
    budgetId: string;
    name?: string;
    mainCurrency: string;
    remainingToday: number;
    spentToday: number;
    isOverToday: boolean;
    endDate: number;
  }>;
};

function DashboardSummary({ summary }: { summary: DashboardSummaryData }) {
  // Group budgets by currency for totals
  const currencyGroups = summary.budgets.reduce(
    (acc, budget) => {
      const currency = budget.mainCurrency;
      if (!acc[currency]) {
        acc[currency] = { remainingToday: 0, spentToday: 0 };
      }
      acc[currency].remainingToday += budget.remainingToday;
      acc[currency].spentToday += budget.spentToday;
      return acc;
    },
    {} as Record<string, { remainingToday: number; spentToday: number }>,
  );

  const currencies = Object.keys(currencyGroups);
  const isSingleCurrency = currencies.length === 1;
  const singleCurrency = isSingleCurrency ? currencies[0] : null;

  return (
    <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
      {/* Active Budgets */}
      <div className="group relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-accent rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-500"></div>
        <Card className="glass border-0 h-full relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet className="h-24 w-24 text-primary rotate-12" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 font-medium text-primary">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Wallet className="h-4 w-4" />
              </div>
              Active Budgets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
              {summary.budgetCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Remaining Today */}
      <div className="group relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-secondary to-green-400 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-500"></div>
        <Card className="glass border-0 h-full relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingDown className="h-24 w-24 text-secondary rotate-12" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 font-medium text-secondary">
              <div className="p-2 bg-secondary/10 rounded-lg">
                <TrendingDown className="h-4 w-4" />
              </div>
              Remaining Today
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSingleCurrency && singleCurrency ? (
              <div
                className={`text-2xl md:text-3xl font-extrabold tracking-tight ${currencyGroups[singleCurrency].remainingToday < 0
                  ? "text-destructive"
                  : "text-green-600 dark:text-green-400"
                  }`}
              >
                {formatCurrency(
                  currencyGroups[singleCurrency].remainingToday,
                  singleCurrency,
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {currencies.map((currency) => (
                  <div
                    key={currency}
                    className={`text-lg font-bold ${currencyGroups[currency].remainingToday < 0
                      ? "text-destructive"
                      : "text-green-600 dark:text-green-400"
                      }`}
                  >
                    {currency}:{" "}
                    {formatCurrency(
                      currencyGroups[currency].remainingToday,
                      currency,
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Over Budget Today */}
      <div className="group relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-destructive to-orange-500 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-500"></div>
        <Card className="glass border-0 h-full relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <AlertTriangle className="h-24 w-24 text-destructive rotate-12" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="flex items-center gap-2 font-medium text-destructive">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertTriangle className="h-4 w-4" />
              </div>
              Over Budget
            </CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
            <div
              className={`text-3xl md:text-4xl font-extrabold tracking-tight ${summary.overBudgetCount > 0
                ? "text-destructive"
                : "text-foreground"
                }`}
            >
              {summary.overBudgetCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ending Soon */}
      <div className="group relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-500"></div>
        <Card className="glass border-0 h-full relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock className="h-24 w-24 text-amber-500 rotate-12" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="flex items-center gap-2 font-medium text-amber-600 dark:text-amber-400">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clock className="h-4 w-4" />
              </div>
              Ending Soon
            </CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
            <div
              className={`text-3xl md:text-4xl font-extrabold tracking-tight ${summary.endingSoonCount > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-foreground"
                }`}
            >
              {summary.endingSoonCount}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BudgetCard({
  budget,
}: {
  budget: {
    _id: string;
    name?: string;
    startDate: number;
    endDate: number;
    totalAmount?: number;
    mainCurrency: string;
  };
}) {
  const clientToday = getTodayTimestamp();
  const { data: dailyLimit } = useQuery(
    convexQuery(api.budgets.getDailyLimit, {
      budgetId: budget._id as any,
      clientToday,
    }),
  );

  return (
    <Link to="/budgets/$budgetId" params={{ budgetId: budget._id }}>
      <Card className="hover:-translate-y-1 transition-all duration-300 h-full border-none shadow-lg glass overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-accent opacity-70" />
        <CardHeader className="pb-4 relative">
          <div className="flex justify-between items-start">
            <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">
              {budget.name || "Unnamed Budget"}
            </CardTitle>
            <div className="p-2 bg-secondary/10 rounded-full">
              <Wallet className="h-4 w-4 text-secondary" />
            </div>
          </div>
          <CardDescription className="text-xs font-medium uppercase tracking-wider opacity-70">
            {format(new Date(budget.startDate), "MMM d")} -{" "}
            {format(new Date(budget.endDate), "MMM d, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dailyLimit ? (
              <>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Today's Usage</span>
                    <span
                      className={`font-bold ${dailyLimit.remainingToday < 0
                        ? "text-destructive"
                        : "text-primary"
                        }`}
                    >
                      {Math.round(
                        ((dailyLimit.adjustedDailyLimit -
                          dailyLimit.remainingToday) /
                          dailyLimit.adjustedDailyLimit) *
                        100,
                      )}
                      %
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${dailyLimit.remainingToday < 0
                        ? "bg-destructive"
                        : "bg-gradient-to-r from-primary to-accent"
                        }`}
                      style={{
                        width: `${Math.min(100, Math.max(0, ((dailyLimit.adjustedDailyLimit - dailyLimit.remainingToday) / dailyLimit.adjustedDailyLimit) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-widest">
                      Available
                    </span>
                    <div
                      className={`font-bold text-lg ${dailyLimit.remainingToday < 0
                        ? "text-destructive"
                        : "text-green-600 dark:text-green-400"
                        }`}
                    >
                      {formatCurrency(
                        dailyLimit.remainingToday,
                        dailyLimit.mainCurrency,
                      )}
                    </div>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-xs text-muted-foreground uppercase tracking-widest">
                      Daily Limit
                    </span>
                    <div className="font-bold text-lg text-foreground">
                      {formatCurrency(
                        dailyLimit.adjustedDailyLimit,
                        dailyLimit.mainCurrency,
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="animate-pulse space-y-3">
                <div className="h-2 bg-muted rounded w-full"></div>
                <div className="flex justify-between">
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
