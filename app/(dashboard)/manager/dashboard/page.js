'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, CalendarOff, Clock, Star, Users } from 'lucide-react'
import { StatsCard } from '@/components/cards/StatsCard'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { managerApi } from '@/services/managerApi'
import { formatDate } from '@/lib/utils'

function ListPanel({ title, items, renderItem, empty }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">{title}</h3>
      {items?.length ? (
        <div className="space-y-3">{items.map(renderItem)}</div>
      ) : (
        <p className="text-sm text-slate-400 py-4">{empty}</p>
      )}
    </div>
  )
}

export default function ManagerDashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    managerApi.getDashboard()
      .then((res) => setData(res.data.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manager Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Your team, approvals, attendance, and performance snapshot</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatsCard title="Team Size" value={data?.teamSize || 0} icon={Users} />
        <StatsCard title="Present Today" value={data?.presentToday || 0} icon={Users} />
        <StatsCard title="Absent Today" value={data?.absentToday || 0} icon={CalendarOff} />
        <StatsCard title="Pending Approvals" value={data?.pendingApprovalsCount || 0} icon={Clock} />
        <StatsCard title="Avg KRA Progress" value={data?.teamPerformanceSummary?.avgKraProgress ?? '-'} valueSuffix={data?.teamPerformanceSummary?.avgKraProgress == null ? '' : '%'} icon={Star} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ListPanel
          title="Upcoming Holidays"
          items={data?.upcomingHolidays || []}
          empty="No holidays in the next 30 days"
          renderItem={(holiday) => (
            <div key={holiday._id} className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{holiday.name}</p>
                <p className="text-xs text-slate-400">{formatDate(holiday.date)}</p>
              </div>
              <CalendarDays className="w-4 h-4 text-slate-400" />
            </div>
          )}
        />
        <ListPanel
          title="Upcoming Birthdays"
          items={data?.upcomingBirthdays || []}
          empty="No birthdays in the next 30 days"
          renderItem={(birthday) => (
            <div key={String(birthday.employeeId)} className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{birthday.name}</p>
              <p className="text-xs text-slate-400">{formatDate(birthday.date)}</p>
            </div>
          )}
        />
        <ListPanel
          title="Announcements"
          items={data?.recentAnnouncements || []}
          empty="No recent announcements"
          renderItem={(announcement) => (
            <div key={announcement._id}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{announcement.title}</p>
                <Badge>{announcement.scope}</Badge>
              </div>
              <p className="text-xs text-slate-400 mt-1">{announcement.message}</p>
            </div>
          )}
        />
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Performance</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4">
              <p className="text-xs text-slate-400">Pending KRA Reviews</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{data?.pendingKraReviews || 0}</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4">
              <p className="text-xs text-slate-400">Average Rating</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{data?.teamPerformanceSummary?.avgRating ?? '-'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
