import { useEffect, useState } from 'react'
import { format, parseISO, isToday, isYesterday } from 'date-fns'
import {
  Plus, Pencil, Trash2, Loader2, ClipboardList,
  Sun, CloudSun, Cloud, CloudRain, CloudLightning, Wind,
  Users, Thermometer, AlertTriangle, HardHat, Package,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { WEATHER_OPTIONS } from '@/types/siteLog'
import type { SiteLog, SiteLogWeather, CreateSiteLogData } from '@/types/siteLog'
import { getSiteLogs, createSiteLog, updateSiteLog, deleteSiteLog } from '@/services/siteLogService'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { DatePicker } from '@/components/ui/date-picker'

// ── Weather helpers ────────────────────────────────────────────────────────

const WEATHER_ICONS: Record<SiteLogWeather, typeof Sun> = {
  Sunny: Sun,
  'Partly Cloudy': CloudSun,
  Cloudy: Cloud,
  Rainy: CloudRain,
  Stormy: CloudLightning,
  Windy: Wind,
}

function logDateLabel(dateStr: string): string {
  const d = parseISO(dateStr)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'EEEE, dd MMM yyyy')
}

// ── Form schema ────────────────────────────────────────────────────────────

const logSchema = z.object({
  logDate: z.date({ error: 'Date required' }),
  weather: z.string().optional(),
  temperatureC: z.string().optional(),
  crewCount: z.string().optional(),
  workCompleted: z.string().min(5, 'Describe the work completed'),
  materialsDelivered: z.string().optional(),
  issues: z.string().optional(),
  safetyNotes: z.string().optional(),
})
type LogFormValues = z.infer<typeof logSchema>

// ── Log Dialog ─────────────────────────────────────────────────────────────

