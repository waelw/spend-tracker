import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { Doc } from "./_generated/dataModel"
import { QueryCtx } from "./_generated/server"

// One day in milliseconds
const ONE_DAY_MS = 24 * 60 * 60 * 1000

// Calculate number of days between two timestamps (inclusive)
function daysBetween(startMs: number, endMs: number): number {
  return Math.floor((endMs - startMs) / ONE_DAY_MS) + 1
}

// Shared helper to compute daily limit metrics for a budget
// Used by getDailyLimit and getDashboardSummary to avoid duplication
async function computeDailyLimitMetrics(
  ctx: QueryCtx,
  budget: Doc<"budgets">,
  clientToday: number
) {
  const todayStart = clientToday
  const startDate = budget.startDate
  const endDate = budget.endDate

  // Get currencies for conversion
  const currencies = await ctx.db
    .query("budgetCurrencies")
    .withIndex("by_budgetId", (q) => q.eq("budgetId", budget._id))
    .collect()
  const rateMap = new Map(currencies.map((c) => [c.currencyCode, c.rateToMain]))

  // Get all assets and calculate total in main currency
  const assets = await ctx.db
    .query("budgetAssets")
    .withIndex("by_budgetId", (q) => q.eq("budgetId", budget._id))
    .collect()

  // Current remaining budget = sum of all assets converted to main currency
  const remainingBudget = assets.reduce((sum, asset) => {
    const rate = rateMap.get(asset.currencyCode) ?? 1
    return sum + asset.amount * rate
  }, 0)

  // Get all income for this budget (for tracking purposes)
  const allIncome = await ctx.db
    .query("income")
    .withIndex("by_budgetId", (q) => q.eq("budgetId", budget._id))
    .collect()

  // Calculate total income (converted to main currency)
  const totalIncome = allIncome.reduce((sum, inc) => {
    const rate = rateMap.get(inc.currencyCode) ?? 1
    return sum + inc.amount * rate
  }, 0)

  // Get all expenses for this budget (for tracking purposes)
  const allExpenses = await ctx.db
    .query("expenses")
    .withIndex("by_budgetId", (q) => q.eq("budgetId", budget._id))
    .collect()

  // Calculate total spent (all expenses converted to main currency)
  const totalSpent = allExpenses.reduce((sum, exp) => {
    const rate = rateMap.get(exp.currencyCode) ?? 1
    return sum + exp.amount * rate
  }, 0)

  // Effective total budget = remaining + total spent (reconstructed)
  const effectiveTotalBudget = remainingBudget + totalSpent

  // Calculate total days in budget
  const totalDays = daysBetween(startDate, endDate)
  const baseDailyLimit = effectiveTotalBudget / totalDays

  // Calculate days left (including today)
  const daysLeft = Math.max(1, daysBetween(todayStart, endDate))

  // Calculate days elapsed from start to yesterday (for rollover calculation)
  const daysElapsed = Math.max(0, Math.floor((todayStart - startDate) / ONE_DAY_MS))

  // Calculate what should have been spent by end of yesterday
  const expectedSpentByYesterday = baseDailyLimit * daysElapsed

  // Calculate spent before today
  const spentBeforeToday = allExpenses
    .filter((exp) => exp.date < todayStart)
    .reduce((sum, exp) => {
      const rate = rateMap.get(exp.currencyCode) ?? 1
      return sum + exp.amount * rate
    }, 0)

  // Rollover: savings from previous days = expected - actual spent before today
  const savingsFromPreviousDays = expectedSpentByYesterday - spentBeforeToday

  // Today's adjusted daily limit = remaining budget / days left
  const adjustedDailyLimit = Math.max(0, remainingBudget) / daysLeft

  // Calculate spent today
  const todayEnd = todayStart + ONE_DAY_MS - 1
  const todayExpenses = allExpenses.filter(
    (exp) => exp.date >= todayStart && exp.date <= todayEnd
  )
  const spentToday = todayExpenses.reduce((sum, exp) => {
    const rate = rateMap.get(exp.currencyCode) ?? 1
    return sum + exp.amount * rate
  }, 0)

  // Remaining for today
  const remainingToday = adjustedDailyLimit - spentToday

  return {
    baseDailyLimit,
    adjustedDailyLimit,
    spentToday,
    remainingToday,
    totalSpent,
    totalIncome,
    effectiveTotalBudget,
    remainingBudget,
    daysLeft,
    totalDays,
    mainCurrency: budget.mainCurrency,
    savingsFromPreviousDays,
  }
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return []
    }
    const userId = identity.subject
    return await ctx.db
      .query("budgets")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect()
  },
})

