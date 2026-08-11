'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarClock } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { interviewApi } from '@/services/interviewApi'
import { formatDate } from '@/lib/utils'
import { INTERVIEW_STATUS_LABELS } from '@/lib/interviewConstants'
import { ScheduleInterviewDialog } from './ScheduleInterviewDialog'

export function InterviewsSection({ applicationId, candidateName, jobTitle }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [scheduling, setScheduling] = useState(false)

  function load() {
    setLoading(true)
    interviewApi.listForApplication(applicationId).then((res) => setRows(res.data.data || [])).finally(() => setLoading(false))
  }
  useEffect(load, [applicationId])

  return (
    <div className="stat-card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Interviews</h3>
        <button onClick={() => setScheduling(true)} className="btn-secondary !text-xs !py-1.5"><CalendarClock className="w-3.5 h-3.5" /> Schedule Interview</button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-400">No interviews scheduled yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((iv) => (
            <Link key={iv._id} href={`/hr/recruitment/interviews/${iv._id}`} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{iv.roundName}</p>
                <p className="text-xs text-slate-400">{formatDate(iv.date, 'dd MMM yyyy')} · {iv.startTime} · {(iv.panel || []).map((p) => p.employeeName).filter(Boolean).join(', ') || 'No panel'}</p>
              </div>
              <Badge variant={iv.status}>{INTERVIEW_STATUS_LABELS[iv.status] || iv.status}</Badge>
            </Link>
          ))}
        </div>
      )}

      {scheduling && (
        <ScheduleInterviewDialog applicationId={applicationId} candidateName={candidateName} jobTitle={jobTitle} onClose={() => setScheduling(false)} onScheduled={() => { setScheduling(false); load() }} />
      )}
    </div>
  )
}
