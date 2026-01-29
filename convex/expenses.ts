import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { startOfDay } from "date-fns"

export const listByBudget = query({
  args: {
    budgetId: v.id("budgets"),
    date: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return []
    }
    // Verify user owns this budget
    const budget = await ctx.db.get(args.budgetId)
    if (!budget || budget.userId !== identity.subject) {
      return []
    }
    let query = ctx.db
      .query("expenses")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.budgetId))

    const expenses = await query.collect()

    // If date filter is provided, filter by that date
    if (args.date) {
      const dayStart = new Date(args.date)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(args.date)
      dayEnd.setHours(23, 59, 59, 999)
      return expenses.filter(
        (exp) => exp.date >= dayStart.getTime() && exp.date <= dayEnd.getTime()
      )
    }

    return expenses.sort((a, b) => b.date - a.date)
  },
})

export const add = mutation({
  args: {
    budgetId: v.id("budgets"),
    amount: v.number(),
    currencyCode: v.string(),
    date: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }
    // Verify user owns this budget
    const budget = await ctx.db.get(args.budgetId)
    if (!budget || budget.userId !== identity.subject) {
      throw new Error("Budget not found")
    }
    // Validate date is not in the future (only today or past allowed)
    const todayEnd = startOfDay(new Date()).getTime() + 24 * 60 * 60 * 1000 - 1
    if (args.date > todayEnd) {
      throw new Error("Cannot add expenses for future dates")
    }
    // Validate currency exists for this budget
    const currencies = await ctx.db
      .query("budgetCurrencies")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.budgetId))
      .collect()
    const validCurrencies = currencies.map((c) => c.currencyCode)
    if (!validCurrencies.includes(args.currencyCode)) {
      throw new Error("Invalid currency for this budget")
    }
    return await ctx.db.insert("expenses", {
      budgetId: args.budgetId,
      userId: identity.subject,
      amount: args.amount,
      currencyCode: args.currencyCode,
      date: args.date,
      description: args.description,
    })
  },
})

export const update = mutation({
  args: {
    id: v.id("expenses"),
    amount: v.optional(v.number()),
    currencyCode: v.optional(v.string()),
    date: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }
    const expense = await ctx.db.get(args.id)
    if (!expense || expense.userId !== identity.subject) {
      throw new Error("Expense not found")
    }
    // If currency is being changed, validate it
    if (args.currencyCode) {
      const currencies = await ctx.db
        .query("budgetCurrencies")
        .withIndex("by_budgetId", (q) => q.eq("budgetId", expense.budgetId))
        .collect()
      const validCurrencies = currencies.map((c) => c.currencyCode)
      if (!validCurrencies.includes(args.currencyCode)) {
        throw new Error("Invalid currency for this budget")
      }
    }
    const { id, ...updates } = args
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    )
    await ctx.db.patch(id, filteredUpdates)
  },
})

export const remove = mutation({
  args: { id: v.id("expenses") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }
    const expense = await ctx.db.get(args.id)
    if (!expense || expense.userId !== identity.subject) {
      throw new Error("Expense not found")
    }
    await ctx.db.delete(args.id)
  },
})
