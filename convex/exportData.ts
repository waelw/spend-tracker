import { v } from "convex/values"
import { action, internalQuery } from "./_generated/server"
import { internal } from "./_generated/api"
import { format } from "date-fns"

// Internal query to get expenses with filtering
export const getExpensesInternal = internalQuery({
  args: {
    budgetId: v.id("budgets"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.budgetId))
      .collect()

    let filtered = expenses

    if (args.startDate !== undefined && args.endDate !== undefined) {
      filtered = filtered.filter(
        (exp) => exp.date >= args.startDate! && exp.date <= args.endDate!
      )
    }

    return filtered.sort((a, b) => b.date - a.date)
  },
})

// Internal query to get income with filtering
export const getIncomeInternal = internalQuery({
  args: {
    budgetId: v.id("budgets"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const income = await ctx.db
      .query("income")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.budgetId))
      .collect()

    let filtered = income

    if (args.startDate !== undefined && args.endDate !== undefined) {
      filtered = filtered.filter(
        (inc) => inc.date >= args.startDate! && inc.date <= args.endDate!
      )
    }

    return filtered.sort((a, b) => b.date - a.date)
  },
})

// Internal query to get budget
export const getBudgetInternal = internalQuery({
  args: { budgetId: v.id("budgets"), userId: v.string() },
  handler: async (ctx, args) => {
    const budget = await ctx.db.get(args.budgetId)
    if (!budget || budget.userId !== args.userId) {
      return null
    }
    return budget
  },
})

/**
 * Exports expenses and income for a budget as CSV.
 * Supports optional date range filtering.
 */
export const exportToCsv = action({
  args: {
    budgetId: v.id("budgets"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ csv: string; filename: string }> => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }

    const budget = await ctx.runQuery(internal.exportData.getBudgetInternal, {
      budgetId: args.budgetId,
      userId: identity.subject,
    })
    if (!budget) {
      throw new Error("Budget not found or you do not have access to it")
    }

    const expenses = await ctx.runQuery(internal.exportData.getExpensesInternal, {
      budgetId: args.budgetId,
      startDate: args.startDate,
      endDate: args.endDate,
    })

    const income = await ctx.runQuery(internal.exportData.getIncomeInternal, {
      budgetId: args.budgetId,
      startDate: args.startDate,
      endDate: args.endDate,
    })

    const csvRows: string[] = []

    csvRows.push("Type,Date,Amount,Currency,Description,Category")

    for (const exp of expenses) {
      const dateStr = format(new Date(exp.date), "yyyy-MM-dd")
      const description = exp.description || ""
      const category = exp.category || ""
      csvRows.push(`Expense,${dateStr},${exp.amount},${exp.currencyCode},"${description.replace(/"/g, '""')}","${category}"`)
    }

    for (const inc of income) {
      const dateStr = format(new Date(inc.date), "yyyy-MM-dd")
      const description = inc.description || ""
      csvRows.push(`Income,${dateStr},${inc.amount},${inc.currencyCode},"${description.replace(/"/g, '""')}",`)
    }

    const csv = csvRows.join("\n")

    const dateRange = args.startDate && args.endDate
      ? `_${format(new Date(args.startDate), "yyyy-MM-dd")}_to_${format(new Date(args.endDate), "yyyy-MM-dd")}`
      : ""
    const filename = `${(budget.name || "budget").replace(/[^a-zA-Z0-9]/g, "_")}_export${dateRange}.csv`

    return { csv, filename }
  },
})