export const get = query({
  args: { id: v.id("budgets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return null
    }
    const budget = await ctx.db.get(args.id)
    if (!budget || budget.userId !== identity.subject) {
      return null
    }
    return budget
  },
})

export const create = mutation({
  args: {
    name: v.optional(v.string()),
    startDate: v.number(),
    endDate: v.number(),
    mainCurrency: v.string(),
    initialAssets: v.array(
      v.object({
        currencyCode: v.string(),
        amount: v.number(),
        rateToMain: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }

    // Validate that main currency is included in initialAssets
    const mainAsset = args.initialAssets.find(
      (a) => a.currencyCode === args.mainCurrency
    )
    if (!mainAsset) {
      throw new Error("Main currency must be included in initial assets")
    }

    const budgetId = await ctx.db.insert("budgets", {
      userId: identity.subject,
      name: args.name,
      startDate: args.startDate,
      endDate: args.endDate,
      mainCurrency: args.mainCurrency,
    })

    // Add currencies and assets
    for (const asset of args.initialAssets) {
      const isMainCurrency = asset.currencyCode === args.mainCurrency
      const rateToMain = isMainCurrency ? 1 : (asset.rateToMain ?? 1)

      // Add currency
      await ctx.db.insert("budgetCurrencies", {
        budgetId,
        currencyCode: asset.currencyCode,
        rateToMain,
      })

      // Add asset
      await ctx.db.insert("budgetAssets", {
        budgetId,
        currencyCode: asset.currencyCode,
        amount: asset.amount,
      })
    }

    return budgetId
  },
})

export const update = mutation({
  args: {
    id: v.id("budgets"),
    name: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }
    const budget = await ctx.db.get(args.id)
    if (!budget || budget.userId !== identity.subject) {
      throw new Error("Budget not found")
    }
    const { id, ...updates } = args
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    )
    await ctx.db.patch(id, filteredUpdates)
  },
})

export const switchMainCurrency = mutation({
  args: {
    id: v.id("budgets"),
    newMainCurrency: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }
    const budget = await ctx.db.get(args.id)
    if (!budget || budget.userId !== identity.subject) {
      throw new Error("Budget not found")
    }

    // Get all currencies for this budget
    const currencies = await ctx.db
      .query("budgetCurrencies")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.id))
      .collect()

    // Find the new main currency
    const newMainCurrencyData = currencies.find(
      (c) => c.currencyCode === args.newMainCurrency
    )
    if (!newMainCurrencyData) {
      throw new Error("Currency not found in this budget")
    }

    // Get the conversion rate from old main to new main
    // If old main = USD (rate 1) and new main = EUR (rate 0.92)
    // Then 1 EUR = 0.92 USD, so 1 USD = 1/0.92 EUR
    const conversionRate = newMainCurrencyData.rateToMain

    // Update all currency rates relative to the new main currency
    for (const currency of currencies) {
      if (currency.currencyCode === args.newMainCurrency) {
        // New main currency gets rate 1
        await ctx.db.patch(currency._id, { rateToMain: 1 })
      } else {
        // Other currencies: newRate = oldRate / conversionRate
        const newRate = currency.rateToMain / conversionRate
        await ctx.db.patch(currency._id, { rateToMain: newRate })
      }
    }

    // Update the budget with new main currency
    // Note: Assets stay in their original currencies, only the display currency changes
    await ctx.db.patch(args.id, {
      mainCurrency: args.newMainCurrency,
    })
  },
})

