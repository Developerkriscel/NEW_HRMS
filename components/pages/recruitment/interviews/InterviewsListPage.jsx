'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarClock, List, CalendarDays, Video, Phone, MapPin } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { interviewApi } from '@/services/interviewApi'
import { jobApi } from '@/services/jobApi'
import { formatDate, cn } from '@/lib/utils'
import { INTERVIEW_STATUS_LABELS, INTERVIEW_MODE_LABELS, INTERVIEW_TYPE_LIST, INTERVIEW_TYPE_LABELS } from '@/lib/interviewConstants'
import { ScheduleInterviewDialog } from './ScheduleInterviewDialog'

const TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'today', label: 'Today' },
  { key: 'completed', label: 'Completed' },
  { key: 'feedbackPending', label: 'Feedback Pending' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'all', label: 'All' },
]

const MODE_ICON = { ONLINE: Video, PHONE: Phone, IN_PERSON: MapPin }

function InterviewRow({ iv }) {
  const ModeIcon = MODE_ICON[iv.mode] || Video
  return (
    <Link href={`/hr/recruitment/interviews/${iv._id}`} className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{iv.candidateName}</p>
        <p className="text-xs text-slate-400 truncate">{iv.jobTitle} · {iv.roundName}</p>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0 text-xs text-slate-500 dark:text-slate-400">
        <span>{formatDate(iv.date, 'dd MMM')} · {iv.startTime}</span>
        <span className="flex items-center gap-1"><ModeIcon className="w-3.5 h-3.5" /> {INTERVIEW_MODE_LABELS[iv.mode]}</span>
        <span className="hidden sm:inline">{(iv.panel || []).map((p) => p.name).filter(Boolean).join(', ') || '—'}</span>
        <Badge variant={iv.status}>{INTERVIEW_STATUS_LABELS[iv.status] || iv.status}</Badge>
      </div>
    </Link>
  )
}

export function InterviewsListPage() {
  const [tab, setTab] = useState('upcoming')
  const [view, setView] = useState('list') // 'list' | 'calendar'
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState([])
  const [employees, setEmployees] = useState([])
  const [filters, setFilters] = useState({ job: '', interviewer: '', round: '', mode: '' })
  const [scheduling, setScheduling] = useState(false)

  useEffect(() => {
    jobApi.list({ size: 100 }).then((res) => setJobs(res.data.data.content || [])).catch(() => {})
    jobApi.getEmployees().then((res) => setEmployees(res.data.data || [])).catch(() => {})
  }, [])

  function load() {
    setLoading(true)
    const params = { tab, size: 100 }
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v })
    interviewApi.list(params).then((res) => setRows(res.data.data.content || [])).finally(() => setLoading(false))
  }
  useEffect(load, [tab, filters])

  function updateFilter(key, val) { setFilters((f) => ({ ...f, [key]: val })) }

  const byDate = rows.reduce((acc, r) => {
    const key = formatDate(r.date, 'dd MMM yyyy')
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {})

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Interviews</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Schedule and track every interview round.</p>
        </div>
        <button onClick={() => setScheduling(true)} className="btn-primary"><CalendarClock className="w-4 h-4" /> Schedule Interview</button>
      </div>

      <div className="border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={cn('px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap', tab === t.key ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200')}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="stat-card !p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
            <select className="input-field" value={filters.job} onChange={(e) => updateFilter('job', e.target.value)}>
              <option value="">All jobs</option>
              {jobs.map((j) => <option key={j._id} value={j._id}>{j.jobTitle}</option>)}
            </select>
            <select className="input-field" value={filters.interviewer} onChange={(e) => updateFilter('interviewer', e.target.value)}>
              <option value="">All interviewers</option>
              {employees.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
            </select>
            <select className="input-field" value={filters.round} onChange={(e) => updateFilter('round', e.target.value)}>
              <option value="">All rounds</option>
              {INTERVIEW_TYPE_LIST.map((t) => <option key={t} value={t}>{INTERVIEW_TYPE_LABELS[t]}</option>)}
            </select>
            <select className="input-field" value={filters.mode} onChange={(e) => updateFilter('mode', e.target.value)}>
              <option value="">All modes</option>
              {Object.entries(INTERVIEW_MODE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="flex gap-1 ml-3 flex-shrink-0">
            <button onClick={() => setView('list')} className={cn('p-2 rounded-lg', view === 'list' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-slate-400')}><List className="w-4 h-4" /></button>
            <button onClick={() => setView('calendar')} className={cn('p-2 rounded-lg', view === 'calendar' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-slate-400')}><CalendarDays className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : rows.length === 0 ? (
        <div className="stat-card text-center py-16">
          <CalendarClock className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
          <p className="text-slate-500 dark:text-slate-400">No interviews in this view.</p>
        </div>
      ) : view === 'list' ? (
        <div className="space-y-2">
          {rows.map((iv) => <InterviewRow key={iv._id} iv={iv} />)}
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(byDate).map(([date, items]) => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">{date}</h3>
              <div className="space-y-2">
                {items.map((iv) => <InterviewRow key={iv._id} iv={iv} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {scheduling && (
        <ScheduleInterviewDialog onClose={() => setScheduling(false)} onScheduled={() => { setScheduling(false); load() }} />
      )}
    </div>
  )
}
