import { internalMutation } from "../_generated/server"

/**
 * Migration script to convert existing budgets to the asset-based system.
 *
 * For each budget:
 * 1. Calculate the current balance = totalAmount + totalIncome - totalExpenses
 * 2. Create a budgetAsset entry for the main currency with that balance
 *
 * Run this migration with:
 * npx convex run migrations/migrateToAssets:migrate
 */
export const migrate = internalMutation({
  handler: async (ctx) => {
    const budgets = await ctx.db.query("budgets").collect()
    let migratedCount = 0
    let skippedCount = 0

    for (const budget of budgets) {
      // Check if this budget already has assets (already migrated)
      const existingAssets = await ctx.db
        .query("budgetAssets")
        .withIndex("by_budgetId", (q) => q.eq("budgetId", budget._id))
        .collect()

      if (existingAssets.length > 0) {
        skippedCount++
        continue
      }

      // Get currencies for rate conversion
      const currencies = await ctx.db
        .query("budgetCurrencies")
        .withIndex("by_budgetId", (q) => q.eq("budgetId", budget._id))
        .collect()
      const rateMap = new Map(currencies.map((c) => [c.currencyCode, c.rateToMain]))

      // Get all income for this budget
      const income = await ctx.db
        .query("income")
        .withIndex("by_budgetId", (q) => q.eq("budgetId", budget._id))
        .collect()

      // Calculate total income (converted to main currency)
      const totalIncome = income.reduce((sum, i) => {
        const rate = rateMap.get(i.currencyCode) ?? 1
        return sum + i.amount * rate
      }, 0)

      // Get all expenses for this budget
      const expenses = await ctx.db
        .query("expenses")
        .withIndex("by_budgetId", (q) => q.eq("budgetId", budget._id))
        .collect()

      // Calculate total expenses (converted to main currency)
      const totalExpenses = expenses.reduce((sum, e) => {
        const rate = rateMap.get(e.currencyCode) ?? 1
        return sum + e.amount * rate
      }, 0)

      // Calculate current balance in main currency
      // Note: budget.totalAmount might be undefined for new budgets
      const initialAmount = budget.totalAmount ?? 0
      const currentBalance = initialAmount + totalIncome - totalExpenses

      // Create asset entry for the main currency
      await ctx.db.insert("budgetAssets", {
        budgetId: budget._id,
        currencyCode: budget.mainCurrency,
        amount: currentBalance,
      })

      // Also create zero-balance assets for any other currencies that have been used
      const usedCurrencies = new Set([
        ...income.map((i) => i.currencyCode),
        ...expenses.map((e) => e.currencyCode),
      ])

      for (const currencyCode of usedCurrencies) {
        if (currencyCode !== budget.mainCurrency) {
          // Check if this currency exists in budgetCurrencies
          const currencyExists = currencies.some((c) => c.currencyCode === currencyCode)
          if (currencyExists) {
            await ctx.db.insert("budgetAssets", {
              budgetId: budget._id,
              currencyCode,
              amount: 0,
            })
          }
        }
      }

      migratedCount++
    }

    return {
      success: true,
      message: `Migration complete. Migrated: ${migratedCount}, Skipped (already migrated): ${skippedCount}`,
      migratedCount,
      skippedCount,
    }
  },
})

/**
 * Check migration status - how many budgets need migration
 */
export const checkStatus = internalMutation({
  handler: async (ctx) => {
    const budgets = await ctx.db.query("budgets").collect()
    let needsMigration = 0
    let alreadyMigrated = 0

    for (const budget of budgets) {
      const existingAssets = await ctx.db
        .query("budgetAssets")
        .withIndex("by_budgetId", (q) => q.eq("budgetId", budget._id))
        .collect()

      if (existingAssets.length > 0) {
        alreadyMigrated++
      } else {
        needsMigration++
      }
    }

    return {
      totalBudgets: budgets.length,
      needsMigration,
      alreadyMigrated,
    }
  },
})
