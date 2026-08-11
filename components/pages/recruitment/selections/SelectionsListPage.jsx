'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BadgeCheck, Scale } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { selectionApi } from '@/services/selectionApi'
import { jobApi } from '@/services/jobApi'
import { SELECTION_STATUS_LABELS } from '@/lib/selectionConstants'
import { CandidateComparisonModal } from '../candidates/CandidateComparisonModal'

const DECISION_FILTERS = [
  '', 'PENDING_DECISION', 'SELECTED', 'SELECTION_APPROVAL_PENDING', 'SELECTION_APPROVED',
  'SELECTION_REJECTED', 'ADDITIONAL_ROUND', 'ON_HOLD', 'REJECTED', 'WITHDRAWN',
]

// item 1 — /hr/recruitment/selections: only candidates who reached the
// final selection stage. item 13 — Candidate Comparison, reusing the same
// compare modal Step 7 built for the pipeline board.
export function SelectionsListPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState([])
  const [filters, setFilters] = useState({ job: '', decision: '', search: '' })
  const [selected, setSelected] = useState([])
  const [comparing, setComparing] = useState(false)

  useEffect(() => { jobApi.list({ size: 100 }).then((res) => setJobs(res.data.data.content || [])).catch(() => {}) }, [])

  function load() {
    setLoading(true)
    const params = { size: 100 }
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v })
    selectionApi.list(params).then((res) => setRows(res.data.data.content || [])).finally(() => setLoading(false))
  }
  useEffect(load, [filters])

  function updateFilter(key, val) { setFilters((f) => ({ ...f, [key]: val })) }
  function toggleSelect(id) { setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < 5 ? [...s, id] : s)) }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Selections</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Candidates who reached the final selection stage across every job.</p>
        </div>
        {selected.length >= 2 && (
          <button onClick={() => setComparing(true)} className="btn-primary"><Scale className="w-4 h-4" /> Compare ({selected.length})</button>
        )}
      </div>

      <div className="stat-card !p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input className="input-field" placeholder="Search candidate or code..." value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} />
          <select className="input-field" value={filters.job} onChange={(e) => updateFilter('job', e.target.value)}>
            <option value="">All jobs</option>
            {jobs.map((j) => <option key={j._id} value={j._id}>{j.jobTitle}</option>)}
          </select>
          <select className="input-field" value={filters.decision} onChange={(e) => updateFilter('decision', e.target.value)}>
            <option value="">All decisions</option>
            {DECISION_FILTERS.filter(Boolean).map((d) => <option key={d} value={d}>{SELECTION_STATUS_LABELS[d] || d}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : rows.length === 0 ? (
        <div className="stat-card text-center py-16">
          <BadgeCheck className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
          <p className="text-slate-500 dark:text-slate-400">No candidates have reached the final selection stage yet.</p>
        </div>
      ) : (
        <div className="stat-card !p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="py-3 px-4 font-medium w-8"></th>
                <th className="py-3 px-4 font-medium">Candidate</th>
                <th className="py-3 px-4 font-medium">Job</th>
                <th className="py-3 px-4 font-medium">Final Interview</th>
                <th className="py-3 px-4 font-medium">Assessment</th>
                <th className="py-3 px-4 font-medium">AI Match</th>
                <th className="py-3 px-4 font-medium">Expected CTC</th>
                <th className="py-3 px-4 font-medium">Notice</th>
                <th className="py-3 px-4 font-medium">Hiring Manager</th>
                <th className="py-3 px-4 font-medium">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {rows.map((r) => (
                <tr key={r.applicationId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-4">
                    <input type="checkbox" checked={selected.includes(r.applicationId)} onChange={() => toggleSelect(r.applicationId)} />
                  </td>
                  <td className="py-3 px-4">
                    <Link href={`/hr/recruitment/applications/${r.applicationId}/selection`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">{r.candidateName}</Link>
                    <p className="text-xs text-slate-400">{r.applicationCode}</p>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{r.jobTitle}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{r.finalInterviewScore != null ? `${r.finalInterviewScore}/10` : '—'}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{r.assessmentScore != null ? `${r.assessmentScore}%` : '—'}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{r.aiMatch != null ? `${r.aiMatch}%` : '—'}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{r.expectedCtc != null ? `₹${r.expectedCtc}L` : '—'}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{r.noticePeriod || '—'}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{r.hiringManager || '—'}</td>
                  <td className="py-3 px-4"><Badge variant={r.decision}>{r.decisionLabel}</Badge>{r.readyForOffer && <Badge variant="READY_FOR_OFFER" className="ml-1">Ready for Offer</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {comparing && <CandidateComparisonModal applicationIds={selected} onClose={() => setComparing(false)} />}
    </div>
  )
}
