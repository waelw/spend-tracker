import { useState } from "react"
import { format } from "date-fns"
import { Edit2, Trash2, Check, X } from "lucide-react"
import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TableCell, TableRow } from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCurrency } from "@/lib/currency-utils"
import { parseLocalDate } from "@/lib/date-utils"

interface IncomeRowProps {
  income: {
    _id: Id<"income">
    amount: number
    currencyCode: string
    date: number
    description?: string
  }
  currencies: { currencyCode: string }[]
}

export function IncomeRow({ income, currencies }: IncomeRowProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editAmount, setEditAmount] = useState(income.amount.toString())
  const [editCurrency, setEditCurrency] = useState(income.currencyCode)
  const [editDate, setEditDate] = useState(format(new Date(income.date), "yyyy-MM-dd"))
  const [editDescription, setEditDescription] = useState(income.description || "")
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteIncomeMutation = useMutation(api.income.remove)
  const updateIncomeMutation = useMutation(api.income.update)
  const today = format(new Date(), "yyyy-MM-dd")

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteIncomeMutation({ id: income._id })
    } catch (error) {
      console.error("Failed to delete income:", error)
      setIsDeleting(false)
    }
  }

  const handleStartEdit = () => {
    setEditAmount(income.amount.toString())
    setEditCurrency(income.currencyCode)
    setEditDate(format(new Date(income.date), "yyyy-MM-dd"))
    setEditDescription(income.description || "")
    setError(null)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setError(null)
  }

  const handleSaveEdit = async () => {
    setError(null)
    const amountNum = parseFloat(editAmount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be greater than 0")
      return
    }

    if (editDate > today) {
      setError("Cannot set income for future dates")
      return
    }

    setIsUpdating(true)
    try {
      await updateIncomeMutation({
        id: income._id,
        amount: amountNum,
        currencyCode: editCurrency,
        date: parseLocalDate(editDate).getTime(),
        description: editDescription || undefined,
      })
      setIsEditing(false)
    } catch (err) {
      console.error("Failed to update income:", err)
      setError(err instanceof Error ? err.message : "Failed to update income")
    } finally {
      setIsUpdating(false)
    }
  }

  if (isEditing) {
    return (
      <TableRow>
        <TableCell colSpan={4} className="p-2">
          <div className="space-y-3 p-2 bg-muted/50 rounded-lg">
            {error && (
              <div className="p-2 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor={`edit-income-amount-${income._id}`} className="text-xs">Amount</Label>
                <Input
                  id={`edit-income-amount-${income._id}`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`edit-income-currency-${income._id}`} className="text-xs">Currency</Label>
                <Select value={editCurrency} onValueChange={setEditCurrency}>
                  <SelectTrigger id={`edit-income-currency-${income._id}`} className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c.currencyCode} value={c.currencyCode}>
                        {c.currencyCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor={`edit-income-date-${income._id}`} className="text-xs">Date</Label>
                <Input
                  id={`edit-income-date-${income._id}`}
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  max={today}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`edit-income-desc-${income._id}`} className="text-xs">Description</Label>
                <Input
                  id={`edit-income-desc-${income._id}`}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Optional"
                  className="h-8"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                disabled={isUpdating}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={isUpdating}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-1" />
                {isUpdating ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <TableRow>
      <TableCell className="whitespace-nowrap">
        <span className="hidden sm:inline">{format(new Date(income.date), "MMM d, yyyy")}</span>
        <span className="sm:hidden">{format(new Date(income.date), "M/d")}</span>
      </TableCell>
      <TableCell className="max-w-[120px] truncate sm:max-w-none">{income.description || "-"}</TableCell>
      <TableCell className="text-right font-medium text-green-600 whitespace-nowrap">
        +{formatCurrency(income.amount, income.currencyCode)}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleStartEdit}
          >
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
      </TableCell>
    </TableRow>
  )
}
