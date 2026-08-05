'use client'

import { useEffect, useState } from 'react'
import { DataTable } from '@/components/tables/DataTable'
import { Avatar } from '@/components/common/Avatar'
import { Badge } from '@/components/common/Badge'
import { attendanceApi } from '@/services/attendanceApi'
import { employeeApi } from '@/services/employeeApi'
import { formatDate } from '@/lib/utils'

export default function ManagerTeamPage() {
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    Promise.all([employeeApi.getAll({ size: 200 }), attendanceApi.getTeamAttendance()])
      .then(([employeeRes, attendanceRes]) => {
        const attendanceByEmployee = new Map((attendanceRes.data.data || []).map((row) => [String(row.employeeId), row]))
        setTeam((employeeRes.data.data.content || []).map((employee) => ({
          ...employee,
          todayAttendance: attendanceByEmployee.get(String(employee._id)) || { status: 'ABSENT' },
        })))
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const columns = [
    { header: 'Employee', accessor: 'firstName', render: (_, row) => {
      const name = `${row.firstName} ${row.lastName}`
      return (
        <div className="flex items-center gap-3">
          <Avatar name={name} size="sm" />
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">{name}</p>
            <p className="text-xs text-slate-400">{row.employeeCode} - {row.email}</p>
          </div>
        </div>
      )
    } },
    { header: 'Department', accessor: 'department', render: (v) => v?.name || '-' },
    { header: 'Designation', accessor: 'designation', render: (v) => v?.name || '-' },
    { header: 'Joining', accessor: 'joiningDate', render: (v) => formatDate(v) },
    { header: 'Employee Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
    { header: "Today's Status", accessor: 'todayAttendance', render: (v) => <Badge>{v?.status || 'ABSENT'}</Badge> },
  ]

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Team</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Direct reports, employee status, and today's attendance</p>
        </div>
      </div>
      <DataTable columns={columns} data={team} isLoading={loading} searchPlaceholder="Search team..." emptyMessage={error ? 'Failed to load team data - try refreshing' : 'No direct reports found'} />
    </div>
  )
}
