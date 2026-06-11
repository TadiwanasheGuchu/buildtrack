import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import NotificationBell from '@/components/NotificationBell'
import { getProjects } from '@/services/projectService'
import type { Project } from '@/types/project'

interface Tab {
  label: string
  to: string
  active?: boolean
}

interface TopNavProps {
  tabs: Tab[]
  searchPlaceholder?: string
  profileImageUrl?: string
  userName?: string
  variant?: 'dashboard' | 'feed'
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const STATUS_DOT: Record<string, string> = {
  Planning: 'bg-outline',
  Active: 'bg-secondary',
  'On Hold': 'bg-tertiary',
  Completed: 'bg-secondary',
  Delayed: 'bg-destructive',
}

// ── Project quick-search with results dropdown ─────────────────────────────

function ProjectSearch({ placeholder, variant }: { placeholder: string; variant: 'dashboard' | 'feed' }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [projects, setProjects] = useState<Project[] | null>(null)
  const loadingRef = useRef(false)

  async function ensureLoaded() {
    if (projects || loadingRef.current) return
    loadingRef.current = true
    try {
      setProjects(await getProjects())
    } catch {
      setProjects([])
    } finally {
      loadingRef.current = false
    }
  }

  const q = query.trim().toLowerCase()
  const matches = q && projects
    ? projects.filter(p =>
        p.name.toLowerCase().includes(q) || p.location.toLowerCase().includes(q),
      ).slice(0, 6)
    : []

  function go(projectId: string) {
    setQuery('')
    setOpen(false)
    navigate(`/projects/${projectId}`)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && matches.length > 0) {
      go(matches[0].id)
    } else if (e.key === 'Escape') {
      setOpen(false)
      e.currentTarget.blur()
    }
  }

  const inputProps = {
    type: 'text' as const,
    placeholder,
    value: query,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => { setQuery(e.target.value); setOpen(true) },
    onFocus: () => { ensureLoaded(); setOpen(true) },
    onBlur: () => setTimeout(() => setOpen(false), 150),
    onKeyDown: handleKeyDown,
  }

  return (
    <div className="relative">
      {variant === 'dashboard' ? (
        <div className="flex items-center bg-surface-container-high rounded-full px-4 py-1.5 gap-2">
          <span className="material-symbols-outlined text-on-surface-variant text-[20px]">search</span>
          <input className="bg-transparent border-none focus:ring-0 text-body-md w-64 p-0" {...inputProps} />
        </div>
      ) : (
        <div className="relative">
          <span className="absolute inset-y-0 left-3 flex items-center text-on-surface-variant">
            <span className="material-symbols-outlined">search</span>
          </span>
          <input
            className="pl-10 pr-4 py-2 bg-surface-container-high border-none rounded-full text-body-md focus:ring-2 focus:ring-primary w-64"
            {...inputProps}
          />
        </div>
      )}

      {open && q && (
        <div className="absolute top-full mt-2 left-0 w-80 bg-surface rounded-xl shadow-lg border border-outline-variant overflow-hidden z-50">
          {projects === null ? (
            <p className="px-4 py-3 text-body-md text-on-surface-variant">Searching…</p>
          ) : matches.length === 0 ? (
            <p className="px-4 py-3 text-body-md text-on-surface-variant">No projects match “{query.trim()}”</p>
          ) : (
            matches.map(p => (
              <button
                key={p.id}
                onMouseDown={() => go(p.id)}
                className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-surface-container-high transition-colors"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[p.status] ?? 'bg-outline'}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-label-md font-medium text-on-surface truncate">{p.name}</span>
                  <span className="block text-caption text-on-surface-variant truncate">{p.location} · {p.status}</span>
                </span>
              </button>
            ))
          )}
          <button
            onMouseDown={() => { setQuery(''); setOpen(false); navigate('/projects') }}
            className="w-full text-left px-4 py-2.5 text-label-md font-bold text-primary border-t border-outline-variant hover:bg-surface-container-high transition-colors"
          >
            View all projects
          </button>
        </div>
      )}
    </div>
  )
}

// ── TopNav ──────────────────────────────────────────────────────────────────

export default function TopNav({
  tabs,
  searchPlaceholder = 'Search...',
  profileImageUrl,
  userName,
  variant = 'dashboard',
}: TopNavProps) {
  const navigate = useNavigate()
  const isDashboard = variant === 'dashboard'

  const tabLinks = tabs.map(tab => (
    <Link
      key={tab.label}
      to={tab.to}
      className={
        tab.active
          ? 'text-primary font-bold border-b-2 border-primary pb-1 font-label-md text-label-md'
          : 'text-on-surface-variant font-medium hover:text-primary-container transition-colors font-label-md text-label-md'
      }
    >
      {tab.label}
    </Link>
  ))

  return (
    <header className="flex justify-between items-center px-gutter py-unit w-full sticky top-0 z-40 bg-surface shadow-sm">
      {/* Left group */}
      <div className={`flex items-center ${isDashboard ? 'gap-gutter' : 'gap-8'}`}>
        <span className="text-headline-md font-headline-md font-bold text-primary">TerraConstruct</span>

        {isDashboard && (
          <div className="hidden lg:block">
            <ProjectSearch placeholder={searchPlaceholder} variant="dashboard" />
          </div>
        )}

        {!isDashboard && (
          <div className="hidden lg:flex items-center gap-6">
            {tabLinks}
          </div>
        )}
      </div>

      {/* Right group */}
      <div className="flex items-center gap-4">
        {isDashboard && (
          <div className="hidden sm:flex gap-6 mr-4">
            {tabLinks}
          </div>
        )}

        {!isDashboard && (
          <div className="hidden sm:block">
            <ProjectSearch placeholder={searchPlaceholder} variant="feed" />
          </div>
        )}

        {isDashboard ? (
          <>
            <NotificationBell />
            <button
              onClick={() => navigate('/settings/profile')}
              aria-label="Settings"
              className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-container-high"
            >
              settings
            </button>
            <button
              onClick={() => navigate('/site-feed')}
              className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-md text-label-md hover:opacity-90 active:scale-95 transition-all"
            >
              New Log
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => navigate('/site-feed')}
              className="bg-primary text-on-primary px-6 py-2 rounded-full font-label-md text-label-md font-bold active:scale-95 transition-transform"
            >
              New Log
            </button>
            <div className="flex items-center gap-2 text-on-surface-variant">
              <NotificationBell />
              <button
                onClick={() => navigate('/settings/profile')}
                aria-label="Settings"
                className="p-2 hover:bg-surface-variant rounded-full transition-colors"
              >
                <span className="material-symbols-outlined">settings</span>
              </button>
            </div>
          </>
        )}

        <Avatar className={`w-10 h-10 shrink-0 ${isDashboard ? 'border-2 border-outline-variant ml-2' : 'border-2 border-white shadow-sm'}`}>
          <AvatarImage src={profileImageUrl} alt={userName ?? 'User'} />
          <AvatarFallback className="bg-primary text-on-primary text-sm font-bold">
            {userName ? initials(userName) : 'U'}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