function SiteLogDialog({
  open, onClose, projectId, editing, onSaved,
}: {
  open: boolean
  onClose: () => void
  projectId: string
  editing: SiteLog | null
  onSaved: (log: SiteLog, isEdit: boolean) => void
}) {
  const [serverError, setServerError] = useState('')
  const form = useForm<LogFormValues>({
    resolver: zodResolver(logSchema),
    defaultValues: {
      logDate: new Date(), weather: '', temperatureC: '', crewCount: '',
      workCompleted: '', materialsDelivered: '', issues: '', safetyNotes: '',
    },
  })

  useEffect(() => {
    if (open) {
      setServerError('')
      if (editing) {
        form.reset({
          logDate: parseISO(editing.logDate),
          weather: editing.weather ?? '',
          temperatureC: editing.temperatureC != null ? String(editing.temperatureC) : '',
          crewCount: editing.crewCount != null ? String(editing.crewCount) : '',
          workCompleted: editing.workCompleted,
          materialsDelivered: editing.materialsDelivered ?? '',
          issues: editing.issues ?? '',
          safetyNotes: editing.safetyNotes ?? '',
        })
      } else {
        form.reset({
          logDate: new Date(), weather: '', temperatureC: '', crewCount: '',
          workCompleted: '', materialsDelivered: '', issues: '', safetyNotes: '',
        })
      }
    }
  }, [open, editing, form])

  async function onSubmit(values: LogFormValues) {
    setServerError('')
    const data: CreateSiteLogData = {
      logDate: values.logDate.toISOString().split('T')[0],
      weather: (values.weather || undefined) as SiteLogWeather | undefined,
      temperatureC: values.temperatureC ? Number(values.temperatureC) : undefined,
      crewCount: values.crewCount ? Number(values.crewCount) : undefined,
      workCompleted: values.workCompleted,
      materialsDelivered: values.materialsDelivered || undefined,
      issues: values.issues || undefined,
      safetyNotes: values.safetyNotes || undefined,
    }
    try {
      if (editing) {
        const updated = await updateSiteLog(editing.id, data)
        onSaved(updated, true)
      } else {
        const created = await createSiteLog(projectId, data)
        onSaved(created, false)
      }
      onClose()
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Site Log' : 'New Site Log'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="logDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date *</FormLabel>
                  <DatePicker value={field.value} onChange={field.onChange} />
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="weather" render={({ field }) => (
                <FormItem>
                  <FormLabel>Weather</FormLabel>
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {WEATHER_OPTIONS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="temperatureC" render={({ field }) => (
                <FormItem>
                  <FormLabel>Temperature (°C)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 28" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="crewCount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Crew on site</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" placeholder="e.g. 24" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="workCompleted" render={({ field }) => (
              <FormItem>
                <FormLabel>Work completed *</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder="What was done on site today…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="materialsDelivered" render={({ field }) => (
              <FormItem>
                <FormLabel>Materials delivered</FormLabel>
                <FormControl>
                  <Textarea rows={2} placeholder="Deliveries received on site…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="issues" render={({ field }) => (
              <FormItem>
                <FormLabel>Issues / delays</FormLabel>
                <FormControl>
                  <Textarea rows={2} placeholder="Problems, delays, blockers…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="safetyNotes" render={({ field }) => (
              <FormItem>
                <FormLabel>Safety notes</FormLabel>
                <FormControl>
                  <Textarea rows={2} placeholder="Incidents, toolbox talks, observations…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {serverError && <p className="text-sm text-destructive">{serverError}</p>}

            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Save Changes' : 'Add Log'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main SiteLogsTab ───────────────────────────────────────────────────────

export default function SiteLogsTab({ projectId }: { projectId: string }) {
  const [logs, setLogs] = useState<SiteLog[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SiteLog | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SiteLog | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setLoading(true)
    getSiteLogs(projectId)
      .then(setLogs)
      .finally(() => setLoading(false))
  }, [projectId])

  function handleSaved(log: SiteLog, isEdit: boolean) {
    setLogs(prev => {
      const next = isEdit ? prev.map(l => l.id === log.id ? log : l) : [log, ...prev]
      return [...next].sort((a, b) => b.logDate.localeCompare(a.logDate))
    })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteSiteLog(deleteTarget.id)
      setLogs(prev => prev.filter(l => l.id !== deleteTarget.id))
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Daily Site Logs</h3>
        <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true) }}>
          <Plus className="w-4 h-4 mr-1" /> New Log
        </Button>
      </div>

      {logs.length === 0 ? (
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <ClipboardList className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground">No site logs yet</p>
              <p className="text-muted-foreground text-sm mt-1">
                Record daily progress, weather, crew numbers and issues from site.
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => { setEditing(null); setDialogOpen(true) }}>
                <Plus className="w-4 h-4 mr-1" /> Add first log
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {logs.map(log => {
            const WeatherIcon = log.weather ? WEATHER_ICONS[log.weather] : null
            return (
              <Card key={log.id} className="group">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-semibold text-foreground">{logDateLabel(log.logDate)}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        {WeatherIcon && (
                          <span className="flex items-center gap-1">
                            <WeatherIcon className="w-3.5 h-3.5" />
                            {log.weather}
                          </span>
                        )}
                        {log.temperatureC != null && (
                          <span className="flex items-center gap-1">
                            <Thermometer className="w-3.5 h-3.5" />
                            {log.temperatureC}°C
                          </span>
                        )}
                        {log.crewCount != null && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {log.crewCount} crew
                          </span>
                        )}
                        <span>by {log.createdByName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => { setEditing(log); setDialogOpen(true) }}
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                        onClick={() => setDeleteTarget(log)}
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-sm text-foreground whitespace-pre-wrap">{log.workCompleted}</p>

                  {(log.materialsDelivered || log.issues || log.safetyNotes) && (
                    <div className="mt-3 space-y-2">
                      {log.materialsDelivered && (
                        <div className="flex items-start gap-2 text-sm rounded-lg bg-muted/60 px-3 py-2">
                          <Package className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                          <div>
                            <span className="font-medium">Materials delivered: </span>
                            <span className="text-muted-foreground">{log.materialsDelivered}</span>
                          </div>
                        </div>
                      )}
                      {log.issues && (
                        <div className="flex items-start gap-2 text-sm rounded-lg bg-destructive/5 px-3 py-2">
                          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-destructive" />
                          <div>
                            <span className="font-medium text-destructive">Issues: </span>
                            <span className="text-muted-foreground">{log.issues}</span>
                          </div>
                        </div>
                      )}
                      {log.safetyNotes && (
                        <div className="flex items-start gap-2 text-sm rounded-lg bg-tertiary/5 px-3 py-2">
                          <HardHat className="w-4 h-4 mt-0.5 shrink-0 text-tertiary" />
                          <div>
                            <span className="font-medium text-tertiary">Safety: </span>
                            <span className="text-muted-foreground">{log.safetyNotes}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialogs */}
      <SiteLogDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        projectId={projectId}
        editing={editing}
        onSaved={handleSaved}
      />

      <Dialog open={!!deleteTarget} onOpenChange={v => { if (!v && !deleting) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete site log?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            The log for <span className="font-semibold text-foreground">
              {deleteTarget && format(parseISO(deleteTarget.logDate), 'dd MMM yyyy')}
            </span> will be permanently deleted.
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
