'use client'

import { useEffect, useState } from 'react'
import { authApi } from '@/services/authApi'
import { companyApi } from '@/services/companyApi'
import { useAuthStore } from '@/store/authStore'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function CompanySettingsPage() {
  const currentUser = useAuthStore((s) => s.user)
  const canEdit = currentUser?.role === 'COMPANY_ADMIN'

  const [tenant, setTenant] = useState(null)
  const [hrSettings, setHrSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hrMessage, setHrMessage] = useState('')
  const [hrSaving, setHrSaving] = useState(false)

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' })
  const [pwMessage, setPwMessage] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  useEffect(() => {
    companyApi.getProfile()
      .then((res) => {
        setTenant(res.data.data)
        setHrSettings(res.data.data.hrSettings)
      })
      .finally(() => setLoading(false))
  }, [])

  function toggleDay(list, day) {
    return list.includes(day) ? list.filter((d) => d !== day) : [...list, day]
  }

  async function handleSaveHrSettings(e) {
    e.preventDefault()
    setHrSaving(true)
    setHrMessage('')
    try {
      await companyApi.updateProfile({ hrSettings })
      setHrMessage('Settings saved')
      setTimeout(() => setHrMessage(''), 3000)
    } finally {
      setHrSaving(false)
    }
  }

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

  if (loading) return <p className="text-sm text-slate-400">Loading...</p>

  const enabledModules = Object.entries(tenant?.features || {}).filter(([, enabled]) => enabled).map(([key]) => key)

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Company Admin · Preferences</p>
        </div>
      </div>

      <form onSubmit={handleSaveHrSettings} className="stat-card space-y-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Employee & Working Hours</h3>
        {hrMessage && <p className="text-sm text-emerald-600 dark:text-emerald-400">{hrMessage}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Employee ID Prefix</span>
            <input className="input-field uppercase" disabled={!canEdit} value={hrSettings.employeeIdPrefix} onChange={(e) => setHrSettings({ ...hrSettings, employeeIdPrefix: e.target.value.toUpperCase() })} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Office Start Time</span>
            <input type="time" className="input-field" disabled={!canEdit} value={hrSettings.officeStartTime} onChange={(e) => setHrSettings({ ...hrSettings, officeStartTime: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Office End Time</span>
            <input type="time" className="input-field" disabled={!canEdit} value={hrSettings.officeEndTime} onChange={(e) => setHrSettings({ ...hrSettings, officeEndTime: e.target.value })} />
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Working Days</p>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <button type="button" key={day} disabled={!canEdit} onClick={() => setHrSettings({ ...hrSettings, workingDays: toggleDay(hrSettings.workingDays, day) })} className={`px-3 py-1.5 rounded-full text-xs font-medium ${hrSettings.workingDays.includes(day) ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>{day}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Weekly Off</p>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <button type="button" key={day} disabled={!canEdit} onClick={() => setHrSettings({ ...hrSettings, weeklyOff: toggleDay(hrSettings.weeklyOff, day) })} className={`px-3 py-1.5 rounded-full text-xs font-medium ${hrSettings.weeklyOff.includes(day) ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>{day}</button>
              ))}
            </div>
          </div>
        </div>
        {canEdit && <button type="submit" disabled={hrSaving} className="btn-primary">{hrSaving ? 'Saving...' : 'Save'}</button>}
      </form>

      <div className="stat-card space-y-3">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Enabled Modules</h3>
        <div className="flex flex-wrap gap-2">
          {enabledModules.length === 0 ? (
            <p className="text-sm text-slate-400">No modules enabled yet.</p>
          ) : enabledModules.map((m) => (
            <span key={m} className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">{m.replace(/_/g, ' ')}</span>
          ))}
        </div>
        <p className="text-xs text-slate-400">Enabling additional modules requires a plan upgrade — contact your platform administrator.</p>
      </div>

      <div className="stat-card space-y-2">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Coming Soon</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Approval workflows, notifications and email settings aren't built yet — this app has no email-delivery service in place, so these would be non-functional forms today. They'll land once that's in place.</p>
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
