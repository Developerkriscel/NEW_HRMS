'use client'

import { useEffect, useState } from 'react'
import { Send } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { DataTable } from '@/components/tables/DataTable'
import { teamRequestApi } from '@/services/teamRequestApi'
import { formatDate } from '@/lib/utils'

const TYPES = ['SHIFT_CHANGE', 'OVERTIME', 'WORK_FROM_HOME', 'TRAVEL', 'DOCUMENT']

export function EmployeeRequestsWorkspace() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ type: 'WORK_FROM_HOME', fromDate: '', toDate: '', reason: '', detailText: '' })

  function load() {
    setLoading(true)
    teamRequestApi.list({ size: 100 })
      .then((res) => setRequests(res.data.data.content || []))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function submitRequest(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await teamRequestApi.submit({
        type: form.type,
        fromDate: form.fromDate || null,
        toDate: form.toDate || null,
        reason: form.reason,
        details: { note: form.detailText },
      })
      setForm({ type: 'WORK_FROM_HOME', fromDate: '', toDate: '', reason: '', detailText: '' })
      setMessage('Request submitted')
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to submit request')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { header: 'Type', accessor: 'type', render: (v) => <Badge>{v}</Badge> },
    { header: 'Period', accessor: 'fromDate', render: (_, row) => `${formatDate(row.fromDate)} - ${formatDate(row.toDate)}` },
    { header: 'Reason', accessor: 'reason' },
    { header: 'Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
    { header: 'Reviewed By', accessor: 'reviewedBy', render: (v) => v ? `${v.firstName} ${v.lastName}` : '-' },
  ]

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Requests</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Submit team requests for manager approval</p>
        </div>
      </div>

      <form onSubmit={submitRequest} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <select className="input-field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          {TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <input type="date" className="input-field" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} />
        <input type="date" className="input-field" value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} />
        <input required className="input-field" placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <button disabled={saving} className="btn-primary"><Send className="w-4 h-4" /> Submit</button>
        <textarea className="input-field md:col-span-5" rows={2} placeholder="Additional details" value={form.detailText} onChange={(e) => setForm({ ...form, detailText: e.target.value })} />
      </form>

      {message && <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>}
      <DataTable columns={columns} data={requests} isLoading={loading} searchPlaceholder="Search requests..." emptyMessage="No requests found" />
    </div>
  )
}
