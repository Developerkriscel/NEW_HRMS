'use client'

import { useEffect, useState } from 'react'
import { GraduationCap } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { DataTable } from '@/components/tables/DataTable'
import { employeeApi } from '@/services/employeeApi'
import { trainingApi } from '@/services/trainingApi'
import { formatDate } from '@/lib/utils'

const STATUSES = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

export function TrainingWorkspace() {
  const [sessions, setSessions] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ title: '', category: '', trainer: '', scheduledAt: '', attendeeIds: [] })

  function load() {
    setLoading(true)
    Promise.all([trainingApi.list(), employeeApi.getAll({ size: 200 })])
      .then(([trainingRes, employeeRes]) => {
        setSessions(trainingRes.data.data || [])
        setEmployees(employeeRes.data.data.content || [])
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function createTraining(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await trainingApi.create(form)
      setForm({ title: '', category: '', trainer: '', scheduledAt: '', attendeeIds: [] })
      setMessage('Training created')
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to create training')
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(row, status) {
    setSaving(true)
    setMessage('')
    try {
      await trainingApi.update(row._id, { status })
      setMessage('Training updated')
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update training')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { header: 'Training', accessor: 'title', render: (_, row) => (
      <div>
        <p className="font-medium text-slate-800 dark:text-slate-100">{row.title}</p>
        <p className="text-xs text-slate-400">{row.category || 'General'} - {row.trainer || 'No trainer'}</p>
      </div>
    ) },
    { header: 'Date', accessor: 'scheduledAt', render: (v) => formatDate(v) },
    { header: 'Attendees', accessor: 'attendees', render: (v) => Array.isArray(v) ? v.length : 0 },
    { header: 'Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
    { header: 'Action', key: 'action', sortable: false, render: (_, row) => (
      <select className="input-field min-w-36" value={row.status} disabled={saving} onChange={(e) => updateStatus(row, e.target.value)}>
        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    ) },
  ]

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Training</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Schedule sessions and track completion</p>
        </div>
      </div>
      <form onSubmit={createTraining} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input required className="input-field" placeholder="Training title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className="input-field" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <input className="input-field" placeholder="Trainer" value={form.trainer} onChange={(e) => setForm({ ...form, trainer: e.target.value })} />
        <input type="datetime-local" className="input-field" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
        <select multiple className="input-field md:col-span-3 min-h-28" value={form.attendeeIds} onChange={(e) => setForm({ ...form, attendeeIds: Array.from(e.target.selectedOptions).map((o) => o.value) })}>
          {employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.firstName} {employee.lastName}</option>)}
        </select>
        <button disabled={saving} className="btn-primary self-start"><GraduationCap className="w-4 h-4" /> Create Training</button>
      </form>
      {message && <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>}
      <DataTable columns={columns} data={sessions} isLoading={loading} searchPlaceholder="Search training..." emptyMessage="No training sessions found" />
    </div>
  )
}
