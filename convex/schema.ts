import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  budgets: defineTable({
    userId: v.string(),
    name: v.optional(v.string()),
    startDate: v.number(), // timestamp ms
    endDate: v.number(), // timestamp ms
    totalAmount: v.optional(v.number()), // Legacy field - now computed from budgetAssets
    mainCurrency: v.string(),
  }).index("by_userId", ["userId"]),

  budgetCurrencies: defineTable({
    budgetId: v.id("budgets"),
    currencyCode: v.string(),
    rateToMain: v.number(), // 1 unit of this currency = rateToMain units of main currency
  }).index("by_budgetId", ["budgetId"]),

  budgetAssets: defineTable({
    budgetId: v.id("budgets"),
    currencyCode: v.string(),
    amount: v.number(), // Current balance in this currency
  })
    .index("by_budgetId", ["budgetId"])
    .index("by_budgetId_currencyCode", ["budgetId", "currencyCode"]),

  assetTransfers: defineTable({
    budgetId: v.id("budgets"),
    userId: v.string(),
    fromCurrency: v.string(),
    toCurrency: v.string(),
    fromAmount: v.number(),
    toAmount: v.number(),
    rateUsed: v.number(),
    date: v.number(), // timestamp ms
    description: v.optional(v.string()),
  })
    .index("by_budgetId", ["budgetId"])
    .index("by_budgetId_date", ["budgetId", "date"]),

  expenses: defineTable({
    budgetId: v.id("budgets"),
    userId: v.string(),
    amount: v.number(),
    currencyCode: v.string(),
    date: v.number(), // timestamp ms
    description: v.optional(v.string()),
    category: v.optional(v.string()), // e.g., Food, Transport, Entertainment
  })
    .index("by_budgetId", ["budgetId"])
    .index("by_budgetId_date", ["budgetId", "date"])
    .index("by_budgetId_category", ["budgetId", "category"]),

  income: defineTable({
    budgetId: v.id("budgets"),
    userId: v.string(),
    amount: v.number(),
    currencyCode: v.string(),
    date: v.number(), // timestamp ms
    description: v.optional(v.string()),
  })
    .index("by_budgetId", ["budgetId"])
    .index("by_budgetId_date", ["budgetId", "date"]),

  recurringItems: defineTable({
    budgetId: v.id("budgets"),
    userId: v.string(),
    type: v.union(v.literal("expense"), v.literal("income")),
    amount: v.number(),
    currencyCode: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()), // for expenses
    frequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
    startDate: v.number(), // timestamp ms - when to start generating entries
    endDate: v.optional(v.number()), // timestamp ms - when to stop generating (optional)
    lastGeneratedDate: v.optional(v.number()), // timestamp ms - last date for which an entry was created
    paused: v.optional(v.boolean()), // whether the recurring item is paused
  })
    .index("by_budgetId", ["budgetId"])
    .index("by_budgetId_userId", ["budgetId", "userId"]),

  alerts: defineTable({
    userId: v.string(),
    budgetId: v.id("budgets"),
    type: v.union(
      v.literal("overBudgetToday"),
      v.literal("overBudgetThreshold"),
      v.literal("budgetEndingSoon")
    ),
    message: v.string(),
    isRead: v.boolean(),
    createdAt: v.number(), // timestamp ms
  })
    .index("by_userId", ["userId"])
    .index("by_userId_isRead", ["userId", "isRead"])
    .index("by_budgetId", ["budgetId"]),
})
