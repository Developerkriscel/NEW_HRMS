'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Plus, Eye, Pencil, Send, Check, X, Ban, ChevronLeft, ChevronRight, FileStack, MoreHorizontal,
} from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { requisitionApi } from '@/services/requisitionApi'
import { departmentApi } from '@/services/departmentApi'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { cn, formatDate } from '@/lib/utils'
import {
  REQUISITION_STATUS_LIST, REQUISITION_STATUS_LABELS,
  PRIORITY_LIST, PRIORITY_LABELS, getAvailableActions,
} from '@/lib/recruitmentConstants'

const PRIORITY_DOT = { LOW: 'bg-slate-400', MEDIUM: 'bg-blue-500', HIGH: 'bg-amber-500', URGENT: 'bg-red-500' }
const PAGE_SIZE = 10

const ACTION_META = {
  view: { label: 'View', icon: Eye },
  edit: { label: 'Edit', icon: Pencil },
  submit: { label: 'Submit', icon: Send },
  approve: { label: 'Approve', icon: Check },
  reject: { label: 'Reject', icon: X },
  cancel: { label: 'Cancel', icon: Ban },
}

export function RequisitionsListPage() {
  const user = useAuthStore((s) => s.user)
  const addNotification = useUIStore((s) => s.addNotification)
  const session = useMemo(() => (user ? { role: user.role, userId: user.id, permissions: user.permissions || [] } : null), [user])

  const [rows, setRows] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [departments, setDepartments] = useState([])
  const [employees, setEmployees] = useState([])
  const [busyId, setBusyId] = useState(null)
  const [dialog, setDialog] = useState(null) // { type: 'reject'|'cancel'|'approve'|'submit', requisition }
  const [approveComment, setApproveComment] = useState('')

  const [filters, setFilters] = useState({ status: '', department: '', requestedBy: '', priority: '', dateFrom: '', dateTo: '' })
  const hasActiveFilters = Object.values(filters).some(Boolean)

  useEffect(() => {
    departmentApi.getAll().then((res) => setDepartments(res.data.data || [])).catch(() => {})
    requisitionApi.getEmployees().then((res) => setEmployees(res.data.data || [])).catch(() => {})
  }, [])

  function load() {
    setLoading(true)
    const params = { page, size: PAGE_SIZE }
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v })
    requisitionApi.list(params)
      .then((res) => {
        setRows(res.data.data.content || [])
        setTotalElements(res.data.data.totalElements || 0)
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [page, filters])

  function updateFilter(key, val) {
    setPage(0)
    setFilters((f) => ({ ...f, [key]: val }))
  }

  function clearFilters() {
    setPage(0)
    setFilters({ status: '', department: '', requestedBy: '', priority: '', dateFrom: '', dateTo: '' })
  }

  async function runAction(type, requisition, extra) {
    setBusyId(requisition._id)
    try {
      if (type === 'submit') {
        await requisitionApi.submit(requisition._id)
        addNotification({ title: 'Submitted for approval', message: `${requisition.requisitionCode} is now awaiting approval`, type: 'info' })
      } else if (type === 'approve') {
        await requisitionApi.approve(requisition._id, extra)
        addNotification({ title: 'Requisition approved', message: `${requisition.requisitionCode} has been approved`, type: 'success' })
      } else if (type === 'reject') {
        await requisitionApi.reject(requisition._id, extra)
        addNotification({ title: 'Requisition rejected', message: `${requisition.requisitionCode} was rejected — ${extra}`, type: 'warning' })
      } else if (type === 'cancel') {
        await requisitionApi.cancel(requisition._id, extra)
        addNotification({ title: 'Requisition cancelled', message: `${requisition.requisitionCode} was cancelled`, type: 'info' })
      }
      setDialog(null)
      setApproveComment('')
      load()
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed')
    } finally {
      setBusyId(null)
    }
  }

  function handleActionClick(action, requisition) {
    setDialog({ type: action, requisition })
  }

  const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE))

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Job Requisitions</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Hiring requests waiting for — or already through — approval.</p>
        </div>
        <Link href="/hr/recruitment/requisitions/new" className="btn-primary">
          <Plus className="w-4 h-4" /> Create Requisition
        </Link>
      </div>

      {/* Filters */}
      <div className="stat-card !p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Status</span>
            <select className="input-field" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
              <option value="">All statuses</option>
              {REQUISITION_STATUS_LIST.map((s) => <option key={s} value={s}>{REQUISITION_STATUS_LABELS[s]}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Department</span>
            <select className="input-field" value={filters.department} onChange={(e) => updateFilter('department', e.target.value)}>
              <option value="">All departments</option>
              {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Requested By</span>
            <select className="input-field" value={filters.requestedBy} onChange={(e) => updateFilter('requestedBy', e.target.value)}>
              <option value="">Anyone</option>
              {employees.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Priority</span>
            <select className="input-field" value={filters.priority} onChange={(e) => updateFilter('priority', e.target.value)}>
              <option value="">All priorities</option>
              {PRIORITY_LIST.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">From</span>
              <input type="date" className="input-field" value={filters.dateFrom} onChange={(e) => updateFilter('dateFrom', e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">To</span>
              <input type="date" className="input-field" value={filters.dateTo} onChange={(e) => updateFilter('dateTo', e.target.value)} />
            </label>
          </div>
        </div>
        {hasActiveFilters && (
          <div className="flex justify-end mt-3">
            <button type="button" onClick={clearFilters} className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <PageLoader />
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center px-6">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <FileStack className="w-6 h-6 text-slate-400" />
            </div>
            {hasActiveFilters ? (
              <p className="text-sm text-slate-400">No requisitions match these filters</p>
            ) : (
              <>
                <p className="text-slate-600 dark:text-slate-300 font-medium">No job requisitions yet.</p>
                <p className="text-sm text-slate-400 max-w-sm">Create a hiring request to start your recruitment process.</p>
                <Link href="/hr/recruitment/requisitions/new" className="btn-primary mt-2">
                  <Plus className="w-4 h-4" /> Create Requisition
                </Link>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              {/* Denser padding than the shared .data-table default — 10 columns plus
                  an actions cluster don't fit a normal viewport otherwise, and the
                  Action buttons are how most of this page gets used, so they can't
                  be the ones left off-screen. */}
              <table className="data-table [&_th]:!px-2 [&_td]:!px-2 [&_th]:!py-2.5 [&_td]:!py-2.5">
                <thead>
                  <tr>
                    <th>Requisition ID</th>
                    <th>Job Title</th>
                    <th>Department</th>
                    <th>Openings</th>
                    <th>Requested By</th>
                    <th>Priority</th>
                    <th>Expected Joining</th>
                    <th>Status</th>
                    <th>Created Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const actions = session ? getAvailableActions(r, session) : ['view']
                    return (
                      <tr key={r._id}>
                        <td className="whitespace-nowrap font-medium text-slate-700 dark:text-slate-200">{r.requisitionCode}</td>
                        <td className="max-w-[140px] truncate" title={r.jobTitle}>{r.jobTitle}</td>
                        <td className="max-w-[110px] truncate" title={r.department?.name}>{r.department?.name || '—'}</td>
                        <td className="whitespace-nowrap">{r.openings}</td>
                        <td className="max-w-[100px] truncate" title={r.requestedBy ? `${r.requestedBy.firstName} ${r.requestedBy.lastName}` : ''}>
                          {r.requestedBy ? `${r.requestedBy.firstName} ${r.requestedBy.lastName[0]}.` : '—'}
                        </td>
                        <td className="whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <span className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_DOT[r.priority])} />
                            {PRIORITY_LABELS[r.priority] || r.priority}
                          </span>
                        </td>
                        <td className="whitespace-nowrap">{r.expectedJoiningDate ? formatDate(r.expectedJoiningDate, 'dd MMM yy') : '—'}</td>
                        <td className="whitespace-nowrap"><Badge>{r.status}</Badge></td>
                        <td className="whitespace-nowrap">{formatDate(r.createdAt, 'dd MMM yy')}</td>
                        <td>
                          <div className="flex gap-0.5">
                            {actions.filter((a) => a !== 'createJob').map((action) => {
                              const meta = ACTION_META[action]
                              if (!meta) return null
                              if (action === 'view') {
                                return (
                                  <Link key={action} href={`/hr/recruitment/requisitions/${r._id}`} title="View" className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                    <meta.icon className="w-3.5 h-3.5" />
                                  </Link>
                                )
                              }
                              if (action === 'edit') {
                                return (
                                  <Link key={action} href={`/hr/recruitment/requisitions/${r._id}/edit`} title="Edit" className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                    <meta.icon className="w-3.5 h-3.5" />
                                  </Link>
                                )
                              }
                              return (
                                <button
                                  key={action}
                                  type="button"
                                  title={meta.label}
                                  disabled={busyId === r._id}
                                  onClick={() => handleActionClick(action, r)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-40"
                                >
                                  <meta.icon className="w-3.5 h-3.5" />
                                </button>
                              )
                            })}
                            {actions.length <= 1 && <MoreHorizontal className="w-3.5 h-3.5 text-slate-200 dark:text-slate-700" />}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm text-slate-500">
              <span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalElements)} of {totalElements}</span>
              <div className="flex gap-1">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1.5 text-xs">{page + 1} / {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {dialog?.type === 'submit' && (
        <ConfirmDialog
          open
          title="Submit for approval?"
          description={`${dialog.requisition.requisitionCode} will be sent for approval and can no longer be freely edited.`}
          requireReason={false}
          confirmLabel="Submit"
          variant="default"
          loading={busyId === dialog.requisition._id}
          onConfirm={() => runAction('submit', dialog.requisition)}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.type === 'approve' && (
        <ConfirmDialog
          open
          title="Approve this requisition?"
          description={`${dialog.requisition.requisitionCode} — ${dialog.requisition.jobTitle}`}
          requireReason={false}
          confirmLabel="Approve"
          variant="default"
          loading={busyId === dialog.requisition._id}
          onConfirm={() => runAction('approve', dialog.requisition, approveComment.trim())}
          onClose={() => { setDialog(null); setApproveComment('') }}
        >
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Approval comment (optional)</span>
            <textarea className="input-field min-h-20 resize-none" value={approveComment} onChange={(e) => setApproveComment(e.target.value)} placeholder="Any notes for the record..." />
          </label>
        </ConfirmDialog>
      )}

      {dialog?.type === 'reject' && (
        <ConfirmDialog
          open
          title="Reject this requisition?"
          description={`${dialog.requisition.requisitionCode} — ${dialog.requisition.jobTitle}`}
          requireReason
          confirmLabel="Reject"
          variant="danger"
          loading={busyId === dialog.requisition._id}
          onConfirm={(reason) => runAction('reject', dialog.requisition, reason)}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.type === 'cancel' && (
        <ConfirmDialog
          open
          title="Cancel this requisition?"
          description={`${dialog.requisition.requisitionCode} — ${dialog.requisition.jobTitle}`}
          requireReason={false}
          confirmLabel="Cancel Requisition"
          variant="danger"
          loading={busyId === dialog.requisition._id}
          onConfirm={() => runAction('cancel', dialog.requisition)}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}
