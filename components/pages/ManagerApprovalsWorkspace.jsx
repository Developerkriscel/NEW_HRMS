'use client'

import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
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

export function ManagerApprovalsWorkspace({ headerAction, title = 'Approvals', subtitle = 'All pending requests from your direct reports', scope = 'team' }) {
  const [items, setItems] = useState([])
  const [type, setType] = useState('')
  const [requestCategory, setRequestCategory] = useState('LEAVE') // 'LEAVE' or 'OTHER'
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [message, setMessage] = useState('')

  function load() {
    setLoading(true)
    const params = { ...(type && { type }), scope }
    managerApi.getApprovals(params)
      .then((res) => setItems(res.data.data || []))
      .finally(() => setLoading(false))
  }

  useEffect(load, [type])

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
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update approval')
    } finally {
      setSavingId('')
    }
  }

  const columns = [
    { header: 'Type', accessor: 'type', render: (v) => <Badge>{v}</Badge> },
    { header: 'Employee', accessor: 'employee', render: employeeName },
    { header: 'Summary', accessor: 'summary' },
    { header: 'Created', accessor: 'createdAt', render: (v) => formatDate(v) },
    { header: 'Action', key: 'action', sortable: false, render: (_, row) => {
      if (row.status === 'APPROVED' || row.status === 'FORWARDED_TO_HR' || row.status === 'MANAGER_REVIEWED') {
        return <Badge variant="success">Approved</Badge>
      }
      if (row.status === 'REJECTED') {
        return <Badge variant="danger">Rejected</Badge>
      }
      return (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button disabled={savingId === row.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:shadow-sm font-semibold text-xs transition-all duration-300" onClick={() => decide(row, true)}>
            <Check className="w-3.5 h-3.5" /> {row.type === 'RESIGNATION' ? 'Forward' : 'Approve'}
          </button>
          <button disabled={savingId === row.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:shadow-sm font-semibold text-xs transition-all duration-300" onClick={() => decide(row, false)}>
            <X className="w-3.5 h-3.5" /> Reject
          </button>
        </div>
      )
    } },
  ]

  const displayItems = items
    .filter(item => {
      if (requestCategory === 'LEAVE') return item.type === 'LEAVE';
      return item.type !== 'LEAVE';
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
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{title}</h1>
            {headerAction && <div>{headerAction}</div>}
          </div>
          {subtitle && <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{subtitle}</p>}
          
          <div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl w-fit border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl mt-6">
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
        
        {requestCategory === 'OTHER' && (
          <select className="input-field max-w-60 mt-2 sm:mt-12" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All Other Types</option>
            {TYPES.filter(t => t !== 'LEAVE').map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>

      {message && <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>}
      <DataTable columns={columns} data={displayItems} isLoading={loading} searchPlaceholder="Search approvals..." emptyMessage={`No pending ${requestCategory === 'LEAVE' ? 'leave' : 'other'} approvals`} />
    </div>
  )
}
