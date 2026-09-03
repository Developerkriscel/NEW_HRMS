'use client'

import { useEffect, useState } from 'react'
import {
  Users, Clock, CalendarOff, Banknote, Receipt, UserMinus,
  CalendarDays, Megaphone, CheckCircle, UserPlus, AlertCircle,
  TrendingUp, Building2, ChevronRight, Activity
} from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { Avatar } from '@/components/common/Avatar'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { dashboardApi } from '@/services/dashboardApi'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import Link from 'next/link'

export function HRDashboardWorkspace({ headerAction }) {
  const { user } = useAuthStore()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    dashboardApi.getHrSummary()
      .then((res) => setData(res.data.data))
      .catch((err) => console.error('Failed to load HR dashboard', err))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const greeting = () => {
    const h = now.getHours()
    if (h < 12) return 'Good Morning'
    if (h < 18) return 'Good Afternoon'
    return 'Good Evening'
  }

  if (loading) return <PageLoader />

  const s = data?.stats || {}
  const attendancePct = s.totalEmployees > 0 ? Math.round((s.present / s.totalEmployees) * 100) : 0

  const kpis = [
    { label: 'Total Employees', value: s.totalEmployees ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { label: 'Present Today', value: s.present ?? 0, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { label: 'Absent Today', value: s.absent ?? 0, icon: CalendarOff, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-500/10' },
    { label: 'New Joiners', value: s.newJoinersThisMonth ?? 0, icon: UserPlus, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/10', suffix: 'this month' },
  ]

  const pendingItems = [
    { label: 'Leave Requests', value: s.pendingLeaveCount ?? 0, icon: CalendarOff, href: '/hr/leave', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10' },
    { label: 'Expenses', value: s.pendingExpensesCount ?? 0, icon: Receipt, href: '/hr/expenses', color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-500/10' },
    { label: 'Offboarding', value: s.pendingResignationsCount ?? 0, icon: UserMinus, href: '/hr/offboarding', color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-500/10' },
  ]

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8 w-full pb-12">
      
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 relative z-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-md mb-4 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-bold tracking-widest uppercase text-slate-600 dark:text-slate-300">
              {now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            {greeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{user?.name?.split(' ')[0]}</span> 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Here's what's happening in your organization today.</p>
        </div>
        {headerAction && <div>{headerAction}</div>}
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Column (Main Stats & Actions) */}
        <div className="xl:col-span-8 space-y-8">
          
          {/* Top KPIs Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="group bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-800/50 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300 ${kpi.bg} ${kpi.color}`}>
                  <kpi.icon className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{kpi.label}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white">{kpi.value}</h3>
                  {kpi.suffix && <span className="text-[10px] font-medium text-slate-400">{kpi.suffix}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Hero Section: Live Status & Action Required */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Live Company Status (Premium Glass Card) */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-6 shadow-2xl border border-indigo-500/20 group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none transition-transform group-hover:scale-110 duration-700"></div>
              
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <Activity className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-widest">Live Status</h3>
                  </div>
                  
                  <div className="flex items-baseline gap-2 mb-2">
                    <h2 className="text-5xl font-black text-white tracking-tighter tabular-nums">
                      {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).replace(/ AM| PM/, '')}
                    </h2>
                    <span className="text-xl font-bold text-indigo-400">
                      {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).includes('AM') ? 'AM' : 'PM'}
                    </span>
                  </div>
                  
                  <div className="flex gap-4 mt-6">
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold text-emerald-400">{s.present ?? 0}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Present</span>
                    </div>
                    <div className="w-px h-10 bg-white/10"></div>
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold text-rose-400">{s.absent ?? 0}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Absent</span>
                    </div>
                    <div className="w-px h-10 bg-white/10"></div>
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold text-amber-400">{s.late ?? 0}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Late</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10">
                  <div className="flex justify-between text-sm font-medium text-indigo-200 mb-2">
                    <span>Attendance Rate</span>
                    <span className="font-bold text-white">{attendancePct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 rounded-full transition-all duration-1000" style={{ width: `${attendancePct}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Required Card */}
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-800/50 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-widest">
                  <AlertCircle className="w-4 h-4 text-amber-500" /> Action Required
                </h3>
                <span className="bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 text-xs font-bold px-2.5 py-1 rounded-full">
                  {s.pendingApprovalsCount ?? 0} Pending
                </span>
              </div>
              
              <div className="flex-1 space-y-3">
                {pendingItems.map((item) => (
                  <Link key={item.label} href={item.href} className="group flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.bg} ${item.color}`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.label}</p>
                        <p className="text-xs text-slate-500 font-medium">{item.value} request{item.value !== 1 ? 's' : ''} waiting</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
          
          {/* New Joiners List (If any) */}
          {data?.newJoiners?.length > 0 && (
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-800/50 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-blue-500" /> New Joiners
                </h3>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Last 30 Days</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.newJoiners.map((emp) => (
                  <div key={emp._id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700/30 hover:border-blue-200 dark:hover:border-blue-500/30 transition-colors">
                    <Avatar name={`${emp.firstName} ${emp.lastName}`} size="md" />
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-slate-500 mb-1">{emp.designation?.name || emp.department?.name || '—'}</p>
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-md">
                        Joined {formatDate(emp.joiningDate)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (Info Widgets) */}
        <div className="xl:col-span-4 space-y-8">
          
          {/* Upcoming Holidays */}
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-800/50 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center justify-between">
              <span className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-rose-500" /> Holidays</span>
              <span className="text-[10px] text-slate-400">Next 30 Days</span>
            </h3>
            
            {data?.upcomingHolidays?.length > 0 ? (
              <div className="space-y-4">
                {data.upcomingHolidays.map((h) => (
                  <div key={h._id} className="flex items-start gap-4 group">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex flex-col items-center justify-center shrink-0 border border-rose-100 dark:border-rose-500/20">
                      <span className="text-[10px] font-bold text-rose-500 uppercase leading-none mb-1">
                        {new Date(h.date).toLocaleString('default', { month: 'short' })}
                      </span>
                      <span className="text-sm font-black text-rose-600 dark:text-rose-400 leading-none">
                        {new Date(h.date).getDate()}
                      </span>
                    </div>
                    <div className="pt-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-rose-600 transition-colors">{h.name}</p>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">{new Date(h.date).toLocaleDateString('en-US', { weekday: 'long' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CalendarDays className="w-5 h-5 text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-400">No upcoming holidays</p>
              </div>
            )}
          </div>

          {/* Announcements */}
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-800/50 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center justify-between">
              <span className="flex items-center gap-2"><Megaphone className="w-4 h-4 text-indigo-500" /> Announcements</span>
            </h3>
            
            <div className="space-y-5">
              {data?.recentAnnouncements?.length > 0 ? data.recentAnnouncements.map((a) => (
                <div key={a._id} className="group relative pl-4 border-l-2 border-slate-100 dark:border-slate-800 hover:border-indigo-500 transition-colors">
                  <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700 group-hover:bg-indigo-500 transition-colors" />
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">{a.title}</p>
                    <Badge variant="outline" className="text-[9px] shrink-0">{a.scope}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{a.message}</p>
                </div>
              )) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Megaphone className="w-5 h-5 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium text-slate-400">No new announcements</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
