import { useState } from "react"
import { Download } from "lucide-react"
import { useAction } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"

interface ExportCsvButtonProps {
  budgetId: Id<"budgets">
}

export function ExportCsvButton({ budgetId }: ExportCsvButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const exportAction = useAction(api.exportData.exportToCsv)

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)

    try {
      const result = await exportAction({ budgetId })

      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = result.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Failed to export CSV:", err)
      setError(err instanceof Error ? err.message : "Failed to export CSV")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={isExporting}
      >
        <Download className={`mr-2 h-4 w-4 ${isExporting ? "animate-pulse" : ""}`} />
        {isExporting ? "Exporting..." : "Export CSV"}
      </Button>
      {error && (
        <div className="absolute top-full right-0 mt-2 p-2 rounded-md text-sm whitespace-nowrap z-10 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          {error}
        </div>
      )}
    </div>
  )
}
