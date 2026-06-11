import { NavLink, useNavigate } from 'react-router-dom'
import { BarChart3, ChevronUp, LayoutDashboard, Camera, Truck, CreditCard, HelpCircle, FolderKanban, Users } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function initials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function SideNav() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-label-md font-medium ${
      isActive
        ? 'bg-primary-container text-on-primary-container font-bold translate-x-1'
        : 'text-on-surface-variant hover:bg-surface-variant'
    }`

  function handleLogout() {
    logout() // async but fire-and-forget; user state clears immediately
  }

  return (
    <aside className="hidden md:flex flex-col h-screen w-64 sticky top-0 left-0 bg-surface-container-low border-r border-outline-variant p-stack-md gap-stack-sm">
      {/* Brand */}
      <div className="flex items-center gap-3 px-2 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-on-primary shrink-0">
          <span className="material-symbols-outlined">architecture</span>
        </div>
        <div className="min-w-0">
          <h2 className="text-on-surface font-bold text-label-md leading-tight truncate">
            {user?.companyName ?? 'TerraConstruct'}
          </h2>
          <p className="text-on-surface-variant text-caption truncate">Construction Manager</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1">
        <NavLink to="/" end className={navLinkClass}>
          <LayoutDashboard className="w-5 h-5 shrink-0" />
          Dashboard
        </NavLink>
        <NavLink to="/projects" className={navLinkClass}>
          <FolderKanban className="w-5 h-5 shrink-0" />
          Projects
        </NavLink>
        <NavLink to="/site-feed" className={navLinkClass}>
          <Camera className="w-5 h-5 shrink-0" />
          Project Site Feed
        </NavLink>
        <NavLink to="/settings/team" className={navLinkClass}>
          <Users className="w-5 h-5 shrink-0" />
          Team
        </NavLink>
        <NavLink to="/resources" className={navLinkClass}>
          <Truck className="w-5 h-5 shrink-0" />
          Resources &amp; Logistics
        </NavLink>
        <NavLink to="/reports" className={navLinkClass}>
          <BarChart3 className="w-5 h-5 shrink-0" />
          Reports
        </NavLink>
        <a
          href="#"
          className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-variant rounded-lg transition-all text-label-md font-medium"
        >
          <CreditCard className="w-5 h-5 shrink-0" />
          Client Portal
        </a>
      </nav>

      {/* Help */}
      <NavLink to="/help" className={navLinkClass}>
        <HelpCircle className="w-5 h-5 shrink-0" />
        Help Center
      </NavLink>

      {/* User profile dropdown */}
      <div className="border-t border-outline-variant pt-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 px-2 py-2 w-full rounded-lg hover:bg-surface-variant transition-colors text-left">
              <Avatar className="w-9 h-9 shrink-0">
                <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                <AvatarFallback className="bg-primary text-on-primary text-sm font-bold">
                  {user ? initials(user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-on-surface truncate">{user?.name ?? 'User'}</p>
                <p className="text-caption text-on-surface-variant capitalize truncate">
                  {user?.role?.replace('_', ' ') ?? 'Owner'}
                </p>
              </div>
              <ChevronUp className="w-4 h-4 text-on-surface-variant shrink-0" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings/profile')}>Profile settings</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings/company')}>Company settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={handleLogout}
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
