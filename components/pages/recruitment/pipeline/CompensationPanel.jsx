'use client'

import Link from 'next/link'
import { IndianRupee, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/common/Badge'

// Below the kanban board, same pattern as AssessmentPanel — every card
// currently sitting in a Selected-category stage, so HR sees at a glance
// who's waiting on a compensation proposal before they can move to an
// offer. Unlike Interview/Assessment, there's no quick-action dialog here:
// compensation is its own multi-field page with a real approval chain, so
// this always links out rather than opening a modal. The backend only ever
// populates `card.compensation` for confidentiality-gated roles (Company
// Admin / HR Manager / Super Admin) — a Manager viewing this same board
// never receives the CTC figures, so this panel just renders nothing for
// them rather than needing its own re-check of who's allowed to see it.
export function CompensationPanel({ stages }) {
  const rows = stages
    .filter((s) => s.category === 'SELECTED')
    .flatMap((s) => s.cards.map((c) => ({ ...c, stageName: s.name })))

  if (!rows.length) return null

  return (
    <div className="stat-card !p-4 space-y-3">
      <div className="flex items-center gap-2">
        <IndianRupee className="w-4 h-4 text-slate-400" />
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Compensation</h2>
        <span className="text-xs text-slate-400">{rows.length} candidate{rows.length > 1 ? 's' : ''} selected</span>
      </div>

      <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
        {rows.map((row) => (
          <div key={row.applicationId} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <Link href={`/hr/recruitment/applications/${row.applicationId}`} className="text-sm font-medium text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 truncate block">
                {row.candidateName}
              </Link>
              <p className="text-xs text-slate-400">{row.stageName}</p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {!row.compensation ? (
                <Link href={`/hr/recruitment/applications/${row.applicationId}/compensation`} className="btn-secondary !text-xs !py-1.5">
                  <IndianRupee className="w-3.5 h-3.5" /> Propose Compensation
                </Link>
              ) : (
                <>
                  {row.compensation.totalCtc != null && (
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">₹{row.compensation.totalCtc}L</span>
                  )}
                  {!row.compensation.budgetFit?.withinBudget && (
                    <span title={`${row.compensation.budgetFit.variancePercent}% over budget`}>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    </span>
                  )}
                  <Badge variant={row.compensation.status}>{row.compensation.statusLabel}</Badge>
                  <Link href={`/hr/recruitment/applications/${row.applicationId}/compensation`} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
                    View
                  </Link>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
