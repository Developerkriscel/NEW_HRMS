'use client'

import { useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Plus, X, Calendar, Send, FileText, Filter } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { DataTable } from '@/components/tables/DataTable'
import { leaveApi } from '@/services/leaveApi'
import { teamRequestApi } from '@/services/teamRequestApi'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { Portal } from '@/components/common/Portal'

const REQUEST_TYPES = ['SHIFT_CHANGE', 'OVERTIME', 'WORK_FROM_HOME', 'TRAVEL', 'DOCUMENT']

function matchesTimeFilter(dateVal, timeFilter) {
  if (!timeFilter || timeFilter === 'All Time') return true
  if (!dateVal) return true
  const d = new Date(dateVal)
  if (isNaN(d.getTime())) return true

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  if (timeFilter === 'Today') {
    return d >= startOfToday && d <= endOfToday
  }
  if (timeFilter === 'Yesterday') {
    const startOfYesterday = new Date(startOfToday)
    startOfYesterday.setDate(startOfYesterday.getDate() - 1)
    const endOfYesterday = new Date(startOfToday.getTime() - 1)
    return d >= startOfYesterday && d <= endOfYesterday
  }
  if (timeFilter === 'This Week') {
    const startOfWeek = new Date(startOfToday)
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    return d >= startOfWeek
  }
  if (timeFilter === 'This Month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    return d >= startOfMonth
  }
  if (timeFilter === 'Last 6 Months') {
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1, 0, 0, 0, 0)
    return d >= sixMonthsAgo
  }
  return true
}

function matchesStatusFilter(status, statusFilter) {
  if (!statusFilter || statusFilter === 'ALL') return true
  return status === statusFilter
}

