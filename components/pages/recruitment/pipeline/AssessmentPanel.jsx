'use client'

import Link from 'next/link'
import { ClipboardList, ClipboardCheck } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { CANDIDATE_ASSESSMENT_STATUS_LABELS } from '@/lib/assessmentConstants'

// Below the kanban board — every card currently sitting in an
// Assessment-category stage, regardless of which column, so HR has one place
// to see who still needs an assessment assigned or evaluated instead of
// opening each card individually. Mirrors the "needs scheduling" prompt on
// Interview-stage cards, just as a list rather than inline per-card (an
// assessment has a result/score worth showing at a glance, a scheduled slot
// doesn't).
export function AssessmentPanel({ stages, onAssign, onEvaluate }) {
  const rows = stages
    .filter((s) => s.category === 'ASSESSMENT')
    .flatMap((s) => s.cards.map((c) => ({ ...c, stageName: s.name })))

  if (!rows.length) return null

  return (
    <div className="stat-card !p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ClipboardList className="w-4 h-4 text-slate-400" />
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Assessments</h2>
        <span className="text-xs text-slate-400">{rows.length} candidate{rows.length > 1 ? 's' : ''} in an assessment stage</span>
      </div>

      <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
        {rows.map((row) => (
          <div key={row.applicationId} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <Link href={`/hr/recruitment/applications/${row.applicationId}`} className="text-sm font-medium text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 truncate block">
                {row.candidateName}
              </Link>
              <p className="text-xs text-slate-400">{row.stageName}{row.assessment?.assessmentName ? ` · ${row.assessment.assessmentName}` : ''}</p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {!row.assessment ? (
                <button onClick={() => onAssign(row)} className="btn-secondary !text-xs !py-1.5">
                  <ClipboardList className="w-3.5 h-3.5" /> Assign Assessment
                </button>
              ) : row.assessment.needsEvaluation ? (
                <>
                  <Badge variant={row.assessment.status}>{CANDIDATE_ASSESSMENT_STATUS_LABELS[row.assessment.status] || row.assessment.status}</Badge>
                  <button onClick={() => onEvaluate(row)} className="btn-secondary !text-xs !py-1.5">
                    <ClipboardCheck className="w-3.5 h-3.5" /> Evaluate
                  </button>
                </>
              ) : (
                <>
                  {row.assessment.percentage != null && (
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{row.assessment.percentage}%</span>
                  )}
                  <Badge variant={row.assessment.status}>{CANDIDATE_ASSESSMENT_STATUS_LABELS[row.assessment.status] || row.assessment.status}</Badge>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
