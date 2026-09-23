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
    Promise.all([employeeApi.getAll({ size: 20 }), attendanceApi.getTeamAttendance()])
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
          <div className="relative z-10 group w-fit mb-2">
  <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-900 via-indigo-700 to-blue-600 dark:from-indigo-200 dark:via-indigo-400 dark:to-blue-400 drop-shadow-sm transition-all duration-500 group-hover:scale-[1.02] origin-left">My Team</h1>
  <div className="h-1 w-12 rounded-full bg-gradient-to-r from-indigo-600 to-blue-500 mt-2 transition-all duration-500 group-hover:w-full opacity-70"></div>
</div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Direct reports, employee status, and today's attendance</p>
        </div>
      </div>
      <DataTable columns={columns} data={team} isLoading={loading} searchPlaceholder="Search team..." emptyMessage={error ? 'Failed to load team data - try refreshing' : 'No direct reports found'} />
    </div>
  )
}
