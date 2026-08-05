'use client'

import { useEffect, useState } from 'react'
import { DataTable } from '@/components/tables/DataTable'
import { Avatar } from '@/components/common/Avatar'
import { Badge } from '@/components/common/Badge'
import { attendanceApi } from '@/services/attendanceApi'

export default function ManagerAttendancePage() {
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    attendanceApi.getTeamAttendance()
      .then((res) => setTeam(res.data.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const columns = [
    { header: 'Employee', accessor: 'name', render: (v, row) => {
      const name = v || (row.employee ? `${row.employee.firstName} ${row.employee.lastName}` : 'Unknown')
      return (
        <div className="flex items-center gap-3">
          <Avatar name={name} size="sm" />
          <span className="font-medium text-slate-800 dark:text-slate-100">{name}</span>
        </div>
      )
    } },
    { header: 'Check In', accessor: 'checkInTime', render: (v) => v ? new Date(v).toLocaleTimeString() : '—' },
    { header: 'Check Out', accessor: 'checkOutTime', render: (v) => v ? new Date(v).toLocaleTimeString() : '—' },
    { header: 'Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
  ]

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Team Attendance</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Today's attendance for your direct reports</p>
        </div>
      </div>
      <DataTable columns={columns} data={team} isLoading={loading} searchable={false} emptyMessage={error ? 'Failed to load attendance data — try refreshing' : 'No records found'} />
    </div>
  )
}
