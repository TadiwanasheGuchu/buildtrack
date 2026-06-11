import { useEffect, useState } from 'react'
import { format, parseISO, isBefore } from 'date-fns'
import { Plus, Pencil, Trash2, Loader2, CheckCircle2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PUNCH_STATUSES, PUNCH_PRIORITIES } from '@/types/punch'
import type { PunchItem, PunchSummary, CreatePunchItemData } from '@/types/punch'
import type { TeamMember } from '@/types/team'
import {
  getPunchItems, getPunchSummary, createPunchItem,
  updatePunchItem, resolvePunchItem, deletePunchItem,
} from '@/services/punchService'
import { getTeamMembers } from '@/services/teamService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { DatePicker } from '@/components/ui/date-picker'
import { cn } from '@/lib/utils'

// ── Styling helpers ────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<string, string> = {
  Critical: 'bg-destructive/10 text-destructive border-destructive/20',
  High:     'bg-primary/10 text-primary border-primary/20',
  Medium:   'bg-tertiary/10 text-tertiary border-tertiary/20',
  Low:      'bg-muted text-muted-foreground border-border',
}

const STATUS_STYLES: Record<string, string> = {
  Open:          'bg-destructive/10 text-destructive',
  'In Progress': 'bg-tertiary/10 text-tertiary',
  Resolved:      'bg-secondary/10 text-secondary',
}

const STATUS_FILTERS = ['All', 'Open', 'In Progress', 'Resolved'] as const

// ── Form schema ────────────────────────────────────────────────────────────

const itemSchema = z.object({
  title: z.string().min(2, 'Title required'),
  description: z.string().optional(),
  priority: z.enum(PUNCH_PRIORITIES),
  status: z.enum(PUNCH_STATUSES),
  assignedToId: z.string().optional(),
  dueDate: z.date().optional(),
})
type ItemFormValues = z.infer<typeof itemSchema>

// ── Item Dialog ────────────────────────────────────────────────────────────

