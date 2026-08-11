'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Eye, FileText, ArrowRightLeft, MessageSquarePlus, ChevronLeft, ChevronRight, Users, UserPlus, Scale, Sparkles } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { candidateApi } from '@/services/candidateApi'
import { jobApi } from '@/services/jobApi'
import { formatDate, cn } from '@/lib/utils'
import { APPLICATION_SOURCE_LIST, APPLICATION_SOURCE_LABELS, APPLICATION_STATUS_LIST, APPLICATION_STATUS_LABELS } from '@/lib/candidateConstants'
import { MoveStageDialog } from './MoveStageDialog'
import { AddNoteDialog } from './AddNoteDialog'
import { CandidateComparisonModal } from './CandidateComparisonModal'

const PAGE_SIZE = 15
const FILTER_DEFAULTS = { job: '', source: '', status: '', search: '', aiMatchMin: '', experienceMin: '', noticePeriodMax: '', expectedCtcMax: '' }

// This *is* the "Screening view inside Candidates" (Step 7 item 12) — same
// table, extended with AI Match / Expected CTC / Notice + the filters and
// multi-select comparison the screening workflow needs, rather than a
// separate /hr/recruitment/screening route.
export function CandidatesListPage() {
  const [rows, setRows] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState([])
  const [filters, setFilters] = useState(FILTER_DEFAULTS)
  const [moveStageFor, setMoveStageFor] = useState(null) // row
  const [addNoteFor, setAddNoteFor] = useState(null) // row
  const [selected, setSelected] = useState(new Set())
  const [comparing, setComparing] = useState(false)
  const hasActiveFilters = Object.values(filters).some(Boolean)

  useEffect(() => {
    jobApi.list({ size: 100 }).then((res) => setJobs(res.data.data.content || [])).catch(() => {})
  }, [])

  function load() {
    setLoading(true)
    const params = { page, size: PAGE_SIZE }
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v })
    candidateApi.list(params)
      .then((res) => {
        setRows(res.data.data.content || [])
        setTotalElements(res.data.data.totalElements || 0)
      })
      .finally(() => setLoading(false))
  }
  useEffect(load, [page, filters])

  function updateFilter(key, val) {
    setPage(0)
    setFilters((f) => ({ ...f, [key]: val }))
  }
  function clearFilters() {
    setPage(0)
    setFilters(FILTER_DEFAULTS)
  }

  function toggleSelect(applicationId) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(applicationId)) next.delete(applicationId)
      else if (next.size < 5) next.add(applicationId)
      return next
    })
  }

  const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE))

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Candidates</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Applications flowing in from your published job openings.</p>
        </div>
        <Link href="/hr/recruitment/candidates/new" className="btn-primary">
          <UserPlus className="w-4 h-4" /> Add Candidate
        </Link>
      </div>

      <div className="stat-card !p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input className="input-field" placeholder="Search name, email, phone, skill..." value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} />
          <select className="input-field" value={filters.job} onChange={(e) => updateFilter('job', e.target.value)}>
            <option value="">All jobs</option>
            {jobs.map((j) => <option key={j._id} value={j._id}>{j.jobTitle}</option>)}
          </select>
          <select className="input-field" value={filters.source} onChange={(e) => updateFilter('source', e.target.value)}>
            <option value="">All sources</option>
            {APPLICATION_SOURCE_LIST.map((s) => <option key={s} value={s}>{APPLICATION_SOURCE_LABELS[s]}</option>)}
          </select>
          <select className="input-field" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
            <option value="">All statuses</option>
            {APPLICATION_STATUS_LIST.map((s) => <option key={s} value={s}>{APPLICATION_STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <input type="number" min={0} max={100} className="input-field" placeholder="Min AI Match %" value={filters.aiMatchMin} onChange={(e) => updateFilter('aiMatchMin', e.target.value)} />
          <input type="number" min={0} className="input-field" placeholder="Min Experience (yrs)" value={filters.experienceMin} onChange={(e) => updateFilter('experienceMin', e.target.value)} />
          <input type="number" min={0} className="input-field" placeholder="Max Notice (days)" value={filters.noticePeriodMax} onChange={(e) => updateFilter('noticePeriodMax', e.target.value)} />
          <input type="number" min={0} className="input-field" placeholder="Max Expected CTC (L)" value={filters.expectedCtcMax} onChange={(e) => updateFilter('expectedCtcMax', e.target.value)} />
        </div>
        {hasActiveFilters && (
          <div className="flex justify-end">
            <button type="button" onClick={clearFilters} className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">Clear filters</button>
          </div>
        )}
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40">
          <span className="text-sm text-blue-700 dark:text-blue-300">{selected.size} selected (max 5)</span>
          <div className="flex gap-2">
            <button onClick={() => setSelected(new Set())} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Clear</button>
            <button onClick={() => setComparing(true)} disabled={selected.size < 2} className="btn-primary !text-xs !py-1.5"><Scale className="w-3.5 h-3.5" /> Compare</button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <PageLoader />
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center px-6">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Users className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-600 dark:text-slate-300 font-medium">No candidates yet.</p>
            <p className="text-sm text-slate-400 max-w-sm">Applications will appear here once your published jobs start receiving them.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="data-table [&_th]:!px-2.5 [&_td]:!px-2.5">
                <thead>
                  <tr>
                    <th className="!w-8"></th>
                    <th>Candidate</th>
                    <th>Job</th>
                    <th>AI Match</th>
                    <th>Exp.</th>
                    <th>Expected CTC</th>
                    <th>Notice</th>
                    <th>Source</th>
                    <th>Stage</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.applicationId}>
                      <td>
                        <input type="checkbox" className="accent-blue-600" checked={selected.has(r.applicationId)} onChange={() => toggleSelect(r.applicationId)} />
                      </td>
                      <td className="whitespace-nowrap">
                        <p className="font-medium text-slate-700 dark:text-slate-200">{r.candidateName}</p>
                        <p className="text-xs text-slate-400">{r.candidateCode}</p>
                      </td>
                      <td className="max-w-[140px] truncate" title={r.jobTitle}>{r.jobTitle}</td>
                      <td className="whitespace-nowrap">
                        {r.aiMatchScore != null ? (
                          <span className={cn('inline-flex items-center gap-1 text-xs font-semibold', r.aiMatchScore >= 85 ? 'text-emerald-600 dark:text-emerald-400' : r.aiMatchScore >= 70 ? 'text-blue-600 dark:text-blue-400' : r.aiMatchScore >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400')}>
                            <Sparkles className="w-3 h-3" /> {r.aiMatchScore}%
                          </span>
                        ) : <span className="text-xs text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                      <td className="whitespace-nowrap">{r.experience != null ? `${r.experience} yrs` : '—'}</td>
                      <td className="whitespace-nowrap">{r.expectedCtc != null ? `₹${r.expectedCtc}L` : '—'}</td>
                      <td className="whitespace-nowrap">{r.noticePeriod || '—'}</td>
                      <td className="whitespace-nowrap">{APPLICATION_SOURCE_LABELS[r.source] || r.source}</td>
                      <td className="whitespace-nowrap">{r.stage}</td>
                      <td className="whitespace-nowrap"><Badge variant={r.status}>{r.status?.replace('_', ' ')}</Badge></td>
                      <td>
                        <div className="flex gap-0.5">
                          <Link href={`/hr/recruitment/candidates/${r.candidateId}`} title="View Profile" className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <Link href={`/hr/recruitment/applications/${r.applicationId}`} title="Review" className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                            <FileText className="w-3.5 h-3.5" />
                          </Link>
                          <button title="Move Stage" onClick={() => setMoveStageFor(r)} className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>
                          <button title="Add Note" onClick={() => setAddNoteFor(r)} className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                            <MessageSquarePlus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm text-slate-500">
              <span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalElements)} of {totalElements}</span>
              <div className="flex gap-1">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1.5 text-xs">{page + 1} / {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {moveStageFor && (
        <MoveStageDialog row={moveStageFor} onClose={() => setMoveStageFor(null)} onMoved={() => { setMoveStageFor(null); load() }} />
      )}
      {addNoteFor && (
        <AddNoteDialog row={addNoteFor} onClose={() => setAddNoteFor(null)} onAdded={() => setAddNoteFor(null)} />
      )}
      {comparing && (
        <CandidateComparisonModal applicationIds={Array.from(selected)} onClose={() => setComparing(false)} />
      )}
    </div>
  )
}
