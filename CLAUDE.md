# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Spend Tracker - A personal budget and expense tracking application built with TanStack Start, Convex, and Clerk.

### Key Features
- Create budgets with date ranges and amounts in a main currency
- Add multiple currencies with custom exchange rates per budget
- Track expenses in any budget currency
- View daily spending limits and remaining budget

## Build and Development Commands

```bash
# Install dependencies
npm install

# Start development server (runs on port 3000)
npm run dev

# Start Convex development server (run in separate terminal)
npx convex dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test
```

## Environment Setup

1. Copy `.env.example` to `.env`
2. Set up Convex:
   - Run `npx convex dev` to create a deployment
   - Copy the deployment URL to `VITE_CONVEX_URL`
   - Set `CLERK_JWT_ISSUER_DOMAIN` in Convex dashboard
3. Set up Clerk:
   - Create a Clerk application
   - Create a JWT template named "convex"
   - Copy publishable key to `VITE_CLERK_PUBLISHABLE_KEY`

## Architecture

```
Frontend (TanStack Start + React)
├── src/routes/          # TanStack Router file-based routes
│   ├── __root.tsx       # Root layout with Clerk + Convex providers
│   ├── index.tsx        # Dashboard (budget list)
│   └── budgets/
│       ├── new.tsx      # Create budget form
│       └── $budgetId.tsx # Budget detail (currencies, expenses)
├── src/components/      # React components
│   ├── ui/              # shadcn UI components
│   ├── theme-provider   # Dark/light mode support
│   └── theme-toggle     # Theme switcher
└── src/lib/utils.ts     # Utility functions (cn for classnames)

Backend (Convex)
├── convex/schema.ts         # Database schema (budgets, currencies, expenses)
├── convex/auth.config.ts    # Clerk authentication config
├── convex/budgets.ts        # Budget CRUD + daily limit calculation
├── convex/budgetCurrencies.ts # Currency management
└── convex/expenses.ts       # Expense tracking
```

### Data Model
- **budgets**: userId, name, startDate, endDate, totalAmount, mainCurrency
- **budgetCurrencies**: budgetId, currencyCode, rateToMain
- **expenses**: budgetId, userId, amount, currencyCode, date, description

### Authentication Flow
1. User signs in with Clerk
2. Clerk JWT with "convex" template is passed to Convex
3. Convex validates JWT and extracts userId from identity
4. All data is scoped by userId for security

## Tech Stack
- **Framework**: TanStack Start (Vite + TanStack Router)
- **Backend**: Convex (serverless database + functions)
- **Auth**: Clerk
- **UI**: Tailwind CSS + shadcn/ui
- **State**: TanStack Query + Convex React Query adapter
- **Utilities**: date-fns, lucide-react icons
