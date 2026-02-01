# Progress Log

## 2026-02-01: Budget Copy/Template Feature

### Completed
- Added `duplicate` mutation in `convex/budgets.ts`:
  - Creates a new budget with copied name (appends "(Copy)" suffix)
  - Copies date range and main currency
  - Copies all budgetCurrencies
  - Copies all budgetAssets
  - Optional parameters for copying:
    - expenses
    - income
    - recurring items
  - Returns the new budgetId

- Added `DuplicateBudgetDialog` component in `src/routes/budgets/$budgetId.tsx`:
  - Dialog with checkboxes to select what to copy
  - Options: copy expenses, copy income, copy recurring items
  - Form validation and error handling
  - Loading state during duplication
  - Navigates to the new budget after successful duplication

- Updated UI in `src/routes/budgets/$budgetId.tsx`:
  - Added `Copy` icon to imports from lucide-react
  - Added "Duplicate" button next to "Delete Budget" button
  - Button opens the DuplicateBudgetDialog

### Files Changed
- `convex/budgets.ts` - Added duplicate mutation
- `src/routes/budgets/$budgetId.tsx` - Added DuplicateBudgetDialog component and button

## 2026-02-01: Recurring Expenses/Income Feature

### Completed
- Added `recurringItems` schema table in `convex/schema.ts`:
  - Fields: budgetId, userId, type (expense/income), amount, currencyCode, description, category (for expenses), frequency (daily/weekly/monthly), startDate, endDate (optional), lastGeneratedDate (optional), paused (optional)
  - Indexes: by_budgetId, by_budgetId_userId

- Created `convex/recurringItems.ts` with full CRUD operations:
  - `listByBudget` - Query all recurring items for a budget
  - `add` - Create new recurring item with validation
  - `update` - Edit recurring item details and pause/resume
  - `remove` - Delete recurring item
  - `generateEntriesFromTemplates` - Internal mutation (cron job) that creates expense/income entries from templates:
    - Runs daily at 00:00 UTC
    - Generates entries for each day based on frequency (daily/weekly/monthly)
    - Handles asset balance updates (deduct for expenses, add for income)
    - Tracks lastGeneratedDate to avoid duplicates
    - Respects endDate and paused status
    - Handles errors gracefully with try-catch

- Updated `convex/crons.ts` to run recurring item generation daily:
  - Cron job runs at 00:00 UTC (start of day)
  - Calls internal.recurringItems.generateEntriesFromTemplates

- Updated UI in `src/routes/budgets/$budgetId.tsx`:
  - Added new icons: Repeat, Pause, Play
  - Added Recurring Items card section after Income list
  - Created `AddRecurringItemDialog` component:
    - Full form to add recurring expense or income
    - Fields: type, amount, currency, description, category (for expenses), frequency, start date, end date (optional)
    - Form validation (amount > 0, end date after start date)
    - Error handling and loading states
  - Created `RecurringItemRow` component:
    - Displays recurring item details (type, amount, frequency, paused status, dates)
    - Inline edit form matching existing expense/income patterns
    - Pause/resume toggle button with Play/Pause icons
    - Edit and delete buttons
    - Visual distinction for paused items (dimmed opacity)

### Files Changed
- `convex/schema.ts` - Added recurringItems table and indexes
- `convex/recurringItems.ts` - New file with recurring items CRUD and cron job
- `convex/crons.ts` - Added daily cron job for recurring item generation
- `src/routes/budgets/$budgetId.tsx` - Added Recurring Items section with full UI

## 2026-02-01: CSV Export Feature

### Completed
- Added CSV export functionality for expenses and income:
  - Created `convex/exportData.ts` with export action:
    - `getExpensesInternal` - Internal query for filtered expenses
    - `getIncomeInternal` - Internal query for filtered income
    - `getBudgetInternal` - Internal query for budget verification
    - `exportToCsv` - Action that generates CSV with columns: Type, Date, Amount, Currency, Description, Category
  - CSV includes both expenses and income sorted by date (newest first)
  - Filename includes budget name and optional date range

- Updated UI in `src/routes/budgets/$budgetId.tsx`:
  - Added `Download` icon from lucide-react
  - Created `ExportCsvButton` component:
    - Uses Convex action to generate CSV
    - Creates Blob and triggers file download in browser
    - Shows loading state while exporting
    - Error handling with user-friendly messages
  - Added "Export CSV" button to Income section header
  - Added "Export CSV" button to Expenses section header

### Files Changed
- `convex/exportData.ts` - New file with CSV export action and internal queries
- `src/routes/budgets/$budgetId.tsx` - Added ExportCsvButton component and UI integration



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
