import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, Download, FileDown, Printer } from 'lucide-react'
import type { PortfolioReport } from '@/types/report'
import { PROJECT_CSV_REPORTS } from '@/types/report'
import { downloadPortfolioCsv, downloadProjectCsv, getPortfolioReport } from '@/services/reportService'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import NotificationBell from '@/components/NotificationBell'

const STATUS_COLORS: Record<string, string> = {
  Planning: 'bg-muted text-muted-foreground border',
  Active: 'bg-secondary/10 text-secondary border-secondary/30',
  'On Hold': 'bg-amber-50 text-amber-700 border-amber-200',
  Completed: 'bg-green-50 text-green-700 border-green-200',
  Delayed: 'bg-destructive/10 text-destructive border-destructive/20',
}

function formatBudget(n: number) {
  if (n >= 1_000_000) return `R ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `R ${(n / 1_000).toFixed(0)}K`
  return `R ${n.toFixed(0)}`
}

export default function ReportsPage() {
  const [report, setReport] = useState<PortfolioReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    getPortfolioReport()
      .then(setReport)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load report'))
      .finally(() => setLoading(false))
  }, [])

  async function handleExport(fn: () => Promise<void>) {
    setExporting(true)
    setError('')
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="p-gutter lg:p-margin-desktop flex flex-col gap-6 max-w-container-max mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-headline-lg font-headline-lg text-foreground">Reports &amp; Analytics</h1>
          <p className="text-muted-foreground mt-1">Portfolio performance across all your projects</p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />
            Print / PDF
          </Button>
          <Button onClick={() => handleExport(downloadPortfolioCsv)} disabled={exporting || loading}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-4 py-3 text-sm print:hidden">
          {error}
        </div>
      )}

      {/* KPI cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-gutter">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
      ) : report && (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-gutter">
            {/* Budget utilisation */}
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-warm border border-outline-variant flex flex-col gap-3">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-primary">payments</span>
                <span className="font-label-md text-label-md">Budget Utilisation</span>
              </div>
              <h3 className={`text-headline-xl font-headline-xl ${report.budgetPercentUsed > 100 ? 'text-destructive' : 'text-on-surface'}`}>
                {report.budgetPercentUsed.toFixed(1)}%
              </h3>
              <Progress value={Math.min(report.budgetPercentUsed, 100)} className="h-2" />
              <p className="text-caption text-on-surface-variant">
                {formatBudget(report.totalSpent)} of {formatBudget(report.totalBudget)}
              </p>
            </div>

            {/* Milestone completion */}
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-warm border border-outline-variant flex flex-col gap-3">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-secondary">flag</span>
                <span className="font-label-md text-label-md">Milestones</span>
              </div>
              <h3 className="text-headline-xl font-headline-xl text-on-surface">
                {report.milestonesCompleted}<span className="text-on-surface-variant text-headline-md font-headline-md"> / {report.milestonesTotal}</span>
              </h3>
              <Progress
                value={report.milestonesTotal ? (report.milestonesCompleted / report.milestonesTotal) * 100 : 0}
                className="h-2"
              />
              <p className="text-caption text-on-surface-variant">
                {report.milestonesOverdue > 0
                  ? `${report.milestonesOverdue} overdue`
                  : 'None overdue'}
              </p>
            </div>

            {/* On-time rate */}
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-warm border border-outline-variant flex flex-col gap-3">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-tertiary">schedule</span>
                <span className="font-label-md text-label-md">On-Time Rate</span>
              </div>
              <h3 className="text-headline-xl font-headline-xl text-on-surface">
                {report.onTimeRate !== null ? `${report.onTimeRate.toFixed(0)}%` : '—'}
              </h3>
              <Progress value={report.onTimeRate ?? 0} className="h-2" />
              <p className="text-caption text-on-surface-variant">
                {report.onTimeRate !== null
                  ? 'Completed milestones finished by due date'
                  : 'No completed milestones with due dates yet'}
              </p>
            </div>

            {/* Punch items */}
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-warm border border-outline-variant flex flex-col gap-3">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-primary">checklist</span>
                <span className="font-label-md text-label-md">Punch Items</span>
              </div>
              <h3 className={`text-headline-xl font-headline-xl ${report.punchOpen > 0 ? 'text-tertiary' : 'text-secondary'}`}>
                {report.punchOpen}<span className="text-on-surface-variant text-headline-md font-headline-md"> open</span>
              </h3>
              <Progress
                value={report.punchOpen + report.punchResolved
                  ? (report.punchResolved / (report.punchOpen + report.punchResolved)) * 100
                  : 0}
                className="h-2"
              />
              <p className="text-caption text-on-surface-variant">{report.punchResolved} resolved to date</p>
            </div>
          </section>

          {/* Status breakdown */}
          <section className="flex flex-wrap items-center gap-2">
            <span className="text-label-md font-label-md text-on-surface-variant mr-2">
              {report.projectsTotal} project{report.projectsTotal !== 1 ? 's' : ''}:
            </span>
            {Object.entries(report.projectsByStatus).map(([status, count]) => (
              <Badge key={status} variant="outline" className={STATUS_COLORS[status] ?? ''}>
                {status} · {count}
              </Badge>
            ))}
          </section>

          {/* Per-project table */}
          <section className="bg-surface-container-lowest rounded-xl shadow-warm border border-outline-variant overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-on-surface text-label-md">Project Breakdown</h2>
            </div>
            {report.projects.length === 0 ? (
              <div className="px-6 py-16 text-center text-on-surface-variant">
                <p className="text-body-md">No projects yet — create one to see analytics here.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-40">Progress</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Spent</TableHead>
                    <TableHead className="text-right">Used</TableHead>
                    <TableHead className="text-right">Milestones</TableHead>
                    <TableHead className="text-right">Open Punch</TableHead>
                    <TableHead className="w-12 print:hidden" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.projects.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link to={`/projects/${p.id}`} className="font-semibold text-on-surface hover:text-primary transition-colors">
                          {p.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLORS[p.status] ?? ''}>{p.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={p.progress} className="h-2 flex-1" />
                          <span className="text-caption text-on-surface-variant w-9 text-right">{p.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatBudget(p.budget)}</TableCell>
                      <TableCell className="text-right">{formatBudget(p.spent)}</TableCell>
                      <TableCell className={`text-right font-semibold ${p.percentUsed > 100 ? 'text-destructive' : ''}`}>
                        {p.percentUsed.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">{p.milestonesCompleted}/{p.milestonesTotal}</TableCell>
                      <TableCell className="text-right">{p.punchOpen}</TableCell>
                      <TableCell className="print:hidden">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={exporting} aria-label={`Export ${p.name} data`}>
                              <FileDown className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Export CSV</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {PROJECT_CSV_REPORTS.map(r => (
                              <DropdownMenuItem
                                key={r.value}
                                onClick={() => handleExport(() => downloadProjectCsv(p.id, r.value))}
                              >
                                {r.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </>
      )}
    </div>
  )
}
