'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, ClipboardList, Pencil } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { assessmentApi } from '@/services/assessmentApi'
import {
  ASSESSMENT_TYPE_LIST, ASSESSMENT_TYPE_LABELS, ASSESSMENT_MASTER_STATUS_LIST, ASSESSMENT_MASTER_STATUS_LABELS,
} from '@/lib/assessmentConstants'

const PAGE_SIZE = 20

export function AssessmentsListPage() {
  const [rows, setRows] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ type: '', status: '' })

  function load() {
    setLoading(true)
    const params = { page, size: PAGE_SIZE }
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v })
    assessmentApi.list(params)
      .then((res) => { setRows(res.data.data.content || []); setTotalElements(res.data.data.totalElements || 0) })
      .finally(() => setLoading(false))
  }
  useEffect(load, [page, filters])

  function updateFilter(key, val) { setPage(0); setFilters((f) => ({ ...f, [key]: val })) }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Assessments</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Build reusable assessments and assign them to candidates.</p>
        </div>
        <Link href="/hr/recruitment/assessments/new" className="btn-primary">
          <Plus className="w-4 h-4" /> Create Assessment
        </Link>
      </div>

      <div className="stat-card !p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select className="input-field" value={filters.type} onChange={(e) => updateFilter('type', e.target.value)}>
            <option value="">All types</option>
            {ASSESSMENT_TYPE_LIST.map((t) => <option key={t} value={t}>{ASSESSMENT_TYPE_LABELS[t]}</option>)}
          </select>
          <select className="input-field" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
            <option value="">All statuses</option>
            {ASSESSMENT_MASTER_STATUS_LIST.map((s) => <option key={s} value={s}>{ASSESSMENT_MASTER_STATUS_LABELS[s]}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <PageLoader />
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center px-6">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-600 dark:text-slate-300 font-medium">No assessments yet.</p>
            <p className="text-sm text-slate-400 max-w-sm">Create one to start screening candidates with structured tests.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table [&_th]:!px-2.5 [&_td]:!px-2.5">
              <thead>
                <tr>
                  <th>Assessment</th>
                  <th>Type</th>
                  <th>Duration</th>
                  <th>Questions</th>
                  <th>Passing Score</th>
                  <th>Used In</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a._id}>
                    <td className="max-w-[220px] truncate font-medium text-slate-700 dark:text-slate-200" title={a.name}>{a.name}</td>
                    <td className="whitespace-nowrap">{ASSESSMENT_TYPE_LABELS[a.type] || a.type}</td>
                    <td className="whitespace-nowrap">{a.durationMinutes ? `${a.durationMinutes} min` : '—'}</td>
                    <td className="whitespace-nowrap">{a.questionCount}</td>
                    <td className="whitespace-nowrap">{a.passingScore != null ? `${a.passingScore}%` : '—'}</td>
                    <td className="whitespace-nowrap">{a.usedInJobs} job{a.usedInJobs !== 1 ? 's' : ''}</td>
                    <td className="whitespace-nowrap"><Badge variant={a.status}>{ASSESSMENT_MASTER_STATUS_LABELS[a.status] || a.status}</Badge></td>
                    <td>
                      <Link href={`/hr/recruitment/assessments/${a._id}`} title="Edit" className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 inline-block">
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
