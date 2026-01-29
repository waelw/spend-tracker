import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  budgets: defineTable({
    userId: v.string(),
    name: v.optional(v.string()),
    startDate: v.number(), // timestamp ms
    endDate: v.number(), // timestamp ms
    totalAmount: v.number(),
    mainCurrency: v.string(),
  }).index("by_userId", ["userId"]),

  budgetCurrencies: defineTable({
    budgetId: v.id("budgets"),
    currencyCode: v.string(),
    rateToMain: v.number(), // 1 unit of this currency = rateToMain units of main currency
  }).index("by_budgetId", ["budgetId"]),

  expenses: defineTable({
    budgetId: v.id("budgets"),
    userId: v.string(),
    amount: v.number(),
    currencyCode: v.string(),
    date: v.number(), // timestamp ms
    description: v.optional(v.string()),
  })
    .index("by_budgetId", ["budgetId"])
    .index("by_budgetId_date", ["budgetId", "date"]),

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