export function EmployeeLeaveWorkspace({ headerAction, isHrPanel = false }) {
  const { user } = useAuthStore()
  const canSelfApprove = ['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(user?.role)

  // Leaves State
  const [leaves, setLeaves] = useState([])
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ leaveTypeId: '', dayType: 'FULL_DAY', startDate: '', endDate: '', reason: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Requests State
  const [requests, setRequests] = useState([])
  const [reqLoading, setReqLoading] = useState(true)
  const [reqRefreshing, setReqRefreshing] = useState(false)
  const [showReqForm, setShowReqForm] = useState(false)
  const [reqForm, setReqForm] = useState({ type: 'WORK_FROM_HOME', fromDate: '', toDate: '', reason: '', detailText: '' })
  const [reqSaving, setReqSaving] = useState(false)
  const [reqError, setReqError] = useState('')

  // Filters (for HR Panel)
  const [timeFilter, setTimeFilter] = useState('All Time')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // UI State
  const [activeTab, setActiveTab] = useState('leave')
  const [mounted, setMounted] = useState(false)

  function load({ silent = false } = {}) {
    if (silent) setRefreshing(true)
    else setLoading(true)
    setLoadError(false)
    const leavesPromise = leaveApi.getMyLeaves({ size: 50 })
      .then((res) => setLeaves(res.data.data.content))
      .catch(() => setLoadError(true))
      .finally(() => {
        if (silent) setRefreshing(false)
        else setLoading(false)
      })

    if (silent) setReqRefreshing(true)
    else setReqLoading(true)
    const requestsPromise = teamRequestApi.list({ size: 50 })
      .then((res) => setRequests(res.data.data.content || []))
      .finally(() => {
        if (silent) setReqRefreshing(false)
        else setReqLoading(false)
      })

    return Promise.allSettled([leavesPromise, requestsPromise])
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
      const payload = {
        ...form,
        endDate: form.dayType === 'FULL_DAY' ? form.endDate : form.startDate,
        halfDay: form.dayType !== 'FULL_DAY',
        halfDayType: form.dayType === 'FULL_DAY' ? null : form.dayType
      }
      const res = await leaveApi.apply(payload)
      setShowForm(false)
      setForm({ leaveTypeId: '', dayType: 'FULL_DAY', startDate: '', endDate: '', reason: '' })
      const createdLeave = res.data.data
      if (createdLeave?._id) setLeaves(prev => [createdLeave, ...prev])
      load({ silent: true })
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
      const res = await teamRequestApi.submit({
        type: reqForm.type,
        fromDate: reqForm.fromDate || null,
        toDate: reqForm.toDate || null,
        reason: reqForm.reason,
        details: { note: reqForm.detailText },
      })
      setShowReqForm(false)
      setReqForm({ type: 'WORK_FROM_HOME', fromDate: '', toDate: '', reason: '', detailText: '' })
      const createdRequest = res.data.data
      if (createdRequest?._id) setRequests(prev => [createdRequest, ...prev])
      load({ silent: true })
    } catch (err) {
      setReqError(err.response?.data?.message || 'Failed to submit request')
    } finally {
      setReqSaving(false)
    }
  }

  async function handleCancelLeave(id) {
    await leaveApi.cancel(id)
    setLeaves(prev => prev.map(item => item._id === id ? { ...item, status: 'CANCELLED' } : item))
  }

  async function handleApproveLeave(id) {
    await leaveApi.approve(id, 'Self-approved by admin')
    setLeaves(prev => prev.map(item => item._id === id ? { ...item, status: 'APPROVED' } : item))
  }

  async function handleRejectLeave(id) {
    await leaveApi.reject(id, 'Self-rejected by admin')
    setLeaves(prev => prev.map(item => item._id === id ? { ...item, status: 'REJECTED' } : item))
  }

  async function handleApproveRequestDirect(id) {
    await teamRequestApi.approve(id, 'Self-approved by admin')
    setRequests(prev => prev.map(item => item._id === id ? { ...item, status: 'APPROVED' } : item))
  }

  async function handleRejectRequestDirect(id) {
    await teamRequestApi.reject(id, 'Self-rejected by admin')
    setRequests(prev => prev.map(item => item._id === id ? { ...item, status: 'REJECTED' } : item))
  }

  const leaveColumns = useMemo(() => [
    { header: 'Leave Type', accessor: 'leaveType', render: (v) => <span className="font-medium text-slate-900 dark:text-white">{v?.name || 'Unknown'}</span> },
    { header: 'Day Type', accessor: 'halfDay', render: (_, l) => <span className="text-sm text-slate-600 dark:text-slate-400">{!l.halfDay ? 'Full Day' : (l.halfDayType === 'FIRST_HALF' ? 'Half Day - First Half' : 'Half Day - Second Half')}</span> },
    { header: 'Duration', accessor: 'startDate', render: (_, l) => (
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-sm whitespace-nowrap">{formatDate(l.startDate)} <span className="text-slate-300 dark:text-slate-600">→</span> {formatDate(l.endDate)}</span>
        <span className="text-[11px] font-semibold text-slate-500">{l.numberOfDays} Day{l.numberOfDays > 1 ? 's' : ''}</span>
      </div>
    ) },
    { header: 'Reason', accessor: 'reason', render: (v) => <span className="text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate block" title={v}>{v || '—'}</span> },
    { header: 'Status', accessor: 'status', align: 'right', render: (v, l) => (
      <div className="flex items-center justify-end gap-3">
        <Badge variant={v === 'APPROVED' ? 'success' : v === 'PENDING' ? 'warning' : 'danger'}>{v}</Badge>
        {v === 'PENDING' && (
          <div className="flex items-center gap-1.5 opacity-100">
            <button onClick={() => handleCancelLeave(l._id)} className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:text-rose-400 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 px-3 py-1.5 rounded-lg">Cancel</button>
            {canSelfApprove && (
              <>
                <button onClick={() => handleApproveLeave(l._id)} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20">Accept</button>
                <button onClick={() => handleRejectLeave(l._id)} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-extrabold text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20">Reject</button>
              </>
            )}
          </div>
        )}
      </div>
    ) }
  ], [canSelfApprove, leaves]) // eslint-disable-line

  const requestColumns = useMemo(() => [
    { header: 'Request Type', accessor: 'type', render: (v) => <span className="font-medium text-slate-900 dark:text-white capitalize">{v?.replace(/_/g, ' ')?.toLowerCase()}</span> },
    { header: 'Duration', accessor: 'fromDate', render: (_, r) => (
      r.fromDate && r.toDate ? (
        <span className="font-medium text-sm whitespace-nowrap">{formatDate(r.fromDate)} <span className="text-slate-300 dark:text-slate-600">→</span> {formatDate(r.toDate)}</span>
      ) : <span className="text-slate-400">—</span>
    ) },
    { header: 'Reason', accessor: 'reason', render: (v) => <span className="text-sm text-slate-600 dark:text-slate-400">{v || '—'}</span> },
    { header: 'Status', accessor: 'status', align: 'right', render: (v, r) => (
      <div className="flex items-center justify-end gap-3">
        <Badge variant={v === 'APPROVED' ? 'success' : v === 'PENDING' ? 'warning' : 'danger'}>{v}</Badge>
        {v === 'PENDING' && canSelfApprove && (
          <div className="flex items-center gap-1.5 opacity-100">
            <button onClick={() => handleApproveRequestDirect(r._id)} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20">Accept</button>
            <button onClick={() => handleRejectRequestDirect(r._id)} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-extrabold text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20">Reject</button>
          </div>
        )}
      </div>
    ) }
  ], [canSelfApprove, requests]) // eslint-disable-line

  const filteredLeaves = useMemo(() => {
    if (!isHrPanel) return leaves
    return leaves.filter(l => {
      const dateVal = l.startDate || l.createdAt
      const matchesTime = matchesTimeFilter(dateVal, timeFilter)
      const matchesStatus = matchesStatusFilter(l.status, statusFilter)
      return matchesTime && matchesStatus
    })
  }, [leaves, timeFilter, statusFilter, isHrPanel])

  const filteredRequests = useMemo(() => {
    if (!isHrPanel) return requests
    return requests.filter(r => {
      const dateVal = r.fromDate || r.createdAt
      const matchesTime = matchesTimeFilter(dateVal, timeFilter)
      const matchesStatus = matchesStatusFilter(r.status, statusFilter)
      return matchesTime && matchesStatus
    })
  }, [requests, timeFilter, statusFilter, isHrPanel])

  const actionToolbar = (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex space-x-1 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl w-fit">
        <button onClick={() => setActiveTab('leave')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'leave' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>Leave History</button>
        <button onClick={() => setActiveTab('request')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'request' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>My Requests</button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {isHrPanel && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-sm">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select 
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
              >
                <option>All Time</option>
                <option>Today</option>
                <option>Yesterday</option>
                <option>This Week</option>
                <option>This Month</option>
                <option>Last 6 Months</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-sm">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2.5">
          <button
            className="bg-violet-600 hover:bg-violet-700 text-white py-2 px-3.5 rounded-lg font-bold text-xs transition-all shadow-[0_0_16px_-5px_rgba(124,58,237,0.5)] flex items-center justify-center shrink-0"
            onClick={() => { setReqError(''); setShowReqForm(true) }}
          >
            New Request
          </button>
          <button
            className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3.5 rounded-lg font-bold text-xs transition-all shadow-[0_0_16px_-5px_rgba(79,70,229,0.5)] flex items-center justify-center shrink-0"
            onClick={() => { setError(''); setShowForm(true) }}
          >
            Apply for Leave
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="animate-fade-in space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400 dark:from-indigo-400 dark:to-indigo-300 hover:scale-[1.02] transition-transform duration-300 relative w-fit pb-2 after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-1/3 after:h-1 after:bg-gradient-to-r after:from-indigo-500 after:to-transparent after:rounded-full">Leave & Requests</h1>
          </div>
        </div>
        {headerAction && (
          <div className="flex items-center gap-3">
            {headerAction}
          </div>
        )}
      </div>

      {activeTab === 'leave' && (
        <div className="space-y-5 animate-fade-in">
          {refreshing && <p className="text-xs font-semibold text-slate-400">Refreshing in background...</p>}
          {actionToolbar}
          {loading ? (
            <p className="text-sm text-slate-400">Loading leaves...</p>
          ) : loadError ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-8 text-center text-sm text-red-500">
              Failed to load leave requests — try refreshing
            </div>
          ) : (
            <DataTable columns={leaveColumns} data={filteredLeaves} pageSize={100} />
          )}
        </div>
      )}

      {activeTab === 'request' && (
        <div className="space-y-5 animate-fade-in">
          {reqRefreshing && <p className="text-xs font-semibold text-slate-400">Refreshing in background...</p>}
          {actionToolbar}
          {reqLoading ? (
            <p className="text-sm text-slate-400">Loading requests...</p>
          ) : (
            <DataTable columns={requestColumns} data={filteredRequests} pageSize={100} />
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
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Leave Type</label>
                  <select required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none" value={form.leaveTypeId} onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}>
                    <option value="" disabled>Select Leave Type</option>
                    {types.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Day Type</label>
                  <select required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none" value={form.dayType} onChange={(e) => setForm({ ...form, dayType: e.target.value })}>
                    <option value="FULL_DAY">Full Day</option>
                    <option value="FIRST_HALF">Half Day - First Half</option>
                    <option value="SECOND_HALF">Half Day - Second Half</option>
                  </select>
                </div>
              </div>
              <div className={`grid ${form.dayType === 'FULL_DAY' ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">{form.dayType === 'FULL_DAY' ? 'Start Date' : 'Date'}</label>
                  <input required type="date" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value, ...(form.dayType !== 'FULL_DAY' && { endDate: e.target.value }) })} />
                </div>
                {form.dayType === 'FULL_DAY' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">End Date</label>
                    <input required type="date" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                  </div>
                )}
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
