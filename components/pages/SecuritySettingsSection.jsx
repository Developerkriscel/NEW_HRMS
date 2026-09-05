'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Clock3, Laptop, Lock, LogOut, RefreshCw, ShieldCheck, Smartphone, Tablet, XCircle } from 'lucide-react'
import { authApi } from '@/services/authApi'

function formatDateTime(value) {
  if (!value) return 'Not available'
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function deviceIcon(type) {
  if (type === 'Mobile') return Smartphone
  if (type === 'Tablet') return Tablet
  return Laptop
}

export function SecuritySettingsSection({ onSignOut }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [saving, setSaving] = useState(false)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [sessionData, setSessionData] = useState({ activeCount: 0, sessions: [] })
  const [revoking, setRevoking] = useState(false)

  const passwordRules = useMemo(() => {
    const value = form.newPassword
    return [
      { label: 'Minimum 8 characters', ok: value.length >= 8 },
      { label: 'One uppercase letter', ok: /[A-Z]/.test(value) },
      { label: 'One number', ok: /[0-9]/.test(value) },
      { label: 'Password confirmation matches', ok: !!value && value === form.confirmPassword },
    ]
  }, [form.newPassword, form.confirmPassword])

  const canSubmit = passwordRules.every((rule) => rule.ok) && form.currentPassword && !saving
  const currentSession = sessionData.sessions?.find((item) => item.isCurrent)
  const otherDeviceCount = Math.max((sessionData.activeCount || 0) - (currentSession ? 1 : 0), 0)

  async function loadSessions() {
    setLoadingSessions(true)
    try {
      const { data } = await authApi.sessions()
      setSessionData(data.data || { activeCount: 0, sessions: [] })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to load active devices' })
    } finally {
      setLoadingSessions(false)
    }
  }

  useEffect(() => {
    loadSessions()
  }, [])

  async function handlePasswordChange(e) {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const { data } = await authApi.changePassword(form.currentPassword, form.newPassword)
      const revoked = data.data?.revokedSessions || 0
      setMessage({
        type: 'success',
        text: revoked
          ? `Password updated. ${revoked} other active device${revoked > 1 ? 's were' : ' was'} signed out.`
          : 'Password updated successfully.',
      })
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      await loadSessions()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to change password' })
    } finally {
      setSaving(false)
    }
  }

  async function handleRevokeOtherDevices() {
    setRevoking(true)
    setMessage({ type: '', text: '' })
    try {
      const { data } = await authApi.signOutOtherDevices()
      setSessionData(data.data || { activeCount: 1, sessions: [] })
      setMessage({ type: 'success', text: data.message || 'Other devices signed out' })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to sign out other devices' })
    } finally {
      setRevoking(false)
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6">
      <form onSubmit={handlePasswordChange} className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80">
        <div className="absolute right-0 top-0 h-56 w-56 translate-x-16 -translate-y-20 rounded-full bg-red-500/10 blur-3xl" />
        <div className="relative mb-7 flex items-start gap-4">
          <div className="rounded-2xl bg-red-50 p-4 text-red-600 shadow-inner dark:bg-red-500/10 dark:text-red-300">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">Change Password</h3>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Update your password and keep your account sessions under control.</p>
          </div>
        </div>

        {message.text && (
          <div className={`relative mb-5 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold ${
            message.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {message.text}
          </div>
        )}

        <div className="relative grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Current Password</span>
            <input
              required
              type="password"
              className="input-field h-13 border border-slate-200/70 bg-white/80 shadow-sm focus:border-red-300 focus:ring-4 focus:ring-red-100"
              placeholder="Enter current password"
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
            />
          </label>
          <label>
            <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">New Password</span>
            <input
              required
              type="password"
              className="input-field h-13 border border-slate-200/70 bg-white/80 shadow-sm focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              placeholder="Create strong password"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            />
          </label>
          <label>
            <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Confirm Password</span>
            <input
              required
              type="password"
              className="input-field h-13 border border-slate-200/70 bg-white/80 shadow-sm focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              placeholder="Re-enter new password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            />
          </label>
        </div>

        <div className="relative mt-5 rounded-3xl border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Password Rules</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {passwordRules.map((rule) => (
              <div key={rule.label} className={`flex items-center gap-2 text-sm font-semibold ${rule.ok ? 'text-emerald-700' : 'text-slate-500'}`}>
                {rule.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {rule.label}
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-6 flex flex-col gap-3 sm:flex-row">
          <button type="submit" disabled={!canSubmit} className="btn-primary min-h-12 flex-1 justify-center disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? 'Updating Securely...' : 'Update Password'}
          </button>
          {onSignOut && (
            <button type="button" onClick={onSignOut} className="btn-secondary min-h-12 justify-center text-red-600 hover:bg-red-50">
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          )}
        </div>
      </form>

      <div className="relative overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-blue-400/20 blur-2xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex rounded-2xl bg-white p-3 text-blue-600 shadow-sm dark:bg-slate-800">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-black text-slate-950 dark:text-white">Active Devices</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">Currently signed-in sessions for this account.</p>
          </div>
          <button type="button" onClick={loadSessions} disabled={loadingSessions} className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 shadow-sm hover:text-blue-600 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900">
            <RefreshCw className={`h-4 w-4 ${loadingSessions ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="relative mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-3xl bg-white/85 p-4 shadow-sm dark:bg-slate-900/80">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Active</p>
            <p className="mt-2 text-4xl font-black text-slate-950 dark:text-white">{loadingSessions ? '-' : sessionData.activeCount || 0}</p>
          </div>
          <div className="rounded-3xl bg-white/85 p-4 shadow-sm dark:bg-slate-900/80">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Other Devices</p>
            <p className="mt-2 text-4xl font-black text-orange-600">{loadingSessions ? '-' : otherDeviceCount}</p>
          </div>
        </div>

        <div className="relative mt-5 space-y-3">
          {(sessionData.sessions || []).map((item) => {
            const Icon = deviceIcon(item.deviceType)
            return (
              <div key={item.id} className={`rounded-3xl border p-4 ${item.isCurrent ? 'border-emerald-200 bg-emerald-50/80' : 'border-slate-200 bg-white/80'} dark:border-slate-800 dark:bg-slate-900/70`}>
                <div className="flex items-start gap-3">
                  <div className={`rounded-2xl p-3 ${item.isCurrent ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900 dark:text-white">{item.browser} on {item.os}</p>
                      {item.isCurrent && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">Current</span>}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{item.deviceType} {item.ipAddress ? `- ${item.ipAddress}` : ''}</p>
                    <p className="mt-2 flex items-center gap-1 text-xs font-medium text-slate-400">
                      <Clock3 className="h-3.5 w-3.5" />
                      Last active {formatDateTime(item.lastSeenAt)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
          {!loadingSessions && !sessionData.sessions?.length && (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-6 text-center text-sm font-semibold text-slate-500">
              No tracked active devices yet. Log in again to create a tracked session.
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={revoking || otherDeviceCount === 0}
          onClick={handleRevokeOtherDevices}
          className="relative mt-5 w-full rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm font-black text-red-600 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-55 dark:border-red-500/20 dark:bg-slate-900 dark:hover:bg-red-500/10"
        >
          {revoking ? 'Signing out other devices...' : 'Sign Out Other Devices'}
        </button>
      </div>
    </div>
  )
}
