import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { internal } from "./_generated/api"

const ONE_DAY_MS = 24 * 60 * 60 * 1000

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return []
    }
    const userId = identity.subject

    const alerts = await ctx.db
      .query("alerts")
      .withIndex("by_userId_isRead", (q) => q.eq("userId", userId).eq("isRead", false))
      .collect()

    return alerts.sort((a, b) => b.createdAt - a.createdAt)
  },
})

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return []
    }
    const userId = identity.subject

    const alerts = await ctx.db
      .query("alerts")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect()

    return alerts.sort((a, b) => b.createdAt - a.createdAt)
  },
})

export const markAsRead = mutation({
  args: { id: v.id("alerts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }
    const alert = await ctx.db.get(args.id)
    if (!alert || alert.userId !== identity.subject) {
      throw new Error("Alert not found")
    }
    await ctx.db.patch(args.id, { isRead: true })
  },
})

export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }
    const userId = identity.subject

    const alerts = await ctx.db
      .query("alerts")
      .withIndex("by_userId_isRead", (q) => q.eq("userId", userId).eq("isRead", false))
      .collect()

    for (const alert of alerts) {
      await ctx.db.patch(alert._id, { isRead: true })
    }
  },
})

export const remove = mutation({
  args: { id: v.id("alerts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }
    const alert = await ctx.db.get(args.id)
    if (!alert || alert.userId !== identity.subject) {
      throw new Error("Alert not found")
    }
    await ctx.db.delete(args.id)
  },
})

export const generateAlertsForAllBudgets = mutation({
  args: { clientToday: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }
    const userId = identity.subject

    const budgets = await ctx.db
      .query("budgets")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect()

    const todayStart = args.clientToday
    const sevenDaysFromNow = todayStart + 7 * ONE_DAY_MS

    for (const budget of budgets) {
      const metrics = await ctx.runQuery(internal.budgets.internalComputeDailyLimitMetrics, {
        budgetId: budget._id,
        clientToday: args.clientToday,
      })

      if (!metrics) continue

      const isOverToday = metrics.remainingToday < 0
      const isOverThreshold = metrics.remainingToday > 0 && metrics.remainingToday < metrics.adjustedDailyLimit * 0.2
      const isEndingSoon = budget.endDate >= todayStart && budget.endDate <= sevenDaysFromNow

      const existingAlerts = await ctx.db
        .query("alerts")
        .withIndex("by_budgetId", (q) => q.eq("budgetId", budget._id))
        .collect()

      const alertTypes = new Set(existingAlerts.map(a => a.type))

      if (isOverToday && !alertTypes.has("overBudgetToday")) {
        await ctx.db.insert("alerts", {
          userId,
          budgetId: budget._id,
          type: "overBudgetToday",
          message: `${budget.name || "Budget"}: Over daily limit by ${Math.abs(metrics.remainingToday).toFixed(2)} ${budget.mainCurrency}`,
          isRead: false,
          createdAt: Date.now(),
        })
      }

      if (isOverThreshold && !alertTypes.has("overBudgetThreshold")) {
        await ctx.db.insert("alerts", {
          userId,
          budgetId: budget._id,
          type: "overBudgetThreshold",
          message: `${budget.name || "Budget"}: Only ${metrics.remainingToday.toFixed(2)} ${budget.mainCurrency} remaining today (less than 20%)`,
          isRead: false,
          createdAt: Date.now(),
        })
      }

      if (isEndingSoon && !alertTypes.has("budgetEndingSoon")) {
        const daysLeft = Math.ceil((budget.endDate - todayStart) / ONE_DAY_MS)
        await ctx.db.insert("alerts", {
          userId,
          budgetId: budget._id,
          type: "budgetEndingSoon",
          message: `${budget.name || "Budget"}: Ends in ${daysLeft} day${daysLeft > 1 ? "s" : ""}`,
          isRead: false,
          createdAt: Date.now(),
        })
      }
    }
  },
})