export const remove = mutation({
  args: { id: v.id("budgets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }
    const budget = await ctx.db.get(args.id)
    if (!budget || budget.userId !== identity.subject) {
      throw new Error("Budget not found")
    }
    // Delete related expenses
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.id))
      .collect()
    for (const expense of expenses) {
      await ctx.db.delete(expense._id)
    }
    // Delete related income
    const incomeEntries = await ctx.db
      .query("income")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.id))
      .collect()
    for (const income of incomeEntries) {
      await ctx.db.delete(income._id)
    }
    // Delete related currencies
    const currencies = await ctx.db
      .query("budgetCurrencies")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.id))
      .collect()
    for (const currency of currencies) {
      await ctx.db.delete(currency._id)
    }
    // Delete related assets
    const assets = await ctx.db
      .query("budgetAssets")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.id))
      .collect()
    for (const asset of assets) {
      await ctx.db.delete(asset._id)
    }
    // Delete related asset transfers
    const transfers = await ctx.db
      .query("assetTransfers")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.id))
      .collect()
    for (const transfer of transfers) {
      await ctx.db.delete(transfer._id)
    }
    // Delete budget
    await ctx.db.delete(args.id)
  },
})

export const getDailyLimit = query({
  args: {
    budgetId: v.id("budgets"),
    clientToday: v.number(), // Client's "today" timestamp (midnight local time)
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return null
    }
    const budget = await ctx.db.get(args.budgetId)
    if (!budget || budget.userId !== identity.subject) {
      return null
    }

    return computeDailyLimitMetrics(ctx, budget, args.clientToday)
  },
})

export const getDashboardSummary = query({
  args: {
    clientToday: v.number(), // Client's "today" timestamp (midnight local time)
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return null
    }
    const userId = identity.subject

    // Get all budgets for the user
    const budgets = await ctx.db
      .query("budgets")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect()

    if (budgets.length === 0) {
      return null
    }

    const clientToday = args.clientToday
    const sevenDaysFromNow = clientToday + 7 * ONE_DAY_MS

    // Compute metrics for each budget
    const budgetMetrics = await Promise.all(
      budgets.map(async (budget) => {
        const metrics = await computeDailyLimitMetrics(ctx, budget, clientToday)
        const isOverToday = metrics.remainingToday < 0
        // Ending soon: endDate is in the future and within 7 days (inclusive)
        const isEndingSoon =
          budget.endDate >= clientToday && budget.endDate <= sevenDaysFromNow

        return {
          budgetId: budget._id,
          name: budget.name,
          mainCurrency: budget.mainCurrency,
          remainingToday: metrics.remainingToday,
          spentToday: metrics.spentToday,
          isOverToday,
          endDate: budget.endDate,
          isEndingSoon,
        }
      })
    )

    // Calculate summary counts
    const budgetCount = budgetMetrics.length
    const overBudgetCount = budgetMetrics.filter((b) => b.isOverToday).length
    const endingSoonCount = budgetMetrics.filter((b) => b.isEndingSoon).length

    return {
      budgetCount,
      overBudgetCount,
      endingSoonCount,
      budgets: budgetMetrics,
    }
  },
})

