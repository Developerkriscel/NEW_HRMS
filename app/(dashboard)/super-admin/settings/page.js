'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { authApi } from '@/services/authApi'
import { useAuthStore } from '@/store/authStore'

export default function SuperAdminSettingsPage() {
  const { user, setUser, logout } = useAuthStore()
  const [refreshing, setRefreshing] = useState(false)
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' })
  const [pwMessage, setPwMessage] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  async function loadProfile() {
    setRefreshing(true)
    try {
      const { data } = await authApi.me()
      setUser(data.data)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!user) loadProfile()
  }, [])

  async function handlePasswordChange(e) {
    e.preventDefault()
    setPwSaving(true)
    setPwMessage('')
    try {
      await authApi.changePassword(pwForm.currentPassword, pwForm.newPassword)
      setPwMessage('Password changed successfully')
      setPwForm({ currentPassword: '', newPassword: '' })
    } catch (err) {
      setPwMessage(err.response?.data?.message || 'Failed to change password')
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Super Admin · Account settings</p>
        </div>
      </div>

      <div className="stat-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Profile</h3>
          <button onClick={loadProfile} className="btn-secondary text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div><span className="text-slate-400">Name:</span> <span className="text-slate-800 dark:text-slate-200">{user?.name}</span></div>
          <div><span className="text-slate-400">Email:</span> <span className="text-slate-800 dark:text-slate-200">{user?.email}</span></div>
          <div><span className="text-slate-400">Role:</span> <span className="text-slate-800 dark:text-slate-200">{user?.role}</span></div>
          <div><span className="text-slate-400">Scope:</span> <span className="text-slate-800 dark:text-slate-200">Platform-wide</span></div>
        </div>
      </div>

      <div className="stat-card">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Change Password</h3>
        {pwMessage && <p className="text-sm mb-3 text-emerald-600 dark:text-emerald-400">{pwMessage}</p>}
        <form onSubmit={handlePasswordChange} className="space-y-3 max-w-sm">
          <input required type="password" placeholder="Current password" className="input-field" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} />
          <input required type="password" placeholder="New password" className="input-field" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} />
          <button type="submit" disabled={pwSaving} className="btn-primary">
            {pwSaving ? 'Saving...' : 'Change Password'}
          </button>
        </form>
      </div>

      <div className="stat-card">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">Session</h3>
        <button onClick={() => logout()} className="btn-secondary text-red-600 dark:text-red-400">Sign Out</button>
      </div>
    </div>
  )
}
