'use client'

import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { leaveApi } from '@/services/leaveApi'
import { formatDate } from '@/lib/utils'

export default function EmployeeLeavePage() {
  const [leaves, setLeaves] = useState([])
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ leaveTypeId: '', startDate: '', endDate: '', reason: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function load() {
    setLoading(true)
    setLoadError(false)
    leaveApi.getMyLeaves({ size: 50 })
      .then((res) => setLeaves(res.data.data.content))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }
  useEffect(() => {
    load()
    leaveApi.getTypes().then((res) => setTypes(res.data.data)).catch(() => setTypes([]))
  }, [])

  async function handleApply(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await leaveApi.apply(form)
      setShowForm(false)
      setForm({ leaveTypeId: '', startDate: '', endDate: '', reason: '' })
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to apply for leave')
    } finally {
      setSaving(false)
    }
  }

  async function handleCancel(id) {
    await leaveApi.cancel(id)
    load()
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Leave</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Apply for and track your leave requests</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Apply for Leave
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : loadError ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-8 text-center text-sm text-red-500">
          Failed to load leave requests — try refreshing
        </div>
      ) : leaves.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-8 text-center text-sm text-slate-400">
          No leave requests yet
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm divide-y divide-slate-50 dark:divide-slate-800">
          {leaves.map((l) => (
            <div key={l._id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-100">{l.leaveType?.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{formatDate(l.startDate)} – {formatDate(l.endDate)} · {l.numberOfDays} day(s)</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{l.status}</Badge>
                {l.status === 'PENDING' && (
                  <button onClick={() => handleCancel(l._id)} className="text-xs text-red-600 dark:text-red-400 hover:underline">Cancel</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Apply for Leave</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleApply} className="space-y-3">
              {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-2">{error}</div>}
              <select required className="input-field" value={form.leaveTypeId} onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}>
                <option value="">Select Leave Type</option>
                {types.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input required type="date" className="input-field" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                <input required type="date" className="input-field" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
              <textarea placeholder="Reason" className="input-field" rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
              <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
                {saving ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
