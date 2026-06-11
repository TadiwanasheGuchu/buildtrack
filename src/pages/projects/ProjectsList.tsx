import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { Plus, Search, MapPin, TrendingUp } from 'lucide-react'
import type { Project, ProjectStatus } from '@/types/project'
import { getProjects } from '@/services/projectService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import NotificationBell from '@/components/NotificationBell'

const STATUS_COLORS: Record<ProjectStatus, string> = {
  Planning: 'bg-muted text-muted-foreground border',
  Active: 'bg-secondary/10 text-secondary border-secondary/30',
  'On Hold': 'bg-amber-50 text-amber-700 border-amber-200',
  Completed: 'bg-green-50 text-green-700 border-green-200',
  Delayed: 'bg-destructive/10 text-destructive border-destructive/20',
}

function formatBudget(n: number) {
  if (n >= 1_000_000) return `R ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `R ${(n / 1_000).toFixed(0)}K`
  return `R ${n}`
}

export default function ProjectsList() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    getProjects()
      .then(setProjects)
      .finally(() => setLoading(false))
  }, [])

  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.location.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="p-gutter lg:p-margin-desktop flex flex-col gap-6 max-w-container-max mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-lg font-headline-lg text-foreground">Projects</h1>
          <p className="text-muted-foreground mt-1">
            {loading ? '—' : `${projects.length} project${projects.length !== 1 ? 's' : ''} total`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Button asChild>
            <Link to="/projects/new">
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or location…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Planning">Planning</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="On Hold">On Hold</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Delayed">Delayed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Project cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl border bg-card p-6 space-y-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-2 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <TrendingUp className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">No projects found</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first project to get started'}
          </p>
          {!search && statusFilter === 'all' && (
            <Button asChild className="mt-4">
              <Link to="/projects/new"><Plus className="w-4 h-4 mr-2" />New Project</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(project => (
            <button
              key={project.id}
              onClick={() => navigate(`/projects/${project.id}`)}
              className="rounded-xl border bg-card text-left p-6 hover:shadow-md hover:border-primary/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 group"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-card-foreground group-hover:text-primary transition-colors truncate">
                    {project.name}
                  </h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{project.location}</span>
                  </p>
                </div>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold shrink-0 ${STATUS_COLORS[project.status]}`}>
                  {project.status}
                </span>
              </div>

              <div className="space-y-1.5 mb-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span className="font-medium text-foreground">{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="h-1.5 bg-muted" />
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                <span className="font-medium text-foreground">{formatBudget(project.budget)}</span>
                <span>Due {format(parseISO(project.endDate), 'MMM yyyy')}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
