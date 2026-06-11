import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, parseISO } from 'date-fns'
import {
  ArrowLeft, Plus, Check, Trash2, Loader2, CalendarDays,
  MapPin, DollarSign, TrendingUp, Pencil,
} from 'lucide-react'
import type { Milestone, Project } from '@/types/project'
import type { Post } from '@/types/feed'
import type { Equipment, Material, Vehicle } from '@/types/resource'
import BudgetTab from '@/components/BudgetTab'
import PunchTab from '@/components/PunchTab'
import DocumentsTab from '@/components/DocumentsTab'
import SiteLogsTab from '@/components/SiteLogsTab'
import {
  getProject, getMilestones, createMilestone,
  completeMilestone, deleteMilestone, updateProject, deleteProject,
} from '@/services/projectService'
import { getPosts } from '@/services/feedService'
import { getEquipment, getMaterials, getVehicles } from '@/services/resourceService'
import FeedPost from '@/components/FeedPost'
import NewPostDialog from '@/components/NewPostDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Separator } from '@/components/ui/separator'
import { DatePicker } from '@/components/ui/date-picker'
import { Skeleton } from '@/components/ui/skeleton'
import NotificationBell from '@/components/NotificationBell'
import { cn } from '@/lib/utils'

const STATUS_COLORS: Record<string, string> = {
  Planning: 'bg-muted text-muted-foreground',
  Active: 'bg-secondary/10 text-secondary',
  'On Hold': 'bg-amber-50 text-amber-700',
  Completed: 'bg-green-50 text-green-700',
  Delayed: 'bg-destructive/10 text-destructive',
}

function formatBudget(n: number) {
  if (n >= 1_000_000) return `R ${(n / 1_000_000).toFixed(2)}M`
  return `R ${n.toLocaleString()}`
}

// ── Edit schema ────────────────────────────────────────────────────────────

const editSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters'),
  location: z.string().min(2, 'Location must be at least 2 characters'),
  status: z.enum(['Planning', 'Active', 'On Hold', 'Completed', 'Delayed']),
  budget: z.coerce.number<number>().positive('Budget must be a positive number'),
  startDate: z.date({ error: 'Start date is required' }),
  endDate: z.date({ error: 'End date is required' }),
  description: z.string().optional(),
}).refine(d => d.endDate >= d.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
})

type EditFormValues = z.infer<typeof editSchema>

// ── Edit Dialog ────────────────────────────────────────────────────────────

