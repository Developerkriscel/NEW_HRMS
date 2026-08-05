'use client'

import { useState } from 'react'
import { Avatar } from '@/components/common/Avatar'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/services/authApi'

export default function ProfilePage() {
  const { user } = useAuthStore()
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' })
  const [pwMessage, setPwMessage] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Profile</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Your account details</p>
        </div>
      </div>

      <div className="stat-card flex items-center gap-4">
        <Avatar name={user?.name || 'U'} size="xl" />
        <div>
          <h3 className="font-semibold text-lg text-slate-900 dark:text-white">{user?.name}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
          <p className="text-xs text-slate-400 mt-1">{user?.role?.replace('_', ' ')} · {user?.companyName}</p>
        </div>
      </div>

      <form onSubmit={handlePasswordChange} className="stat-card space-y-4 max-w-sm">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Change Password</h3>
        {pwMessage && <p className="text-sm text-emerald-600 dark:text-emerald-400">{pwMessage}</p>}
        <input required type="password" placeholder="Current password" className="input-field" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} />
        <input required type="password" placeholder="New password" className="input-field" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} />
        <button type="submit" disabled={pwSaving} className="btn-primary">
          {pwSaving ? 'Saving...' : 'Change Password'}
        </button>
      </form>
    </div>
  )
}
