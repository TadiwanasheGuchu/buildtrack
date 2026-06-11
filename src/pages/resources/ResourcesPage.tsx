import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, Plus, Trash2, Loader2, Package, Wrench, Truck } from 'lucide-react'
import type { Equipment, Material, Vehicle, CreateEquipmentData, CreateMaterialData, CreateVehicleData } from '@/types/resource'
import { EQUIPMENT_CATEGORIES, MATERIAL_UNITS } from '@/types/resource'
import {
  getEquipment, createEquipment, updateEquipment, deleteEquipment,
  getMaterials, createMaterial, updateMaterial, deleteMaterial,
  getVehicles, createVehicle, updateVehicle, deleteVehicle,
} from '@/services/resourceService'
import { getProjects } from '@/services/projectService'
import type { Project } from '@/types/project'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { cn } from '@/lib/utils'
import NotificationBell from '@/components/NotificationBell'

// ── Status chip ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  'Available':   'bg-secondary/10 text-secondary border-secondary/20',
  'In Use':      'bg-primary/10 text-primary border-primary/20',
  'Maintenance': 'bg-tertiary/10 text-tertiary border-tertiary/20',
}

function StatusChip({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center text-xs font-semibold border rounded-full px-2.5 py-0.5', STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground')}>
      {status}
    </span>
  )
}

// ── Generic delete confirm ─────────────────────────────────────────────────