export const getDailyBreakdown = query({
  args: {
    budgetId: v.id("budgets"),
    clientToday: v.number(), // Client's "today" timestamp (midnight local time)
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return null
    }
    const budget = await ctx.db.get(args.budgetId)
    if (!budget || budget.userId !== identity.subject) {
      return null
    }

    // Use timestamps directly
    const todayStart = args.clientToday
    const startDate = budget.startDate
    const endDate = budget.endDate

    // Get currencies for conversion
    const currencies = await ctx.db
      .query("budgetCurrencies")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.budgetId))
      .collect()
    const rateMap = new Map(currencies.map((c) => [c.currencyCode, c.rateToMain]))

    // Get all assets and calculate total in main currency
    const assets = await ctx.db
      .query("budgetAssets")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.budgetId))
      .collect()

    // Current remaining budget = sum of all assets converted to main currency
    const currentAssetTotal = assets.reduce((sum, asset) => {
      const rate = rateMap.get(asset.currencyCode) ?? 1
      return sum + asset.amount * rate
    }, 0)

    // Get all income for this budget
    const allIncome = await ctx.db
      .query("income")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.budgetId))
      .collect()

    // Calculate total income (converted to main currency)
    const totalIncome = allIncome.reduce((sum, inc) => {
      const rate = rateMap.get(inc.currencyCode) ?? 1
      return sum + inc.amount * rate
    }, 0)

    // Get all expenses for this budget
    const allExpenses = await ctx.db
      .query("expenses")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.budgetId))
      .collect()

    // Calculate total spent (all expenses converted to main currency)
    const totalSpent = allExpenses.reduce((sum, exp) => {
      const rate = rateMap.get(exp.currencyCode) ?? 1
      return sum + exp.amount * rate
    }, 0)

    // Effective total budget = current assets + total spent (reconstructed)
    const effectiveTotalBudget = currentAssetTotal + totalSpent

    // Calculate total days and base daily limit
    const totalDays = daysBetween(startDate, endDate)
    const baseDailyLimit = effectiveTotalBudget / totalDays

  

    // Group expenses by day (using the stored timestamp directly)
    const expensesByDay = new Map<number, number>()
    for (const exp of allExpenses) {
      // Expenses are already stored at midnight local time
      const dayKey = exp.date
      const rate = rateMap.get(exp.currencyCode) ?? 1
      const current = expensesByDay.get(dayKey) ?? 0
      expensesByDay.set(dayKey, current + exp.amount * rate)
    }

    // Group income by day
    const incomeByDay = new Map<number, number>()
    for (const inc of allIncome) {
      const dayKey = inc.date
      const rate = rateMap.get(inc.currencyCode) ?? 1
      const current = incomeByDay.get(dayKey) ?? 0
      incomeByDay.set(dayKey, current + inc.amount * rate)
    }

    // Remaining budget from today onward (current asset total)
    const remainingBudget = currentAssetTotal

    // Days left including today (minimum 1 to avoid division by zero)
    const daysLeft = Math.max(1, daysBetween(todayStart, endDate))

    // Projected daily limit for today and all future days
    const projectedDailyLimit = remainingBudget / daysLeft

    // Find secondary currency (first non-main currency)
    const secondaryCurrency = currencies.find(c => c.currencyCode !== budget.mainCurrency)

    // Build day-by-day breakdown with rollover
    const days: {
      date: number
      dayNumber: number
      dailyLimit: number
      dailyLimitSecondary: number | null
      spent: number
      income: number
      remaining: number
      rollover: number
      isToday: boolean
      isPast: boolean
      isFuture: boolean
    }[] = []

    let carryOver = 0 // Running rollover from previous days

    for (let i = 0; i < totalDays; i++) {
      const dayTimestamp = startDate + (i * ONE_DAY_MS)
      const isToday = dayTimestamp === todayStart
      const isPast = dayTimestamp < todayStart
      const isFuture = dayTimestamp > todayStart

      const spent = expensesByDay.get(dayTimestamp) ?? 0
      const income = incomeByDay.get(dayTimestamp) ?? 0

      let dailyLimit: number
      let dayRollover = 0

      if (isPast) {
        // Past days: Use rollover-based calculation (historical view)
        const remainingDaysFromThisDay = totalDays - i
        dailyLimit = baseDailyLimit + (carryOver / remainingDaysFromThisDay)
        dayRollover = dailyLimit - spent
        carryOver += dayRollover
      } else {
        // Today and future: Use uniform projected limit based on remaining budget
        dailyLimit = projectedDailyLimit
      }

      const remaining = dailyLimit - spent

      // Calculate equivalent in secondary currency
      const dailyLimitSecondary = secondaryCurrency
        ? dailyLimit / secondaryCurrency.rateToMain
        : null

      days.push({
        date: dayTimestamp,
        dayNumber: i + 1,
        dailyLimit,
        dailyLimitSecondary,
        spent,
        income,
        remaining,
        rollover: dayRollover,
        isToday,
        isPast,
        isFuture,
      })
    }

    return {
      days,
      mainCurrency: budget.mainCurrency,
      secondaryCurrency: secondaryCurrency?.currencyCode ?? null,
      totalDays,
      baseDailyLimit,
      projectedDailyLimit,
      remainingBudget,
      totalSpent,
      daysLeft,
      initialBudget: effectiveTotalBudget, // Total budget including income
      totalIncome,
    }
  },
})
