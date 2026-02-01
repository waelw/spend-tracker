import { v } from "convex/values"
import { mutation, query, internalMutation } from "./_generated/server"

export const listByBudget = query({
  args: {
    budgetId: v.id("budgets"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return []
    }
    const budget = await ctx.db.get(args.budgetId)
    if (!budget || budget.userId !== identity.subject) {
      return []
    }
    const recurringItems = await ctx.db
      .query("recurringItems")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.budgetId))
      .collect()
    return recurringItems.sort((a, b) => b.startDate - a.startDate)
  },
})

export const add = mutation({
  args: {
    budgetId: v.id("budgets"),
    type: v.union(v.literal("expense"), v.literal("income")),
    amount: v.number(),
    currencyCode: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    frequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
    startDate: v.number(),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }
    const budget = await ctx.db.get(args.budgetId)
    if (!budget || budget.userId !== identity.subject) {
      throw new Error("Budget not found")
    }
    if (args.amount <= 0) {
      throw new Error("Amount must be greater than 0")
    }
    if (args.endDate && args.endDate <= args.startDate) {
      throw new Error("End date must be after start date")
    }
    const currencies = await ctx.db
      .query("budgetCurrencies")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.budgetId))
      .collect()
    const validCurrencies = currencies.map((c) => c.currencyCode)
    if (!validCurrencies.includes(args.currencyCode)) {
      throw new Error("Invalid currency for this budget")
    }
    return await ctx.db.insert("recurringItems", {
      budgetId: args.budgetId,
      userId: identity.subject,
      type: args.type,
      amount: args.amount,
      currencyCode: args.currencyCode,
      description: args.description,
      category: args.category,
      frequency: args.frequency,
      startDate: args.startDate,
      endDate: args.endDate,
      paused: false,
    })
  },
})

export const update = mutation({
  args: {
    id: v.id("recurringItems"),
    amount: v.optional(v.number()),
    currencyCode: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    frequency: v.optional(v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"))),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    paused: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }
    const recurringItem = await ctx.db.get(args.id)
    if (!recurringItem || recurringItem.userId !== identity.subject) {
      throw new Error("Recurring item not found")
    }
    if (args.amount !== undefined && args.amount <= 0) {
      throw new Error("Amount must be greater than 0")
    }
    const { id, ...updates } = args
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    )
    if (filteredUpdates.startDate && filteredUpdates.endDate) {
      if (filteredUpdates.endDate <= filteredUpdates.startDate) {
        throw new Error("End date must be after start date")
      }
    } else if (filteredUpdates.endDate) {
      const startDate = filteredUpdates.startDate ?? recurringItem.startDate
      if (filteredUpdates.endDate <= startDate) {
        throw new Error("End date must be after start date")
      }
    } else if (filteredUpdates.startDate) {
      const endDate = filteredUpdates.endDate ?? recurringItem.endDate
      if (endDate && filteredUpdates.startDate >= endDate) {
        throw new Error("Start date must be before end date")
      }
    }
    if (filteredUpdates.currencyCode) {
      const currencies = await ctx.db
        .query("budgetCurrencies")
        .withIndex("by_budgetId", (q) => q.eq("budgetId", recurringItem.budgetId))
        .collect()
      const validCurrencies = currencies.map((c) => c.currencyCode)
      if (!validCurrencies.includes(filteredUpdates.currencyCode as string)) {
        throw new Error("Invalid currency for this budget")
      }
    }
    await ctx.db.patch(id, filteredUpdates)
  },
})

export const remove = mutation({
  args: { id: v.id("recurringItems") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }
    const recurringItem = await ctx.db.get(args.id)
    if (!recurringItem || recurringItem.userId !== identity.subject) {
      throw new Error("Recurring item not found")
    }
    await ctx.db.delete(args.id)
  },
})

export const generateEntriesFromTemplates = internalMutation({
  handler: async (ctx) => {
    const now = Date.now()
    const recurringItems = await ctx.db.query("recurringItems").collect()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)
    const todayStart = today.getTime()
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000
    for (const item of recurringItems) {
      if (item.paused) {
        continue
      }
      const lastGenerated = item.lastGeneratedDate ?? item.startDate - 1
      let nextDate = lastGenerated + 1
      const endDate = item.endDate ?? Infinity
      while (nextDate <= todayStart && nextDate <= endDate) {
        const dateObj = new Date(nextDate)
        const shouldCreate = (() => {
          switch (item.frequency) {
            case "daily":
              return true
            case "weekly":
              return dateObj.getDay() === new Date(item.startDate).getDay()
            case "monthly":
              return dateObj.getDate() === new Date(item.startDate).getDate()
          }
        })()
        if (shouldCreate) {
          try {
            if (item.type === "expense") {
              await ctx.db.insert("expenses", {
                budgetId: item.budgetId,
                userId: item.userId,
                amount: item.amount,
                currencyCode: item.currencyCode,
                date: nextDate,
                description: item.description,
                category: item.category,
              })
              const asset = await ctx.db
                .query("budgetAssets")
                .withIndex("by_budgetId_currencyCode", (q) =>
                  q.eq("budgetId", item.budgetId).eq("currencyCode", item.currencyCode)
                )
                .first()
              if (asset) {
                await ctx.db.patch(asset._id, { amount: asset.amount - item.amount })
              }
            } else {
              await ctx.db.insert("income", {
                budgetId: item.budgetId,
                userId: item.userId,
                amount: item.amount,
                currencyCode: item.currencyCode,
                date: nextDate,
                description: item.description,
              })
              const asset = await ctx.db
                .query("budgetAssets")
                .withIndex("by_budgetId_currencyCode", (q) =>
                  q.eq("budgetId", item.budgetId).eq("currencyCode", item.currencyCode)
                )
                .first()
              if (asset) {
                await ctx.db.patch(asset._id, { amount: asset.amount + item.amount })
              }
            }
            await ctx.db.patch(item._id, { lastGeneratedDate: nextDate as number })
          } catch (error) {
            console.error(`Failed to create entry for recurring item ${item._id}:`, error)
          }
        }
        nextDate += 24 * 60 * 60 * 1000
      }
    }
  },
})
