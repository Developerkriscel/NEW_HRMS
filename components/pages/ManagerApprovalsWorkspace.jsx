'use client'

import { useEffect, useState } from 'react'
import { Eye } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { Portal } from '@/components/common/Portal'
import { DataTable } from '@/components/tables/DataTable'
import { managerApi } from '@/services/managerApi'
import { leaveApi } from '@/services/leaveApi'
import { attendanceApi } from '@/services/attendanceApi'
import { teamRequestApi } from '@/services/teamRequestApi'
import { expenseApi } from '@/services/expenseApi'
import { assetApi } from '@/services/assetApi'
import { resignationApi } from '@/services/resignationApi'
import { kraApi } from '@/services/kraApi'
import { formatDate } from '@/lib/utils'

const TYPES = [
  'LEAVE',
  'ATTENDANCE_REGULARIZATION',
  'SHIFT_CHANGE',
  'OVERTIME',
  'WORK_FROM_HOME',
  'TRAVEL',
  'DOCUMENT',
  'EXPENSE',
  'ASSET_REQUEST',
  'RESIGNATION',
  'KRA_REVIEW',
]

function employeeName(employee) {
  return employee ? `${employee.firstName} ${employee.lastName}` : '-'
}

function LeaveApprovalDrawer({ item, onClose, onDecide, saving }) {
  if (!item) return null

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm" onClick={onClose}>
        <aside className="h-full w-full max-w-lg overflow-y-auto border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950" onClick={(event) => event.stopPropagation()}>
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-6 py-5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{item.type === 'LEAVE' ? 'Leave' : 'Request'} Details</h2>
              <p className="text-sm font-semibold text-slate-500">{employeeName(item.employee)}</p>
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
              x
            </button>
          </div>

          <div className="space-y-5 p-6">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">{item.type === 'LEAVE' ? 'Leave Type' : 'Request Type'}</p>
                  <h3 className="mt-1.5 text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400 dark:from-indigo-400 dark:to-indigo-300 tracking-tight">{item.leaveType || String(item.type).replace(/_/g, ' ')}</h3>
                </div>
                <Badge>{item.status}</Badge>
              </div>
            </div>

            {item.type === 'LEAVE' ? (
              <div className="grid grid-cols-2 gap-3">
                <DetailBox label="Start Date" value={formatDate(item.startDate)} />
                <DetailBox label="End Date" value={formatDate(item.endDate)} />
                <DetailBox label="Total Days" value={`${item.numberOfDays || 0} day(s)`} />
                <DetailBox label="Applied On" value={formatDate(item.createdAt)} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <DetailBox label="Applied On" value={formatDate(item.createdAt)} />
              </div>
            )}

            <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Employee</p>
              <p className="mt-2 text-sm font-bold text-indigo-700 dark:text-indigo-300">{employeeName(item.employee)}</p>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">{item.employee?.employeeCode || '-'}</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Details</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">{item.reason || item.summary || '-'}</p>
            </div>

            {item.halfDay && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">
                Half day request: {String(item.halfDayType || '').replaceAll('_', ' ') || 'Half Day'}
              </div>
            )}
          </div>

          {item.status === 'PENDING' && (
            <div className="sticky bottom-0 grid grid-cols-2 gap-3 border-t border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
              <button disabled={saving === item.id} onClick={() => onDecide(item, false)} className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-extrabold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60">
                Reject
              </button>
              <button disabled={saving === item.id} onClick={() => onDecide(item, true)} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-700 disabled:opacity-60">
                Accept
              </button>
            </div>
          )}
        </aside>
      </div>
    </Portal>
  )
}

function DetailBox({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">{value}</p>
    </div>
  )
}

