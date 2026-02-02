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
import { EXPENSE_CATEGORIES } from "@/constants/categories"

interface ExpenseRowProps {
  expense: {
    _id: Id<"expenses">
    amount: number
    currencyCode: string
    date: number
    description?: string
    category?: string
  }
  currencies: { currencyCode: string }[]
}

export function ExpenseRow({ expense, currencies }: ExpenseRowProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editAmount, setEditAmount] = useState(expense.amount.toString())
  const [editCurrency, setEditCurrency] = useState(expense.currencyCode)
  const [editDate, setEditDate] = useState(format(new Date(expense.date), "yyyy-MM-dd"))
  const [editDescription, setEditDescription] = useState(expense.description || "")
  const [editCategory, setEditCategory] = useState(expense.category || "")
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteExpenseMutation = useMutation(api.expenses.remove)
  const updateExpenseMutation = useMutation(api.expenses.update)
  const today = format(new Date(), "yyyy-MM-dd")

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteExpenseMutation({ id: expense._id })
    } catch (error) {
      console.error("Failed to delete expense:", error)
      setIsDeleting(false)
    }
  }

  const handleStartEdit = () => {
    setEditAmount(expense.amount.toString())
    setEditCurrency(expense.currencyCode)
    setEditDate(format(new Date(expense.date), "yyyy-MM-dd"))
    setEditDescription(expense.description || "")
    setEditCategory(expense.category || "")
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
      setError("Cannot set expense for future dates")
      return
    }

    setIsUpdating(true)
    try {
      await updateExpenseMutation({
        id: expense._id,
        amount: amountNum,
        currencyCode: editCurrency,
        date: parseLocalDate(editDate).getTime(),
        description: editDescription || undefined,
        category: editCategory || undefined,
      })
      setIsEditing(false)
    } catch (err) {
      console.error("Failed to update expense:", err)
      setError(err instanceof Error ? err.message : "Failed to update expense")
    } finally {
      setIsUpdating(false)
    }
  }

  if (isEditing) {
    return (
      <TableRow>
        <TableCell colSpan={5} className="p-2">
          <div className="space-y-3 p-2 bg-muted/50 rounded-lg">
            {error && (
              <div className="p-2 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor={`edit-expense-amount-${expense._id}`} className="text-xs">Amount</Label>
                <Input
                  id={`edit-expense-amount-${expense._id}`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`edit-expense-currency-${expense._id}`} className="text-xs">Currency</Label>
                <Select value={editCurrency} onValueChange={setEditCurrency}>
                  <SelectTrigger id={`edit-expense-currency-${expense._id}`} className="h-8">
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
                <Label htmlFor={`edit-expense-date-${expense._id}`} className="text-xs">Date</Label>
                <Input
                  id={`edit-expense-date-${expense._id}`}
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  max={today}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`edit-expense-category-${expense._id}`} className="text-xs">Category</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger id={`edit-expense-category-${expense._id}`} className="h-8">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`edit-expense-desc-${expense._id}`} className="text-xs">Description</Label>
              <Input
                id={`edit-expense-desc-${expense._id}`}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Optional"
                className="h-8"
              />
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
        <span className="hidden sm:inline">{format(new Date(expense.date), "MMM d, yyyy")}</span>
        <span className="sm:hidden">{format(new Date(expense.date), "M/d")}</span>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        {expense.category ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
            {expense.category}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="max-w-[120px] truncate sm:max-w-none">
        {expense.description || "-"}
        {expense.category && (
          <span className="sm:hidden text-xs text-muted-foreground ml-1">
            ({expense.category})
          </span>
        )}
      </TableCell>
      <TableCell className="text-right font-medium whitespace-nowrap">
        {formatCurrency(expense.amount, expense.currencyCode)}
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
