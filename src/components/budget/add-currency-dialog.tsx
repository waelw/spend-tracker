import { useState } from "react"
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const addCurrencySchema = z.object({
  currencyCode: z.string().min(1, "Currency code is required").max(3, "Currency code must be 3 characters or less"),
  rateToMain: z.string().min(1, "Exchange rate is required").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Rate must be a positive number"
  ),
})

type AddCurrencyFormValues = z.infer<typeof addCurrencySchema>

interface AddCurrencyDialogProps {
  budgetId: Id<"budgets">
}

export function AddCurrencyDialog({ budgetId }: AddCurrencyDialogProps) {
  const [open, setOpen] = useState(false)
  const addCurrencyMutation = useMutation(api.budgetCurrencies.add)

  const form = useForm<AddCurrencyFormValues>({
    resolver: zodResolver(addCurrencySchema),
    defaultValues: {
      currencyCode: "",
      rateToMain: "",
    },
  })

  const onSubmit = async (values: AddCurrencyFormValues) => {
    try {
      await addCurrencyMutation({
        budgetId,
        currencyCode: values.currencyCode.toUpperCase(),
        rateToMain: parseFloat(values.rateToMain),
      })
      setOpen(false)
      form.reset()
    } catch (error) {
      console.error("Failed to add currency:", error)
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
          Add Currency
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Currency</DialogTitle>
          <DialogDescription>
            Add a new currency with its exchange rate to the main currency.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="currencyCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., EUR"
                      maxLength={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rateToMain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exchange Rate to Main Currency</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      placeholder="e.g., 1.08"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    1 unit of this currency equals how many units of the main currency?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Adding..." : "Add Currency"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
