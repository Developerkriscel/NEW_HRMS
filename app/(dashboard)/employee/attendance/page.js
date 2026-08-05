'use client'

import { useEffect, useState } from 'react'
import { DataTable } from '@/components/tables/DataTable'
import { Badge } from '@/components/common/Badge'
import { attendanceApi } from '@/services/attendanceApi'
import { formatDate } from '@/lib/utils'

export default function EmployeeAttendancePage() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    attendanceApi.getMyAttendance()
      .then((res) => setRecords(res.data.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const columns = [
    { header: 'Date', accessor: 'date', render: (v) => formatDate(v) },
    { header: 'Check In', accessor: 'checkInTime', render: (v) => v ? new Date(v).toLocaleTimeString() : '—' },
    { header: 'Check Out', accessor: 'checkOutTime', render: (v) => v ? new Date(v).toLocaleTimeString() : '—' },
    { header: 'Late', accessor: 'lateMark', render: (v) => v ? <Badge variant="pending">Late</Badge> : '—' },
    { header: 'Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
  ]

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Attendance</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">This month's attendance history</p>
        </div>
      </div>
      <DataTable columns={columns} data={records} isLoading={loading} searchable={false} emptyMessage={error ? 'Failed to load attendance history — try refreshing' : 'No records found'} />
    </div>
  )
}
