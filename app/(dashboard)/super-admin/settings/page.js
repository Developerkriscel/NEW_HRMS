'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, CheckCircle2, Database, RefreshCw, Save, ShieldCheck, UserCircle2 } from 'lucide-react'
import api from '@/services/api'
import { authApi } from '@/services/authApi'
import { useAuthStore } from '@/store/authStore'
import { SecuritySettingsSection } from '@/components/pages/SecuritySettingsSection'
import { cn } from '@/lib/utils'

const defaultSettings = {
  organizationDefaults: {
    defaultCountry: 'India',
    defaultTimezone: 'Asia/Kolkata',
    tenantCodePrefix: '',
  },
  provisioning: {
    databasePrefix: 'nexahr_tenant',
  },
}

const tabs = [
  { id: 'organization', label: 'Organization Form', icon: Building2 },
  { id: 'provisioning', label: 'Provisioning', icon: Database },
  { id: 'security', label: 'My Security', icon: ShieldCheck },
]

function mergeSettings(value = {}) {
  return {
    organizationDefaults: { ...defaultSettings.organizationDefaults, ...(value.organizationDefaults || {}) },
    provisioning: { ...defaultSettings.provisioning, ...(value.provisioning || {}) },
  }
}

function Field({ label, value, onChange, type = 'text', min, max, hint, disabled }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
      <input
        type={type}
        min={min}
        max={max}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="input-field h-11 w-full rounded-xl border border-slate-200/80 bg-white px-3.5 text-sm font-normal shadow-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-800 dark:bg-slate-950"
      />
      {hint ? <span className="mt-1 block text-xs text-slate-400">{hint}</span> : null}
    </label>
  )
}