export function ManagerApprovalsWorkspace({ headerAction, title = 'Approvals', subtitle = 'All pending requests from your direct reports', scope = 'team' }) {
  const [items, setItems] = useState([])
  const [type, setType] = useState('')
  const [requestCategory, setRequestCategory] = useState('LEAVE') // 'LEAVE' or 'OTHER'
  const [statusFilter, setStatusFilter] = useState('ALL')
    const [employeeFilter, setEmployeeFilter] = useState('ALL')
    const [dateRangeFilter, setDateRangeFilter] = useState('ALL')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [savingId, setSavingId] = useState('')
  const [message, setMessage] = useState('')
  const [selectedLeave, setSelectedLeave] = useState(null)

  function load({ silent = false } = {}) {
    if (silent) setRefreshing(true)
    else setLoading(true)
    const params = { ...(type && { type }), scope }
    return managerApi.getApprovals(params)
      .then((res) => setItems(res.data.data || []))
      .finally(() => {
        if (silent) setRefreshing(false)
        else setLoading(false)
      })
  }

  useEffect(() => { load() }, [type])

  async function decide(item, approved) {
    setSavingId(item.id)
    setMessage('')
    try {
      if (item.type === 'LEAVE') {
        if (approved) await leaveApi.approve(item.id, 'Approved by manager')
        else await leaveApi.reject(item.id, 'Rejected by manager')
      } else if (item.type === 'ATTENDANCE_REGULARIZATION') {
        if (approved) await attendanceApi.approveRegularization(item.id)
        else await attendanceApi.rejectRegularization(item.id, 'Rejected by manager')
      } else if (['SHIFT_CHANGE', 'OVERTIME', 'WORK_FROM_HOME', 'TRAVEL', 'DOCUMENT'].includes(item.type)) {
        if (approved) await teamRequestApi.approve(item.id, 'Approved by manager')
        else await teamRequestApi.reject(item.id, 'Rejected by manager')
      } else if (item.type === 'EXPENSE') {
        if (approved) await expenseApi.approve(item.id, 'Approved by manager')
        else await expenseApi.reject(item.id, 'Rejected by manager')
      } else if (item.type === 'ASSET_REQUEST') {
        if (approved) await assetApi.approveRequest(item.id, 'Approved by manager')
        else await assetApi.rejectRequest(item.id, 'Rejected by manager')
      } else if (item.type === 'RESIGNATION') {
        if (approved) {
          await resignationApi.update(item.id, { managerRecommendation: 'Recommended for HR review' })
          await resignationApi.forward(item.id)
        } else {
          await resignationApi.update(item.id, { managerRecommendation: 'Not recommended', managerFinalRemarks: 'Rejected by manager' })
          await resignationApi.forward(item.id)
        }
      } else if (item.type === 'KRA_REVIEW') {
        await kraApi.review(item.id, {
          decision: approved ? 'APPROVE' : 'SEND_BACK',
          managerRemarks: approved ? 'Approved by manager' : 'Sent back by manager',
        })
      }
      setMessage(item.type === 'RESIGNATION'
        ? `Resignation ${approved ? 'recommended' : 'not recommended'} and forwarded to HR`
        : `${item.type.replaceAll('_', ' ')} ${approved ? 'approved' : 'rejected'}`)
      
      setItems(prev => prev.map(i => {
        if (i.id === item.id) {
          return { ...i, status: approved ? (item.type === 'RESIGNATION' ? 'FORWARDED_TO_HR' : 'APPROVED') : 'REJECTED' }
        }
        return i
      }))
      setSelectedLeave((current) => current?.id === item.id
        ? { ...current, status: approved ? (item.type === 'RESIGNATION' ? 'FORWARDED_TO_HR' : 'APPROVED') : 'REJECTED' }
        : current)
      load({ silent: true }).catch(() => {})
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update approval')
    } finally {
      setSavingId('')
    }
  }

  const leaveColumns = [
    { header: 'Employee', accessor: 'employee', render: employeeName },
    { header: 'Leave Type', accessor: 'leaveType', render: (v) => <Badge>{v || 'LEAVE'}</Badge> },
    { header: 'Dates', key: 'dates', sortable: false, render: (_, row) => (
      <div>
        <p className="font-bold text-slate-900 dark:text-slate-100">{formatDate(row.startDate)} - {formatDate(row.endDate)}</p>
        <p className="text-xs font-semibold text-slate-400">{row.numberOfDays} day(s){row.halfDay ? ` - ${String(row.halfDayType || 'Half day').replaceAll('_', ' ')}` : ''}</p>
      </div>
    ) },
    { header: 'Reason', accessor: 'reason', render: (v) => <span className="line-clamp-2 max-w-72">{v || '-'}</span> },
    { header: 'Applied On', accessor: 'createdAt', render: (v) => formatDate(v) },
    { header: 'Action', key: 'action', sortable: false, align: 'right', render: (_, row) => (
      <div className="flex flex-wrap justify-end gap-2" onClick={(e) => e.stopPropagation()}>
        <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900" onClick={() => setSelectedLeave(row)}>
          <Eye className="mr-1 inline h-3.5 w-3.5" /> View
        </button>
        {row.status === 'PENDING' ? (
          <>
            <button disabled={savingId === row.id} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60" onClick={() => decide(row, true)}>Accept</button>
            <button disabled={savingId === row.id} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-extrabold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60" onClick={() => decide(row, false)}>Reject</button>
          </>
        ) : <Badge>{row.status}</Badge>}
      </div>
    ) },
  ]

  const columns = [
    { header: 'Type', accessor: 'type', render: (v) => <Badge>{v}</Badge> },
    { header: 'Employee', accessor: 'employee', render: employeeName },
    { header: 'Summary', accessor: 'summary' },
    { header: 'Created', accessor: 'createdAt', render: (v) => formatDate(v) },
    { header: 'Action', key: 'action', sortable: false, align: 'right', render: (_, row) => {
      let statusBadge = null;
      if (row.status === 'APPROVED' || row.status === 'FORWARDED_TO_HR' || row.status === 'MANAGER_REVIEWED') {
        statusBadge = <Badge variant="success">Approved</Badge>
      } else if (row.status === 'REJECTED') {
        statusBadge = <Badge variant="danger">Rejected</Badge>
      } else if (row.status !== 'PENDING') {
        statusBadge = <Badge>{row.status}</Badge>
      }

      return (
        <div className="flex flex-wrap justify-end gap-2 items-center" onClick={(e) => e.stopPropagation()}>
          <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900" onClick={() => setSelectedLeave(row)}>
            <Eye className="mr-1 inline h-3.5 w-3.5" /> View
          </button>
          {row.status === 'PENDING' ? (
            <>
              <button disabled={savingId === row.id} className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:shadow-sm font-semibold text-xs transition-all duration-300" onClick={() => decide(row, true)}>
                {row.type === 'RESIGNATION' ? 'Forward' : 'Accept'}
              </button>
              <button disabled={savingId === row.id} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 hover:shadow-sm font-semibold text-xs transition-all duration-300" onClick={() => decide(row, false)}>
                Reject
              </button>
            </>
          ) : statusBadge}
        </div>
      )
    } },
  ]

  const uniqueEmployees = Array.from(new Map(
      items.filter(i => i.employee).map(i => [i.employee._id, i.employee])
    ).values())

    const displayItems = items
    .filter(item => {
      if (requestCategory === 'LEAVE') return item.type === 'LEAVE';
      return item.type !== 'LEAVE';
    })
    .filter(item => {
      if (employeeFilter === 'ALL') return true;
      return item.employee?._id === employeeFilter;
    })
    .filter(item => {
      if (dateRangeFilter === 'ALL') return true;
      const dateStr = item.createdAt;
      if (!dateStr) return true;
      const d = new Date(dateStr);
      const now = new Date();
      
      const isSameDay = (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
      
      if (dateRangeFilter === 'TODAY') {
        return isSameDay(d, now);
      }
      
      if (dateRangeFilter === 'THIS_WEEK') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0,0,0,0);
        return d >= startOfWeek;
      }
      
      if (dateRangeFilter === 'LAST_WEEK') {
        const startOfThisWeek = new Date(now);
        startOfThisWeek.setDate(now.getDate() - now.getDay());
        startOfThisWeek.setHours(0,0,0,0);
        const startOfLastWeek = new Date(startOfThisWeek);
        startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);
        return d >= startOfLastWeek && d < startOfThisWeek;
      }

      if (dateRangeFilter === 'THIS_MONTH') {
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }

      if (dateRangeFilter === 'CUSTOM') {
        if (customStartDate && d < new Date(customStartDate)) return false;
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          if (d > end) return false;
        }
        return true;
      }

      if (dateRangeFilter === 'LAST_MONTH') {
        let lastMonth = now.getMonth() - 1;
        let year = now.getFullYear();
        if (lastMonth < 0) {
          lastMonth = 11;
          year--;
        }
        return d.getFullYear() === year && d.getMonth() === lastMonth;
      }

      return true;
    })
    .filter(item => {
      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'PENDING') return item.status === 'PENDING' || item.status === 'SUBMITTED';
      if (statusFilter === 'APPROVED') return item.status === 'APPROVED' || item.status === 'FORWARDED_TO_HR' || item.status === 'MANAGER_REVIEWED';
      if (statusFilter === 'REJECTED') return item.status === 'REJECTED';
      return true;
    })
    .sort((a, b) => {
      const aProcessed = ['APPROVED', 'REJECTED', 'FORWARDED_TO_HR', 'MANAGER_REVIEWED'].includes(a.status) && !(a.type === 'RESIGNATION' && a.status === 'MANAGER_REVIEWED');
      const bProcessed = ['APPROVED', 'REJECTED', 'FORWARDED_TO_HR', 'MANAGER_REVIEWED'].includes(b.status) && !(b.type === 'RESIGNATION' && b.status === 'MANAGER_REVIEWED');
      if (aProcessed && !bProcessed) return 1;
      if (!aProcessed && bProcessed) return -1;
      return 0;
    });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400 dark:from-indigo-400 dark:to-indigo-300 hover:scale-[1.02] transition-transform duration-300 relative w-fit pb-2 after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-1/3 after:h-1 after:bg-gradient-to-r after:from-indigo-500 after:to-transparent after:rounded-full">{title}</h1>
          </div>
          {subtitle && <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{subtitle}</p>}
          
          <div className="inline-flex bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl w-fit border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl mt-6">
            <button
              onClick={() => { setRequestCategory('LEAVE'); setType(''); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 ${
                requestCategory === 'LEAVE'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
              }`}
            >
              Leave Approvals
            </button>
            <button
              onClick={() => { setRequestCategory('OTHER'); setType(''); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 ${
                requestCategory === 'OTHER'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
              }`}
            >
              Other Requests
            </button>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-4">
          {headerAction && <div>{headerAction}</div>}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center mt-2 sm:mt-0">
            <select className="input-field max-w-40" value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}>
              <option value="ALL">All Employees</option>
              {uniqueEmployees.map(e => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}
            </select>
            <select className="input-field max-w-40" value={dateRangeFilter} onChange={(e) => setDateRangeFilter(e.target.value)}>
              <option value="ALL">All History</option>
              <option value="TODAY">Today</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="LAST_WEEK">Last Week</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="LAST_MONTH">Last Month</option>
              <option value="CUSTOM">Custom</option>
            </select>
            {dateRangeFilter === 'CUSTOM' && (
              <div className="flex gap-2 items-center">
                <input type="date" className="input-field w-[140px]" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
                <input type="date" className="input-field w-[140px]" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
              </div>
            )}
            <select className="input-field max-w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            {requestCategory === 'OTHER' && (
              <select className="input-field max-w-60" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">All Other Types</option>
                {TYPES.filter(t => t !== 'LEAVE').map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      {message && <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>}
      {refreshing && <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Refreshing in background...</p>}
      <DataTable pageSize={50} columns={requestCategory === 'LEAVE' ? leaveColumns : columns} data={displayItems} isLoading={loading} searchPlaceholder="Search approvals..." emptyMessage={`No pending ${requestCategory === 'LEAVE' ? 'leave' : 'other'} approvals`} />
      <LeaveApprovalDrawer item={selectedLeave} onClose={() => setSelectedLeave(null)} onDecide={decide} saving={savingId} />
    </div>
  )
}
