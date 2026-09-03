'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, CalendarOff, Clock, Star, Users, Megaphone, CheckCircle } from 'lucide-react'
import { StatsCard } from '@/components/cards/StatsCard'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { managerApi } from '@/services/managerApi'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

export function ManagerDashboardWorkspace({ headerAction }) {
  const { user } = useAuthStore()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    managerApi.getDashboard()
      .then((res) => setData(res.data.data))
      .catch((err) => console.error('Failed to load manager dashboard', err))
      .finally(() => setLoading(false))
  }, [])

  // Precise live timer
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const greeting = () => {
    const hour = now.getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 18) return 'Good Afternoon'
    return 'Good Evening'
  }

  if (loading) return <PageLoader />

  const attendancePercentage = data?.teamSize > 0 
    ? Math.round((data.presentToday / data.teamSize) * 100)
    : 0

  return (
    <div className="animate-fade-in space-y-6 w-full pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {greeting()}, {user?.name?.split(' ')[0]} 👋
            </h1>
            {headerAction && <div>{headerAction}</div>}
          </div>
          <div className="mt-1.5">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Team Size" value={data?.teamSize || 0} icon={Users} />
        <StatsCard title="Present Today" value={data?.presentToday || 0} icon={CheckCircle} />
        <StatsCard title="Absent Today" value={data?.absentToday || 0} icon={CalendarOff} />
        <StatsCard title="Pending Approvals" value={data?.pendingApprovalsCount || 0} icon={Clock} />
      </div>

      {/* Dashboard Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Hero & Lists) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Hero Card */}
          <div className="relative rounded-3xl overflow-hidden bg-slate-900 shadow-xl border border-slate-800 p-4 sm:p-5 isolation-auto">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none animate-pulse"></div>
            <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none"></div>

            <div className="relative z-10 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex-1 w-full flex flex-col items-start">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-gradient-to-r from-emerald-500 to-teal-400"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-gradient-to-r from-emerald-500 to-teal-400"></span>
                  </span>
                  <span className="text-white text-[10px] font-semibold tracking-wide uppercase">Live Status</span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60 tabular-nums tracking-tighter mb-0.5">
                  {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  <span className="text-lg text-white/40 ml-1">{now.toLocaleTimeString('en-US', { second: '2-digit' })}</span>
                </h2>
              </div>

              <div className="flex-[1.2] w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl">
                <h3 className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">Team Attendance Overview</h3>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-2xl font-black text-white">{data?.presentToday || 0}<span className="text-sm font-medium text-white/50"> / {data?.teamSize || 0}</span></span>
                  <span className="text-sm font-bold text-white">{attendancePercentage}%</span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full" style={{ width: `${attendancePercentage}%` }}></div>
                </div>
                <p className="text-xs text-white/50 mt-2 text-right">Team members present today</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upcoming Holidays */}
            <div className="premium-card p-6 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl shadow-sm">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center justify-between">
                Upcoming Holidays
                <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-md">Next 30 Days</span>
              </h3>
              {data?.upcomingHolidays?.length > 0 ? (
                <div className="space-y-4">
                  {data.upcomingHolidays.map((holiday) => (
                    <div key={holiday._id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                          <CalendarDays className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{holiday.name}</p>
                          <p className="text-xs text-slate-500">{formatDate(holiday.date)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-slate-400">No upcoming holidays.</div>
              )}
            </div>

            {/* Upcoming Birthdays */}
            <div className="premium-card p-6 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl shadow-sm">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center justify-between">
                Team Birthdays
                <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-md">Next 30 Days</span>
              </h3>
              {data?.upcomingBirthdays?.length > 0 ? (
                <div className="space-y-4">
                  {data.upcomingBirthdays.map((birthday) => (
                    <div key={String(birthday.employeeId)} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                          <Star className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{birthday.name}</p>
                          <p className="text-xs text-slate-500">{formatDate(birthday.date)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-slate-400">No upcoming team birthdays.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Info Cards) */}
        <div className="space-y-6">
          
          {/* Action Required: Approvals */}
          <div className="premium-card p-6 border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-3xl shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none"></div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2 relative z-10">
              <Clock className="w-4 h-4 text-indigo-500" /> Action Required
            </h3>
            <div className="relative z-10 text-center py-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white dark:bg-slate-800 shadow-md mb-4 border border-slate-100 dark:border-slate-700">
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{data?.pendingApprovalsCount || 0}</span>
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Pending Leave Approvals</p>
              <p className="text-xs text-slate-500 mb-6">Review your team's requests to keep things moving.</p>
              <a href="/manager/leave-approvals" className="inline-block w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_-3px_rgba(79,70,229,0.4)]">
                Review Approvals
              </a>
            </div>
          </div>

          {/* Announcements */}
          <div className="premium-card p-6 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-slate-400" /> Announcements
            </h3>
            <div className="space-y-4">
              {data?.recentAnnouncements?.length > 0 ? data.recentAnnouncements.map(a => (
                <div key={a._id} className="border-b border-slate-100 dark:border-slate-800 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">{a.title}</p>
                    <Badge variant="outline" className="text-[9px] shrink-0">{a.scope}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{a.message}</p>
                </div>
              )) : (
                <p className="text-xs text-slate-400 text-center py-6">No new company announcements.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
