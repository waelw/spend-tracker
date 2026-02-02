import { useState } from "react"
import { ArrowRightLeft } from "lucide-react"
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { formatCurrency } from "@/lib/currency-utils"

interface TransferDialogProps {
  budgetId: Id<"budgets">
  assets: { _id: Id<"budgetAssets">; currencyCode: string; amount: number }[]
  currencies: { currencyCode: string; rateToMain: number }[]
}

export function TransferDialog({ budgetId, assets, currencies }: TransferDialogProps) {
  const [open, setOpen] = useState(false)
  const transferMutation = useMutation(api.budgetAssets.transfer)

  const transferSchema = z.object({
    fromCurrency: z.string().min(1, "Select source currency"),
    toCurrency: z.string().min(1, "Select destination currency"),
    amount: z.string().min(1, "Amount is required").refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      "Amount must be a positive number"
    ),
  }).refine(
    (data) => data.fromCurrency !== data.toCurrency,
    { message: "Cannot transfer to the same currency", path: ["toCurrency"] }
  ).refine(
    (data) => {
      const fromAsset = assets.find((a) => a.currencyCode === data.fromCurrency)
      const amount = parseFloat(data.amount) || 0
      return !fromAsset || amount <= fromAsset.amount
    },
    { message: "Insufficient balance", path: ["amount"] }
  )

  type TransferFormValues = z.infer<typeof transferSchema>

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      fromCurrency: assets[0]?.currencyCode || "",
      toCurrency: assets[1]?.currencyCode || assets[0]?.currencyCode || "",
      amount: "",
    },
  })

  const fromCurrency = form.watch("fromCurrency")
  const toCurrency = form.watch("toCurrency")
  const amount = form.watch("amount")

  const fromAsset = assets.find((a) => a.currencyCode === fromCurrency)
  const fromRate = currencies.find((c) => c.currencyCode === fromCurrency)?.rateToMain ?? 1
  const toRate = currencies.find((c) => c.currencyCode === toCurrency)?.rateToMain ?? 1

  const amountNum = parseFloat(amount) || 0
  const exchangeRate = fromRate / toRate
  const toAmount = amountNum * exchangeRate

  const onSubmit = async (values: TransferFormValues) => {
    try {
      await transferMutation({
        budgetId,
        fromCurrency: values.fromCurrency,
        toCurrency: values.toCurrency,
        fromAmount: parseFloat(values.amount),
      })
      setOpen(false)
      form.reset()
    } catch (err) {
      form.setError("root", {
        message: err instanceof Error ? err.message : "Failed to transfer",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) form.reset()
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ArrowRightLeft className="mr-2 h-4 w-4" />
          Transfer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Between Currencies</DialogTitle>
          <DialogDescription>
            Convert funds from one currency to another using the current exchange rates.
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
              name="fromCurrency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From</FormLabel>
                  <div className="flex gap-2">
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assets.map((a) => (
                          <SelectItem key={a.currencyCode} value={a.currencyCode}>
                            {a.currencyCode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field: amountField }) => (
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Amount"
                            className="flex-1"
                            {...amountField}
                          />
                        </FormControl>
                      )}
                    />
                  </div>
                  {fromAsset && (
                    <FormDescription>
                      Available: {formatCurrency(fromAsset.amount, fromCurrency)}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-center">
              <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
            </div>

            <FormField
              control={form.control}
              name="toCurrency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To</FormLabel>
                  <div className="flex gap-2">
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assets.map((a) => (
                          <SelectItem key={a.currencyCode} value={a.currencyCode}>
                            {a.currencyCode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="text"
                      value={amountNum > 0 ? toAmount.toFixed(2) : ""}
                      disabled
                      placeholder="You'll receive"
                      className="flex-1 bg-muted"
                    />
                  </div>
                  {fromCurrency !== toCurrency && amountNum > 0 && (
                    <FormDescription>
                      Rate: 1 {fromCurrency} = {exchangeRate.toFixed(4)} {toCurrency}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Transferring..." : "Transfer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
