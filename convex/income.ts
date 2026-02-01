import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { startOfDay } from "date-fns"

export const listByBudget = query({
  args: {
    budgetId: v.id("budgets"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
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
    const incomeEntries = await ctx.db
      .query("income")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.budgetId))
      .collect()

    let filtered = incomeEntries

    // Date range filter
    if (args.startDate !== undefined && args.endDate !== undefined) {
      filtered = filtered.filter(
        (inc) => inc.date >= args.startDate! && inc.date <= args.endDate!
      )
    }

    // Amount filters
    if (args.minAmount !== undefined) {
      filtered = filtered.filter((inc) => inc.amount >= args.minAmount!)
    }
    if (args.maxAmount !== undefined) {
      filtered = filtered.filter((inc) => inc.amount <= args.maxAmount!)
    }

    // Description search (case-insensitive)
    if (args.search && args.search.trim() !== "") {
      const searchLower = args.search.toLowerCase()
      filtered = filtered.filter((inc) => {
        const desc = inc.description || ""
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

    // Add to the asset for this currency
    const asset = await ctx.db
      .query("budgetAssets")
      .withIndex("by_budgetId_currencyCode", (q) =>
        q.eq("budgetId", args.budgetId).eq("currencyCode", args.currencyCode)
      )
      .first()

    if (asset) {
      await ctx.db.patch(asset._id, { amount: asset.amount + args.amount })
    } else {
      // Create new asset if it doesn't exist
      await ctx.db.insert("budgetAssets", {
        budgetId: args.budgetId,
        currencyCode: args.currencyCode,
        amount: args.amount,
      })
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

export const update = mutation({
  args: {
    id: v.id("income"),
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
    const income = await ctx.db.get(args.id)
    if (!income || income.userId !== identity.subject) {
      throw new Error("Income not found")
    }

    const newCurrency = args.currencyCode ?? income.currencyCode
    const newAmount = args.amount ?? income.amount

    // If currency is being changed, validate it
    if (args.currencyCode && args.currencyCode !== income.currencyCode) {
      const currencies = await ctx.db
        .query("budgetCurrencies")
        .withIndex("by_budgetId", (q) => q.eq("budgetId", income.budgetId))
        .collect()
      const validCurrencies = currencies.map((c) => c.currencyCode)
      if (!validCurrencies.includes(args.currencyCode)) {
        throw new Error("Invalid currency for this budget")
      }
    }

    // Handle asset balance updates if amount or currency changed
    if (args.amount !== undefined || args.currencyCode !== undefined) {
      // Remove the old income amount from the old currency asset
      const oldAsset = await ctx.db
        .query("budgetAssets")
        .withIndex("by_budgetId_currencyCode", (q) =>
          q.eq("budgetId", income.budgetId).eq("currencyCode", income.currencyCode)
        )
        .first()

      if (oldAsset) {
        await ctx.db.patch(oldAsset._id, { amount: oldAsset.amount - income.amount })
      }

      // Add the new income amount to the new currency asset
      const newAsset = await ctx.db
        .query("budgetAssets")
        .withIndex("by_budgetId_currencyCode", (q) =>
          q.eq("budgetId", income.budgetId).eq("currencyCode", newCurrency)
        )
        .first()

      if (newAsset) {
        await ctx.db.patch(newAsset._id, { amount: newAsset.amount + newAmount })
      } else {
        // Create new asset if it doesn't exist
        await ctx.db.insert("budgetAssets", {
          budgetId: income.budgetId,
          currencyCode: newCurrency,
          amount: newAmount,
        })
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

    // Subtract the amount from the asset
    const asset = await ctx.db
      .query("budgetAssets")
      .withIndex("by_budgetId_currencyCode", (q) =>
        q.eq("budgetId", income.budgetId).eq("currencyCode", income.currencyCode)
      )
      .first()

    if (asset) {
      await ctx.db.patch(asset._id, { amount: asset.amount - income.amount })
    }

    await ctx.db.delete(args.id)
  },
})
