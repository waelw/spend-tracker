import { useState } from "react"
import { format } from "date-fns"
import { Edit2, Trash2, Check, X, Pause, Play } from "lucide-react"
import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

interface RecurringItemRowProps {
  item: {
    _id: Id<"recurringItems">
    type: "expense" | "income"
    amount: number
    currencyCode: string
    description?: string
    category?: string
    frequency: "daily" | "weekly" | "monthly"
    startDate: number
    endDate?: number
    paused?: boolean
  }
  currencies: { currencyCode: string }[]
}

export function RecurringItemRow({ item, currencies }: RecurringItemRowProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editAmount, setEditAmount] = useState(item.amount.toString())
  const [editCurrency, setEditCurrency] = useState(item.currencyCode)
  const [editDescription, setEditDescription] = useState(item.description || "")
  const [editCategory, setEditCategory] = useState(item.category || "")
  const [editFrequency, setEditFrequency] = useState(item.frequency)
  const [editStartDate, setEditStartDate] = useState(format(new Date(item.startDate), "yyyy-MM-dd"))
  const [editEndDate, setEditEndDate] = useState(item.endDate ? format(new Date(item.endDate), "yyyy-MM-dd") : "")
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteRecurringItemMutation = useMutation(api.recurringItems.remove)
  const updateRecurringItemMutation = useMutation(api.recurringItems.update)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteRecurringItemMutation({ id: item._id })
    } catch (error) {
      console.error("Failed to delete recurring item:", error)
      setIsDeleting(false)
    }
  }

  const handleTogglePaused = async () => {
    setIsUpdating(true)
    try {
      await updateRecurringItemMutation({ id: item._id, paused: !item.paused })
    } catch (error) {
      console.error("Failed to toggle paused state:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleStartEdit = () => {
    setEditAmount(item.amount.toString())
    setEditCurrency(item.currencyCode)
    setEditDescription(item.description || "")
    setEditCategory(item.category || "")
    setEditFrequency(item.frequency)
    setEditStartDate(format(new Date(item.startDate), "yyyy-MM-dd"))
    setEditEndDate(item.endDate ? format(new Date(item.endDate), "yyyy-MM-dd") : "")
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

    setIsUpdating(true)
    try {
      await updateRecurringItemMutation({
        id: item._id,
        amount: amountNum,
        currencyCode: editCurrency,
        description: editDescription || undefined,
        category: item.type === "expense" ? (editCategory || undefined) : undefined,
        frequency: editFrequency,
        startDate: parseLocalDate(editStartDate).getTime(),
        endDate: editEndDate ? parseLocalDate(editEndDate).getTime() : undefined,
      })
      setIsEditing(false)
    } catch (err) {
      console.error("Failed to update recurring item:", err)
      setError(err instanceof Error ? err.message : "Failed to update recurring item")
    } finally {
      setIsUpdating(false)
    }
  }

  if (isEditing) {
    return (
      <div className="p-4 bg-muted/50 rounded-lg space-y-3">
        {error && (
          <div className="p-2 text-sm text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Amount</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Currency</Label>
            <Select value={editCurrency} onValueChange={setEditCurrency}>
              <SelectTrigger className="h-8">
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
        <div className="space-y-1">
          <Label className="text-xs">Description</Label>
          <Input
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Optional"
            className="h-8"
          />
        </div>
        {item.type === "expense" && (
          <div className="space-y-1">
            <Label className="text-xs">Category</Label>
            <Select value={editCategory} onValueChange={setEditCategory}>
              <SelectTrigger className="h-8">
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
        )}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Frequency</Label>
            <Select value={editFrequency} onValueChange={(v: "daily" | "weekly" | "monthly") => setEditFrequency(v)}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Start Date</Label>
            <Input
              type="date"
              value={editStartDate}
              onChange={(e) => setEditStartDate(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">End Date (optional)</Label>
            <Input
              type="date"
              value={editEndDate}
              onChange={(e) => setEditEndDate(e.target.value)}
              min={editStartDate}
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
          >
            <Check className="h-4 w-4 mr-1" />
            {isUpdating ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`p-4 border rounded-lg ${item.paused ? "bg-muted/30 opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${item.type === "income" ? "text-green-600" : ""}`}>
              {item.type === "expense" ? "-" : "+"}{formatCurrency(item.amount, item.currencyCode)}
            </span>
            <span className="text-xs bg-secondary px-2 py-0.5 rounded capitalize">
              {item.frequency}
            </span>
            {item.paused && (
              <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                Paused
              </span>
            )}
          </div>
          {item.description && (
            <p className="text-sm">{item.description}</p>
          )}
          {item.type === "expense" && item.category && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              {item.category}
            </span>
          )}
          <p className="text-xs text-muted-foreground">
            Starts: {format(new Date(item.startDate), "MMM d, yyyy")}
            {item.endDate && ` • Ends: ${format(new Date(item.endDate), "MMM d, yyyy")}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleTogglePaused}
            title={item.paused ? "Resume" : "Pause"}
            disabled={isUpdating}
          >
            {item.paused ? (
              <Play className="h-4 w-4" />
            ) : (
              <Pause className="h-4 w-4" />
            )}
          </Button>
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
      </div>
    </div>
  )
}
