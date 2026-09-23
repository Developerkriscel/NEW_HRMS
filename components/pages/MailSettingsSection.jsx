'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Eye, EyeOff, Mail, Send, ShieldCheck } from 'lucide-react'
import { companyApi } from '@/services/companyApi'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { useAuthStore } from '@/store/authStore'

const DEFAULT_FORM = {
  enabled: false,
  fromName: 'NexaHR',
  fromEmail: '',
  replyTo: '',
  smtpHost: '',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: '',
  smtpPassword: '',
  testRecipient: '',
  hasPassword: false,
}

export function MailSettingsSection() {
  const currentUser = useAuthStore((s) => s.user)
  const canEdit = ['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(currentUser?.role)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    companyApi.getMailSettings()
      .then((res) => {
        if (!mounted) return
        setForm({ ...DEFAULT_FORM, ...res.data.data, smtpPassword: '' })
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load email settings'))
      .finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [])

  function setValue(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const payload = { ...form }
      if (!payload.smtpPassword) delete payload.smtpPassword
      const res = await companyApi.updateMailSettings(payload)
      setForm({ ...DEFAULT_FORM, ...res.data.data, smtpPassword: '' })
      setMessage('Email settings saved successfully.')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save email settings')
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    setError('')
    setMessage('')
    try {
      await companyApi.testMailSettings(form.testRecipient)
      setMessage(`Test email sent to ${form.testRecipient}.`)
      const res = await companyApi.getMailSettings()
      setForm({ ...DEFAULT_FORM, ...res.data.data, smtpPassword: '' })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send test email')
    } finally {
      setTesting(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <form onSubmit={handleSave} className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
          Configure SMTP once. Offer letters, candidate emails, and employee invitations can use this sender.
        </p>
        <label className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
          <input
            type="checkbox"
            checked={form.enabled}
            disabled={!canEdit || saving}
            onChange={(e) => setValue('enabled', e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          Enable email sending
        </label>
      </div>

      {message && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5" /> {message}
        </div>
      )}
      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Field label="From Name">
          <input className="input-field" disabled={!canEdit} value={form.fromName} onChange={(e) => setValue('fromName', e.target.value)} placeholder="NexaHR Recruitment" />
        </Field>
        <Field label="From Email">
          <input type="email" className="input-field" disabled={!canEdit} value={form.fromEmail} onChange={(e) => setValue('fromEmail', e.target.value)} placeholder="hr@company.com" />
        </Field>
        <Field label="Reply-To Email">
          <input type="email" className="input-field" disabled={!canEdit} value={form.replyTo} onChange={(e) => setValue('replyTo', e.target.value)} placeholder="recruitment@company.com" />
        </Field>
        <Field label="SMTP Host">
          <input className="input-field" disabled={!canEdit} value={form.smtpHost} onChange={(e) => setValue('smtpHost', e.target.value)} placeholder="smtp.gmail.com" />
        </Field>
        <Field label="SMTP Port">
          <input type="number" min="1" max="65535" className="input-field" disabled={!canEdit} value={form.smtpPort} onChange={(e) => setValue('smtpPort', e.target.value)} placeholder="587" />
        </Field>
        <Field label="SMTP Username">
          <input className="input-field" disabled={!canEdit} value={form.smtpUser} onChange={(e) => setValue('smtpUser', e.target.value)} placeholder="hr@company.com" />
        </Field>
        <Field label={form.hasPassword ? 'SMTP Password (leave blank to keep saved password)' : 'SMTP Password'}>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              className="input-field pr-12"
              disabled={!canEdit}
              value={form.smtpPassword}
              onChange={(e) => setValue('smtpPassword', e.target.value)}
              placeholder={form.hasPassword ? 'Saved password is hidden' : 'App password / SMTP password'}
            />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        <Field label="Security">
          <label className="flex min-h-[48px] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
            <input type="checkbox" checked={form.smtpSecure} disabled={!canEdit} onChange={(e) => setValue('smtpSecure', e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            Use SSL/TLS (usually port 465)
          </label>
        </Field>
      </div>

      <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm font-medium text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p>For Gmail/Google Workspace, use an App Password, not your normal login password. Password is saved encrypted and never shown back on screen.</p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/40">
        <h4 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Send Test Email</h4>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input type="email" className="input-field flex-1" disabled={!canEdit} value={form.testRecipient} onChange={(e) => setValue('testRecipient', e.target.value)} placeholder="admin@company.com" />
          <button type="button" onClick={handleTest} disabled={!canEdit || testing || !form.testRecipient} className="btn-secondary justify-center disabled:cursor-not-allowed disabled:opacity-50">
            {testing ? 'Testing...' : <><Send className="h-4 w-4" /> Send Test</>}
          </button>
        </div>
        {form.lastTestStatus && (
          <p className={`mt-3 text-xs font-bold ${form.lastTestStatus === 'SUCCESS' ? 'text-emerald-600' : 'text-red-600'}`}>
            Last test: {form.lastTestStatus}{form.lastTestError ? ` - ${form.lastTestError}` : ''}
          </p>
        )}
      </div>

      <div className="mt-8 flex justify-end">
        <button type="submit" disabled={!canEdit || saving} className="btn-primary min-w-[160px] justify-center disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Email Settings'}
        </button>
      </div>
    </form>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  )
}
