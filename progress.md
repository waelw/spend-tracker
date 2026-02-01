# Progress Log

## 2026-02-01: Edit Income Feature

### Completed
- Added `income.update` mutation in `convex/income.ts` following the same pattern as `expenses.update`
  - Supports optional updates for: amount, currencyCode, date, description
  - Properly handles asset balance updates when amount or currency changes
  - Validates currency exists for the budget before updating

- Updated `IncomeRow` component in `src/routes/budgets/$budgetId.tsx` with inline editing:
  - Added edit button alongside delete button
  - Inline edit form with fields for amount, currency, date, and description
  - Form validation (no future dates, amount > 0)
  - Error handling and loading states
  - Consistent styling with the rest of the app (green accent for income)

### Files Changed
- `convex/income.ts` - Added update mutation
- `src/routes/budgets/$budgetId.tsx` - Enhanced IncomeRow component with edit functionality
