'use client'

import { useEffect, useState } from 'react'
import { LogOut } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { DataTable } from '@/components/tables/DataTable'
import { resignationApi } from '@/services/resignationApi'
import { formatDate } from '@/lib/utils'

export function EmployeeOffboardingWorkspace() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ resignationDate: '', lastWorkingDate: '', reason: '' })

  function load() {
    setLoading(true)
    resignationApi.list({ size: 50 })
      .then((res) => setItems(res.data.data.content || []))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function submitResignation(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await resignationApi.submit(form)
      setForm({ resignationDate: '', lastWorkingDate: '', reason: '' })
      setMessage('Resignation submitted')
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to submit resignation')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { header: 'Resignation Date', accessor: 'resignationDate', render: (v) => formatDate(v) },
    { header: 'Last Working Date', accessor: 'lastWorkingDate', render: (v) => formatDate(v) },
    { header: 'Reason', accessor: 'reason', render: (v) => v || '-' },
    { header: 'Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
    { header: 'Handover To', accessor: 'handoverEmployee', render: (v) => v ? `${v.firstName} ${v.lastName}` : '-' },
  ]

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Offboarding</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Submit and track resignation workflow</p>
        </div>
      </div>

      <form onSubmit={submitResignation} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input required type="date" className="input-field" value={form.resignationDate} onChange={(e) => setForm({ ...form, resignationDate: e.target.value })} />
        <input type="date" className="input-field" value={form.lastWorkingDate} onChange={(e) => setForm({ ...form, lastWorkingDate: e.target.value })} />
        <input className="input-field" placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <button disabled={saving} className="btn-primary"><LogOut className="w-4 h-4" /> Submit</button>
      </form>

      {message && <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>}
      <DataTable columns={columns} data={items} isLoading={loading} searchPlaceholder="Search resignations..." emptyMessage="No resignation records found" />
    </div>
  )
}
