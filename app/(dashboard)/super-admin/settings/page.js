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
    <div className="animate-fade-in space-y-8">
      <div className="page-header flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Super Admin · Account configuration</p>
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
            <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">{user?.name}</span>
          </div>
          <div className="bg-slate-50/50 dark:bg-slate-800/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Email Address</span>
            <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">{user?.email}</span>
          </div>
          <div className="bg-slate-50/50 dark:bg-slate-800/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Role</span>
            <span className="inline-block px-2.5 py-1 mt-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold rounded-md">{user?.role}</span>
          </div>
          <div className="bg-slate-50/50 dark:bg-slate-800/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Access Scope</span>
            <span className="inline-block px-2.5 py-1 mt-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-xs font-bold rounded-md">Platform-wide</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="neumorphic-card p-6 sm:p-8">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">Security</h3>
            <p className="text-xs text-slate-500 mt-1">Update your password</p>
          </div>
          
          {pwMessage && <div className="p-3 mb-4 rounded-lg bg-emerald-50/80 text-emerald-600 text-sm font-medium border border-emerald-100">{pwMessage}</div>}
          
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 ml-1 uppercase tracking-wide">Current Password</label>
              <input required type="password" placeholder="••••••••" className="input-field" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 ml-1 uppercase tracking-wide">New Password</label>
              <input required type="password" placeholder="••••••••" className="input-field" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} />
            </div>
            <div className="pt-2">
              <button type="submit" disabled={pwSaving} className="btn-primary w-full justify-center">
                {pwSaving ? 'Updating Securely...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

        <div className="neumorphic-card p-6 sm:p-8 flex flex-col">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">Active Session</h3>
            <p className="text-xs text-slate-500 mt-1">Manage your current login session</p>
          </div>
          
          <div className="flex-1 flex flex-col justify-center items-center p-6 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/30">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3 shadow-inner">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Sign Out of NexaHR</h4>
            <p className="text-xs text-slate-500 mb-4 max-w-[200px]">End your current session and return to the login screen.</p>
            <button onClick={() => logout()} className="btn-danger w-full justify-center">Sign Out Securely</button>
          </div>
        </div>
      </div>
    </div>
  )
}
