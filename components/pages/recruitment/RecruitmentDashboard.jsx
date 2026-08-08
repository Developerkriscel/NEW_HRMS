'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Plus, Briefcase, Users, FileText, CalendarCheck, FileSignature, UserCheck,
  Eye, RotateCcw, Video, MessageSquare, ChevronRight, ClipboardList,
  FileClock, FileWarning, FolderClock, CalendarClock, AlarmClock,
} from 'lucide-react'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { cn, formatDate } from '@/lib/utils'
import { recruitmentApi } from '@/services/recruitmentApi'

const DEPARTMENTS = ['All Departments', 'Engineering', 'Sales', 'Design', 'Human Resources', 'Marketing']
const RECRUITERS = ['All Recruiters', 'Amit Shah', 'Neha Kapoor', 'Kavita Rao', 'Sanjay Mehta']
const LOCATIONS = ['All Locations', 'Bangalore', 'Mumbai', 'Delhi NCR', 'Remote']
const JOB_POSITIONS = ['All Positions', 'Backend Developer', 'Sales Manager', 'UI Designer', 'HR Executive']

const KPI_CARDS = [
  { key: 'openPositions', title: 'Open Positions', icon: Briefcase, href: '/hr/recruitment/jobs', tint: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  { key: 'totalCandidates', title: 'Total Candidates', icon: Users, href: '/hr/recruitment/candidates', tint: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' },
  { key: 'newApplications', title: 'New Applications', icon: FileText, href: '/hr/recruitment/candidates?filter=new', tint: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { key: 'interviewsScheduled', title: 'Interviews Scheduled', icon: CalendarCheck, href: '/hr/recruitment/interviews', tint: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
  { key: 'pendingOffers', title: 'Offers Pending', icon: FileSignature, href: '/hr/recruitment/offers?filter=pending', tint: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
  { key: 'joiningSoon', title: 'Joining Soon', icon: UserCheck, href: '/hr/recruitment/candidates?filter=joining-soon', tint: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400' },
]

// Keyword -> icon for the pending-actions list, matched against the mock
// label text so the endpoint doesn't need to send an icon name.
const ACTION_ICONS = [
  { match: /screening/i, icon: ClipboardList },
  { match: /feedback/i, icon: MessageSquare },
  { match: /approval/i, icon: FileClock },
  { match: /expire/i, icon: FileWarning },
  { match: /document/i, icon: FolderClock },
  { match: /joining/i, icon: CalendarClock },
]

function actionIconFor(label) {
  return ACTION_ICONS.find((a) => a.match.test(label))?.icon || AlarmClock
}

const INTERVIEW_ACTIONS = [
  { label: 'View', icon: Eye },
  { label: 'Reschedule', icon: RotateCcw },
  { label: 'Join', icon: Video },
  { label: 'Feedback', icon: MessageSquare },
]

const OFFER_STATUS_COLORS = {
  Draft: 'bg-slate-400',
  'Pending Approval': 'bg-amber-500',
  Sent: 'bg-blue-500',
  Accepted: 'bg-emerald-500',
  Declined: 'bg-red-500',
  Expired: 'bg-slate-300 dark:bg-slate-600',
}

export function RecruitmentDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [filters, setFilters] = useState({
    from: '', to: '', department: DEPARTMENTS[0], recruiter: RECRUITERS[0],
    location: LOCATIONS[0], position: JOB_POSITIONS[0],
  })

  useEffect(() => {
    recruitmentApi.getDashboard()
      .then((res) => setData(res.data.data))
      .catch(() => setError('Failed to load the recruitment dashboard'))
      .finally(() => setLoading(false))
  }, [])

  function updateFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value }))
  }

  function clearFilters() {
    setFilters({ from: '', to: '', department: DEPARTMENTS[0], recruiter: RECRUITERS[0], location: LOCATIONS[0], position: JOB_POSITIONS[0] })
  }

  if (loading) return <PageLoader />
  if (error || !data) return <p className="text-sm text-red-500">{error || 'Something went wrong'}</p>

  const { stats, funnel, todayInterviews, pendingActions, positionAging, sourcePerformance, joiningSoon, offerStatus } = data
  const funnelMax = funnel[0]?.count || 1
  const agingMax = Math.max(...positionAging.map((p) => p.days), 1)
  const offerTotal = offerStatus.reduce((sum, o) => sum + o.count, 0) || 1

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Recruitment</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage your hiring pipeline, candidates, interviews and offers.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/hr/recruitment/requisitions/new" className="btn-primary">
            <Plus className="w-4 h-4" /> Create Requisition
          </Link>
          <Link href="/hr/recruitment/candidates" className="btn-secondary">
            <Plus className="w-4 h-4" /> Add Candidate
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="stat-card !p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">From</span>
            <input type="date" className="input-field" value={filters.from} onChange={(e) => updateFilter('from', e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">To</span>
            <input type="date" className="input-field" value={filters.to} onChange={(e) => updateFilter('to', e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Department</span>
            <select className="input-field" value={filters.department} onChange={(e) => updateFilter('department', e.target.value)}>
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Recruiter</span>
            <select className="input-field" value={filters.recruiter} onChange={(e) => updateFilter('recruiter', e.target.value)}>
              {RECRUITERS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Location</span>
            <select className="input-field" value={filters.location} onChange={(e) => updateFilter('location', e.target.value)}>
              {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Job Position</span>
            <select className="input-field" value={filters.position} onChange={(e) => updateFilter('position', e.target.value)}>
              {JOB_POSITIONS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
        </div>
        <div className="flex justify-end mt-3">
          <button type="button" onClick={clearFilters} className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
            Reset filters
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {KPI_CARDS.map(({ key, title, icon: Icon, href, tint }) => (
          <Link key={key} href={href} className="stat-card group block cursor-pointer">
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center mb-4', tint)}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1 tracking-tight">{stats[key]}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
              {title}
              <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Hiring Funnel */}
        <div className="stat-card xl:col-span-1">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-5">Hiring Funnel</h3>
          <div className="space-y-3.5">
            {funnel.map((stage, i) => {
              const widthPct = Math.max((stage.count / funnelMax) * 100, 4)
              const conversion = i > 0 && funnel[i - 1].count ? Math.round((stage.count / funnel[i - 1].count) * 100) : null
              return (
                <div key={stage.stage}>
                  {conversion != null && (
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 mb-1">↓ {conversion}% from {funnel[i - 1].stage}</div>
                  )}
                  <div className="flex items-baseline justify-between text-sm mb-1">
                    <span className="text-slate-700 dark:text-slate-200 font-medium">{stage.stage}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{stage.count}</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500" style={{ width: `${widthPct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Today's Interviews */}
        <div className="stat-card xl:col-span-2">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Today&apos;s Interviews</h3>
          {todayInterviews.length === 0 ? (
            <p className="text-sm text-slate-400">No interviews scheduled for today</p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Candidate</th>
                    <th>Position</th>
                    <th>Round</th>
                    <th>Interviewer</th>
                    <th>Mode</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {todayInterviews.map((iv) => (
                    <tr key={iv.id}>
                      <td className="whitespace-nowrap font-medium text-slate-700 dark:text-slate-200">{iv.time}</td>
                      <td className="whitespace-nowrap">{iv.candidate}</td>
                      <td className="whitespace-nowrap">{iv.position}</td>
                      <td className="whitespace-nowrap">{iv.round}</td>
                      <td className="whitespace-nowrap">{iv.interviewer}</td>
                      <td className="whitespace-nowrap">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', iv.mode === 'Online' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400')}>
                          {iv.mode}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-1.5">
                          {INTERVIEW_ACTIONS.map(({ label, icon: ActionIcon }) => (
                            <Link
                              key={label}
                              href="/hr/recruitment/interviews"
                              title={label}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            >
                              <ActionIcon className="w-3.5 h-3.5" />
                            </Link>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Actions */}
        <div className="stat-card">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Pending Actions</h3>
          <div className="space-y-1.5">
            {pendingActions.map((action) => {
              const ActionIcon = actionIconFor(action.label)
              return (
                <Link
                  key={action.id}
                  href={action.link}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                    <ActionIcon className="w-4 h-4" />
                  </div>
                  <span className="flex-1 text-sm text-slate-700 dark:text-slate-200">{action.label}</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors" />
                </Link>
              )
            })}
          </div>
        </div>

        {/* Open Position Aging */}
        <div className="stat-card">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Open Position Aging</h3>
          <p className="text-xs text-slate-400 mb-4">How long each open position has been unfilled</p>
          <div className="space-y-3.5">
            {positionAging.map((p) => (
              <div key={p.position}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-700 dark:text-slate-200">{p.position}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{p.days} days</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${(p.days / agingMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Performance */}
        <div className="stat-card">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Source Performance</h3>
          <p className="text-xs text-slate-400 mb-4">Where candidates are coming from, and which sources convert</p>
          <div className="grid grid-cols-2 gap-3">
            {sourcePerformance.map((s) => (
              <div key={s.source} className="rounded-xl border border-slate-100 dark:border-slate-800 p-3">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">{s.source}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{s.candidates} Candidates</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{s.hires} Hires</p>
              </div>
            ))}
          </div>
        </div>

        {/* Joining Soon */}
        <div className="stat-card">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Joining Soon</h3>
          {joiningSoon.length === 0 ? (
            <p className="text-sm text-slate-400">No one is joining soon</p>
          ) : (
            <div className="space-y-3">
              {joiningSoon.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.position} · Joining: {formatDate(c.joiningDate, 'dd MMM')}</p>
                  </div>
                  <span className={cn(
                    'px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
                    c.status === 'Ready to Join'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  )}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Offer Status */}
      <div className="stat-card">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Offer Status</h3>
        <div className="flex h-3 rounded-full overflow-hidden mb-4">
          {offerStatus.map((o) => (
            <div key={o.status} className={OFFER_STATUS_COLORS[o.status] || 'bg-slate-300'} style={{ width: `${(o.count / offerTotal) * 100}%` }} title={`${o.status}: ${o.count}`} />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {offerStatus.map((o) => (
            <div key={o.status} className="flex items-center gap-2">
              <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', OFFER_STATUS_COLORS[o.status] || 'bg-slate-300')} />
              <span className="text-xs text-slate-500 dark:text-slate-400">{o.status}</span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 ml-auto">{o.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
