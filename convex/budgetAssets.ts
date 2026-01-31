import { v } from "convex/values"
import { mutation, query, internalMutation } from "./_generated/server"

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
      .query("budgetAssets")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.budgetId))
      .collect()
  },
})

export const getAsset = query({
  args: {
    budgetId: v.id("budgets"),
    currencyCode: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return null
    }
    // Verify user owns this budget
    const budget = await ctx.db.get(args.budgetId)
    if (!budget || budget.userId !== identity.subject) {
      return null
    }
    return await ctx.db
      .query("budgetAssets")
      .withIndex("by_budgetId_currencyCode", (q) =>
        q.eq("budgetId", args.budgetId).eq("currencyCode", args.currencyCode)
      )
      .first()
  },
})

export const getTotalInMainCurrency = query({
  args: { budgetId: v.id("budgets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return 0
    }
    // Verify user owns this budget
    const budget = await ctx.db.get(args.budgetId)
    if (!budget || budget.userId !== identity.subject) {
      return 0
    }

    const assets = await ctx.db
      .query("budgetAssets")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.budgetId))
      .collect()

    const currencies = await ctx.db
      .query("budgetCurrencies")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.budgetId))
      .collect()

    const rateMap = new Map(currencies.map((c) => [c.currencyCode, c.rateToMain]))

    return assets.reduce((sum, asset) => {
      const rate = rateMap.get(asset.currencyCode) ?? 1
      return sum + asset.amount * rate
    }, 0)
  },
})

export const upsert = mutation({
  args: {
    budgetId: v.id("budgets"),
    currencyCode: v.string(),
    amount: v.number(),
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

    // Check if asset already exists
    const existing = await ctx.db
      .query("budgetAssets")
      .withIndex("by_budgetId_currencyCode", (q) =>
        q.eq("budgetId", args.budgetId).eq("currencyCode", args.currencyCode)
      )
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, { amount: args.amount })
      return existing._id
    }

    // Ensure currency exists for this budget
    const currency = await ctx.db
      .query("budgetCurrencies")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.budgetId))
      .filter((q) => q.eq(q.field("currencyCode"), args.currencyCode))
      .first()

    if (!currency) {
      throw new Error("Currency not found for this budget")
    }

    return await ctx.db.insert("budgetAssets", {
      budgetId: args.budgetId,
      currencyCode: args.currencyCode,
      amount: args.amount,
    })
  },
})

export const addToAsset = mutation({
  args: {
    budgetId: v.id("budgets"),
    currencyCode: v.string(),
    amount: v.number(),
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

    // Get existing asset
    const asset = await ctx.db
      .query("budgetAssets")
      .withIndex("by_budgetId_currencyCode", (q) =>
        q.eq("budgetId", args.budgetId).eq("currencyCode", args.currencyCode)
      )
      .first()

    if (asset) {
      await ctx.db.patch(asset._id, { amount: asset.amount + args.amount })
      return asset._id
    }

    // Create new asset if doesn't exist
    // First ensure currency exists
    const currency = await ctx.db
      .query("budgetCurrencies")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.budgetId))
      .filter((q) => q.eq(q.field("currencyCode"), args.currencyCode))
      .first()

    if (!currency) {
      throw new Error("Currency not found for this budget")
    }

    return await ctx.db.insert("budgetAssets", {
      budgetId: args.budgetId,
      currencyCode: args.currencyCode,
      amount: args.amount,
    })
  },
})

export const subtractFromAsset = mutation({
  args: {
    budgetId: v.id("budgets"),
    currencyCode: v.string(),
    amount: v.number(),
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

    // Get existing asset
    const asset = await ctx.db
      .query("budgetAssets")
      .withIndex("by_budgetId_currencyCode", (q) =>
        q.eq("budgetId", args.budgetId).eq("currencyCode", args.currencyCode)
      )
      .first()

    if (!asset) {
      throw new Error("No asset found for this currency")
    }

    if (asset.amount < args.amount) {
      throw new Error(
        `Insufficient balance. Available: ${asset.amount} ${args.currencyCode}, Required: ${args.amount} ${args.currencyCode}`
      )
    }

    await ctx.db.patch(asset._id, { amount: asset.amount - args.amount })
    return asset._id
  },
})

