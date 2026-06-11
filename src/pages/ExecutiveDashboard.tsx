import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  format, parseISO, startOfMonth, endOfMonth,
  isBefore, isToday, isTomorrow, differenceInDays,
} from 'date-fns'
import { useAuth } from '@/auth/useAuth'
import TopNav from '../components/TopNav'
import { getProjects, getUpcomingMilestones } from '@/services/projectService'
import { getCompanyBudgetSummary } from '@/services/budgetService'
import { getCompanyOpenPunchCount } from '@/services/punchService'
import type { Project } from '@/types/project'
import type { MilestoneWithProject } from '@/types/project'
import type { CompanyBudgetSummary } from '@/types/budget'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'

const TABS = [
  { label: 'Projects', to: '/projects', active: true },
  { label: 'Analytics', to: '/reports', active: false },
  { label: 'Fleet', to: '/resources?tab=fleet', active: false },
]

const WEATHER_DATA = [
  { city: 'Windhoek', condition: 'Clear Skies', temp: '32°C', wind: '12km/h', icon: 'sunny', iconColor: 'text-secondary' },
  { city: 'Gaborone', condition: 'Mostly Sunny', temp: '34°C', wind: '8km/h', icon: 'partly_cloudy_day', iconColor: 'text-tertiary' },
  { city: 'Harare', condition: 'Light Rain', temp: '22°C', wind: '24km/h', icon: 'rainy', iconColor: 'text-primary' },
  { city: 'Cape Town', condition: 'Overcast', temp: '19°C', wind: '35km/h', icon: 'cloud', iconColor: 'text-on-surface-variant' },
]

// Cycle through these for project card thumbnails
const CARD_GRADIENTS = [
  'from-primary/25 to-secondary/15',
  'from-secondary/25 to-tertiary/15',
  'from-tertiary/25 to-primary/15',
  'from-primary/15 to-tertiary/25',
  'from-secondary/15 to-primary/25',
]

