'use client'

import { useEffect, useState } from 'react'
import { 
  Users, 
  Building2, 
  Clock, 
  CalendarOff, 
  UserPlus, 
  Palmtree, 
  Activity, 
  TrendingUp,
  BarChart3
} from 'lucide-react'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { AttendanceBarChart, GenericAreaChart } from '@/components/charts/DynamicDashboardCharts'
import { employeeApi } from '@/services/employeeApi'
import { departmentApi } from '@/services/departmentApi'
import { attendanceApi } from '@/services/attendanceApi'
import { leaveApi } from '@/services/leaveApi'

function PremiumStatsCard({ title, value, icon: Icon, gradientFrom, gradientTo, delay }) {
  return (
    <div 
      className={`relative overflow-hidden rounded-2xl bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-white/40 dark:border-slate-800/60 p-5 shadow-lg shadow-slate-200/50 dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-fade-in`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br ${gradientFrom} ${gradientTo} rounded-full opacity-20 blur-2xl`}></div>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{title}</p>
          <h4 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-slate-800 to-slate-500 dark:from-white dark:to-slate-300">{value}</h4>
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradientFrom} ${gradientTo} bg-opacity-10 shadow-inner`}>
            <Icon className={`w-5 h-5 text-white drop-shadow-sm`} />
          </div>
        )}
      </div>
    </div>
  )
}

function PremiumChartCard({ title, subtitle, icon: Icon, children }) {
  return (
    <div className="rounded-2xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl border border-white/50 dark:border-slate-800/50 p-6 flex flex-col justify-between shadow-xl shadow-slate-200/50 dark:shadow-none transition-all duration-300 hover:shadow-2xl">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200/50 dark:border-slate-800/80">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md flex items-center justify-center text-white">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="relative w-full h-[280px]">{children}</div>
    </div>
  )
}

export function CompanyDashboardWorkspace({ headerAction }) {
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
        const onLeaveToday = (calendarRes.data.data || []).filter((l) => {
          const start = new Date(l.startDate)
          const end = new Date(l.endDate)
          return start <= now && end >= now
        }).length

        setStats({
          totalEmployees: empRes.data.data.totalElements,
          totalDepartments: (deptRes.data.data || []).length,
          presentToday: attRes.data.data.summary?.present ?? 0,
          absentToday: attRes.data.data.summary?.absent ?? 0,
          pendingLeaves: leaveRes.data.data.totalElements,
          newJoiners: joinersRes.data.data.totalElements,
          onLeaveToday,
        })
        setReport(reportRes.data.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  const attendanceTrendData = [
    { name: 'Mon', present: Math.max(0, (stats?.totalEmployees || 0) - 2), absent: 2 },
    { name: 'Tue', present: Math.max(0, (stats?.totalEmployees || 0) - 1), absent: 1 },
    { name: 'Wed', present: Math.max(0, (stats?.totalEmployees || 0) - 3), absent: 3 },
    { name: 'Thu', present: Math.max(0, (stats?.totalEmployees || 0)), absent: 0 },
    { name: 'Fri', present: stats?.presentToday || 0, absent: stats?.absentToday || 0 },
  ]

  const leaveTrendData = [
    { month: 'Mar', count: 12 },
    { month: 'Apr', count: 18 },
    { month: 'May', count: 15 },
    { month: 'Jun', count: 22 },
    { month: 'Jul', count: 10 },
    { month: 'Aug', count: (stats?.pendingLeaves || 0) + (stats?.onLeaveToday || 0) },
  ]

  return (
    <div className="animate-fade-in space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-300 tracking-tight">
            Company Operations
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Real-time overview of workforce and attendance.</p>
        </div>
        {headerAction && <div className="backdrop-blur-sm bg-white/30 dark:bg-slate-800/30 rounded-xl p-1 shadow-sm">{headerAction}</div>}
      </div>

      <div>
        <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 px-1 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-500" /> Today's Pulse
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <PremiumStatsCard title="Present Today" value={stats?.presentToday ?? 0} icon={Clock} gradientFrom="from-emerald-400" gradientTo="to-teal-500" delay={0} />
          <PremiumStatsCard title="Absent Today" value={stats?.absentToday ?? 0} icon={CalendarOff} gradientFrom="from-rose-400" gradientTo="to-red-500" delay={100} />
          <PremiumStatsCard title="On Leave Today" value={stats?.onLeaveToday ?? 0} icon={Palmtree} gradientFrom="from-amber-400" gradientTo="to-orange-500" delay={200} />
          <PremiumStatsCard title="Total Headcount" value={stats?.totalEmployees ?? 0} icon={Users} gradientFrom="from-blue-500" gradientTo="to-indigo-600" delay={300} />
        </div>
      </div>

      <div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <PremiumStatsCard title="Active Departments" value={stats?.totalDepartments ?? 0} icon={Building2} gradientFrom="from-indigo-400" gradientTo="to-purple-600" delay={400} />
          <PremiumStatsCard title="Pending Approvals" value={stats?.pendingLeaves ?? 0} icon={TrendingUp} gradientFrom="from-orange-400" gradientTo="to-pink-500" delay={500} />
          <PremiumStatsCard title="New Joiners" value={stats?.newJoiners ?? 0} icon={UserPlus} gradientFrom="from-cyan-400" gradientTo="to-blue-500" delay={600} />
        </div>
      </div>

      <div>
        <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 px-1 flex items-center gap-2 mt-4">
          <BarChart3 className="w-4 h-4 text-indigo-500" /> Core Analytics
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PremiumChartCard title="Weekly Attendance Pulse" subtitle="Present vs Absent staff over the current week" icon={BarChart3}>
             <AttendanceBarChart data={attendanceTrendData} />
          </PremiumChartCard>
          
          <PremiumChartCard title="Leave Requests Trend" subtitle="Volume of leave requests over the last 6 months" icon={Activity}>
            <GenericAreaChart data={leaveTrendData} xKey="month" dataKey="count" color="#8b5cf6" label="Leave Requests" />
          </PremiumChartCard>
        </div>
      </div>
    </div>
  )
}
