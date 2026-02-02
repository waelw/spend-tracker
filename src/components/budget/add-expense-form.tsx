import { useEffect } from "react";
import { format } from "date-fns";
import { useMutation } from "convex/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { formatCurrency } from "@/lib/currency-utils";
import { parseLocalDate } from "@/lib/date-utils";
import { EXPENSE_CATEGORIES } from "@/constants/categories";

const today = format(new Date(), "yyyy-MM-dd");

const addExpenseSchema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      "Amount must be a positive number",
    ),
  currencyCode: z.string().min(1, "Currency is required"),
  date: z
    .string()
    .min(1, "Date is required")
    .refine((val) => val <= today, "Cannot add expenses for future dates"),
  category: z.string().optional(),
  description: z.string().optional(),
});

type AddExpenseFormValues = z.infer<typeof addExpenseSchema>;

interface AddExpenseFormProps {
  budgetId: Id<"budgets">;
  currencies: { currencyCode: string }[];
  assets: { currencyCode: string; amount: number }[];
}

export function AddExpenseForm({
  budgetId,
  currencies,
  assets,
}: AddExpenseFormProps) {
  const addExpenseMutation = useMutation(api.expenses.add);

  const form = useForm<AddExpenseFormValues>({
    resolver: zodResolver(addExpenseSchema),
    defaultValues: {
      amount: "",
      currencyCode: currencies[0]?.currencyCode || "",
      date: format(new Date(), "yyyy-MM-dd"),
      category: "",
      description: "",
    },
  });

  const selectedCurrency = form.watch("currencyCode");
  const currentAsset = assets.find((a) => a.currencyCode === selectedCurrency);
  const availableBalance = currentAsset?.amount ?? 0;

  // Update currency when currencies list changes
  useEffect(() => {
    if (
      currencies.length > 0 &&
      !currencies.find((c) => c.currencyCode === selectedCurrency)
    ) {
      form.setValue("currencyCode", currencies[0].currencyCode);
    }
  }, [currencies, selectedCurrency, form]);

  const onSubmit = async (values: AddExpenseFormValues) => {
    try {
      await addExpenseMutation({
        budgetId,
        amount: parseFloat(values.amount),
        currencyCode: values.currencyCode,
        date: parseLocalDate(values.date).getTime(),
        description: values.description || undefined,
        category: values.category || undefined,
      });
      form.reset({
        amount: "",
        currencyCode: selectedCurrency,
        date: format(new Date(), "yyyy-MM-dd"),
        category: "",
        description: "",
      });
    } catch (err) {
      console.error("Failed to add expense:", err);
      form.setError("root", {
        message: err instanceof Error ? err.message : "Failed to add expense",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {form.formState.errors.root && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            {form.formState.errors.root.message}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    {currencies.map((c) => {
                      const asset = assets.find(
                        (a) => a.currencyCode === c.currencyCode,
                      );
                      return (
                        <SelectItem key={c.currencyCode} value={c.currencyCode}>
                          {c.currencyCode} (
                          {formatCurrency(asset?.amount ?? 0, c.currencyCode)})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormDescription
                  className={availableBalance > 0 ? "" : "text-destructive"}
                >
                  Available:{" "}
                  {formatCurrency(availableBalance, selectedCurrency)}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
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
        </div>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Groceries" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting || currencies.length === 0}
        >
          {form.formState.isSubmitting ? "Adding..." : "Add Expense"}
        </Button>
      </form>
    </Form>
  );
}
