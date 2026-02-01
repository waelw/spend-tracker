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
})
