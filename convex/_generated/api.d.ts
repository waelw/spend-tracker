/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as budgetAssets from "../budgetAssets.js";
import type * as budgetCurrencies from "../budgetCurrencies.js";
import type * as budgets from "../budgets.js";
import type * as crons from "../crons.js";
import type * as currencyRates from "../currencyRates.js";
import type * as expenses from "../expenses.js";
import type * as income from "../income.js";
import type * as migrations_migrateToAssets from "../migrations/migrateToAssets.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  budgetAssets: typeof budgetAssets;
  budgetCurrencies: typeof budgetCurrencies;
  budgets: typeof budgets;
  crons: typeof crons;
  currencyRates: typeof currencyRates;
  expenses: typeof expenses;
  income: typeof income;
  "migrations/migrateToAssets": typeof migrations_migrateToAssets;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
