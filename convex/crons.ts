import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

// Generate recurring expenses/income daily at 00:00 UTC (start of day)
crons.daily(
  "generate recurring items",
  { hourUTC: 0, minuteUTC: 0 },
  internal.recurringItems.generateEntriesFromTemplates
)

// Refresh exchange rates daily at 23:55 UTC (end of day)
crons.daily(
  "refresh exchange rates",
  { hourUTC: 23, minuteUTC: 55 },
  internal.currencyRates.refreshAllRates
)

export default crons
