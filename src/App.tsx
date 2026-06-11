import { BrowserRouter, NavLink, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import SideNav from '@/components/SideNav'
import Login from '@/pages/auth/Login'
import Register from '@/pages/auth/Register'
import ForgotPassword from '@/pages/auth/ForgotPassword'
import ResetPassword from '@/pages/auth/ResetPassword'
import ExecutiveDashboard from '@/pages/ExecutiveDashboard'
import ProjectSiteFeed from '@/pages/ProjectSiteFeed'
import ProjectsList from '@/pages/projects/ProjectsList'
import ProjectNew from '@/pages/projects/ProjectNew'
import ProjectDetail from '@/pages/projects/ProjectDetail'
import TeamSettings from '@/pages/settings/TeamSettings'
import ProfileSettings from '@/pages/settings/ProfileSettings'
import CompanySettings from '@/pages/settings/CompanySettings'
import ResourcesPage from '@/pages/resources/ResourcesPage'
import ReportsPage from '@/pages/ReportsPage'
import HelpCenter from '@/pages/HelpCenter'
import AcceptInvite from '@/pages/auth/AcceptInvite'
import './App.css'

function MobileBottomNav() {
  const cls = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center ${isActive ? 'text-primary' : 'text-on-surface-variant'}`

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-container border-t border-outline-variant flex justify-around p-4 z-50">
      <NavLink to="/" end className={cls}>
        {({ isActive }) => (
          <>
            <span className={`material-symbols-outlined ${isActive ? 'icon-filled' : ''}`}>dashboard</span>
            <span className="text-[10px] font-bold uppercase mt-1">Home</span>
          </>
        )}
      </NavLink>
      <NavLink to="/site-feed" className={cls}>
        {({ isActive }) => (
          <>
            <span className={`material-symbols-outlined ${isActive ? 'icon-filled' : ''}`}>photo_camera</span>
            <span className="text-[10px] font-bold uppercase mt-1">Feed</span>
          </>
        )}
      </NavLink>
      <NavLink to="/resources" className={cls}>
        {({ isActive }) => (
          <>
            <span className={`material-symbols-outlined ${isActive ? 'icon-filled' : ''}`}>local_shipping</span>
            <span className="text-[10px] font-bold uppercase mt-1">Fleet</span>
          </>
        )}
      </NavLink>
      <button className="flex flex-col items-center text-on-surface-variant">
        <span className="material-symbols-outlined">person</span>
        <span className="text-[10px] font-bold uppercase mt-1">Profile</span>
      </button>
    </nav>
  )
}

function AppLayout() {
  return (
    <div className="bg-background text-foreground min-h-screen flex overflow-hidden">
      <SideNav />
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        <Outlet />
      </div>
      <MobileBottomNav />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<ExecutiveDashboard />} />
              <Route path="/projects" element={<ProjectsList />} />
              <Route path="/projects/new" element={<ProjectNew />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/site-feed" element={<ProjectSiteFeed />} />
              <Route path="/settings/team" element={<TeamSettings />} />
              <Route path="/settings/profile" element={<ProfileSettings />} />
              <Route path="/settings/company" element={<CompanySettings />} />
              <Route path="/resources" element={<ResourcesPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/help" element={<HelpCenter />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
