'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/common/Badge'
import { DataTable } from '@/components/tables/DataTable'
import { resignationApi } from '@/services/resignationApi'
import { formatDate } from '@/lib/utils'

const STATUSES = ['SUBMITTED', 'MANAGER_REVIEWED', 'FORWARDED_TO_HR', 'APPROVED', 'REJECTED']

export function OffboardingWorkspace() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [message, setMessage] = useState('')

  function load() {
    setLoading(true)
    const params = { size: 100 }
    if (status) params.status = status
    resignationApi.list(params)
      .then((res) => setItems(res.data.data.content || []))
      .finally(() => setLoading(false))
  }

  useEffect(load, [status])

  async function decide(row, decision) {
    setSaving(true)
    setMessage('')
    try {
      await resignationApi.update(row._id, {
        hrDecision: decision,
        hrDecisionNote: decision === 'APPROVED' ? 'Approved by HR' : 'Rejected by HR',
      })
      setMessage(`Resignation ${decision.toLowerCase()}`)
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update resignation')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { header: 'Employee', accessor: 'employee', render: (employee) => (
      <div>
        <p className="font-medium text-slate-800 dark:text-slate-100">{employee?.firstName} {employee?.lastName}</p>
        <p className="text-xs text-slate-400">{employee?.employeeCode || 'Employee'}</p>
      </div>
    ) },
    { header: 'Resignation Date', accessor: 'resignationDate', render: (v) => formatDate(v) },
    { header: 'Last Working Date', accessor: 'lastWorkingDate', render: (v) => formatDate(v) },
    { header: 'Handover To', accessor: 'handoverEmployee', render: (v) => v ? `${v.firstName} ${v.lastName}` : '-' },
    { header: 'Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
    { header: 'Action', key: 'action', sortable: false, render: (_, row) => ['APPROVED', 'REJECTED'].includes(row.status) ? null : (
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        <button disabled={saving} className="btn-secondary py-1.5" onClick={() => decide(row, 'APPROVED')}>Approve</button>
        <button disabled={saving} className="btn-secondary py-1.5 text-red-600" onClick={() => decide(row, 'REJECTED')}>Reject</button>
      </div>
    ) },
  ]

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Offboarding</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Review resignations, handovers, and final HR decisions</p>
        </div>
        <select className="input-field max-w-52" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {message && <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>}

      <DataTable
        columns={columns}
        data={items}
        isLoading={loading}
        searchPlaceholder="Search resignations..."
        emptyMessage="No resignations found"
      />
    </div>
  )
}