export const transfer = mutation({
  args: {
    budgetId: v.id("budgets"),
    fromCurrency: v.string(),
    toCurrency: v.string(),
    fromAmount: v.number(),
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

    if (args.fromCurrency === args.toCurrency) {
      throw new Error("Cannot transfer to the same currency")
    }

    if (args.fromAmount <= 0) {
      throw new Error("Transfer amount must be positive")
    }

    // Get source asset
    const fromAsset = await ctx.db
      .query("budgetAssets")
      .withIndex("by_budgetId_currencyCode", (q) =>
        q.eq("budgetId", args.budgetId).eq("currencyCode", args.fromCurrency)
      )
      .first()

    if (!fromAsset || fromAsset.amount < args.fromAmount) {
      throw new Error(
        `Insufficient balance in ${args.fromCurrency}. Available: ${fromAsset?.amount ?? 0}`
      )
    }

    // Get exchange rates
    const currencies = await ctx.db
      .query("budgetCurrencies")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.budgetId))
      .collect()

    const fromCurrency = currencies.find((c) => c.currencyCode === args.fromCurrency)
    const toCurrency = currencies.find((c) => c.currencyCode === args.toCurrency)

    if (!fromCurrency || !toCurrency) {
      throw new Error("Currency not found")
    }

    // Calculate conversion: fromAmount * fromRate / toRate
    // fromRate is "1 fromCurrency = fromRate mainCurrency"
    // toRate is "1 toCurrency = toRate mainCurrency"
    // So: fromAmount in main = fromAmount * fromRate
    // toAmount = fromAmount in main / toRate
    const rateUsed = fromCurrency.rateToMain / toCurrency.rateToMain
    const toAmount = args.fromAmount * rateUsed

    // Update source asset
    await ctx.db.patch(fromAsset._id, { amount: fromAsset.amount - args.fromAmount })

    // Get or create destination asset
    const toAsset = await ctx.db
      .query("budgetAssets")
      .withIndex("by_budgetId_currencyCode", (q) =>
        q.eq("budgetId", args.budgetId).eq("currencyCode", args.toCurrency)
      )
      .first()

    if (toAsset) {
      await ctx.db.patch(toAsset._id, { amount: toAsset.amount + toAmount })
    } else {
      await ctx.db.insert("budgetAssets", {
        budgetId: args.budgetId,
        currencyCode: args.toCurrency,
        amount: toAmount,
      })
    }

    // Record the transfer
    await ctx.db.insert("assetTransfers", {
      budgetId: args.budgetId,
      userId: identity.subject,
      fromCurrency: args.fromCurrency,
      toCurrency: args.toCurrency,
      fromAmount: args.fromAmount,
      toAmount,
      rateUsed,
      date: Date.now(),
      description: args.description,
    })

    return { fromAmount: args.fromAmount, toAmount, rateUsed }
  },
})

export const listTransfers = query({
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
      .query("assetTransfers")
      .withIndex("by_budgetId_date", (q) => q.eq("budgetId", args.budgetId))
      .order("desc")
      .collect()
  },
})

// Internal mutation for migration - adds to asset without auth check
export const internalAddToAsset = internalMutation({
  args: {
    budgetId: v.id("budgets"),
    currencyCode: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    // Get existing asset
    const asset = await ctx.db
      .query("budgetAssets")
      .withIndex("by_budgetId_currencyCode", (q) =>
        q.eq("budgetId", args.budgetId).eq("currencyCode", args.currencyCode)
      )
      .first()

    if (asset) {
      await ctx.db.patch(asset._id, { amount: asset.amount + args.amount })
      return asset._id
    }

    return await ctx.db.insert("budgetAssets", {
      budgetId: args.budgetId,
      currencyCode: args.currencyCode,
      amount: args.amount,
    })
  },
})
