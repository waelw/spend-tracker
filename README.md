# Spend Tracker

A modern, full-stack budget tracking application built with TanStack Start, Convex, and Clerk. Track your budgets across multiple currencies, set daily spending limits, and manage expenses with real-time updates.

![Spend Tracker](https://img.shields.io/badge/Status-Active-success)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![TanStack Start](https://img.shields.io/badge/TanStack%20Start-RC-orange)
![Convex](https://img.shields.io/badge/Convex-1.31-green)

## Features

### Budget Management
- **Create budgets** with custom date ranges (start and end dates)
- **Set total budget amount** in your preferred main currency
- **Name your budgets** for easy organization
- **View all budgets** in a beautiful dashboard with quick stats

### Multi-Currency Support
- **Add multiple currencies** to each budget
- **Set custom exchange rates** between currencies for each budget
- **Track expenses** in any currency within a budget
- **Automatic conversion** to main currency for spending calculations

### Daily Spending Limits
- **Automatic daily limit calculation** based on budget duration and total amount
- **Real-time tracking** of today's spending vs. daily limit
- **Visual indicators** showing remaining budget for the day
- **Daily breakdown** showing spending patterns over time

### Expense & Income Tracking
- **Add expenses** with amount, currency, date, and optional description
- **Track income** to adjust your available budget
- **View expense history** organized by date
- **Delete expenses** and income entries as needed

### User Experience
- **Dark mode support** with seamless theme switching
- **Responsive design** that works on all devices
- **Real-time updates** powered by Convex's reactive queries
- **Beautiful UI** built with shadcn/ui components
- **Secure authentication** via Clerk

## Tech Stack

### Frontend
- **[TanStack Start](https://tanstack.com/start)** - Full-stack React framework with SSR
- **[TanStack Router](https://tanstack.com/router)** - Type-safe routing
- **[TanStack Query](https://tanstack.com/query)** - Data fetching and state management
- **[React](https://react.dev)** - UI library
- **[Tailwind CSS](https://tailwindcss.com)** - Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com)** - High-quality component library
- **[date-fns](https://date-fns.org)** - Date utility library
- **[Recharts](https://recharts.org)** - Chart library for visualizations

### Backend & Infrastructure
- **[Convex](https://convex.dev)** - Backend-as-a-Service with real-time database
- **[Clerk](https://clerk.com)** - Authentication and user management
- **[Vite](https://vitejs.dev)** - Build tool and dev server

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A [Convex](https://convex.dev) account (free tier available)
- A [Clerk](https://clerk.com) account (free tier available)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd spend-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Convex**
   ```bash
   npx convex dev
   ```
   This will:
   - Prompt you to log in or create a Convex account
   - Create a new Convex project
   - Generate the `convex/` folder with backend functions
   - Save your deployment URL to `.env`

4. **Set up Clerk**
   - Sign up at [clerk.com](https://clerk.com)
   - Create a new application
   - In the Clerk Dashboard, go to **JWT Templates**
   - Create a new template and select **Convex**
   - **Important:** The JWT token must be named `convex` (do not rename it)
   - Copy the **Issuer URL** (your Frontend API URL)
   - In the Convex Dashboard, go to your deployment settings
   - Add an environment variable: `CLERK_JWT_ISSUER_DOMAIN` = your Issuer URL
   - Copy your **Publishable Key** from Clerk Dashboard → API Keys

5. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # Convex (automatically added by `npx convex dev`)
   VITE_CONVEX_URL=your_convex_deployment_url
   
   # Clerk
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   ```

   Or copy from the example:
   ```bash
   cp .env.example .env
   ```
   Then fill in your values.

6. **Start the development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

## Project Structure

```
spend-tracker/
├── convex/                 # Convex backend functions
│   ├── _generated/        # Auto-generated types
│   ├── auth.config.ts     # Clerk authentication config
│   ├── schema.ts          # Database schema definition
│   ├── budgets.ts         # Budget CRUD operations
│   ├── budgetCurrencies.ts # Currency & exchange rate management
│   ├── expenses.ts        # Expense tracking
│   └── income.ts          # Income tracking
├── src/
│   ├── components/        # React components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── theme-provider.tsx
│   │   └── theme-toggle.tsx
│   ├── routes/           # TanStack Router routes
│   │   ├── __root.tsx    # Root layout
│   │   ├── index.tsx     # Dashboard
│   │   └── budgets/      # Budget routes
│   ├── lib/              # Utility functions
│   ├── router.tsx        # Router configuration
│   └── styles.css        # Global styles
├── public/               # Static assets
├── app.config.ts        # App configuration
├── vite.config.ts       # Vite configuration
└── package.json         # Dependencies
```

## Usage

### Creating a Budget

1. Click **"New Budget"** on the dashboard
2. Enter:
   - Budget name (optional)
   - Start date
   - End date
   - Total amount
   - Main currency (e.g., USD, EUR, GBP)
3. Click **"Create Budget"**

### Adding Currencies

1. Open a budget detail page
2. Go to the **Currencies** tab
3. Click **"Add Currency"**
4. Enter:
   - Currency code (e.g., EUR, JPY)
   - Exchange rate to main currency (e.g., 1 EUR = 1.1 USD means rate is 1.1)
5. Click **"Add"**

### Updating Exchange Rates from API (Optional)

You can optionally fetch live exchange rates from an external API:

1. Get a free API key from [exchangerate-api.com](https://www.exchangerate-api.com/) (1500 requests/month free)
2. Set the API key in Convex environment:
   ```bash
   npx convex env set EXCHANGE_RATE_API_KEY your_api_key_here
   ```
3. In the budget detail page, click **"Update Rates"** in the Currencies section
4. All non-main currency rates will be updated from the API
5. You can still manually edit any rate after a refresh to override it

**Note:** Without the API key configured, the "Update Rates" button will show an error. Manual rate entry always works regardless of API configuration.

### Adding Expenses

1. Open a budget detail page
2. Go to the **Expenses** tab
3. Click **"Add Expense"**
4. Enter:
   - Amount
   - Currency (must be main currency or one of the added currencies)
   - Date (defaults to today)
   - Description (optional)
5. Click **"Add"**

### Viewing Daily Limits

- The dashboard shows **Today's Limit** and **Remaining Today** for each budget
- The budget detail page shows detailed daily breakdown with charts
- Daily limit = Total Budget ÷ Number of Days in Budget Period

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests

### Convex Development

Keep `npx convex dev` running in a separate terminal during development. It will:
- Watch for changes in `convex/` folder
- Sync functions to your Convex deployment
- Regenerate TypeScript types

### Type Safety

The project uses TypeScript with end-to-end type safety:
- Convex generates types from your schema
- Import types from `convex/_generated/api` and `convex/_generated/dataModel`
- TanStack Router provides type-safe routing

## Deployment

### Building for Production

```bash
npm run build
```

### Environment Variables

Make sure to set these environment variables in your hosting platform:

- `VITE_CONVEX_URL` - Your Convex deployment URL
- `VITE_CLERK_PUBLISHABLE_KEY` - Your Clerk publishable key

**Convex Environment Variables** (set via `npx convex env set`):
- `CLERK_JWT_ISSUER_DOMAIN` - Your Clerk issuer URL (required)
- `EXCHANGE_RATE_API_KEY` - API key from [exchangerate-api.com](https://www.exchangerate-api.com/) (optional, for live rate updates)

### Convex Production Deployment

1. In Convex Dashboard, create a production deployment
2. Set `CLERK_JWT_ISSUER_DOMAIN` for production (use your production Clerk issuer URL)
3. Deploy:
   ```bash
   npx convex deploy --prod
   ```

### Clerk Production

Update your Clerk application settings:
- Add your production domain to allowed origins
- Use production API keys (`pk_live_...` instead of `pk_test_...`)

## Database Schema

### Budgets
- `userId` - Clerk user ID
- `name` - Optional budget name
- `startDate` - Start date timestamp (ms)
- `endDate` - End date timestamp (ms)
- `totalAmount` - Total budget amount
- `mainCurrency` - Main currency code

### Budget Currencies
- `budgetId` - Reference to budget
- `currencyCode` - Currency code (e.g., "EUR")
- `rateToMain` - Exchange rate to main currency

### Expenses
- `budgetId` - Reference to budget
- `userId` - Clerk user ID
- `amount` - Expense amount
- `currencyCode` - Currency of expense
- `date` - Date timestamp (ms)
- `description` - Optional description

### Income
- `budgetId` - Reference to budget
- `userId` - Clerk user ID
- `amount` - Income amount
- `currencyCode` - Currency of income
- `date` - Date timestamp (ms)
- `description` - Optional description

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- Built with [TanStack Start](https://tanstack.com/start)
- Backend powered by [Convex](https://convex.dev)
- Authentication by [Clerk](https://clerk.com)
- UI components from [shadcn/ui](https://ui.shadcn.com)
