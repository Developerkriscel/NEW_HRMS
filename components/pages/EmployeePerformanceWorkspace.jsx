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
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [progressByKra, setProgressByKra] = useState({})

  function load() {
    setLoading(true)
    Promise.all([kraApi.list({ size: 100 }), performanceReviewApi.list({ size: 100 })])
      .then(([kraRes, reviewRes]) => {
        setKras(kraRes.data.data.content || [])
        setReviews(reviewRes.data.data.content || [])
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function updateProgress(kra, submit = false) {
    const draft = progressByKra[kra._id] || {}
    setSaving(true)
    setMessage('')
    try {
      await kraApi.updateProgress(kra._id, {
        progressPercent: draft.progressPercent === undefined ? kra.progressPercent : Number(draft.progressPercent),
        note: draft.note || '',
        submit,
      })
      setProgressByKra((current) => ({ ...current, [kra._id]: { progressPercent: '', note: '' } }))
      setMessage(submit ? 'KRA submitted for review' : 'KRA progress updated')
      load()
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Performance</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Update KRAs and view submitted performance reviews</p>
        </div>
      </div>
      {message && <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>}
      <DataTable columns={kraColumns} data={kras} isLoading={loading} searchPlaceholder="Search KRAs..." emptyMessage="No KRAs assigned" />
      <DataTable columns={reviewColumns} data={reviews} isLoading={loading} searchPlaceholder="Search reviews..." emptyMessage="No submitted reviews found" />
    </div>
  )
}
