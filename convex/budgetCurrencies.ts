import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const listByBudget = query({
  args: { budgetId: v.id("budgets") },
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
    return await ctx.db
      .query("budgetCurrencies")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.budgetId))
      .collect()
  },
})

export const add = mutation({
  args: {
    budgetId: v.id("budgets"),
    currencyCode: v.string(),
    rateToMain: v.number(),
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
    // Check if currency already exists
    const existing = await ctx.db
      .query("budgetCurrencies")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.budgetId))
      .filter((q) => q.eq(q.field("currencyCode"), args.currencyCode))
      .first()
    if (existing) {
      throw new Error("Currency already exists for this budget")
    }
    return await ctx.db.insert("budgetCurrencies", {
      budgetId: args.budgetId,
      currencyCode: args.currencyCode,
      rateToMain: args.rateToMain,
    })
  },
})

export const updateRate = mutation({
  args: {
    id: v.id("budgetCurrencies"),
    rateToMain: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }
    const currency = await ctx.db.get(args.id)
    if (!currency) {
      throw new Error("Currency not found")
    }
    // Verify user owns the budget
    const budget = await ctx.db.get(currency.budgetId)
    if (!budget || budget.userId !== identity.subject) {
      throw new Error("Budget not found")
    }
    await ctx.db.patch(args.id, { rateToMain: args.rateToMain })
  },
})

export const remove = mutation({
  args: { id: v.id("budgetCurrencies") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }
    const currency = await ctx.db.get(args.id)
    if (!currency) {
      throw new Error("Currency not found")
    }
    // Verify user owns the budget
    const budget = await ctx.db.get(currency.budgetId)
    if (!budget || budget.userId !== identity.subject) {
      throw new Error("Budget not found")
    }
    // Don't allow deleting main currency
    if (currency.currencyCode === budget.mainCurrency) {
      throw new Error("Cannot delete main currency")
    }
    await ctx.db.delete(args.id)
  },
})
