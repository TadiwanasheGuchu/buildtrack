import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { createProject } from '@/services/projectService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { DatePicker } from '@/components/ui/date-picker'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import NotificationBell from '@/components/NotificationBell'

const schema = z.object({
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

type FormValues = z.infer<typeof schema>

export default function ProjectNew() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      location: '',
      status: 'Planning',
      budget: 0,
      description: '',
    },
  })

  async function onSubmit(values: FormValues) {
    setServerError('')
    try {
      const project = await createProject({
        name: values.name,
        location: values.location,
        status: values.status,
        budget: values.budget,
        startDate: values.startDate.toISOString().split('T')[0],
        endDate: values.endDate.toISOString().split('T')[0],
        description: values.description ?? '',
      })
      navigate(`/projects/${project.id}`, { replace: true })
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to create project')
    }
  }

  return (
    <div className="p-gutter lg:p-margin-desktop max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/projects"><ArrowLeft className="w-5 h-5" /></Link>
        </Button>
        <div>
          <h1 className="text-headline-lg font-headline-lg text-foreground">New Project</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Fill in the details to create a new project</p>
        </div>
        <div className="ml-auto">
          <NotificationBell />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Name */}
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Project name *</FormLabel>
                  <FormControl><Input placeholder="e.g. Windhoek Residential Phase 3" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Location */}
              <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem>
                  <FormLabel>Location *</FormLabel>
                  <FormControl><Input placeholder="e.g. Windhoek, Namibia" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Status */}
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

                {/* Budget */}
                <FormField control={form.control} name="budget" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget (ZAR) *</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g. 5000000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Start date */}
                <FormField control={form.control} name="startDate" render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Start date *</FormLabel>
                    <DatePicker value={field.value} onChange={field.onChange} placeholder="Select start date" />
                    {fieldState.error && <p className="text-sm text-destructive">{fieldState.error.message}</p>}
                  </FormItem>
                )} />

                {/* End date */}
                <FormField control={form.control} name="endDate" render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>End date *</FormLabel>
                    <DatePicker value={field.value} onChange={field.onChange} placeholder="Select end date" />
                    {fieldState.error && <p className="text-sm text-destructive">{fieldState.error.message}</p>}
                  </FormItem>
                )} />
              </div>

              <Separator />

              {/* Description */}
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the scope, objectives, and key deliverables…" rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {serverError && <p className="text-sm text-destructive">{serverError}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" type="button" asChild>
                  <Link to="/projects">Cancel</Link>
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Project
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
