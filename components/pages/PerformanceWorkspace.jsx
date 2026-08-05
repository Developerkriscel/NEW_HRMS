'use client'

import { useEffect, useState } from 'react'
import { Plus, Send } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { DataTable } from '@/components/tables/DataTable'
import { employeeApi } from '@/services/employeeApi'
import { kraApi } from '@/services/kraApi'
import { performanceReviewApi } from '@/services/performanceReviewApi'
import { formatDate } from '@/lib/utils'

export function PerformanceWorkspace({ title, subtitle }) {
  const [employees, setEmployees] = useState([])
  const [kras, setKras] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [kraForm, setKraForm] = useState({ employeeId: '', title: '', dueDate: '', weightage: 0 })
  const [reviewForm, setReviewForm] = useState({ employeeId: '', periodLabel: '', kraScore: '' })

  function load() {
    setLoading(true)
    Promise.all([
      employeeApi.getAll({ size: 200 }),
      kraApi.list({ size: 100 }),
      performanceReviewApi.list({ size: 100 }),
    ])
      .then(([employeeRes, kraRes, reviewRes]) => {
        setEmployees(employeeRes.data.data.content || [])
        setKras(kraRes.data.data.content || [])
        setReviews(reviewRes.data.data.content || [])
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function assignKra(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await kraApi.assign({
        ...kraForm,
        weightage: Number(kraForm.weightage || 0),
      })
      setKraForm({ employeeId: '', title: '', dueDate: '', weightage: 0 })
      setMessage('KRA assigned')
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to assign KRA')
    } finally {
      setSaving(false)
    }
  }

  async function createReview(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await performanceReviewApi.create({
        employeeId: reviewForm.employeeId,
        periodLabel: reviewForm.periodLabel,
        kraScore: reviewForm.kraScore === '' ? null : Number(reviewForm.kraScore),
      })
      setReviewForm({ employeeId: '', periodLabel: '', kraScore: '' })
      setMessage('Review draft created')
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to create review')
    } finally {
      setSaving(false)
    }
  }

  async function submitReview(id) {
    setSaving(true)
    setMessage('')
    try {
      await performanceReviewApi.submit(id)
      setMessage('Review submitted')
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to submit review')
    } finally {
      setSaving(false)
    }
  }

  const employeeOptions = employees.map((employee) => (
    <option key={employee._id} value={employee._id}>
      {employee.firstName} {employee.lastName} ({employee.employeeCode || employee.email})
    </option>
  ))

  const kraColumns = [
    { header: 'KRA', accessor: 'title', render: (_, row) => (
      <div>
        <p className="font-medium text-slate-800 dark:text-slate-100">{row.title}</p>
        <p className="text-xs text-slate-400">{row.type} - {row.progressPercent || 0}% progress</p>
      </div>
    ) },
    { header: 'Employee', accessor: 'employee', render: (v) => v ? `${v.firstName} ${v.lastName}` : '-' },
    { header: 'Due Date', accessor: 'dueDate', render: (v) => formatDate(v) },
    { header: 'Weight', accessor: 'weightage', render: (v) => `${v || 0}%` },
    { header: 'Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
  ]

  const reviewColumns = [
    { header: 'Review', accessor: 'periodLabel', render: (_, row) => (
      <div>
        <p className="font-medium text-slate-800 dark:text-slate-100">{row.periodLabel}</p>
        <p className="text-xs text-slate-400">Overall {row.overallRating || '-'} - KRA {row.kraScore ?? '-'}</p>
      </div>
    ) },
    { header: 'Employee', accessor: 'employee', render: (v) => v ? `${v.firstName} ${v.lastName}` : '-' },
    { header: 'Reviewer', accessor: 'reviewer', render: (v) => v ? `${v.firstName} ${v.lastName}` : '-' },
    { header: 'Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
    { header: 'Action', key: 'action', sortable: false, render: (_, row) => row.status === 'DRAFT' ? (
      <button disabled={saving} className="btn-secondary py-1.5" onClick={(e) => { e.stopPropagation(); submitReview(row._id) }}>
        Submit
      </button>
    ) : null },
  ]

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <form onSubmit={assignKra} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Plus className="w-4 h-4" /> Assign KRA</h3>
          <select required className="input-field" value={kraForm.employeeId} onChange={(e) => setKraForm({ ...kraForm, employeeId: e.target.value })}>
            <option value="">Select employee</option>
            {employeeOptions}
          </select>
          <input required className="input-field" placeholder="KRA title" value={kraForm.title} onChange={(e) => setKraForm({ ...kraForm, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input type="date" className="input-field" value={kraForm.dueDate} onChange={(e) => setKraForm({ ...kraForm, dueDate: e.target.value })} />
            <input type="number" className="input-field" placeholder="Weight %" value={kraForm.weightage} onChange={(e) => setKraForm({ ...kraForm, weightage: e.target.value })} />
          </div>
          <button disabled={saving} className="btn-primary"><Plus className="w-4 h-4" /> Assign</button>
        </form>

        <form onSubmit={createReview} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Send className="w-4 h-4" /> Create Review Draft</h3>
          <select required className="input-field" value={reviewForm.employeeId} onChange={(e) => setReviewForm({ ...reviewForm, employeeId: e.target.value })}>
            <option value="">Select employee</option>
            {employeeOptions}
          </select>
          <input required className="input-field" placeholder="Period, e.g. Q1 2026" value={reviewForm.periodLabel} onChange={(e) => setReviewForm({ ...reviewForm, periodLabel: e.target.value })} />
          <input type="number" min="0" max="100" className="input-field" placeholder="KRA score" value={reviewForm.kraScore} onChange={(e) => setReviewForm({ ...reviewForm, kraScore: e.target.value })} />
          <button disabled={saving} className="btn-primary"><Send className="w-4 h-4" /> Create Draft</button>
        </form>
      </div>

      {message && <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>}

      <DataTable columns={kraColumns} data={kras} isLoading={loading} searchPlaceholder="Search KRAs..." emptyMessage="No KRAs found" />
      <DataTable columns={reviewColumns} data={reviews} isLoading={loading} searchPlaceholder="Search reviews..." emptyMessage="No reviews found" />
    </div>
  )
}
