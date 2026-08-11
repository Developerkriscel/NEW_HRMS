'use client'

import { useEffect, useState } from 'react'
import { ClipboardList, Copy, Check } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { assessmentApi } from '@/services/assessmentApi'
import { formatDate, formatRelativeTime, cn } from '@/lib/utils'
import { CANDIDATE_ASSESSMENT_STATUS_LABELS } from '@/lib/assessmentConstants'
import { AssignAssessmentDialog } from './AssignAssessmentDialog'
import { EvaluateAssessmentModal } from './EvaluateAssessmentModal'

function ScoreBreakdown({ breakdown }) {
  const entries = Object.entries(breakdown || {})
  if (!entries.length) return null
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
      {entries.map(([label, v]) => (
        <div key={label} className="text-xs">
          <p className="text-slate-400">{label}</p>
          <p className="font-medium text-slate-700 dark:text-slate-200">{v.scored}/{v.max}</p>
        </div>
      ))}
    </div>
  )
}

export function AssessmentsSection({ applicationId, candidateName }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [evaluating, setEvaluating] = useState(null) // candidateAssessmentId
  const [copiedId, setCopiedId] = useState(null)

  function load() {
    setLoading(true)
    assessmentApi.listForApplication(applicationId).then((res) => setRows(res.data.data || [])).finally(() => setLoading(false))
  }
  useEffect(load, [applicationId])

  function copyLink(row) {
    navigator.clipboard?.writeText(`${window.location.origin}/candidate/assessment/${row.token}`)
    setCopiedId(row._id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const needsEvaluation = (status) => ['SUBMITTED', 'EVALUATING'].includes(status)

  return (
    <div className="stat-card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Assessments</h3>
        <button onClick={() => setAssigning(true)} className="btn-secondary !text-xs !py-1.5"><ClipboardList className="w-3.5 h-3.5" /> Assign Assessment</button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-400">No assessments assigned yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r._id} className="rounded-xl border border-slate-100 dark:border-slate-800 p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{r.assessment?.name}</p>
                  <p className="text-xs text-slate-400">Assigned {formatRelativeTime(r.assignedAt)} by {r.assignedByName}</p>
                </div>
                <Badge variant={r.status}>{CANDIDATE_ASSESSMENT_STATUS_LABELS[r.status] || r.status}</Badge>
              </div>

              {r.status === 'COMPLETED' || r.percentage != null ? (
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{r.score ?? 0} / {r.maxScore ?? r.assessment?.totalMarks ?? '—'}</span>
                  <span className="text-slate-400">Passing {r.assessment?.passingScore ?? '—'}%</span>
                  {r.result && r.result !== 'PENDING' && (
                    <span className={cn('font-medium', r.result === 'PASSED' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>{r.result}</span>
                  )}
                </div>
              ) : null}
              <ScoreBreakdown breakdown={r.scoreBreakdown} />

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                {r.startedAt && <span>Started {formatDate(r.startedAt, 'dd MMM, hh:mm a')}</span>}
                {r.submittedAt && <span>Submitted {formatDate(r.submittedAt, 'dd MMM, hh:mm a')}</span>}
                {r.durationUsedMinutes != null && <span>Duration used: {r.durationUsedMinutes} min</span>}
                <span>Attempt {r.attemptNumber}/{r.maxAttempts}</span>
              </div>

              {r.recommendation && (
                <p className="text-xs text-slate-500 dark:text-slate-400">Evaluator recommendation: <span className="font-medium">{r.recommendation.replace('_', ' ')}</span>{r.evaluationComment ? ` — ${r.evaluationComment}` : ''}</p>
              )}

              <div className="flex gap-2 pt-1">
                {['ASSIGNED', 'SENT', 'OPENED'].includes(r.status) && (
                  <button onClick={() => copyLink(r)} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1">
                    {copiedId === r._id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Copy candidate link
                  </button>
                )}
                {needsEvaluation(r.status) && (
                  <button onClick={() => setEvaluating(r._id)} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">Evaluate</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {assigning && (
        <AssignAssessmentDialog applicationId={applicationId} candidateName={candidateName} onClose={() => { setAssigning(false); load() }} onAssigned={load} />
      )}
      {evaluating && (
        <EvaluateAssessmentModal candidateAssessmentId={evaluating} onClose={() => setEvaluating(null)} onEvaluated={() => { setEvaluating(null); load() }} />
      )}
    </div>
  )
}
