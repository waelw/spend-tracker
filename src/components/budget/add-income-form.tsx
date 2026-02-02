import { useEffect } from "react"
import { format } from "date-fns"
import { useMutation } from "convex/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

const today = format(new Date(), "yyyy-MM-dd")

const addIncomeSchema = z.object({
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Amount must be a positive number"
  ),
  currencyCode: z.string().min(1, "Currency is required"),
  date: z.string().min(1, "Date is required").refine(
    (val) => val <= today,
    "Cannot add income for future dates"
  ),
  description: z.string().optional(),
})

type AddIncomeFormValues = z.infer<typeof addIncomeSchema>

interface AddIncomeFormProps {
  budgetId: Id<"budgets">
  currencies: { currencyCode: string }[]
}

export function AddIncomeForm({ budgetId, currencies }: AddIncomeFormProps) {
  const addIncomeMutation = useMutation(api.income.add)

  const form = useForm<AddIncomeFormValues>({
    resolver: zodResolver(addIncomeSchema),
    defaultValues: {
      amount: "",
      currencyCode: currencies[0]?.currencyCode || "",
      date: format(new Date(), "yyyy-MM-dd"),
      description: "",
    },
  })

  const selectedCurrency = form.watch("currencyCode")

  // Update currency when currencies list changes
  useEffect(() => {
    if (currencies.length > 0 && !currencies.find((c) => c.currencyCode === selectedCurrency)) {
      form.setValue("currencyCode", currencies[0].currencyCode)
    }
  }, [currencies, selectedCurrency, form])

  const onSubmit = async (values: AddIncomeFormValues) => {
    try {
      await addIncomeMutation({
        budgetId,
        amount: parseFloat(values.amount),
        currencyCode: values.currencyCode,
        date: parseLocalDate(values.date).getTime(),
        description: values.description || undefined,
      })
      form.reset({
        amount: "",
        currencyCode: selectedCurrency,
        date: format(new Date(), "yyyy-MM-dd"),
        description: "",
      })
    } catch (err) {
      console.error("Failed to add income:", err)
      form.setError("root", {
        message: err instanceof Error ? err.message : "Failed to add income",
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {form.formState.errors.root && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            {form.formState.errors.root.message}
          </div>
        )}
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
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input type="date" max={today} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Salary, Gift" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={form.formState.isSubmitting || currencies.length === 0}>
          {form.formState.isSubmitting ? "Adding..." : "Add Income"}
        </Button>
      </form>
    </Form>
  )
}