function DeleteDialog({ label, onClose, onConfirm }: {
  label: string
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setLoading(true)
    setError('')
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={v => { if (!v && !loading) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Delete?</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          <span className="font-semibold text-foreground">{label}</span> will be permanently removed.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Row actions ────────────────────────────────────────────────────────────

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
        <Pencil className="w-3.5 h-3.5" />
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onDelete}>
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  )
}

// ── Equipment tab ──────────────────────────────────────────────────────────

const eqSchema = z.object({
  name:      z.string().min(1, 'Required'),
  category:  z.string().min(1, 'Required'),
  status:    z.enum(['Available', 'In Use', 'Maintenance']),
  projectId: z.string().nullable(),
  notes:     z.string().max(500).optional(),
})
type EqForm = z.infer<typeof eqSchema>

function EquipmentDialog({ projects, editing, onClose, onSaved }: {
  projects: Project[]
  editing: Equipment | null
  onClose: () => void
  onSaved: (item: Equipment) => void
}) {
  const [serverError, setServerError] = useState('')

  const form = useForm<EqForm>({
    resolver: zodResolver(eqSchema),
    defaultValues: {
      name:      editing?.name ?? '',
      category:  editing?.category ?? EQUIPMENT_CATEGORIES[0],
      status:    editing?.status ?? 'Available',
      projectId: editing?.projectId ?? null,
      notes:     editing?.notes ?? '',
    },
  })

  async function onSubmit(values: EqForm) {
    setServerError('')
    const data: CreateEquipmentData = {
      name: values.name,
      category: values.category,
      status: values.status,
      projectId: values.projectId || null,
      notes: values.notes || null,
    }
    try {
      const saved = editing
        ? await updateEquipment(editing.id, data)
        : await createEquipment(data)
      onSaved(saved)
      onClose()
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Save failed')
    }
  }

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Equipment' : 'Add Equipment'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl><Input placeholder="e.g. Caterpillar 320 Excavator" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {EQUIPMENT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
                      <SelectItem value="Available">Available</SelectItem>
                      <SelectItem value="In Use">In Use</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="projectId" render={({ field }) => (
              <FormItem>
                <FormLabel>Assigned project</FormLabel>
                <Select value={field.value ?? 'none'} onValueChange={v => field.onChange(v === 'none' ? null : v)}>
                  <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea rows={2} placeholder="Optional notes..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {serverError && <p className="text-sm text-destructive">{serverError}</p>}
            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Save Changes' : 'Add Equipment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function EquipmentTab({ projects }: { projects: Project[] }) {
  const [items, setItems] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Equipment | null>(null)
  const [deleting, setDeleting] = useState<Equipment | null>(null)

  useEffect(() => {
    getEquipment().then(setItems).finally(() => setLoading(false))
  }, [])

  function handleSaved(item: Equipment) {
    setItems(prev => editing ? prev.map(e => e.id === item.id ? item : e) : [item, ...prev])
  }

  if (loading) return <TabSkeleton />

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true) }}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Equipment
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={<Wrench className="w-6 h-6" />} label="No equipment yet" onAdd={() => setDialogOpen(true)} />
      ) : (
        <div className="rounded-xl border overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground">
                <th className="text-left px-4 py-2.5 font-medium">Name</th>
                <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">Category</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-left px-4 py-2.5 font-medium hidden lg:table-cell">Project</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map(e => (
                <tr key={e.id} className="group hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{e.name}</p>
                    {e.notes && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{e.notes}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{e.category}</td>
                  <td className="px-4 py-3"><StatusChip status={e.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {e.projectName ?? <span className="italic">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <RowActions
                      onEdit={() => { setEditing(e); setDialogOpen(true) }}
                      onDelete={() => setDeleting(e)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialogOpen && (
        <EquipmentDialog
          projects={projects}
          editing={editing}
          onClose={() => { setDialogOpen(false); setEditing(null) }}
          onSaved={handleSaved}
        />
      )}
      {deleting && (
        <DeleteDialog
          label={deleting.name}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await deleteEquipment(deleting.id)
            setItems(prev => prev.filter(e => e.id !== deleting.id))
          }}
        />
      )}
    </div>
  )
}

// ── Materials tab ──────────────────────────────────────────────────────────

const matSchema = z.object({
  name:      z.string().min(1, 'Required'),
  unit:      z.string().min(1, 'Required'),
  quantity:  z.coerce.number<number>().min(0, 'Must be 0 or more'),
  projectId: z.string().nullable(),
})
type MatForm = z.infer<typeof matSchema>

function MaterialDialog({ projects, editing, onClose, onSaved }: {
  projects: Project[]
  editing: Material | null
  onClose: () => void
  onSaved: (item: Material) => void
}) {
  const [serverError, setServerError] = useState('')

  const form = useForm<MatForm>({
    resolver: zodResolver(matSchema),
    defaultValues: {
      name:      editing?.name ?? '',
      unit:      editing?.unit ?? MATERIAL_UNITS[0],
      quantity:  editing?.quantity ?? 0,
      projectId: editing?.projectId ?? null,
    },
  })

  async function onSubmit(values: MatForm) {
    setServerError('')
    const data: CreateMaterialData = {
      name: values.name, unit: values.unit, quantity: values.quantity,
      projectId: values.projectId || null,
    }
    try {
      const saved = editing
        ? await updateMaterial(editing.id, data)
        : await createMaterial(data)
      onSaved(saved)
      onClose()
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Save failed')
    }
  }

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Material' : 'Add Material'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Material name *</FormLabel>
                <FormControl><Input placeholder="e.g. Portland Cement 42.5N" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity *</FormLabel>
                  <FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="unit" render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {MATERIAL_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="projectId" render={({ field }) => (
              <FormItem>
                <FormLabel>Assigned project</FormLabel>
                <Select value={field.value ?? 'none'} onValueChange={v => field.onChange(v === 'none' ? null : v)}>
                  <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />

            {serverError && <p className="text-sm text-destructive">{serverError}</p>}
            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Save Changes' : 'Add Material'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function MaterialsTab({ projects }: { projects: Project[] }) {
  const [items, setItems] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Material | null>(null)
  const [deleting, setDeleting] = useState<Material | null>(null)

  useEffect(() => {
    getMaterials().then(setItems).finally(() => setLoading(false))
  }, [])

  function handleSaved(item: Material) {
    setItems(prev => editing ? prev.map(m => m.id === item.id ? item : m) : [item, ...prev])
  }

  if (loading) return <TabSkeleton />

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true) }}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Material
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={<Package className="w-6 h-6" />} label="No materials tracked yet" onAdd={() => setDialogOpen(true)} />
      ) : (
        <div className="rounded-xl border overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground">
                <th className="text-left px-4 py-2.5 font-medium">Material</th>
                <th className="text-left px-4 py-2.5 font-medium">Qty</th>
                <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">Project</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map(m => (
                <tr key={m.id} className="group hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{m.name}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold">{m.quantity.toLocaleString()}</span>
                    <span className="text-muted-foreground ml-1">{m.unit}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {m.projectName ?? <span className="italic">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <RowActions
                      onEdit={() => { setEditing(m); setDialogOpen(true) }}
                      onDelete={() => setDeleting(m)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialogOpen && (
        <MaterialDialog
          projects={projects}
          editing={editing}
          onClose={() => { setDialogOpen(false); setEditing(null) }}
          onSaved={handleSaved}
        />
      )}
      {deleting && (
        <DeleteDialog
          label={deleting.name}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await deleteMaterial(deleting.id)
            setItems(prev => prev.filter(m => m.id !== deleting.id))
          }}
        />
      )}
    </div>
  )
}

// ── Fleet tab ──────────────────────────────────────────────────────────────

const vehSchema = z.object({
  name:        z.string().min(1, 'Required'),
  plateNumber: z.string().min(1, 'Required'),
  driverName:  z.string().optional(),
  projectId:   z.string().nullable(),
})
type VehForm = z.infer<typeof vehSchema>

function VehicleDialog({ projects, editing, onClose, onSaved }: {
  projects: Project[]
  editing: Vehicle | null
  onClose: () => void
  onSaved: (item: Vehicle) => void
}) {
  const [serverError, setServerError] = useState('')

  const form = useForm<VehForm>({
    resolver: zodResolver(vehSchema),
    defaultValues: {
      name:        editing?.name ?? '',
      plateNumber: editing?.plateNumber ?? '',
      driverName:  editing?.driverName ?? '',
      projectId:   editing?.projectId ?? null,
    },
  })

  async function onSubmit(values: VehForm) {
    setServerError('')
    const data: CreateVehicleData = {
      name: values.name, plateNumber: values.plateNumber,
      driverName: values.driverName || null, projectId: values.projectId || null,
    }
    try {
      const saved = editing
        ? await updateVehicle(editing.id, data)
        : await createVehicle(data)
      onSaved(saved)
      onClose()
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Save failed')
    }
  }

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Vehicle' : 'Add Vehicle'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Vehicle name *</FormLabel>
                <FormControl><Input placeholder="e.g. Hino 300 Flatbed" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="plateNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Plate number *</FormLabel>
                  <FormControl><Input placeholder="e.g. GP 42 SD FK" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="driverName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Driver</FormLabel>
                  <FormControl><Input placeholder="Optional" {...field} /></FormControl>
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="projectId" render={({ field }) => (
              <FormItem>
                <FormLabel>Assigned project</FormLabel>
                <Select value={field.value ?? 'none'} onValueChange={v => field.onChange(v === 'none' ? null : v)}>
                  <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />

            {serverError && <p className="text-sm text-destructive">{serverError}</p>}
            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Save Changes' : 'Add Vehicle'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function FleetTab({ projects }: { projects: Project[] }) {
  const [items, setItems] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [deleting, setDeleting] = useState<Vehicle | null>(null)

  useEffect(() => {
    getVehicles().then(setItems).finally(() => setLoading(false))
  }, [])

  function handleSaved(item: Vehicle) {
    setItems(prev => editing ? prev.map(v => v.id === item.id ? item : v) : [item, ...prev])
  }

  if (loading) return <TabSkeleton />

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true) }}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Vehicle
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={<Truck className="w-6 h-6" />} label="No vehicles in fleet yet" onAdd={() => setDialogOpen(true)} />
      ) : (
        <div className="rounded-xl border overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground">
                <th className="text-left px-4 py-2.5 font-medium">Vehicle</th>
                <th className="text-left px-4 py-2.5 font-medium">Plate</th>
                <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">Driver</th>
                <th className="text-left px-4 py-2.5 font-medium hidden lg:table-cell">Project</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map(v => (
                <tr key={v.id} className="group hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{v.name}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{v.plateNumber}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {v.driverName ?? <span className="italic">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {v.projectName ?? <span className="italic">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <RowActions
                      onEdit={() => { setEditing(v); setDialogOpen(true) }}
                      onDelete={() => setDeleting(v)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialogOpen && (
        <VehicleDialog
          projects={projects}
          editing={editing}
          onClose={() => { setDialogOpen(false); setEditing(null) }}
          onSaved={handleSaved}
        />
      )}
      {deleting && (
        <DeleteDialog
          label={deleting.name}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await deleteVehicle(deleting.id)
            setItems(prev => prev.filter(v => v.id !== deleting.id))
          }}
        />
      )}
    </div>
  )
}

