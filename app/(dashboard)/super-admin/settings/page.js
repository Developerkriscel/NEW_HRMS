'use client'

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { authApi } from '@/services/authApi'
import { useAuthStore } from '@/store/authStore'
import { SecuritySettingsSection } from '@/components/pages/SecuritySettingsSection'

export default function SuperAdminSettingsPage() {
  const { user, setUser, logout } = useAuthStore()
  const [refreshing, setRefreshing] = useState(false)

  const loadProfile = useCallback(async () => {
    setRefreshing(true)
    try {
      const { data } = await authApi.me()
      setUser(data.data)
    } finally {
      setRefreshing(false)
    }
  }, [setUser])

  useEffect(() => {
    if (!user) loadProfile()
  }, [loadProfile, user])

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-2 border-b border-slate-100/80 dark:border-slate-800/60">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-1.5">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 hover:scale-[1.02] transition-transform duration-300 relative w-fit pb-2 after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-1/3 after:h-1 after:bg-gradient-to-r after:from-blue-500 after:to-transparent after:rounded-full">Settings</h1>
          </div>
        </div>
      </div>

      <div className="neumorphic-card p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">Profile Information</h3>
            <p className="text-xs text-slate-500 mt-1">Your personal account details</p>
          </div>
          <button onClick={loadProfile} className="btn-secondary text-xs shadow-sm bg-slate-50 hover:bg-slate-100">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-slate-50/50 dark:bg-slate-800/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Full Name</span>
            <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">{user?.name || '-'}</span>
          </div>
          <div className="bg-slate-50/50 dark:bg-slate-800/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Email Address</span>
            <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">{user?.email || '-'}</span>
          </div>
          <div className="bg-slate-50/50 dark:bg-slate-800/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Role</span>
            <span className="inline-block px-2.5 py-1 mt-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold rounded-md">{user?.role || '-'}</span>
          </div>
          <div className="bg-slate-50/50 dark:bg-slate-800/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Access Scope</span>
            <span className="inline-block px-2.5 py-1 mt-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-xs font-bold rounded-md">Platform-wide</span>
          </div>
        </div>
      </div>

      <SecuritySettingsSection onSignOut={logout} />
    </div>
  )
}
