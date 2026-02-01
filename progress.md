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

## 2026-02-01: Expense Categories Feature

### Completed
- Added optional `category` field to expenses schema in `convex/schema.ts`
  - Added index `by_budgetId_category` for efficient category-based queries
  - Default categories: Food, Transport, Entertainment, Shopping, Bills, Health, Education, Travel, Other

- Updated `expenses.add` mutation in `convex/expenses.ts` to support category parameter

- Updated `expenses.update` mutation in `convex/expenses.ts` to support category editing

- Enhanced UI in `src/routes/budgets/$budgetId.tsx`:
  - Added `EXPENSE_CATEGORIES` constant with predefined category options
  - Added category dropdown in AddExpenseForm (between date and description fields)
  - Enhanced ExpenseRow component with:
    - Category display as a pill/badge in the table
    - Full inline edit form with category selector
    - Edit and delete buttons for each expense
  - Added category filter dropdown in Expenses List header
    - Filter by: All Categories, Uncategorized, or specific category
  - Mobile-responsive: category shown inline with description on small screens

### Files Changed
- `convex/schema.ts` - Added category field and index to expenses table
- `convex/expenses.ts` - Added category support to add and update mutations
- `src/routes/budgets/$budgetId.tsx` - Added category UI (form, display, filter, inline edit)

## 2026-02-01: Filter and Search Feature

### Completed
- Enhanced `expenses.listByBudget` query in `convex/expenses.ts` with advanced filtering:
  - Date range filter (startDate, endDate)
  - Category filter (including uncategorized option)
  - Amount range filter (minAmount, maxAmount)
  - Description search (case-insensitive)
  - Results remain sorted by date (newest first)

- Enhanced `income.listByBudget` query in `convex/income.ts` with similar filtering:
  - Date range filter (startDate, endDate)
  - Amount range filter (minAmount, maxAmount)
  - Description search (case-insensitive)
  - Results remain sorted by date (newest first)

- Updated UI in `src/routes/budgets/$budgetId.tsx`:
  - Added `Filter` and `FilterX` icons from lucide-react
  - Added state management for expense and income filters:
    - showExpenseFilters/showIncomeFilters (toggle visibility)
    - expenseFilters/incomeFilters (filter values)
  - Added "Filters" button in Expenses section that toggles a collapsible filter panel
  - Added "Filters" button in Income section with similar functionality
  - Filter panels include:
    - Search description text input
    - Date range inputs (start and end)
    - Amount range inputs (min and max)
    - "Clear All" button to reset all filters
  - Category filter (previously implemented) still works in conjunction with other filters
  - Updated `useQuery` calls to pass filter parameters to backend queries
  - Responsive design with grid layout for filter inputs (1 column on mobile, 2 columns on desktop)

### Files Changed
- `convex/expenses.ts` - Enhanced listByBudget query with filter parameters
- `convex/income.ts` - Enhanced listByBudget query with filter parameters
- `src/routes/budgets/$budgetId.tsx` - Added filter UI and state management
