import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

// Refresh exchange rates daily at 23:55 UTC (end of day)
crons.daily(
  "refresh exchange rates",
  { hourUTC: 23, minuteUTC: 55 },
  internal.currencyRates.refreshAllRates
)

export default crons
