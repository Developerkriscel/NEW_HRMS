'use client'

import { useEffect, useState } from 'react'
import { Users, Building2, Clock, CalendarOff, UserPlus, Palmtree } from 'lucide-react'
import { StatsCard } from '@/components/cards/StatsCard'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { GenericAreaChart, DepartmentPieChart } from '@/components/charts/DynamicDashboardCharts'
import { employeeApi } from '@/services/employeeApi'
import { departmentApi } from '@/services/departmentApi'
import { attendanceApi } from '@/services/attendanceApi'
import { leaveApi } from '@/services/leaveApi'

function ChartCard({ title, children }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">{title}</h3>
      {children}
    </div>
  )
}

export default function CompanyDashboardPage() {
  const [stats, setStats] = useState(null)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    Promise.all([
      employeeApi.getAll({ size: 1 }),
      departmentApi.getAll(),
      attendanceApi.getAll(),
      leaveApi.getPendingApprovals({ size: 1 }),
      employeeApi.getAll({ size: 1, joinedAfter: monthStart }),
      leaveApi.getCalendar({ month: now.getMonth() + 1, year: now.getFullYear() }),
      employeeApi.getReports({ months: 6 }),
    ])
      .then(([empRes, deptRes, attRes, leaveRes, joinersRes, calendarRes, reportRes]) => {
        const onLeaveToday = calendarRes.data.data.filter((l) => {
          const start = new Date(l.startDate)
          const end = new Date(l.endDate)
          return start <= now && end >= now
        }).length

        setStats({
          totalEmployees: empRes.data.data.totalElements,
          totalDepartments: deptRes.data.data.length,
          presentToday: attRes.data.data.summary.present,
          absentToday: attRes.data.data.summary.absent,
          pendingLeaves: leaveRes.data.data.totalElements,
          newJoiners: joinersRes.data.data.totalElements,
          onLeaveToday,
        })
        setReport(reportRes.data.data)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Company Overview</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Company Admin · Organization snapshot</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Present Today" value={stats?.presentToday ?? 0} icon={Clock} />
        <StatsCard title="Absent Today" value={stats?.absentToday ?? 0} icon={Clock} />
        <StatsCard title="On Leave Today" value={stats?.onLeaveToday ?? 0} icon={Palmtree} />
        <StatsCard title="Total Employees" value={stats?.totalEmployees ?? 0} icon={Users} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Departments" value={stats?.totalDepartments ?? 0} icon={Building2} />
        <StatsCard title="Pending Leave Approvals" value={stats?.pendingLeaves ?? 0} icon={CalendarOff} />
        <StatsCard title="New Joiners (this month)" value={stats?.newJoiners ?? 0} icon={UserPlus} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Employees by Department">
          {report?.byDepartment?.length ? (
            <DepartmentPieChart data={report.byDepartment.map((r) => ({ name: r.name, value: r.count }))} />
          ) : (
            <p className="text-sm text-slate-400 py-8 text-center">No department data yet</p>
          )}
        </ChartCard>
        <ChartCard title="New Joiners Trend">
          <GenericAreaChart data={report?.newJoinersTrend || []} xKey="month" dataKey="count" color="#2563eb" label="New Joiners" />
        </ChartCard>
      </div>
    </div>
  )
}
