import { useState } from "react"
import { Copy } from "lucide-react"
import { useMutation } from "convex/react"
import { useNavigate } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form"

const duplicateBudgetSchema = z.object({
  copyExpenses: z.boolean(),
  copyIncome: z.boolean(),
  copyRecurringItems: z.boolean(),
})

type DuplicateBudgetFormValues = z.infer<typeof duplicateBudgetSchema>

interface DuplicateBudgetDialogProps {
  budgetId: Id<"budgets">
}

export function DuplicateBudgetDialog({ budgetId }: DuplicateBudgetDialogProps) {
  const [open, setOpen] = useState(false)
  const duplicateBudgetMutation = useMutation(api.budgets.duplicate)
  const navigate = useNavigate()

  const form = useForm<DuplicateBudgetFormValues>({
    resolver: zodResolver(duplicateBudgetSchema),
    defaultValues: {
      copyExpenses: false,
      copyIncome: false,
      copyRecurringItems: false,
    },
  })

  const onSubmit = async (values: DuplicateBudgetFormValues) => {
    try {
      const newBudgetId = await duplicateBudgetMutation({
        id: budgetId,
        copyExpenses: values.copyExpenses,
        copyIncome: values.copyIncome,
        copyRecurringItems: values.copyRecurringItems,
      })
      setOpen(false)
      navigate({ to: "/budgets/$budgetId", params: { budgetId: newBudgetId } })
    } catch (err) {
      console.error("Failed to duplicate budget:", err)
      form.setError("root", {
        message: err instanceof Error ? err.message : "Failed to duplicate budget",
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
          <Copy className="mr-2 h-4 w-4" />
          Duplicate
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate Budget</DialogTitle>
          <DialogDescription>
            Create a copy of this budget. Choose what to include.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {form.formState.errors.root && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {form.formState.errors.root.message}
              </div>
            )}
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="copyExpenses"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel className="cursor-pointer">Copy expenses</FormLabel>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="copyIncome"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel className="cursor-pointer">Copy income</FormLabel>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="copyRecurringItems"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel className="cursor-pointer">Copy recurring items</FormLabel>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Duplicating..." : "Duplicate Budget"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
