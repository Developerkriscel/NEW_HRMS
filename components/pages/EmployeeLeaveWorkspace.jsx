'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, X, Calendar, Send, FileText } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { leaveApi } from '@/services/leaveApi'
import { teamRequestApi } from '@/services/teamRequestApi'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { Check } from 'lucide-react'
import { Portal } from '@/components/common/Portal'

const REQUEST_TYPES = ['SHIFT_CHANGE', 'OVERTIME', 'WORK_FROM_HOME', 'TRAVEL', 'DOCUMENT']

export function EmployeeLeaveWorkspace({ headerAction }) {
  const { user } = useAuthStore()
  const canSelfApprove = ['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(user?.role)

  // Leaves State
  const [leaves, setLeaves] = useState([])
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ leaveTypeId: '', startDate: '', endDate: '', reason: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Requests State
  const [requests, setRequests] = useState([])
  const [reqLoading, setReqLoading] = useState(true)
  const [showReqForm, setShowReqForm] = useState(false)
  const [reqForm, setReqForm] = useState({ type: 'WORK_FROM_HOME', fromDate: '', toDate: '', reason: '', detailText: '' })
  const [reqSaving, setReqSaving] = useState(false)
  const [reqError, setReqError] = useState('')

  // UI State
  const [activeTab, setActiveTab] = useState('leave')
  const [mounted, setMounted] = useState(false)

  function load() {
    setLoading(true)
    setLoadError(false)
    leaveApi.getMyLeaves({ size: 50 })
      .then((res) => setLeaves(res.data.data.content))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))

    setReqLoading(true)
    teamRequestApi.list({ size: 50 })
      .then((res) => setRequests(res.data.data.content || []))
      .finally(() => setReqLoading(false))
  }

  useEffect(() => {
    setMounted(true)
    load()
    leaveApi.getTypes().then((res) => setTypes(res.data.data)).catch(() => setTypes([]))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleApplyLeave(e) {
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

  async function handleApplyRequest(e) {
    e.preventDefault()
    setReqSaving(true)
    setReqError('')
    try {
      await teamRequestApi.submit({
        type: reqForm.type,
        fromDate: reqForm.fromDate || null,
        toDate: reqForm.toDate || null,
        reason: reqForm.reason,
        details: { note: reqForm.detailText },
      })
      setShowReqForm(false)
      setReqForm({ type: 'WORK_FROM_HOME', fromDate: '', toDate: '', reason: '', detailText: '' })
      load()
    } catch (err) {
      setReqError(err.response?.data?.message || 'Failed to submit request')
    } finally {
      setReqSaving(false)
    }
  }

  async function handleCancelLeave(id) {
    await leaveApi.cancel(id)
    load()
  }

  async function handleApproveLeave(id) {
    await leaveApi.approve(id, 'Self-approved by admin')
    load()
  }

  async function handleRejectLeave(id) {
    await leaveApi.reject(id, 'Self-rejected by admin')
    load()
  }

  async function handleApproveRequestDirect(id) {
    await teamRequestApi.approve(id, 'Self-approved by admin')
    load()
  }

  async function handleRejectRequestDirect(id) {
    await teamRequestApi.reject(id, 'Self-rejected by admin')
    load()
  }

  const tabSwitcher = (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex space-x-1 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl w-fit">
        <button onClick={() => setActiveTab('leave')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'leave' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>Leave History</button>
        <button onClick={() => setActiveTab('request')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'request' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>My Requests</button>
      </div>
      {headerAction && <div>{headerAction}</div>}
    </div>
  )

  return (
    <div className="animate-fade-in space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-white">Leave & Requests</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage your time-off and submit team requests</p>
        </div>
        <div className="flex items-center gap-2.5 mt-5 sm:mt-6">
          <button
            className="bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 py-2 px-3.5 rounded-lg font-bold text-xs transition-all shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
            onClick={() => { setReqError(''); setShowReqForm(true) }}
          >
            <Send className="w-3.5 h-3.5" /> New Request
          </button>
          <button
            className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3.5 rounded-lg font-bold text-xs transition-all shadow-[0_0_16px_-5px_rgba(79,70,229,0.5)] flex items-center gap-1.5"
            onClick={() => { setError(''); setShowForm(true) }}
          >
            <Plus className="w-3.5 h-3.5" /> Apply for Leave
          </button>
        </div>
      </div>

      {activeTab === 'leave' && (
        <div className="space-y-5 animate-fade-in">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><Calendar className="w-5 h-5 text-indigo-500" /> Leave History</h2>
          {tabSwitcher}
          {loading ? (
            <p className="text-sm text-slate-400">Loading leaves...</p>
          ) : loadError ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-8 text-center text-sm text-red-500">
              Failed to load leave requests — try refreshing
            </div>
          ) : leaves.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-8 text-center text-sm text-slate-400">
              No leave requests yet
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-50 dark:divide-slate-800/50">
              {leaves.map((l) => (
                <div key={l._id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">{l.leaveType?.name}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5 font-medium">
                          {formatDate(l.startDate)}
                          <span className="text-slate-300 dark:text-slate-600">→</span>
                          {formatDate(l.endDate)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
                          {l.numberOfDays} Day{l.numberOfDays > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end sm:justify-start gap-3">
                    <Badge variant={l.status === 'APPROVED' ? 'success' : l.status === 'PENDING' ? 'warning' : 'danger'}>
                      {l.status}
                    </Badge>
                    {l.status === 'PENDING' && (
                      <div className="flex items-center gap-1.5 opacity-100">
                        <button
                          onClick={() => handleCancelLeave(l._id)}
                          className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:text-rose-400 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 px-3 py-1.5 rounded-lg"
                        >
                          Cancel
                        </button>
                        {canSelfApprove && (
                          <>
                            <button onClick={() => handleApproveLeave(l._id)} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20" title="Approve">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleRejectLeave(l._id)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20" title="Reject">
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'request' && (
        <div className="space-y-5 animate-fade-in">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-500" /> My Requests</h2>
          {tabSwitcher}
          {reqLoading ? (
            <p className="text-sm text-slate-400">Loading requests...</p>
          ) : requests.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-8 text-center text-sm text-slate-400">
              No requests yet
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-50 dark:divide-slate-800/50">
              {requests.map((r) => (
                <div key={r._id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">{r.type.replace(/_/g, ' ')}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {r.fromDate && r.toDate && (
                          <span className="flex items-center gap-1.5 font-medium">
                            {formatDate(r.fromDate)}
                            <span className="text-slate-300 dark:text-slate-600">→</span>
                            {formatDate(r.toDate)}
                          </span>
                        )}
                        <span className="text-slate-500">{r.reason}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end sm:justify-start gap-3">
                    <Badge variant={r.status === 'APPROVED' ? 'success' : r.status === 'PENDING' ? 'warning' : 'danger'}>
                      {r.status}
                    </Badge>
                    {r.status === 'PENDING' && canSelfApprove && (
                      <div className="flex items-center gap-1.5 opacity-100">
                        <button onClick={() => handleApproveRequestDirect(r._id)} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20" title="Approve">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleRejectRequestDirect(r._id)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20" title="Reject">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Apply Leave Modal */}
      {showForm && mounted && (
        <Portal><div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowForm(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-fade-in border border-slate-200 dark:border-slate-800">
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none"></div>
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Apply for Leave</h2>
                  <p className="text-xs text-slate-500 font-medium">Submit a new leave request</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={handleApplyLeave} className="p-6 space-y-5">
              {error && <div className="p-3 rounded-xl text-sm font-medium border bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20">{error}</div>}
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Leave Type</label>
                <select required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none" value={form.leaveTypeId} onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}>
                  <option value="" disabled>Select Leave Type</option>
                  {types.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Start Date</label>
                  <input required type="date" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">End Date</label>
                  <input required type="date" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Reason</label>
                <textarea required placeholder="Please provide a reason for your leave..." className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none" rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-indigo-500/25">
                  {saving ? 'Submitting Request...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div></Portal>
      )}

      {/* New Request Modal */}
      {showReqForm && mounted && (
        <Portal><div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowReqForm(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-fade-in border border-slate-200 dark:border-slate-800">
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none"></div>
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
                  <Send className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">New Request</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Submit team requests for manager approval</p>
                </div>
              </div>
              <button onClick={() => setShowReqForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleApplyRequest} className="p-6">
              {reqError && (
                <div className="mb-5 p-3 rounded-xl text-sm font-medium border bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20">
                  {reqError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5 sm:col-span-1 lg:col-span-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Type</label>
                  <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none" value={reqForm.type} onChange={(e) => setReqForm({ ...reqForm, type: e.target.value })}>
                    {REQUEST_TYPES.map((type) => <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Start Date</label>
                  <input type="date" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={reqForm.fromDate} onChange={(e) => setReqForm({ ...reqForm, fromDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">End Date</label>
                  <input type="date" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={reqForm.toDate} onChange={(e) => setReqForm({ ...reqForm, toDate: e.target.value })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Reason</label>
                  <input required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Enter reason" value={reqForm.reason} onChange={(e) => setReqForm({ ...reqForm, reason: e.target.value })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Additional Details</label>
                  <textarea className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none" rows={3} placeholder="Any other details..." value={reqForm.detailText} onChange={(e) => setReqForm({ ...reqForm, detailText: e.target.value })} />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => setShowReqForm(false)} className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={reqSaving} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)] flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> {reqSaving ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div></Portal>
      )}
    </div>
  )
}
