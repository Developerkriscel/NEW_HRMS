'use client'

import { useEffect, useState } from 'react'
import { LifeBuoy, Send, X } from 'lucide-react'

const CATEGORIES = [
  'Attendance & Time', 'Leave Management', 'Payroll & Compensation', 'Recruitment',
  'Performance', 'Employee Data', 'Billing & Subscription', 'Account & Access',
  'Integration', 'Feature Request', 'Technical Issue', 'Other',
]

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']

export default function SupportTicketModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    subject: '', category: 'Technical Issue', priority: 'Medium', relatedModule: '', description: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !saving) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose, saving])

  if (!open) return null

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!form.subject.trim() || !form.description.trim()) {
      setError('Subject and description are required.')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/company/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...form,
          subject: form.subject.trim(),
          description: form.description.trim(),
          relatedModule: form.relatedModule.trim() || null,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || 'Failed to create ticket')
      onCreated?.(data.data)
    } catch (err) {
      setError(err.message || 'Failed to create ticket')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="support-ticket-title" className="max-h-[min(760px,calc(100vh-2rem))] w-full max-w-3xl overflow-y-auto rounded-[26px] border border-white/70 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white/95 px-6 py-5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:px-8">
          <div>
            <h2 id="support-ticket-title" className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">
              <LifeBuoy className="h-6 w-6 text-indigo-500" /> Create Support Ticket
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Raise a platform support request for your organization.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Close support ticket form">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 sm:p-8">
          {error ? <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}
          <div className="grid gap-5 md:grid-cols-2">
            <label className="md:col-span-2">
              <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Subject</span>
              <input autoFocus className="input-field" value={form.subject} onChange={(e) => update('subject', e.target.value)} placeholder="Briefly describe the issue" />
            </label>
            <label>
              <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Category</span>
              <select className="input-field" value={form.category} onChange={(e) => update('category', e.target.value)}>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select>
            </label>
            <label>
              <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Priority</span>
              <select className="input-field" value={form.priority} onChange={(e) => update('priority', e.target.value)}>{PRIORITIES.map((item) => <option key={item}>{item}</option>)}</select>
            </label>
            <label className="md:col-span-2">
              <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Related Module</span>
              <input className="input-field" value={form.relatedModule} onChange={(e) => update('relatedModule', e.target.value)} placeholder="Optional, e.g. Payroll, Attendance, Recruitment" />
            </label>
            <label className="md:col-span-2">
              <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Description</span>
              <textarea className="input-field min-h-[150px] resize-y py-3" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Include what happened, affected users, and expected result." />
            </label>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}><Send className="h-4 w-4" />{saving ? 'Creating...' : 'Create Ticket'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
