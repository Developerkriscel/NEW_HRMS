'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { candidateApi } from '@/services/candidateApi'
import { MATCH_LABEL_LABELS } from '@/lib/matchingConstants'

const ROWS = [
  { key: 'aiMatchScore', label: 'AI Match', render: (r) => r.aiMatchScore != null ? `${r.aiMatchScore}%` : '—' },
  { key: 'matchLabel', label: 'Match Label', render: (r) => r.matchLabel ? MATCH_LABEL_LABELS[r.matchLabel] : '—' },
  { key: 'experience', label: 'Experience', render: (r) => r.experience != null ? `${r.experience}y` : '—' },
  { key: 'requiredSkillsMatched', label: 'Required Skills', render: (r) => r.requiredSkillsMatched ?? '—' },
  { key: 'expectedCtc', label: 'Expected CTC', render: (r) => r.expectedCtc != null ? `₹${r.expectedCtc}L` : '—' },
  { key: 'noticePeriod', label: 'Notice', render: (r) => r.noticePeriod ?? '—' },
  { key: 'screening', label: 'Screening', render: (r) => r.screening ?? '—' },
  { key: 'stage', label: 'Stage', render: (r) => r.stage ?? '—' },
]

// item 13 — Candidate Comparison. Highlights the best value in each row so
// HR can scan across candidates at a glance.
export function CandidateComparisonModal({ applicationIds, onClose }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    candidateApi.compare(applicationIds).then((res) => setRows(res.data.data)).finally(() => setLoading(false))
  }, [applicationIds])

  function bestValue(key) {
    const values = rows.map((r) => r[key]).filter((v) => typeof v === 'number')
    if (!values.length) return null
    return key === 'expectedCtc' ? Math.min(...values) : Math.max(...values)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Compare Candidates</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        <div className="p-6">
          {loading ? (
            <p className="text-sm text-slate-400">Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2 pr-4 font-medium">Criteria</th>
                    {rows.map((r) => <th key={r.applicationId} className="py-2 px-4 font-medium text-slate-700 dark:text-slate-200">{r.candidateName}<p className="text-[10px] font-normal text-slate-400">{r.jobTitle}</p></th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                  {ROWS.map((rowDef) => {
                    const best = bestValue(rowDef.key)
                    return (
                      <tr key={rowDef.key}>
                        <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">{rowDef.label}</td>
                        {rows.map((r) => (
                          <td key={r.applicationId} className={`py-2.5 px-4 font-medium ${best != null && r[rowDef.key] === best ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'}`}>
                            {rowDef.render(r)}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                  <tr>
                    <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">Status</td>
                    {rows.map((r) => <td key={r.applicationId} className="py-2.5 px-4"><Badge variant={r.status}>{r.status?.replace('_', ' ')}</Badge></td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
