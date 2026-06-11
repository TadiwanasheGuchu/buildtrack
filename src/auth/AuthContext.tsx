import { createContext, useCallback, useEffect, useRef, useState } from 'react'
import type { User } from '@/types/auth'
import { getMeApi, loginApi, logoutApi, refreshTokenApi, registerApi } from '@/services/authService'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (companyName: string, name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loginWithTokens: (accessToken: string, refreshToken: string, user: User) => void
  updateUser: (user: User) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

function getTokenExpiry(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000
  } catch {
    return 0
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }, [])

  const scheduleRefresh = useCallback((accessToken: string) => {
    clearRefreshTimer()
    const expiry = getTokenExpiry(accessToken)
    if (!expiry) return
    // Refresh 5 minutes before expiry
    const delay = expiry - Date.now() - 5 * 60 * 1000
    if (delay <= 0) return
    refreshTimerRef.current = setTimeout(async () => {
      const storedRefreshToken = localStorage.getItem('refresh_token')
      if (!storedRefreshToken) return
      try {
        const { access_token, refresh_token, user: me } = await refreshTokenApi(storedRefreshToken)
        localStorage.setItem('access_token', access_token)
        localStorage.setItem('refresh_token', refresh_token)
        setUser(me)
        scheduleRefresh(access_token)
      } catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        setUser(null)
      }
    }, delay)
  }, [clearRefreshTimer])

  useEffect(() => {
    const accessToken = localStorage.getItem('access_token')
    const storedRefreshToken = localStorage.getItem('refresh_token')

    if (!accessToken && !storedRefreshToken) {
      setIsLoading(false)
      return
    }

    async function restoreSession() {
      if (accessToken) {
        try {
          const me = await getMeApi()
          setUser(me)
          scheduleRefresh(accessToken)
          return
        } catch {
          // Access token expired — fall through to try refresh
        }
      }
      if (storedRefreshToken) {
        try {
          const { access_token, refresh_token, user: me } = await refreshTokenApi(storedRefreshToken)
          localStorage.setItem('access_token', access_token)
          localStorage.setItem('refresh_token', refresh_token)
          setUser(me)
          scheduleRefresh(access_token)
        } catch {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
        }
      }
    }

    restoreSession().finally(() => setIsLoading(false))

    return () => clearRefreshTimer()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email: string, password: string) => {
    const { access_token, refresh_token, user: me } = await loginApi({ email, password })
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', refresh_token)
    setUser(me)
    scheduleRefresh(access_token)
  }, [scheduleRefresh])

  const register = useCallback(async (companyName: string, name: string, email: string, password: string) => {
    const { access_token, refresh_token, user: me } = await registerApi({ companyName, name, email, password })
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', refresh_token)
    setUser(me)
    scheduleRefresh(access_token)
  }, [scheduleRefresh])

  const logout = useCallback(async () => {
    clearRefreshTimer()
    try {
      await logoutApi()
    } catch {
      // Best-effort — always clear local state
    }
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
  }, [clearRefreshTimer])

  const loginWithTokens = useCallback((accessToken: string, refreshToken: string, me: User) => {
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
    setUser(me)
    scheduleRefresh(accessToken)
  }, [scheduleRefresh])

  const updateUser = useCallback((me: User) => setUser(me), [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout, loginWithTokens, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}
