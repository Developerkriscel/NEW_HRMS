'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { IndianRupee } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { compensationApi } from '@/services/compensationApi'
import { COMPENSATION_STATUS_LABELS, COMPENSATION_STATUS_LIST } from '@/lib/compensationConstants'

// Confidentiality note (item 14): this whole page is gated server-side by
// COMPENSATION_VIEW_ROLES — an interviewer or plain manager hitting this
// route gets a 403 from the API, not a filtered view.
export function CompensationListPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  function load() {
    setLoading(true); setError('')
    const params = { size: 100 }
    if (status) params.status = status
    compensationApi.list(params)
      .then((res) => setRows(res.data.data.content || []))
      .catch((err) => setError(err.response?.status === 403 ? 'You do not have permission to view compensation data.' : 'Could not load compensation proposals.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [status])

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Compensation</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Proposals prepared for selected candidates, one row per application's latest version.</p>
        </div>
      </div>

      <div className="stat-card !p-4">
        <select className="input-field max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {COMPENSATION_STATUS_LIST.map((s) => <option key={s} value={s}>{COMPENSATION_STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <div className="stat-card text-center py-16"><p className="text-slate-500 dark:text-slate-400">{error}</p></div>
      ) : rows.length === 0 ? (
        <div className="stat-card text-center py-16">
          <IndianRupee className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
          <p className="text-slate-500 dark:text-slate-400">No compensation proposals yet. Prepare one from a selected candidate's Selection page.</p>
        </div>
      ) : (
        <div className="stat-card !p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="py-3 px-4 font-medium">Candidate</th>
                <th className="py-3 px-4 font-medium">Job</th>
                <th className="py-3 px-4 font-medium">Version</th>
                <th className="py-3 px-4 font-medium">Current CTC</th>
                <th className="py-3 px-4 font-medium">Expected CTC</th>
                <th className="py-3 px-4 font-medium">Proposed CTC</th>
                <th className="py-3 px-4 font-medium">Budget Fit</th>
                <th className="py-3 px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {rows.map((r) => (
                <tr key={r.proposalId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-4">
                    <Link href={`/hr/recruitment/applications/${r.applicationId}/compensation`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">{r.candidateName}</Link>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{r.jobTitle}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">V{r.version}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{r.currentCtc != null ? `₹${r.currentCtc}L` : '—'}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{r.expectedCtc != null ? `₹${r.expectedCtc}L` : '—'}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">₹{r.totalCtc}L</td>
                  <td className="py-3 px-4">{r.budgetFit?.withinBudget ? <span className="text-emerald-600 dark:text-emerald-400 text-xs">✓ Within Budget</span> : <span className="text-amber-600 dark:text-amber-400 text-xs">⚠ +₹{r.budgetFit?.variance}L</span>}</td>
                  <td className="py-3 px-4"><Badge variant={r.status}>{r.statusLabel}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