function formatBudget(n: number) {
  if (n >= 1_000_000) return `R ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `R ${(n / 1_000).toFixed(0)}K`
  return `R ${n}`
}

function milestoneTimeInfo(dueDate: string | null): { label: string; color: string; dotColor: string } {
  if (!dueDate) return { label: 'No due date', color: 'text-on-surface-variant', dotColor: 'bg-outline' }
  const d = parseISO(dueDate)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  if (isBefore(d, today)) return { label: 'Overdue', color: 'text-destructive', dotColor: 'bg-destructive' }
  if (isToday(d)) return { label: 'Due today', color: 'text-tertiary', dotColor: 'bg-tertiary' }
  if (isTomorrow(d)) return { label: 'Due tomorrow', color: 'text-tertiary', dotColor: 'bg-tertiary' }
  const days = differenceInDays(d, today)
  if (days <= 7) return { label: `In ${days} days`, color: 'text-tertiary', dotColor: 'bg-tertiary' }
  return { label: format(d, 'dd MMM yyyy'), color: 'text-on-surface-variant', dotColor: 'bg-secondary' }
}

export default function ExecutiveDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [upcomingMilestones, setUpcomingMilestones] = useState<MilestoneWithProject[]>([])
  const [budgetSummary, setBudgetSummary] = useState<CompanyBudgetSummary | null>(null)
  const [openPunchCount, setOpenPunchCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getProjects(), getUpcomingMilestones(5), getCompanyBudgetSummary(), getCompanyOpenPunchCount()])
      .then(([ps, ms, bs, pc]) => {
        setProjects(ps); setUpcomingMilestones(ms); setBudgetSummary(bs); setOpenPunchCount(pc)
      })
      .finally(() => setLoading(false))
  }, [])

  const now = new Date()
  const dateRangeLabel = `${format(startOfMonth(now), 'MMM d, yyyy')} – ${format(endOfMonth(now), 'MMM d, yyyy')}`
  const firstName = user?.name?.split(' ')[0] ?? 'there'

  const onTrackCount  = projects.filter(p => p.status === 'Active').length
  const atRiskCount   = projects.filter(p => p.status === 'On Hold').length
  const delayedCount  = projects.filter(p => p.status === 'Delayed').length
  const attentionCount = atRiskCount + delayedCount

  const activeProjects = projects.filter(p => p.status === 'Active').slice(0, 3)

  return (
    <>
      <TopNav
        variant="dashboard"
        tabs={TABS}
        searchPlaceholder="Search projects..."
        profileImageUrl={user?.avatarUrl}
        userName={user?.name}
      />

      <main className="p-gutter lg:p-margin-desktop flex flex-col gap-stack-lg max-w-container-max mx-auto w-full">
        {/* Hero Greeting */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-stack-md">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-background">Executive Overview</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">
              {loading
                ? 'Loading your projects…'
                : attentionCount > 0
                  ? `Welcome back, ${firstName}. You have ${attentionCount} project${attentionCount !== 1 ? 's' : ''} requiring attention.`
                  : `Welcome back, ${firstName}. All projects are on track.`
              }
            </p>
          </div>
          <div className="flex items-center gap-2 bg-surface-container-high px-4 py-2 rounded-xl">
            <span className="material-symbols-outlined text-secondary">calendar_today</span>
            <span className="font-label-md text-label-md text-on-surface">{dateRangeLabel}</span>
          </div>
        </section>

        {/* Status Health Cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-gutter">
          {/* On Track */}
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-warm border border-outline-variant flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined icon-filled">check_circle</span>
              </div>
              <span className="bg-secondary-fixed text-on-secondary-fixed-variant px-3 py-1 rounded-full text-caption font-bold">
                ON TRACK
              </span>
            </div>
            <div>
              {loading
                ? <Skeleton className="h-10 w-16 mb-1" />
                : <h3 className="text-headline-xl font-headline-xl text-secondary">{String(onTrackCount).padStart(2, '0')}</h3>
              }
              <p className="text-on-surface-variant font-label-md text-label-md">Active Projects</p>
            </div>
            <div className="h-1 bg-surface-variant rounded-full overflow-hidden">
              <div
                className="h-full bg-secondary transition-all duration-700"
                style={{ width: loading || !projects.length ? '0%' : `${(onTrackCount / projects.length) * 100}%` }}
              />
            </div>
          </div>

          {/* At Risk */}
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-warm border border-outline-variant flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary">
                <span className="material-symbols-outlined icon-filled">warning</span>
              </div>
              <span className="bg-tertiary-fixed-dim text-on-tertiary-fixed px-3 py-1 rounded-full text-caption font-bold">
                AT RISK
              </span>
            </div>
            <div>
              {loading
                ? <Skeleton className="h-10 w-16 mb-1" />
                : <h3 className="text-headline-xl font-headline-xl text-tertiary">{String(atRiskCount).padStart(2, '0')}</h3>
              }
              <p className="text-on-surface-variant font-label-md text-label-md">On Hold</p>
            </div>
            <div className="h-1 bg-surface-variant rounded-full overflow-hidden">
              <div
                className="h-full bg-tertiary transition-all duration-700"
                style={{ width: loading || !projects.length ? '0%' : `${(atRiskCount / projects.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Delayed */}
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-warm border border-outline-variant flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-full bg-error-container flex items-center justify-center text-error">
                <span className="material-symbols-outlined icon-filled">error</span>
              </div>
              <span className="bg-error-container text-on-error-container px-3 py-1 rounded-full text-caption font-bold">
                DELAYED
              </span>
            </div>
            <div>
              {loading
                ? <Skeleton className="h-10 w-16 mb-1" />
                : <h3 className="text-headline-xl font-headline-xl text-error">{String(delayedCount).padStart(2, '0')}</h3>
              }
              <p className="text-on-surface-variant font-label-md text-label-md">Behind Schedule</p>
            </div>
            <div className="h-1 bg-surface-variant rounded-full overflow-hidden">
              <div
                className="h-full bg-error transition-all duration-700"
                style={{ width: loading || !projects.length ? '0%' : `${(delayedCount / projects.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Open Punch Items */}
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-warm border border-outline-variant flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined icon-filled">checklist</span>
              </div>
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-caption font-bold">
                SNAGGING
              </span>
            </div>
            <div>
              {loading
                ? <Skeleton className="h-10 w-16 mb-1" />
                : <h3 className="text-headline-xl font-headline-xl text-primary">{String(openPunchCount).padStart(2, '0')}</h3>
              }
              <p className="text-on-surface-variant font-label-md text-label-md">Open Punch Items</p>
            </div>
            <div className="h-1 bg-surface-variant rounded-full overflow-hidden">
              <div className="h-full bg-primary/60 transition-all duration-700" style={{ width: openPunchCount > 0 ? '100%' : '0%' }} />
            </div>
          </div>
        </section>

        {/* Budget Overview */}
        <section className="bg-surface-container-lowest rounded-xl shadow-warm border border-outline-variant p-gutter">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
              Budget Overview
            </h2>
            {!loading && budgetSummary && (
              <span className="text-caption text-on-surface-variant">All projects</span>
            )}
          </div>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : budgetSummary ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-surface-container-low rounded-lg p-4">
                  <p className="text-caption text-on-surface-variant mb-1">Total Budget</p>
                  <p className="font-headline-md text-on-surface">{formatBudget(budgetSummary.totalBudget)}</p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-4">
                  <p className="text-caption text-on-surface-variant mb-1">Total Spent</p>
                  <p className="font-headline-md text-on-surface">{formatBudget(budgetSummary.totalSpent)}</p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-4">
                  <p className="text-caption text-on-surface-variant mb-1">Remaining</p>
                  <p className={`font-headline-md ${budgetSummary.remaining < 0 ? 'text-error' : 'text-secondary'}`}>
                    {formatBudget(Math.abs(budgetSummary.remaining))}
                  </p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-4">
                  <p className="text-caption text-on-surface-variant mb-1">Budget Used</p>
                  <p className={`font-headline-md ${budgetSummary.percentUsed > 90 ? 'text-error' : budgetSummary.percentUsed > 70 ? 'text-tertiary' : 'text-on-surface'}`}>
                    {budgetSummary.percentUsed.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Progress
                  value={Math.min(budgetSummary.percentUsed, 100)}
                  className={`h-2 flex-1 ${budgetSummary.percentUsed > 90 ? '[&>div]:bg-error' : budgetSummary.percentUsed > 70 ? '[&>div]:bg-tertiary' : '[&>div]:bg-primary'}`}
                />
                <span className="text-caption text-on-surface-variant shrink-0">
                  {formatBudget(budgetSummary.totalSpent)} of {formatBudget(budgetSummary.totalBudget)}
                </span>
              </div>
            </div>
          ) : null}
        </section>

        {/* Dashboard Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
          {/* Left Column */}
          <div className="lg:col-span-1 flex flex-col gap-stack-md">
            {/* Regional Weather — static, Phase 10 enhancement */}
            <div className="bg-surface-container-lowest rounded-xl shadow-warm border border-outline-variant overflow-hidden">
              <div className="p-gutter border-b border-outline-variant flex items-center justify-between">
                <h2 className="font-headline-md text-headline-md text-on-surface">Regional Weather</h2>
                <span className="material-symbols-outlined text-on-surface-variant">cloud_sync</span>
              </div>
              <div className="divide-y divide-outline-variant">
                {WEATHER_DATA.map((w) => (
                  <div key={w.city} className="p-4 flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <span className={`material-symbols-outlined ${w.iconColor} text-[32px]`}>{w.icon}</span>
                      <div>
                        <p className="font-label-md text-label-md text-on-surface">{w.city}</p>
                        <p className="text-caption text-on-surface-variant">{w.condition}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-headline-md text-on-surface">{w.temp}</p>
                      <p className="text-caption text-on-surface-variant">Wind: {w.wind}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Milestones */}
            <div className="bg-surface-container-lowest rounded-xl shadow-warm border border-outline-variant p-gutter">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-6">Upcoming Milestones</h2>
              {loading ? (
                <div className="flex flex-col gap-6">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="pl-10 relative">
                      <Skeleton className="h-3 w-20 mb-2" />
                      <Skeleton className="h-4 w-40 mb-1" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  ))}
                </div>
              ) : upcomingMilestones.length === 0 ? (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-on-surface-variant text-4xl">task_alt</span>
                  <p className="text-on-surface-variant text-body-md mt-2">No upcoming milestones.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-6 relative">
                  <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-outline-variant" />
                  {upcomingMilestones.map(m => {
                    const { label, color, dotColor } = milestoneTimeInfo(m.dueDate || null)
                    return (
                      <div key={m.id} className="relative pl-10">
                        <div className={`absolute left-2.5 top-1.5 w-3.5 h-3.5 rounded-full ${dotColor} ring-4 ring-white`} />
                        <p className={`text-caption font-bold uppercase tracking-wider ${color}`}>{label}</p>
                        <h4 className="font-label-md text-label-md text-on-surface mt-1 truncate">{m.title}</h4>
                        <p className="text-body-md text-on-surface-variant truncate">{m.projectName}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column — Active Projects */}
          <div className="lg:col-span-2 flex flex-col gap-stack-md">
            <div className="bg-surface-container-lowest rounded-xl shadow-warm border border-outline-variant h-full">
              <div className="p-gutter border-b border-outline-variant flex items-center justify-between bg-surface-container-low/50">
                <h2 className="font-headline-md text-headline-md text-on-surface">Active Projects</h2>
                <Link to="/projects" className="text-primary font-label-md text-label-md hover:underline">
                  View All
                </Link>
              </div>
              <div className="p-gutter flex flex-col gap-6">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <div key={i}>
                      {i > 1 && <hr className="border-outline-variant mb-6" />}
                      <div className="flex gap-4 mb-4">
                        <Skeleton className="w-16 h-16 rounded-lg shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-48" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <div className="space-y-2 text-right">
                          <Skeleton className="h-3 w-28 ml-auto" />
                          <Skeleton className="h-2 w-32 ml-auto" />
                        </div>
                      </div>
                      <Skeleton className="h-14 rounded-lg" />
                    </div>
                  ))
                ) : activeProjects.length === 0 ? (
                  <div className="text-center py-16">
                    <span className="material-symbols-outlined text-on-surface-variant text-5xl">construction</span>
                    <p className="text-on-surface-variant text-body-md mt-3">No active projects yet.</p>
                    <Link
                      to="/projects/new"
                      className="mt-4 inline-block bg-primary text-on-primary px-4 py-2 rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity"
                    >
                      Create your first project
                    </Link>
                  </div>
                ) : (
                  activeProjects.map((project, idx) => (
                    <div key={project.id}>
                      {idx > 0 && <hr className="border-outline-variant mb-6" />}
                      <button
                        className="w-full text-left group"
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                          <div className="flex gap-4">
                            {/* Thumbnail placeholder — no image model yet */}
                            <div className={`w-16 h-16 rounded-lg shrink-0 border border-outline-variant bg-gradient-to-br ${CARD_GRADIENTS[idx % CARD_GRADIENTS.length]} flex items-center justify-center group-hover:scale-105 transition-transform duration-300`}>
                              <span className="material-symbols-outlined text-primary text-2xl">construction</span>
                            </div>
                            <div>
                              <h3 className="font-headline-md text-on-surface group-hover:text-primary transition-colors">{project.name}</h3>
                              <p className="text-body-md text-on-surface-variant flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">location_on</span>
                                {project.location}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-caption font-bold text-on-surface-variant uppercase mb-1">Progress</p>
                            <div className="flex items-center gap-3">
                              <div className="w-32 h-2 bg-surface-variant rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-secondary transition-all duration-700"
                                  style={{ width: `${project.progress}%` }}
                                />
                              </div>
                              <span className="font-label-md text-label-md text-secondary">{project.progress}%</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-surface-container-low rounded-lg p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined icon-filled text-secondary">payments</span>
                            <p className="text-body-md text-on-surface">
                              <span className="font-bold">Budget:</span> {formatBudget(project.budget)}
                            </p>
                          </div>
                          <span className="text-caption text-on-surface-variant italic shrink-0">
                            {project.endDate ? `Due ${format(parseISO(project.endDate), 'MMM yyyy')}` : 'No deadline set'}
                          </span>
                        </div>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
