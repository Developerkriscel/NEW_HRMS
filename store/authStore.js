import { create } from 'zustand'
import { ROLE_DASHBOARDS } from '@/lib/roleDashboards'

import api from '@/services/api'

let fetchMePromise = null
const DEV_LOGIN_STORAGE_KEY = 'nexahr_dev_login'

function rememberDevLogin(user) {
  if (typeof window === 'undefined') return
  if (user?.devLogin) window.localStorage.setItem(DEV_LOGIN_STORAGE_KEY, 'true')
  else window.localStorage.removeItem(DEV_LOGIN_STORAGE_KEY)
}

// Unlike the original (Zustand + localStorage + a raw JWT held in JS), the
// actual access/refresh tokens now live only in httpOnly cookies set by the
// API routes — this store just mirrors the current user for UI purposes.
// Route protection itself is enforced server-side by middleware.js.
export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  hydrated: false,

  setAuth: (user) => {
    rememberDevLogin(user)
    set({ user, isAuthenticated: true, isLoading: false, hydrated: true })
  },

  setUser: (user) => {
    rememberDevLogin(user)
    set({ user })
  },

  fetchMe: async () => {
    const current = get()
    if (current.hydrated) return current.user
    if (fetchMePromise) return fetchMePromise

    set({ isLoading: true })
    fetchMePromise = api.get('/auth/me')
      .then(({ data }) => {
        const user = data.data
        rememberDevLogin(user)
        set({ user, isAuthenticated: true, isLoading: false, hydrated: true })
        return user
      })
      .catch(() => {
        rememberDevLogin(null)
        set({ user: null, isAuthenticated: false, isLoading: false, hydrated: true })
        return null
      })
      .finally(() => {
        fetchMePromise = null
      })

    return fetchMePromise
  },

  logout: async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // ignore — we're logging out regardless
    }
    rememberDevLogin(null)
    set({ user: null, isAuthenticated: false })
    window.location.href = '/login'
  },

  getDashboardPath: () => {
    const { user } = get()
    if (!user?.role) return '/login'
    return ROLE_DASHBOARDS[user.role] || '/login'
  },

  hasPermission: (permission) => {
    const { user } = get()
    if (!user) return false
    if (user.role === 'SUPER_ADMIN') {
      const platformPermissions = user.platformPermissions || []
      return platformPermissions.includes('*') || platformPermissions.includes(permission)
    }
    return user.permissions?.includes(permission) ?? false
  },

  hasRole: (roles) => {
    const { user } = get()
    if (!user) return false
    const rolesArr = Array.isArray(roles) ? roles : [roles]
    return rolesArr.includes(user.role)
  },
}))
