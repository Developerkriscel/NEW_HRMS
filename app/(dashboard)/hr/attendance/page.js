'use client'

import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { DataTable } from '@/components/tables/DataTable'
import { Badge } from '@/components/common/Badge'
import { StatsCard } from '@/components/cards/StatsCard'
import { Users, UserX, Clock } from 'lucide-react'
import { attendanceApi } from '@/services/attendanceApi'

export default function HRAttendancePage() {
  const [records, setRecords] = useState([])
  const [summary, setSummary] = useState({ present: 0, absent: 0, late: 0 })
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    Promise.all([attendanceApi.getAll(), attendanceApi.getPendingRegularizations()])
      .then(([attRes, pendRes]) => {
        setRecords(attRes.data.data.records)
        setSummary(attRes.data.data.summary)
        setPending(pendRes.data.data)
      })
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function approve(id) {
    await attendanceApi.approveRegularization(id)
    load()
  }
  async function reject(id) {
    await attendanceApi.rejectRegularization(id, 'Rejected by HR')
    load()
  }

  const columns = [
    { header: 'Employee', accessor: 'employee', render: (v) => v ? `${v.firstName} ${v.lastName}` : '—' },
    { header: 'Check In', accessor: 'checkInTime', render: (v) => v ? new Date(v).toLocaleTimeString() : '—' },
    { header: 'Check Out', accessor: 'checkOutTime', render: (v) => v ? new Date(v).toLocaleTimeString() : '—' },
    { header: 'Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
  ]

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Attendance</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Today's attendance across the company</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Present" value={summary.present} icon={Users} />
        <StatsCard title="Absent" value={summary.absent} icon={UserX} />
        <StatsCard title="Late" value={summary.late} icon={Clock} />
      </div>

      {pending.length > 0 && (
        <div className="stat-card">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Pending Regularizations</h3>
          <div className="space-y-3">
            {pending.map((r) => (
              <div key={r._id} className="flex items-center justify-between text-sm border-b border-slate-50 dark:border-slate-800/50 pb-3 last:border-0">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">{r.employee?.firstName} {r.employee?.lastName}</p>
                  <p className="text-xs text-slate-400">{new Date(r.date).toDateString()} · {r.regularizationReason}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approve(r._id)} className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => reject(r._id)} className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <DataTable columns={columns} data={records} isLoading={loading} searchPlaceholder="Search employees..." />
    </div>
  )
}
