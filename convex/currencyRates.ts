import { v } from "convex/values"
import { action, internalQuery, internalMutation } from "./_generated/server"
import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"

// Exchange rate API response type
interface ExchangeRateResponse {
  result: "success" | "error"
  "error-type"?: string
  base_code?: string
  conversion_rates?: Record<string, number>
}

// Result type for the action
interface RefreshRatesResult {
  success: boolean
  message: string
  updated: number
  total?: number
}

// Internal query to get budget by ID with ownership verification
export const getBudgetInternal = internalQuery({
  args: { budgetId: v.id("budgets"), userId: v.string() },
  handler: async (ctx, args) => {
    const budget = await ctx.db.get(args.budgetId)
    if (!budget || budget.userId !== args.userId) {
      return null
    }
    return budget
  },
})

// Internal query to get currencies for a budget
export const getCurrenciesInternal = internalQuery({
  args: { budgetId: v.id("budgets") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("budgetCurrencies")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.budgetId))
      .collect()
  },
})

// Internal mutation to update a currency rate
export const updateRateInternal = internalMutation({
  args: { id: v.id("budgetCurrencies"), rateToMain: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { rateToMain: args.rateToMain })
  },
})

/**
 * Refreshes exchange rates for all non-main currencies in a budget
 * from an external API (exchangerate-api.com).
 *
 * Requires EXCHANGE_RATE_API_KEY to be set in Convex environment variables.
 * Set it with: npx convex env set EXCHANGE_RATE_API_KEY your_key
 */
export const refreshRates = action({
  args: {
    budgetId: v.id("budgets"),
    currencyCode: v.optional(v.string()), // Optional: refresh only a specific currency
  },
  handler: async (ctx, args): Promise<RefreshRatesResult> => {
    // Get user identity
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }

    // Get the budget and verify ownership
    const budget = await ctx.runQuery(internal.currencyRates.getBudgetInternal, {
      budgetId: args.budgetId,
      userId: identity.subject,
    })
    if (!budget) {
      throw new Error("Budget not found or you do not have access to it")
    }

    // Get all currencies for this budget
    const currencies = await ctx.runQuery(internal.currencyRates.getCurrenciesInternal, {
      budgetId: args.budgetId,
    })

    // Filter to non-main currencies (main currency always stays at rate 1)
    let currenciesToUpdate = currencies.filter(
      (c: { currencyCode: string; _id: Id<"budgetCurrencies"> }) =>
        c.currencyCode !== budget.mainCurrency
    )

    // If a specific currency was requested, filter to just that one
    if (args.currencyCode) {
      if (args.currencyCode === budget.mainCurrency) {
        // Main currency doesn't need API refresh
        return { success: true, message: "Main currency rate is always 1", updated: 0 }
      }
      currenciesToUpdate = currenciesToUpdate.filter(
        (c: { currencyCode: string }) => c.currencyCode === args.currencyCode
      )
      if (currenciesToUpdate.length === 0) {
        throw new Error(`Currency ${args.currencyCode} not found in this budget`)
      }
    }

    // If no non-main currencies, nothing to update
    if (currenciesToUpdate.length === 0) {
      return { success: true, message: "No currencies to update", updated: 0 }
    }

    // Get API key from environment
    const apiKey = process.env.EXCHANGE_RATE_API_KEY
    if (!apiKey) {
      throw new Error(
        "Exchange rate API key not configured. Set EXCHANGE_RATE_API_KEY in Convex environment variables."
      )
    }

    // Fetch exchange rates from API
    // Using exchangerate-api.com with base as our main currency
    const apiUrl = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${budget.mainCurrency}`

    let response: Response
    try {
      response = await fetch(apiUrl)
    } catch {
      throw new Error("Failed to connect to exchange rate service. Please try again later.")
    }

    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status} ${response.statusText}`)
    }

    const data: ExchangeRateResponse = await response.json()

    if (data.result !== "success") {
      // Handle specific API errors
      if (data["error-type"] === "invalid-key") {
        throw new Error("Invalid exchange rate API key. Please check your configuration.")
      }
      if (data["error-type"] === "unsupported-code") {
        throw new Error(`Currency code ${budget.mainCurrency} is not supported by the exchange rate API.`)
      }
      throw new Error(`Exchange rate API error: ${data["error-type"] || "unknown error"}`)
    }

    if (!data.conversion_rates) {
      throw new Error("Exchange rate API returned no conversion rates")
    }

    // Update each non-main currency
    // API returns: 1 mainCurrency = X targetCurrency
    // We store: 1 targetCurrency = rateToMain mainCurrency
    // So: rateToMain = 1 / apiRate
    let updatedCount = 0
    const errors: string[] = []

    for (const currency of currenciesToUpdate) {
      const apiRate = data.conversion_rates[currency.currencyCode]

      if (apiRate === undefined || apiRate === null) {
        // API doesn't have this currency - skip it, keep existing rate
        errors.push(`No rate available for ${currency.currencyCode}`)
        continue
      }

      if (apiRate <= 0) {
        errors.push(`Invalid rate for ${currency.currencyCode}`)
        continue
      }

      // Convert: 1 mainCurrency = apiRate targetCurrency
      // We want: 1 targetCurrency = ? mainCurrency
      // So: rateToMain = 1 / apiRate
      const rateToMain = 1 / apiRate

      try {
        await ctx.runMutation(internal.currencyRates.updateRateInternal, {
          id: currency._id,
          rateToMain,
        })
        updatedCount++
      } catch {
        errors.push(`Failed to update ${currency.currencyCode}`)
      }
    }

    // Build result message
    let message: string
    if (updatedCount === currenciesToUpdate.length) {
      message = `Successfully updated ${updatedCount} currency rate${updatedCount !== 1 ? "s" : ""}`
    } else if (updatedCount > 0) {
      message = `Updated ${updatedCount} of ${currenciesToUpdate.length} currencies`
      if (errors.length > 0) {
        message += `. Note: ${errors.join(", ")}`
      }
    } else {
      message = "Could not update any currency rates"
      if (errors.length > 0) {
        message += `: ${errors.join(", ")}`
      }
    }

    return {
      success: updatedCount > 0 || currenciesToUpdate.length === 0,
      message,
      updated: updatedCount,
      total: currenciesToUpdate.length,
    }
  },
})