function PunchItemDialog({
  open, onClose, projectId, editing, teamMembers, onSaved,
}: {
  open: boolean
  onClose: () => void
  projectId: string
  editing: PunchItem | null
  teamMembers: TeamMember[]
  onSaved: (item: PunchItem, isEdit: boolean) => void
}) {
  const [serverError, setServerError] = useState('')
  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: { title: '', description: '', priority: 'Medium', status: 'Open', assignedToId: '', dueDate: undefined },
  })

  useEffect(() => {
    if (open) {
      setServerError('')
      if (editing) {
        form.reset({
          title: editing.title,
          description: editing.description ?? '',
          priority: editing.priority,
          status: editing.status,
          assignedToId: editing.assignedToId ?? '',
          dueDate: editing.dueDate ? parseISO(editing.dueDate) : undefined,
        })
      } else {
        form.reset({ title: '', description: '', priority: 'Medium', status: 'Open', assignedToId: '', dueDate: undefined })
      }
    }
  }, [open, editing, form])

  async function onSubmit(values: ItemFormValues) {
    setServerError('')
    const data: CreatePunchItemData = {
      title: values.title,
      description: values.description || undefined,
      priority: values.priority,
      status: values.status,
      assignedToId: values.assignedToId || undefined,
      dueDate: values.dueDate ? values.dueDate.toISOString().split('T')[0] : undefined,
    }
    try {
      if (editing) {
        const updated = await updatePunchItem(editing.id, data)
        onSaved(updated, true)
      } else {
        const created = await createPunchItem(projectId, data)
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
          <DialogTitle>{editing ? 'Edit Punch Item' : 'Add Punch Item'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Title *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Cracked render on eastern wall" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea rows={2} placeholder="Additional detail…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {PUNCH_PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {PUNCH_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="assignedToId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign to</FormLabel>
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {teamMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Due date</FormLabel>
                  <DatePicker value={field.value} onChange={field.onChange} placeholder="Optional" />
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {serverError && <p className="text-sm text-destructive">{serverError}</p>}

            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Save Changes' : 'Add Item'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main PunchTab ──────────────────────────────────────────────────────────

export default function PunchTab({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<PunchItem[]>([])
  const [summary, setSummary] = useState<PunchSummary | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<PunchItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PunchItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [resolving, setResolving] = useState<string | null>(null)

  async function load() {
    const [allItems, s, members] = await Promise.all([
      getPunchItems(projectId),
      getPunchSummary(projectId),
      getTeamMembers(),
    ])
    setItems(allItems)
    setSummary(s)
    setTeamMembers(members)
  }

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = statusFilter === 'All' ? items : items.filter(i => i.status === statusFilter)

  function handleSaved(item: PunchItem, isEdit: boolean) {
    setItems(prev => isEdit ? prev.map(i => i.id === item.id ? item : i) : [item, ...prev])
    getPunchSummary(projectId).then(setSummary)
  }

  async function handleResolve(item: PunchItem) {
    setResolving(item.id)
    try {
      const updated = await resolvePunchItem(item.id)
      setItems(prev => prev.map(i => i.id === item.id ? updated : i))
      getPunchSummary(projectId).then(setSummary)
    } finally {
      setResolving(null)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deletePunchItem(deleteTarget.id)
      setItems(prev => prev.filter(i => i.id !== deleteTarget.id))
      getPunchSummary(projectId).then(setSummary)
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Total Items</p>
              <p className="text-2xl font-bold">{summary.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Open</p>
              <p className={cn('text-2xl font-bold', summary.open > 0 ? 'text-destructive' : 'text-muted-foreground')}>
                {summary.open}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">In Progress</p>
              <p className={cn('text-2xl font-bold', summary.inProgress > 0 ? 'text-tertiary' : 'text-muted-foreground')}>
                {summary.inProgress}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Resolved</p>
              <p className={cn('text-2xl font-bold', summary.resolved > 0 ? 'text-secondary' : 'text-muted-foreground')}>
                {summary.resolved}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Items list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-base">Punch Items</CardTitle>
            <div className="flex items-center gap-1">
              {STATUS_FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-full border transition-colors',
                    statusFilter === f
                      ? 'bg-primary text-on-primary border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  {f}
                  {f !== 'All' && summary && (
                    <span className="ml-1 opacity-70">
                      {f === 'Open' ? summary.open : f === 'In Progress' ? summary.inProgress : summary.resolved}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true) }}>
            <Plus className="w-4 h-4 mr-1" /> Add Item
          </Button>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground">
                {statusFilter === 'All' ? 'No punch items yet' : `No ${statusFilter.toLowerCase()} items`}
              </p>
              {statusFilter === 'All' && (
                <>
                  <p className="text-muted-foreground text-sm mt-1">Log defects and outstanding work to track them here.</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => { setEditing(null); setDialogOpen(true) }}>
                    <Plus className="w-4 h-4 mr-1" /> Add first item
                  </Button>
                </>
              )}
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map(item => {
                const isOverdue = item.dueDate && item.status !== 'Resolved' && isBefore(parseISO(item.dueDate), new Date())
                return (
                  <li key={item.id} className="py-3.5 flex items-start justify-between gap-3 group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={cn(
                          'text-xs font-semibold border rounded-full px-2 py-0.5 shrink-0',
                          PRIORITY_STYLES[item.priority],
                        )}>
                          {item.priority}
                        </span>
                        <span className={cn('text-xs font-medium rounded-full px-2 py-0.5 shrink-0', STATUS_STYLES[item.status])}>
                          {item.status}
                        </span>
                      </div>
                      <p className={cn('font-medium text-foreground', item.status === 'Resolved' && 'line-through text-muted-foreground')}>
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        {item.assignedToName && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">person</span>
                            {item.assignedToName}
                          </span>
                        )}
                        {item.dueDate && (
                          <span className={cn('flex items-center gap-1', isOverdue && 'text-destructive font-medium')}>
                            <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                            {isOverdue ? 'Overdue · ' : ''}{format(parseISO(item.dueDate), 'dd MMM yyyy')}
                          </span>
                        )}
                        {item.resolvedAt && (
                          <span className="flex items-center gap-1 text-secondary">
                            <span className="material-symbols-outlined text-[13px]">check_circle</span>
                            Resolved {format(parseISO(item.resolvedAt), 'dd MMM yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.status !== 'Resolved' && (
                        <Button
                          size="icon" variant="ghost" className="h-7 w-7 text-secondary"
                          onClick={() => handleResolve(item)}
                          disabled={resolving === item.id}
                          title="Mark resolved"
                        >
                          {resolving === item.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <CheckCircle2 className="w-3.5 h-3.5" />
                          }
                        </Button>
                      )}
                      <Button
                        size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => { setEditing(item); setDialogOpen(true) }}
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                        onClick={() => setDeleteTarget(item)}
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <PunchItemDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        projectId={projectId}
        editing={editing}
        teamMembers={teamMembers}
        onSaved={handleSaved}
      />

      <Dialog open={!!deleteTarget} onOpenChange={v => { if (!v && !deleting) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete punch item?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            <span className="font-semibold text-foreground">{deleteTarget?.title}</span> will be permanently deleted.
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
