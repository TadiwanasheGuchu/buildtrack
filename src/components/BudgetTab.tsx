import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Plus, Pencil, Trash2, Loader2, Settings2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { BUDGET_CATEGORIES } from '@/types/budget'
import type { BudgetSummary, CostEntry, CreateCostEntryData } from '@/types/budget'
import {
  getBudgetSummary, getCostEntries, createCostEntry,
  updateCostEntry, deleteCostEntry, saveBudgetLines,
} from '@/services/budgetService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { DatePicker } from '@/components/ui/date-picker'
import { cn } from '@/lib/utils'

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000) return `R ${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `R ${(n / 1_000).toFixed(0)}K`
  return `R ${n.toLocaleString()}`
}

const CATEGORY_COLORS: Record<string, string> = {
  'Labour': 'bg-primary/15 text-primary',
  'Materials': 'bg-secondary/15 text-secondary',
  'Equipment': 'bg-tertiary/15 text-tertiary',
  'Subcontractors': 'bg-amber-50 text-amber-700',
  'Permits & Fees': 'bg-blue-50 text-blue-700',
  'Other': 'bg-muted text-muted-foreground',
}

// ── Cost entry form schema ─────────────────────────────────────────────────

const entrySchema = z.object({
  category: z.enum(BUDGET_CATEGORIES),
  description: z.string().min(2, 'Description required'),
  amount: z.coerce.number<number>().positive('Amount must be positive'),
  vendor: z.string().optional(),
  date: z.date({ error: 'Date is required' }),
})
type EntryFormValues = z.infer<typeof entrySchema>

// ── Cost Entry Dialog ──────────────────────────────────────────────────────

function CostEntryDialog({
  open, onClose, projectId, editing, onSaved,
}: {
  open: boolean
  onClose: () => void
  projectId: string
  editing: CostEntry | null
  onSaved: (entry: CostEntry, isEdit: boolean) => void
}) {
  const [serverError, setServerError] = useState('')
  const form = useForm<EntryFormValues>({
    resolver: zodResolver(entrySchema),
    defaultValues: { category: 'Labour', description: '', amount: 0, vendor: '', date: new Date() },
  })

  useEffect(() => {
    if (open) {
      setServerError('')
      if (editing) {
        form.reset({
          category: editing.category,
          description: editing.description,
          amount: editing.amount,
          vendor: editing.vendor ?? '',
          date: parseISO(editing.date),
        })
      } else {
        form.reset({ category: 'Labour', description: '', amount: 0, vendor: '', date: new Date() })
      }
    }
  }, [open, editing, form])

  async function onSubmit(values: EntryFormValues) {
    setServerError('')
    const data: CreateCostEntryData = {
      category: values.category,
      description: values.description,
      amount: values.amount,
      vendor: values.vendor || undefined,
      date: values.date.toISOString().split('T')[0],
    }
    try {
      if (editing) {
        const updated = await updateCostEntry(editing.id, data)
        onSaved(updated, true)
      } else {
        const created = await createCostEntry(projectId, data)
        onSaved(created, false)
      }
      onClose()
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Cost Entry' : 'Log Cost'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BUDGET_CATEGORIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date *</FormLabel>
                  <DatePicker value={field.value} onChange={field.onChange} placeholder="Select date" />
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description *</FormLabel>
                <FormControl><Input placeholder="e.g. Foundation crew — week 1" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (ZAR) *</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="vendor" render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor</FormLabel>
                  <FormControl><Input placeholder="Supplier / contractor" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {serverError && <p className="text-sm text-destructive">{serverError}</p>}

            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Save Changes' : 'Log Cost'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ── Allocations Dialog ─────────────────────────────────────────────────────

function AllocationsDialog({
  open, onClose, projectId, totalBudget, current, onSaved,
}: {
  open: boolean
  onClose: () => void
  projectId: string
  totalBudget: number
  current: BudgetSummary['categories']
  onSaved: () => void
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      const init: Record<string, string> = {}
      for (const cat of current) {
        init[cat.category] = cat.allocated > 0 ? String(cat.allocated) : ''
      }
      setValues(init)
      setError('')
    }
  }, [open, current])

  const total = Object.values(values).reduce((a, v) => a + (Number(v) || 0), 0)
  const over = total > totalBudget

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const lines = BUDGET_CATEGORIES
        .filter(c => Number(values[c]) > 0)
        .map(c => ({ category: c, allocatedAmount: Number(values[c]) }))
      await saveBudgetLines(projectId, lines)
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Budget Allocations</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <p className="text-sm text-muted-foreground">
            Total budget: <span className="font-semibold text-foreground">{fmt(totalBudget)}</span>
          </p>
          {BUDGET_CATEGORIES.map(cat => (
            <div key={cat} className="flex items-center gap-3">
              <span className={cn('text-xs font-medium rounded-full px-2.5 py-0.5 w-36 shrink-0', CATEGORY_COLORS[cat])}>
                {cat}
              </span>
              <Input
                type="number"
                min={0}
                step={1000}
                placeholder="0"
                value={values[cat] ?? ''}
                onChange={e => setValues(v => ({ ...v, [cat]: e.target.value }))}
                className="flex-1"
              />
            </div>
          ))}
          <div className="flex items-center justify-between text-sm pt-1 border-t border-border">
            <span className="text-muted-foreground">Total allocated</span>
            <span className={cn('font-semibold', over ? 'text-destructive' : 'text-foreground')}>
              {fmt(total)}
            </span>
          </div>
          {over && (
            <p className="text-xs text-destructive">
              Allocated ({fmt(total)}) exceeds total budget ({fmt(totalBudget)}).
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Allocations
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main BudgetTab ─────────────────────────────────────────────────────────

export default function BudgetTab({ projectId, totalBudget }: { projectId: string; totalBudget: number }) {
  const [summary, setSummary] = useState<BudgetSummary | null>(null)
  const [entries, setEntries] = useState<CostEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [entryDialogOpen, setEntryDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CostEntry | null>(null)
  const [allocOpen, setAllocOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CostEntry | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    const [s, es] = await Promise.all([getBudgetSummary(projectId, totalBudget), getCostEntries(projectId)])
    setSummary(s)
    setEntries(es)
  }

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [projectId, totalBudget]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSaved(entry: CostEntry, isEdit: boolean) {
    setEntries(prev => isEdit ? prev.map(e => e.id === entry.id ? entry : e) : [entry, ...prev])
    load() // refresh summary
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteCostEntry(deleteTarget.id)
      setEntries(prev => prev.filter(e => e.id !== deleteTarget.id))
      load()
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!summary) return null

  const spentPercent = Math.min(summary.percentUsed, 100)
  const isOverBudget = summary.totalSpent > summary.totalBudget

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Total Budget</p>
            <p className="text-xl font-bold text-foreground">{fmt(summary.totalBudget)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
            <p className={cn('text-xl font-bold', isOverBudget ? 'text-destructive' : 'text-foreground')}>
              {fmt(summary.totalSpent)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Remaining</p>
            <p className={cn('text-xl font-bold', isOverBudget ? 'text-destructive' : 'text-secondary')}>
              {isOverBudget ? `-${fmt(Math.abs(summary.remaining))}` : fmt(summary.remaining)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Budget Used</p>
            <p className={cn('text-xl font-bold', isOverBudget ? 'text-destructive' : 'text-foreground')}>
              {summary.percentUsed.toFixed(1)}%
            </p>
            <Progress
              value={spentPercent}
              className={cn('h-1.5 mt-2', isOverBudget ? '[&>div]:bg-destructive' : '[&>div]:bg-primary')}
            />
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Budget by Category</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setAllocOpen(true)}>
            <Settings2 className="w-3.5 h-3.5 mr-1.5" />
            Edit Allocations
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {summary.categories.map(cat => {
              const hasAlloc = cat.allocated > 0
              const pct = hasAlloc ? Math.min((cat.spent / cat.allocated) * 100, 100) : 0
              const over = cat.spent > cat.allocated && hasAlloc
              return (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn('text-xs font-medium rounded-full px-2.5 py-0.5 shrink-0', CATEGORY_COLORS[cat.category])}>
                        {cat.category}
                      </span>
                      {cat.spent > 0 && (
                        <span className="text-xs text-muted-foreground truncate">
                          {fmt(cat.spent)} spent
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-right shrink-0">
                      {hasAlloc ? (
                        <span className={cn('font-medium', over ? 'text-destructive' : 'text-muted-foreground')}>
                          {fmt(cat.spent)} / {fmt(cat.allocated)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">No allocation</span>
                      )}
                    </div>
                  </div>
                  {hasAlloc && (
                    <Progress
                      value={pct}
                      className={cn('h-1.5', over ? '[&>div]:bg-destructive' : '[&>div]:bg-primary/60')}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Cost entries */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            Cost Entries
            {entries.length > 0 && <Badge variant="secondary" className="text-xs">{entries.length}</Badge>}
          </CardTitle>
          <Button size="sm" onClick={() => { setEditing(null); setEntryDialogOpen(true) }}>
            <Plus className="w-4 h-4 mr-1" /> Log Cost
          </Button>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">No costs logged yet.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => { setEditing(null); setEntryDialogOpen(true) }}>
                <Plus className="w-4 h-4 mr-1" /> Log first cost
              </Button>
            </div>
          ) : (
            <ul className="divide-y text-sm">
              {entries.map(entry => (
                <li key={entry.id} className="flex items-start justify-between py-3 gap-3 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground truncate">{entry.description}</p>
                      <span className={cn('text-xs font-medium rounded-full px-2 py-0.5 shrink-0', CATEGORY_COLORS[entry.category])}>
                        {entry.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span>{format(parseISO(entry.date), 'dd MMM yyyy')}</span>
                      {entry.vendor && <span>· {entry.vendor}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-semibold text-foreground">{fmt(entry.amount)}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => { setEditing(entry); setEntryDialogOpen(true) }}
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                        onClick={() => setDeleteTarget(entry)}
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CostEntryDialog
        open={entryDialogOpen}
        onClose={() => setEntryDialogOpen(false)}
        projectId={projectId}
        editing={editing}
        onSaved={handleSaved}
      />

      <AllocationsDialog
        open={allocOpen}
        onClose={() => setAllocOpen(false)}
        projectId={projectId}
        totalBudget={totalBudget}
        current={summary.categories}
        onSaved={load}
      />

      <Dialog open={!!deleteTarget} onOpenChange={v => { if (!v && !deleting) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete cost entry?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            <span className="font-semibold text-foreground">{deleteTarget?.description}</span> ({deleteTarget ? fmt(deleteTarget.amount) : ''}) will be permanently deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
