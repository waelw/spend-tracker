import { useState } from "react"
import { Edit2, Trash2 } from "lucide-react"
import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TableCell, TableRow } from "@/components/ui/table"

interface CurrencyRowProps {
  currency: {
    _id: Id<"budgetCurrencies">
    currencyCode: string
    rateToMain: number
  }
  isMain: boolean
}

export function CurrencyRow({ currency, isMain }: CurrencyRowProps) {
  const [editing, setEditing] = useState(false)
  const [newRate, setNewRate] = useState(currency.rateToMain.toString())
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const updateRateMutation = useMutation(api.budgetCurrencies.updateRate)
  const deleteCurrencyMutation = useMutation(api.budgetCurrencies.remove)

  const handleUpdateRate = async () => {
    setIsUpdating(true)
    try {
      await updateRateMutation({
        id: currency._id,
        rateToMain: parseFloat(newRate),
      })
      setEditing(false)
    } catch (error) {
      console.error("Failed to update rate:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteCurrencyMutation({ id: currency._id })
    } catch (error) {
      console.error("Failed to delete currency:", error)
      setIsDeleting(false)
    }
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{currency.currencyCode}</TableCell>
      <TableCell>
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.0001"
              min="0"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              className="w-24"
            />
            <Button size="sm" onClick={handleUpdateRate} disabled={isUpdating}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          currency.rateToMain
        )}
      </TableCell>
      <TableCell>
        {!isMain && !editing && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setEditing(true)}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
        {isMain && <span className="text-xs text-muted-foreground">Main</span>}
      </TableCell>
    </TableRow>
  )
}