// ── Shared helpers ─────────────────────────────────────────────────────────

function TabSkeleton() {
  return (
    <div className="space-y-3 pt-2">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
    </div>
  )
}

function EmptyState({ icon, label, onAdd }: { icon: React.ReactNode; label: string; onAdd: () => void }) {
  return (
    <div className="text-center py-20 border border-dashed border-outline-variant rounded-xl">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 text-muted-foreground">
        {icon}
      </div>
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-sm text-muted-foreground mt-1">Add the first entry to get started.</p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onAdd}>
        <Plus className="w-4 h-4 mr-1" /> Add
      </Button>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ResourcesPage() {
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') ?? ''
  const initialTab = ['equipment', 'materials', 'fleet'].includes(tabParam) ? tabParam : 'equipment'
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    getProjects().then(setProjects)
  }, [])

  return (
    <div className="p-gutter lg:p-margin-desktop flex flex-col gap-6 max-w-container-max mx-auto w-full">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-headline-lg font-headline-lg text-foreground">Resources & Logistics</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage equipment, materials, and fleet across all projects.
          </p>
        </div>
        <NotificationBell />
      </div>

      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="equipment">
            <Wrench className="w-4 h-4 mr-2" />
            Equipment
          </TabsTrigger>
          <TabsTrigger value="materials">
            <Package className="w-4 h-4 mr-2" />
            Materials
          </TabsTrigger>
          <TabsTrigger value="fleet">
            <Truck className="w-4 h-4 mr-2" />
            Fleet
          </TabsTrigger>
        </TabsList>

        <TabsContent value="equipment" className="mt-4">
          <EquipmentTab projects={projects} />
        </TabsContent>
        <TabsContent value="materials" className="mt-4">
          <MaterialsTab projects={projects} />
        </TabsContent>
        <TabsContent value="fleet" className="mt-4">
          <FleetTab projects={projects} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
