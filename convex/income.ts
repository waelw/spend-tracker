import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { startOfDay } from "date-fns"

export const listByBudget = query({
  args: {
    budgetId: v.id("budgets"),
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
    const incomeEntries = await ctx.db
      .query("income")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.budgetId))
      .collect()

    return incomeEntries.sort((a, b) => b.date - a.date)
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
      throw new Error("Cannot add income for future dates")
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
    return await ctx.db.insert("income", {
      budgetId: args.budgetId,
      userId: identity.subject,
      amount: args.amount,
      currencyCode: args.currencyCode,
      date: args.date,
      description: args.description,
    })
  },
})

export const remove = mutation({
  args: { id: v.id("income") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }
    const income = await ctx.db.get(args.id)
    if (!income || income.userId !== identity.subject) {
      throw new Error("Income not found")
    }
    await ctx.db.delete(args.id)
  },
})
