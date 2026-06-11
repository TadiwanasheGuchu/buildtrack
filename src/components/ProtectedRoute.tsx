import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-white">architecture</span>
          </div>
          <p className="text-muted-foreground text-sm">Loading…</p>
        </div>
      </div>
    )
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}
