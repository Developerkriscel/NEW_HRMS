'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, LifeBuoy, Send } from 'lucide-react'

const CATEGORIES = [
  'Attendance & Time',
  'Leave Management',
  'Payroll & Compensation',
  'Recruitment',
  'Performance',
  'Employee Data',
  'Billing & Subscription',
  'Account & Access',
  'Integration',
  'Feature Request',
  'Technical Issue',
  'Other',
]

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']

export default function CreateSupportTicketPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    subject: '',
    category: 'Technical Issue',
    priority: 'Medium',
    relatedModule: '',
    description: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  async function submit(e) {
    e.preventDefault()
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
      router.replace(`/company/support/${data.data._id}`)
    } catch (err) {
      setError(err.message || 'Failed to create ticket')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      <button type="button" onClick={() => router.push('/company/support')} className="btn-secondary">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="page-header">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900 dark:text-white">
            <LifeBuoy className="h-6 w-6 text-indigo-500" />
            Create Support Ticket
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">Raise a platform support request for your organization.</p>
        </div>
      </div>

      <form onSubmit={submit} className="max-w-4xl rounded-[26px] border border-slate-200/70 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {error ? <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}

        <div className="grid gap-5 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Subject</span>
            <input className="input-field" value={form.subject} onChange={(e) => update('subject', e.target.value)} placeholder="Briefly describe the issue" />
          </label>

          <label>
            <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Category</span>
            <select className="input-field" value={form.category} onChange={(e) => update('category', e.target.value)}>
              {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Priority</span>
            <select className="input-field" value={form.priority} onChange={(e) => update('priority', e.target.value)}>
              {PRIORITIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label className="md:col-span-2">
            <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Related Module</span>
            <input className="input-field" value={form.relatedModule} onChange={(e) => update('relatedModule', e.target.value)} placeholder="Optional, e.g. Payroll, Attendance, Recruitment" />
          </label>

          <label className="md:col-span-2">
            <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Description</span>
            <textarea className="input-field min-h-[180px] resize-y py-3" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Include what happened, affected users, and expected result." />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={() => router.push('/company/support')} className="btn-secondary" disabled={saving}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Send className="h-4 w-4" />
            {saving ? 'Creating...' : 'Create Ticket'}
          </button>
        </div>
      </form>
    </div>
  )
}
