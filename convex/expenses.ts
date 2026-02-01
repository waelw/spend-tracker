import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { startOfDay } from "date-fns"

export const listByBudget = query({
  args: {
    budgetId: v.id("budgets"),
    date: v.optional(v.number()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    category: v.optional(v.string()),
    minAmount: v.optional(v.number()),
    maxAmount: v.optional(v.number()),
    search: v.optional(v.string()),
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

    let filtered = expenses

    // Date range filter
    if (args.startDate !== undefined && args.endDate !== undefined) {
      filtered = filtered.filter(
        (exp) => exp.date >= args.startDate! && exp.date <= args.endDate!
      )
    } else if (args.date) {
      const dayStart = new Date(args.date)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(args.date)
      dayEnd.setHours(23, 59, 59, 999)
      filtered = filtered.filter(
        (exp) => exp.date >= dayStart.getTime() && exp.date <= dayEnd.getTime()
      )
    }

    // Category filter (include uncategorized when category === "" or null)
    if (args.category !== undefined) {
      if (args.category === "") {
        filtered = filtered.filter((exp) => !exp.category)
      } else {
        filtered = filtered.filter((exp) => exp.category === args.category)
      }
    }

    // Amount filters
    if (args.minAmount !== undefined) {
      filtered = filtered.filter((exp) => exp.amount >= args.minAmount!)
    }
    if (args.maxAmount !== undefined) {
      filtered = filtered.filter((exp) => exp.amount <= args.maxAmount!)
    }

    // Description search (case-insensitive)
    if (args.search && args.search.trim() !== "") {
      const searchLower = args.search.toLowerCase()
      filtered = filtered.filter((exp) => {
        const desc = exp.description || ""
        return desc.toLowerCase().includes(searchLower)
      })
    }

    return filtered.sort((a, b) => b.date - a.date)
  },
})

export const add = mutation({
  args: {
    budgetId: v.id("budgets"),
    amount: v.number(),
    currencyCode: v.string(),
    date: v.number(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
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

    // Get the asset for this currency and check balance
    const asset = await ctx.db
      .query("budgetAssets")
      .withIndex("by_budgetId_currencyCode", (q) =>
        q.eq("budgetId", args.budgetId).eq("currencyCode", args.currencyCode)
      )
      .first()

    if (!asset) {
      throw new Error(`No asset found for ${args.currencyCode}`)
    }

    if (asset.amount < args.amount) {
      throw new Error(
        `Insufficient balance. Available: ${asset.amount.toFixed(2)} ${args.currencyCode}, Required: ${args.amount.toFixed(2)} ${args.currencyCode}`
      )
    }

    // Deduct from asset
    await ctx.db.patch(asset._id, { amount: asset.amount - args.amount })

    // Record the expense
    return await ctx.db.insert("expenses", {
      budgetId: args.budgetId,
      userId: identity.subject,
      amount: args.amount,
      currencyCode: args.currencyCode,
      date: args.date,
      description: args.description,
      category: args.category,
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
    category: v.optional(v.string()),
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

    const newCurrency = args.currencyCode ?? expense.currencyCode
    const newAmount = args.amount ?? expense.amount

    // If currency is being changed, validate it
    if (args.currencyCode && args.currencyCode !== expense.currencyCode) {
      const currencies = await ctx.db
        .query("budgetCurrencies")
        .withIndex("by_budgetId", (q) => q.eq("budgetId", expense.budgetId))
        .collect()
      const validCurrencies = currencies.map((c) => c.currencyCode)
      if (!validCurrencies.includes(args.currencyCode)) {
        throw new Error("Invalid currency for this budget")
      }
    }

    // Handle asset balance updates if amount or currency changed
    if (args.amount !== undefined || args.currencyCode !== undefined) {
      // Refund the old amount to the old currency asset
      const oldAsset = await ctx.db
        .query("budgetAssets")
        .withIndex("by_budgetId_currencyCode", (q) =>
          q.eq("budgetId", expense.budgetId).eq("currencyCode", expense.currencyCode)
        )
        .first()

      if (oldAsset) {
        await ctx.db.patch(oldAsset._id, { amount: oldAsset.amount + expense.amount })
      }

      // Get the new asset and check balance
      const newAsset = await ctx.db
        .query("budgetAssets")
        .withIndex("by_budgetId_currencyCode", (q) =>
          q.eq("budgetId", expense.budgetId).eq("currencyCode", newCurrency)
        )
        .first()

      if (!newAsset) {
        throw new Error(`No asset found for ${newCurrency}`)
      }

      if (newAsset.amount < newAmount) {
        // Rollback the refund
        if (oldAsset) {
          await ctx.db.patch(oldAsset._id, { amount: oldAsset.amount })
        }
        throw new Error(
          `Insufficient balance. Available: ${newAsset.amount.toFixed(2)} ${newCurrency}, Required: ${newAmount.toFixed(2)} ${newCurrency}`
        )
      }

      // Deduct from new asset
      await ctx.db.patch(newAsset._id, { amount: newAsset.amount - newAmount })
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

    // Add the amount back to the asset
    const asset = await ctx.db
      .query("budgetAssets")
      .withIndex("by_budgetId_currencyCode", (q) =>
        q.eq("budgetId", expense.budgetId).eq("currencyCode", expense.currencyCode)
      )
      .first()

    if (asset) {
      await ctx.db.patch(asset._id, { amount: asset.amount + expense.amount })
    }

    await ctx.db.delete(args.id)
  },
})
