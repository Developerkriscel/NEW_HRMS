'use client'

import { useEffect, useState } from 'react'
import { Send } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { DataTable } from '@/components/tables/DataTable'
import { kraApi } from '@/services/kraApi'
import { performanceReviewApi } from '@/services/performanceReviewApi'
import { formatDate } from '@/lib/utils'

export function EmployeePerformanceWorkspace() {
  const [kras, setKras] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [progressByKra, setProgressByKra] = useState({})

  function load({ silent = false } = {}) {
    if (silent) setRefreshing(true)
    else setLoading(true)
    return Promise.all([kraApi.list({ size: 100 }), performanceReviewApi.list({ size: 100 })])
      .then(([kraRes, reviewRes]) => {
        setKras(kraRes.data.data.content || [])
        setReviews(reviewRes.data.data.content || [])
      })
      .finally(() => {
        if (silent) setRefreshing(false)
        else setLoading(false)
      })
  }

  useEffect(() => { load() }, [])

  async function updateProgress(kra, submit = false) {
    const draft = progressByKra[kra._id] || {}
    setSaving(true)
    setMessage('')
    try {
      const nextProgress = draft.progressPercent === undefined ? kra.progressPercent : Number(draft.progressPercent)
      const res = await kraApi.updateProgress(kra._id, {
        progressPercent: nextProgress,
        note: draft.note || '',
        submit,
      })
      const updated = res.data?.data
      setKras((current) => current.map((item) => item._id === kra._id
        ? { ...item, ...(updated || {}), progressPercent: nextProgress, status: submit ? (updated?.status || 'SUBMITTED') : (updated?.status || item.status) }
        : item))
      setProgressByKra((current) => ({ ...current, [kra._id]: { progressPercent: '', note: '' } }))
      setMessage(submit ? 'KRA submitted for review' : 'KRA progress updated')
      load({ silent: true }).catch(() => {})
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update KRA')
    } finally {
      setSaving(false)
    }
  }

  const kraColumns = [
    { header: 'KRA', accessor: 'title', render: (_, row) => (
      <div>
        <p className="font-medium text-slate-800 dark:text-slate-100">{row.title}</p>
        <p className="text-xs text-slate-400">{row.description || row.type}</p>
      </div>
    ) },
    { header: 'Due', accessor: 'dueDate', render: (v) => formatDate(v) },
    { header: 'Progress', accessor: 'progressPercent', render: (v) => `${v || 0}%` },
    { header: 'Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
    { header: 'Update', key: 'update', sortable: false, render: (_, row) => (
      <div className="flex min-w-80 gap-2" onClick={(e) => e.stopPropagation()}>
        <input type="number" min="0" max="100" className="input-field w-24" placeholder="%" value={progressByKra[row._id]?.progressPercent ?? ''} onChange={(e) => setProgressByKra((current) => ({ ...current, [row._id]: { ...current[row._id], progressPercent: e.target.value } }))} />
        <input className="input-field" placeholder="Note" value={progressByKra[row._id]?.note || ''} onChange={(e) => setProgressByKra((current) => ({ ...current, [row._id]: { ...current[row._id], note: e.target.value } }))} />
        <button disabled={saving} className="btn-secondary py-1.5" onClick={() => updateProgress(row, false)}>Save</button>
        <button disabled={saving} className="btn-primary py-1.5" onClick={() => updateProgress(row, true)}><Send className="w-4 h-4" /></button>
      </div>
    ) },
  ]

  const reviewColumns = [
    { header: 'Review', accessor: 'periodLabel', render: (_, row) => (
      <div>
        <p className="font-medium text-slate-800 dark:text-slate-100">{row.periodLabel}</p>
        <p className="text-xs text-slate-400">{row.feedback || 'No feedback added'}</p>
      </div>
    ) },
    { header: 'Reviewer', accessor: 'reviewer', render: (v) => v ? `${v.firstName} ${v.lastName}` : '-' },
    { header: 'Rating', accessor: 'overallRating', render: (v) => v ?? '-' },
    { header: 'KRA Score', accessor: 'kraScore', render: (v) => v ?? '-' },
    { header: 'Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
  ]

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400 dark:from-indigo-400 dark:to-indigo-300 hover:scale-[1.02] transition-transform duration-300 relative w-fit pb-2 after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-1/3 after:h-1 after:bg-gradient-to-r after:from-indigo-500 after:to-transparent after:rounded-full">Performance</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Update KRAs and view submitted performance reviews</p>
        </div>
      </div>
      {message && <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>}
      {refreshing && <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Refreshing in background...</p>}
      <DataTable columns={kraColumns} data={kras} isLoading={loading} searchPlaceholder="Search KRAs..." emptyMessage="No KRAs assigned" />
      <DataTable columns={reviewColumns} data={reviews} isLoading={loading} searchPlaceholder="Search reviews..." emptyMessage="No submitted reviews found" />
    </div>
  )
}
