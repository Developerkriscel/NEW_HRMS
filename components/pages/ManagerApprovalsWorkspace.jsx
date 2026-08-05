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

export function ManagerApprovalsWorkspace() {
  const [items, setItems] = useState([])
  const [type, setType] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [message, setMessage] = useState('')

  function load() {
    setLoading(true)
    const params = type ? { type } : undefined
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
      load()
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
    { header: 'Action', key: 'action', sortable: false, render: (_, row) => (
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        <button disabled={savingId === row.id} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100" onClick={() => decide(row, true)} title={row.type === 'RESIGNATION' ? 'Forward to HR' : 'Approve'}>
          <Check className="w-4 h-4" />
        </button>
        <button disabled={savingId === row.id} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" onClick={() => decide(row, false)} title="Reject">
          <X className="w-4 h-4" />
        </button>
      </div>
    ) },
  ]

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Approvals</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">All pending requests from your direct reports</p>
        </div>
        <select className="input-field max-w-60" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All Types</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {message && <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>}
      <DataTable columns={columns} data={items} isLoading={loading} searchPlaceholder="Search approvals..." emptyMessage="No pending approvals" />
    </div>
  )
}
