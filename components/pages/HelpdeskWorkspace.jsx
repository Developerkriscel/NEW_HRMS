'use client'

import { useEffect, useState } from 'react'
import { MessageSquarePlus } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { DataTable } from '@/components/tables/DataTable'
import { helpdeskApi } from '@/services/helpdeskApi'
import { formatDate } from '@/lib/utils'

const STATUSES = ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED']

export function HelpdeskWorkspace({ title, subtitle, canRaise = false, canManage = false }) {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [form, setForm] = useState({ subject: '', category: '', priority: 'MEDIUM', description: '' })
  const [message, setMessage] = useState('')

  function load() {
    setLoading(true)
    const params = { size: 100 }
    if (status) params.status = status
    helpdeskApi.list(params)
      .then((res) => setTickets(res.data.data.content || []))
      .finally(() => setLoading(false))
  }

  useEffect(load, [status])

  async function raiseTicket(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await helpdeskApi.raise(form)
      setForm({ subject: '', category: '', priority: 'MEDIUM', description: '' })
      setMessage('Ticket raised')
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to raise ticket')
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(ticket, nextStatus) {
    if (ticket.status === nextStatus) return
    setSaving(true)
    setMessage('')
    try {
      await helpdeskApi.setStatus(ticket._id, nextStatus)
      setMessage('Ticket updated')
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update ticket')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { header: 'Ticket', accessor: 'subject', render: (_, row) => (
      <div>
        <p className="font-medium text-slate-800 dark:text-slate-100">{row.subject}</p>
        <p className="text-xs text-slate-400">{row.category || 'General'} - {row.priority}</p>
      </div>
    ) },
    { header: 'Raised By', accessor: 'raisedBy', render: (v) => v ? `${v.firstName} ${v.lastName}` : 'Me' },
    { header: 'Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
    { header: 'Created', accessor: 'createdAt', render: (v) => formatDate(v) },
  ]

  if (canManage) {
    columns.push({
      header: 'Action',
      key: 'action',
      sortable: false,
      render: (_, row) => (
        <select
          className="input-field min-w-36"
          value={row.status}
          disabled={saving}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => updateStatus(row, e.target.value)}
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      ),
    })
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{subtitle}</p>
        </div>
        <select className="input-field max-w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {canRaise && (
        <form onSubmit={raiseTicket} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <input required className="input-field md:col-span-2" placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <input className="input-field" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <select className="input-field" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <textarea className="input-field md:col-span-3" rows={2} placeholder="Describe the issue" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <button disabled={saving} className="btn-primary self-start">
            <MessageSquarePlus className="w-4 h-4" /> {saving ? 'Saving...' : 'Raise Ticket'}
          </button>
        </form>
      )}

      {message && <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>}

      <DataTable
        columns={columns}
        data={tickets}
        isLoading={loading}
        searchPlaceholder="Search tickets..."
        emptyMessage="No tickets found"
      />
    </div>
  )
}
