'use client'

import { useEffect, useState } from 'react'
import { Users, Clock, CalendarOff, Banknote } from 'lucide-react'
import { StatsCard } from '@/components/cards/StatsCard'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { Badge } from '@/components/common/Badge'
import { employeeApi } from '@/services/employeeApi'
import { attendanceApi } from '@/services/attendanceApi'
import { leaveApi } from '@/services/leaveApi'

export default function HRDashboardPage() {
  const [stats, setStats] = useState(null)
  const [pendingLeaves, setPendingLeaves] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const now = new Date()
    Promise.all([
      employeeApi.getAll({ size: 1 }),
      attendanceApi.getAll(),
      leaveApi.getPendingApprovals({ size: 5 }),
    ])
      .then(([empRes, attRes, leaveRes]) => {
        setStats({
          totalEmployees: empRes.data.data.totalElements,
          present: attRes.data.data.summary.present,
          absent: attRes.data.data.summary.absent,
          late: attRes.data.data.summary.late,
        })
        setPendingLeaves(leaveRes.data.data.content)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  return (
    <div className="animate-fade-in space-y-4">
      <div className="page-header !mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">HR Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Today's workforce snapshot</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Employees" value={stats?.totalEmployees ?? 0} icon={Users} />
        <StatsCard title="Present Today" value={stats?.present ?? 0} icon={Clock} />
        <StatsCard title="Absent Today" value={stats?.absent ?? 0} icon={CalendarOff} />
        <StatsCard title="Late Today" value={stats?.late ?? 0} icon={Clock} />
      </div>

      <div className="stat-card">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Pending Leave Approvals</h3>
        {pendingLeaves.length === 0 ? (
          <p className="text-sm text-slate-400">No pending leave requests</p>
        ) : (
          <div className="space-y-3">
            {pendingLeaves.map((l) => (
              <div key={l._id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">{l.employee?.firstName} {l.employee?.lastName}</p>
                  <p className="text-xs text-slate-400">{l.leaveType?.name} · {l.numberOfDays} day(s)</p>
                </div>
                <Badge>{l.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