function EditProjectDialog({
  open, onClose, project, onSaved,
}: {
  open: boolean
  onClose: () => void
  project: Project
  onSaved: (p: Project) => void
}) {
  const [serverError, setServerError] = useState('')

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: project.name,
      location: project.location,
      status: project.status,
      budget: project.budget,
      startDate: project.startDate ? parseISO(project.startDate) : undefined,
      endDate: project.endDate ? parseISO(project.endDate) : undefined,
      description: project.description,
    },
  })

  // Reset form when project changes (dialog re-opens for different project)
  useEffect(() => {
    if (open) {
      form.reset({
        name: project.name,
        location: project.location,
        status: project.status,
        budget: project.budget,
        startDate: project.startDate ? parseISO(project.startDate) : undefined,
        endDate: project.endDate ? parseISO(project.endDate) : undefined,
        description: project.description,
      })
      setServerError('')
    }
  }, [open, project, form])

  async function onSubmit(values: EditFormValues) {
    setServerError('')
    try {
      const updated = await updateProject(project.id, {
        name: values.name,
        location: values.location,
        status: values.status,
        budget: values.budget,
        startDate: values.startDate.toISOString().split('T')[0],
        endDate: values.endDate.toISOString().split('T')[0],
        description: values.description ?? '',
      })
      onSaved(updated)
      onClose()
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to update project')
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Project name *</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="location" render={({ field }) => (
              <FormItem>
                <FormLabel>Location *</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(['Planning', 'Active', 'On Hold', 'Completed', 'Delayed'] as const).map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="budget" render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget (ZAR) *</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="startDate" render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Start date *</FormLabel>
                  <DatePicker value={field.value} onChange={field.onChange} placeholder="Select date" />
                  {fieldState.error && <p className="text-sm text-destructive">{fieldState.error.message}</p>}
                </FormItem>
              )} />

              <FormField control={form.control} name="endDate" render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>End date *</FormLabel>
                  <DatePicker value={field.value} onChange={field.onChange} placeholder="Select date" />
                  {fieldState.error && <p className="text-sm text-destructive">{fieldState.error.message}</p>}
                </FormItem>
              )} />
            </div>

            <Separator />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea rows={3} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {serverError && <p className="text-sm text-destructive">{serverError}</p>}

            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [newPostOpen, setNewPostOpen] = useState(false)
  const [posts, setPosts] = useState<Post[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [newDueDate, setNewDueDate] = useState<Date | undefined>()
  const [saving, setSaving] = useState(false)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])

  useEffect(() => {
    if (!id) return
    Promise.all([getProject(id), getMilestones(id), getPosts(id), getEquipment(id), getMaterials(id), getVehicles(id)])
      .then(([p, ms, feedPosts, eq, mats, vehs]) => {
        setProject(p); setMilestones(ms); setPosts(feedPosts)
        setEquipment(eq); setMaterials(mats); setVehicles(vehs)
      })
      .catch(() => navigate('/projects', { replace: true }))
      .finally(() => setLoading(false))
  }, [id, navigate])

  async function handleAddMilestone() {
    if (!id || !newTitle.trim()) return
    setSaving(true)
    try {
      const m = await createMilestone(id, {
        title: newTitle.trim(),
        dueDate: newDueDate ? newDueDate.toISOString().split('T')[0] : '',
      })
      setMilestones(prev => [...prev, m])
      const updated = await getProject(id)
      setProject(updated)
      setNewTitle(''); setNewDueDate(undefined); setAddOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleComplete(milestoneId: string) {
    if (!id) return
    const m = await completeMilestone(milestoneId, id)
    setMilestones(prev => prev.map(x => x.id === milestoneId ? m : x))
    const updated = await getProject(id)
    setProject(updated)
  }

  async function handleDeleteMilestone(milestoneId: string) {
    if (!id) return
    await deleteMilestone(milestoneId, id)
    setMilestones(prev => prev.filter(x => x.id !== milestoneId))
    const updated = await getProject(id)
    setProject(updated)
  }

  async function handleDeleteProject() {
    if (!id) return
    setDeleting(true)
    try {
      await deleteProject(id)
      navigate('/projects', { replace: true })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-gutter lg:p-margin-desktop space-y-6 max-w-container-max mx-auto w-full">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!project) return null

  const completed = milestones.filter(m => m.completedAt !== null).length
  const total = milestones.length

  return (
    <>
      <div className="p-gutter lg:p-margin-desktop flex flex-col gap-6 max-w-container-max mx-auto w-full">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild className="shrink-0 mt-1">
            <Link to="/projects"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-headline-lg font-headline-lg text-foreground">{project.name}</h1>
              <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', STATUS_COLORS[project.status])}>
                {project.status}
              </span>
            </div>
            <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
              <MapPin className="w-4 h-4" />{project.location}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <NotificationBell />
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="w-4 h-4 mr-1.5" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete
            </Button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <TrendingUp className="w-4 h-4" /> Progress
              </div>
              <p className="text-2xl font-bold">{project.progress}%</p>
              <Progress value={project.progress} className="h-1.5 mt-2 bg-muted" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <DollarSign className="w-4 h-4" /> Budget
              </div>
              <p className="text-2xl font-bold">{formatBudget(project.budget)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <CalendarDays className="w-4 h-4" /> Start
              </div>
              <p className="text-lg font-semibold">
                {project.startDate ? format(parseISO(project.startDate), 'dd MMM yyyy') : '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <CalendarDays className="w-4 h-4" /> Deadline
              </div>
              <p className="text-lg font-semibold">
                {project.endDate ? format(parseISO(project.endDate), 'dd MMM yyyy') : '—'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="milestones">
              Milestones {total > 0 && <Badge variant="secondary" className="ml-2 text-xs">{completed}/{total}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="punch">Punch List</TabsTrigger>
            <TabsTrigger value="site-logs">Site Logs</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="resources">
              Resources {(equipment.length + materials.length + vehicles.length) > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">{equipment.length + materials.length + vehicles.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="feed">
              Feed {posts.length > 0 && <Badge variant="secondary" className="ml-2 text-xs">{posts.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <Card>
              <CardHeader><CardTitle>Description</CardTitle></CardHeader>
              <CardContent>
                {project.description
                  ? <p className="text-muted-foreground leading-relaxed">{project.description}</p>
                  : <p className="text-muted-foreground italic text-sm">No description added yet.</p>
                }
              </CardContent>
            </Card>
          </TabsContent>

          {/* Milestones */}
          <TabsContent value="milestones">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Milestones</CardTitle>
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </CardHeader>
              <CardContent>
                {milestones.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No milestones yet.</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setAddOpen(true)}>
                      <Plus className="w-4 h-4 mr-1" /> Add first milestone
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
                    <ul className="space-y-4">
                      {milestones.map(m => (
                        <li key={m.id} className="relative pl-10 group">
                          <div className={cn(
                            'absolute left-2.5 top-1.5 w-3 h-3 rounded-full ring-4 ring-background',
                            m.completedAt ? 'bg-secondary' : 'bg-border',
                          )} />
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className={cn('font-medium', m.completedAt && 'line-through text-muted-foreground')}>
                                {m.title}
                              </p>
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {m.completedAt
                                  ? `Completed ${format(parseISO(m.completedAt), 'dd MMM yyyy')}`
                                  : m.dueDate ? `Due ${format(parseISO(m.dueDate), 'dd MMM yyyy')}` : 'No due date'
                                }
                              </p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!m.completedAt && (
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-secondary" onClick={() => handleComplete(m.id)} title="Mark complete">
                                  <Check className="w-4 h-4" />
                                </Button>
                              )}
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteMilestone(m.id)} title="Delete">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Budget */}
          <TabsContent value="budget">
            <BudgetTab projectId={project.id} totalBudget={project.budget} />
          </TabsContent>

          {/* Punch List */}
          <TabsContent value="punch">
            <PunchTab projectId={project.id} />
          </TabsContent>

          {/* Site Logs */}
          <TabsContent value="site-logs">
            <SiteLogsTab projectId={project.id} />
          </TabsContent>

          {/* Documents */}
          <TabsContent value="documents">
            <DocumentsTab projectId={project.id} />
          </TabsContent>

          {/* Resources */}
          <TabsContent value="resources">
            <div className="space-y-4">
              {/* Equipment */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-muted-foreground">construction</span>
                    Equipment
                    {equipment.length > 0 && <Badge variant="secondary" className="ml-auto text-xs">{equipment.length}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {equipment.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No equipment assigned to this project.</p>
                  ) : (
                    <ul className="divide-y text-sm">
                      {equipment.map(e => (
                        <li key={e.id} className="flex items-center justify-between py-2.5 gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{e.name}</p>
                            <p className="text-xs text-muted-foreground">{e.category}</p>
                          </div>
                          <span className={cn(
                            'text-xs font-semibold border rounded-full px-2.5 py-0.5 shrink-0',
                            e.status === 'Available' ? 'bg-secondary/10 text-secondary border-secondary/20' :
                            e.status === 'In Use' ? 'bg-primary/10 text-primary border-primary/20' :
                            'bg-tertiary/10 text-tertiary border-tertiary/20',
                          )}>
                            {e.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Materials */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-muted-foreground">inventory_2</span>
                    Materials
                    {materials.length > 0 && <Badge variant="secondary" className="ml-auto text-xs">{materials.length}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {materials.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No materials tracked for this project.</p>
                  ) : (
                    <ul className="divide-y text-sm">
                      {materials.map(m => (
                        <li key={m.id} className="flex items-center justify-between py-2.5 gap-3">
                          <p className="font-medium text-foreground truncate">{m.name}</p>
                          <p className="text-muted-foreground shrink-0">
                            <span className="font-semibold text-foreground">{m.quantity.toLocaleString()}</span> {m.unit}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Fleet */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-muted-foreground">local_shipping</span>
                    Fleet
                    {vehicles.length > 0 && <Badge variant="secondary" className="ml-auto text-xs">{vehicles.length}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {vehicles.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No vehicles assigned to this project.</p>
                  ) : (
                    <ul className="divide-y text-sm">
                      {vehicles.map(v => (
                        <li key={v.id} className="flex items-center justify-between py-2.5 gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{v.name}</p>
                            <p className="text-xs text-muted-foreground">{v.driverName ?? 'No driver assigned'}</p>
                          </div>
                          <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded shrink-0">{v.plateNumber}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <p className="text-xs text-muted-foreground text-center pb-2">
                Manage assignments in{' '}
                <a href="/resources" className="underline underline-offset-2 text-primary hover:opacity-80">Resources & Logistics</a>
              </p>
            </div>
          </TabsContent>

          {/* Feed */}
          <TabsContent value="feed">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Site updates for this project
                </p>
                <Button size="sm" onClick={() => setNewPostOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Post Update
                </Button>
              </div>

              {posts.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-outline-variant rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <span className="material-symbols-outlined text-muted-foreground text-2xl">feed</span>
                  </div>
                  <p className="font-medium text-foreground">No updates yet</p>
                  <p className="text-muted-foreground text-sm mt-1">Post the first site update for this project.</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => setNewPostOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Post Update
                  </Button>
                </div>
              ) : (
                posts.map(post => (
                  <FeedPost key={post.id} post={post} />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Milestone Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Milestone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title *</label>
              <Input
                placeholder="e.g. Foundation Sign-off"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddMilestone()}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Due date</label>
              <DatePicker value={newDueDate} onChange={setNewDueDate} placeholder="Select due date" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddMilestone} disabled={!newTitle.trim() || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Milestone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      {project && (
        <EditProjectDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          project={project}
          onSaved={updated => setProject(updated)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={v => { if (!deleting) setDeleteOpen(v) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            <span className="font-semibold text-foreground">{project?.name}</span> and all its milestones
            will be permanently deleted. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProject} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Post Dialog */}
      <NewPostDialog
        open={newPostOpen}
        onClose={() => setNewPostOpen(false)}
        onPosted={post => setPosts(prev => [post, ...prev])}
        projects={project ? [project] : []}
        defaultProjectId={id}
      />
    </>
  )
}
