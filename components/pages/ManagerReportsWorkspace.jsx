'use client'

import { useEffect, useState } from 'react'
import { DataTable } from '@/components/tables/DataTable'
import { managerApi } from '@/services/managerApi'
import { formatDate } from '@/lib/utils'

const REPORT_TYPES = ['attendance', 'late', 'absence', 'overtime', 'leave', 'kra', 'delay', 'task', 'performance', 'pending']

function labelFor(key) {
  return key.replaceAll('_', ' ').replace(/^\w/, (c) => c.toUpperCase())
}

export function ManagerReportsWorkspace() {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const today = now.toISOString().slice(0, 10)
  const [type, setType] = useState('attendance')
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(today)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    managerApi.getReports({ type, from, to })
      .then((res) => setRows(res.data.data.rows || []))
      .finally(() => setLoading(false))
  }, [type, from, to])

  const keys = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key))
    return set
  }, new Set(['employee'])))

  const columns = keys.map((key) => ({
    header: labelFor(key),
    accessor: key,
    render: (value) => {
      if (value == null || value === '') return '-'
      if (key.toLowerCase().includes('date') || key === 'checkIn' || key === 'checkOut') return formatDate(value, key === 'checkIn' || key === 'checkOut' ? 'dd MMM yyyy HH:mm' : 'dd MMM yyyy')
      if (typeof value === 'boolean') return value ? 'Yes' : 'No'
      return String(value)
    },
  }))

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Team attendance, leave, KRA, task, performance, and pending work reports</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <select className="input-field sm:max-w-52" value={type} onChange={(e) => setType(e.target.value)}>
          {REPORT_TYPES.map((t) => <option key={t} value={t}>{labelFor(t)}</option>)}
        </select>
        <input type="date" className="input-field sm:max-w-44" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className="input-field sm:max-w-44" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      <DataTable columns={columns} data={rows} isLoading={loading} searchPlaceholder="Search report..." emptyMessage="No report rows found" />
    </div>
  )
}