function formatDateTime(value) {
  if (!value) return 'Never saved'
  return new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function SuperAdminSettingsPage() {
  const { user, setUser, logout, hasPermission } = useAuthStore()
  const canManage = hasPermission('platform.settings.manage')
  const [active, setActive] = useState('organization')
  const [settings, setSettings] = useState(defaultSettings)
  const [meta, setMeta] = useState({ updatedAt: null, updatedBy: null })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refreshingProfile, setRefreshingProfile] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const summary = useMemo(() => [
    { label: 'Default Country', value: settings.organizationDefaults.defaultCountry || '-' },
    { label: 'Default Timezone', value: settings.organizationDefaults.defaultTimezone || '-' },
    { label: 'Code Prefix', value: settings.organizationDefaults.tenantCodePrefix || 'None' },
    { label: 'DB Prefix', value: settings.provisioning.databasePrefix || '-' },
  ], [settings])

  const update = (group, key, value) => {
    setSettings((current) => ({
      ...current,
      [group]: { ...current[group], [key]: value },
    }))
  }

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      const { data } = await api.get('/super-admin/settings', { skipCache: true, devMock: false })
      setSettings(mergeSettings(data.data?.settings))
      setMeta({ updatedAt: data.data?.updatedAt || null, updatedBy: data.data?.updatedBy || null })
    } catch (err) {
      setSettings(defaultSettings)
      setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to load platform settings' })
    } finally {
      setLoading(false)
    }
  }, [])

  const loadProfile = useCallback(async () => {
    setRefreshingProfile(true)
    try {
      const { data } = await authApi.me()
      setUser(data.data)
    } finally {
      setRefreshingProfile(false)
    }
  }, [setUser])

  useEffect(() => {
    loadSettings()
    if (!user) loadProfile()
  }, [loadSettings, loadProfile, user])

  async function saveSettings() {
    if (!canManage) return
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const { data } = await api.put('/super-admin/settings', { settings })
      setSettings(mergeSettings(data.data?.settings))
      setMeta({
        updatedAt: data.data?.updatedAt || new Date().toISOString(),
        updatedBy: data.data?.updatedBy || user?.email || null,
      })
      setMessage({ type: 'success', text: data.message || 'Platform settings saved' })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save platform settings' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      <div className="flex flex-col gap-4 border-b border-slate-100/80 pb-5 dark:border-slate-800/60 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="w-fit bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text pb-2 text-3xl font-bold tracking-tight text-transparent dark:from-blue-400 dark:to-indigo-400 sm:text-4xl">
            Settings
          </h1>
          <p className="text-sm text-slate-500 font-normal">
            Platform account, onboarding defaults, and tenant provisioning settings.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={loadSettings} disabled={loading} className="btn-secondary">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </button>
          {active !== 'security' ? (
            <button onClick={saveSettings} disabled={!canManage || saving || loading} className="btn-primary disabled:cursor-not-allowed disabled:opacity-60">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          ) : null}
        </div>
      </div>

      {message.text ? (
        <div className={cn(
          'flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium',
          message.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
            : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300'
        )}>
          <CheckCircle2 className="h-4 w-4" />
          {message.text}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-[28px] border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <UserCircle2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user?.name || 'Super Admin'}</p>
                <p className="truncate text-xs text-slate-500 font-normal">{user?.email || '-'}</p>
              </div>
            </div>
            <button onClick={loadProfile} className="btn-secondary w-full justify-center text-xs">
              <RefreshCw className={cn('h-3.5 w-3.5', refreshingProfile && 'animate-spin')} />
              Refresh Profile
            </button>
          </div>

          <nav className="rounded-[28px] border border-slate-200/70 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {tabs.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setActive(item.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition',
                    active === item.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              )
            })}
          </nav>

          <div className="rounded-[28px] border border-slate-200/70 bg-white p-4 text-xs text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 font-normal">
            <p className="font-semibold uppercase tracking-wider text-slate-400">Last saved</p>
            <p className="mt-1.5 text-slate-700 dark:text-slate-300 font-medium">{formatDateTime(meta.updatedAt)}</p>
            <p className="mt-0.5 truncate text-slate-400">By {meta.updatedBy || 'system default'}</p>
          </div>
        </aside>

        <main className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summary.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">{item.label}</p>
                <p className="mt-1.5 truncate text-base font-semibold text-slate-800 dark:text-slate-200">{item.value}</p>
              </div>
            ))}
          </div>

          {!canManage && active !== 'security' ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
              You can view these settings, but saving requires platform.settings.manage permission.
            </div>
          ) : null}

          {active === 'organization' && (
            <section className="rounded-[28px] border border-slate-200/70 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 border-b border-slate-100 pb-4 dark:border-slate-800">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Organization Form Defaults</h2>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed font-normal">
                  Used only to prefill regional fields and code suggestions in Create Organization. Seats, storage, price, and trial days are managed from Plans.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field disabled={!canManage} label="Default Country" value={settings.organizationDefaults.defaultCountry} onChange={(value) => update('organizationDefaults', 'defaultCountry', value)} />
                <Field disabled={!canManage} label="Default Timezone" value={settings.organizationDefaults.defaultTimezone} onChange={(value) => update('organizationDefaults', 'defaultTimezone', value)} />
                <Field disabled={!canManage} label="Tenant Code Prefix" value={settings.organizationDefaults.tenantCodePrefix} onChange={(value) => update('organizationDefaults', 'tenantCodePrefix', value)} hint="Optional prefix added to suggested tenant codes." />
              </div>
            </section>
          )}

          {active === 'provisioning' && (
            <section className="rounded-[28px] border border-slate-200/70 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 border-b border-slate-100 pb-4 dark:border-slate-800">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Provisioning</h2>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed font-normal">
                  Used by tenant provisioning to generate new tenant database names.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field disabled={!canManage} label="Tenant Database Prefix" value={settings.provisioning.databasePrefix} onChange={(value) => update('provisioning', 'databasePrefix', value)} hint="Example: nexahr_tenant_ACME becomes nexahr_tenant_acme." />
              </div>
            </section>
          )}

          {active === 'security' && <SecuritySettingsSection onSignOut={logout} />}
        </main>
      </div>
    </div>
  )
}
