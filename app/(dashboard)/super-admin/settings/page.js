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
      <div className="page-header flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Super Admin - Account configuration</p>
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
