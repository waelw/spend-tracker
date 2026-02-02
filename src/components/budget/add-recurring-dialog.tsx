import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Plus } from "lucide-react"
import { useMutation } from "convex/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { parseLocalDate } from "@/lib/date-utils"
import { EXPENSE_CATEGORIES } from "@/constants/categories"

const addRecurringSchema = z.object({
  type: z.enum(["expense", "income"]),
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Amount must be a positive number"
  ),
  currencyCode: z.string().min(1, "Currency is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
}).refine(
  (data) => !data.endDate || data.endDate >= data.startDate,
  { message: "End date must be after start date", path: ["endDate"] }
)

type AddRecurringFormValues = z.infer<typeof addRecurringSchema>

interface AddRecurringItemDialogProps {
  budgetId: Id<"budgets">
  currencies: { currencyCode: string }[]
}

export function AddRecurringItemDialog({ budgetId, currencies }: AddRecurringItemDialogProps) {
  const [open, setOpen] = useState(false)
  const addRecurringItemMutation = useMutation(api.recurringItems.add)

  const form = useForm<AddRecurringFormValues>({
    resolver: zodResolver(addRecurringSchema),
    defaultValues: {
      type: "expense",
      amount: "",
      currencyCode: currencies[0]?.currencyCode || "",
      description: "",
      category: "",
      frequency: "monthly",
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: "",
    },
  })

  const selectedType = form.watch("type")
  const selectedCurrency = form.watch("currencyCode")
  const startDate = form.watch("startDate")

  // Update currency when currencies list changes
  useEffect(() => {
    if (currencies.length > 0 && !currencies.find((c) => c.currencyCode === selectedCurrency)) {
      form.setValue("currencyCode", currencies[0].currencyCode)
    }
  }, [currencies, selectedCurrency, form])

  const onSubmit = async (values: AddRecurringFormValues) => {
    try {
      await addRecurringItemMutation({
        budgetId,
        type: values.type,
        amount: parseFloat(values.amount),
        currencyCode: values.currencyCode,
        description: values.description || undefined,
        category: values.type === "expense" ? (values.category || undefined) : undefined,
        frequency: values.frequency,
        startDate: parseLocalDate(values.startDate).getTime(),
        endDate: values.endDate ? parseLocalDate(values.endDate).getTime() : undefined,
      })
      setOpen(false)
      form.reset()
    } catch (err) {
      console.error("Failed to add recurring item:", err)
      form.setError("root", {
        message: err instanceof Error ? err.message : "Failed to add recurring item",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) form.reset()
    }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Recurring
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Recurring {selectedType === "expense" ? "Expense" : "Income"}</DialogTitle>
          <DialogDescription>
            Create an automatic {selectedType === "expense" ? "expense" : "income"} that repeats on a schedule
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {form.formState.errors.root && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {form.formState.errors.root.message}
              </div>
            )}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currencyCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currencies.map((c) => (
                          <SelectItem key={c.currencyCode} value={c.currencyCode}>
                            {c.currencyCode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Rent, Salary" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {selectedType === "expense" && (
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category (optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date (optional)</FormLabel>
                    <FormControl>
                      <Input type="date" min={startDate} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting || currencies.length === 0}>
                {form.formState.isSubmitting ? "Adding..." : "Add Recurring"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
