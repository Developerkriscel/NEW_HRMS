'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Plus, Eye, Pencil, PlayCircle, PauseCircle, XCircle, RotateCcw, Copy, ChevronLeft, ChevronRight, Briefcase,
} from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { jobApi } from '@/services/jobApi'
import { departmentApi, branchApi } from '@/services/departmentApi'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { cn, formatDate } from '@/lib/utils'
import {
  JOB_STATUS_LIST, JOB_STATUS_LABELS, JOB_EMPLOYMENT_TYPE_LIST, JOB_EMPLOYMENT_TYPE_LABELS,
  WORK_MODE_LIST, WORK_MODE_LABELS, getAvailableJobActions,
} from '@/lib/jobConstants'

const PAGE_SIZE = 10

const ACTION_META = {
  view: { label: 'View', icon: Eye },
  edit: { label: 'Edit', icon: Pencil },
  open: { label: 'Open', icon: PlayCircle },
  pause: { label: 'Pause', icon: PauseCircle },
  reopen: { label: 'Reopen', icon: RotateCcw },
  close: { label: 'Close', icon: XCircle },
  cancel: { label: 'Cancel', icon: XCircle },
  duplicate: { label: 'Duplicate', icon: Copy },
}

export function JobsListPage() {
  const user = useAuthStore((s) => s.user)
  const addNotification = useUIStore((s) => s.addNotification)
  const session = useMemo(() => (user ? { role: user.role, userId: user.id, permissions: user.permissions || [] } : null), [user])
  const canCreate = user && ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'].includes(user.role)

  const [rows, setRows] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [departments, setDepartments] = useState([])
  const [locations, setLocations] = useState([])
  const [employees, setEmployees] = useState([])
  const [busyId, setBusyId] = useState(null)
  const [dialog, setDialog] = useState(null) // { type, job }

  const [filters, setFilters] = useState({
    status: '', department: '', location: '', recruiter: '', hiringManager: '',
    employmentType: '', workMode: '', dateFrom: '', dateTo: '',
  })
  const hasActiveFilters = Object.values(filters).some(Boolean)

  useEffect(() => {
    departmentApi.getAll().then((res) => setDepartments(res.data.data || [])).catch(() => {})
    branchApi.getAll().then((res) => setLocations(res.data.data || [])).catch(() => {})
    jobApi.getEmployees().then((res) => setEmployees(res.data.data || [])).catch(() => {})
  }, [])

  function load() {
    setLoading(true)
    const params = { page, size: PAGE_SIZE }
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v })
    jobApi.list(params)
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
    setFilters({ status: '', department: '', location: '', recruiter: '', hiringManager: '', employmentType: '', workMode: '', dateFrom: '', dateTo: '' })
  }

  async function runAction(type, job, extra) {
    setBusyId(job._id)
    try {
      if (type === 'open') { await jobApi.open(job._id); addNotification({ title: 'Job opened', message: `${job.jobCode} is now live`, type: 'success' }) }
      else if (type === 'pause') { await jobApi.pause(job._id, extra); addNotification({ title: 'Job paused', message: `${job.jobCode} was paused`, type: 'info' }) }
      else if (type === 'reopen') { await jobApi.reopen(job._id); addNotification({ title: 'Job reopened', message: `${job.jobCode} is open again`, type: 'success' }) }
      else if (type === 'close') { await jobApi.close(job._id, extra); addNotification({ title: 'Job closed', message: `${job.jobCode} was closed`, type: 'info' }) }
      else if (type === 'cancel') { await jobApi.cancel(job._id, extra); addNotification({ title: 'Job cancelled', message: `${job.jobCode} was cancelled`, type: 'warning' }) }
      else if (type === 'duplicate') { await jobApi.duplicate(job._id); addNotification({ title: 'Job duplicated', message: `A draft copy of ${job.jobCode} was created`, type: 'info' }) }
      setDialog(null)
      load()
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed')
    } finally {
      setBusyId(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE))

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Open Positions</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Job openings converted from approved requisitions, ready to review and publish internally.</p>
        </div>
        {canCreate && (
          <Link href="/hr/recruitment/jobs/new" className="btn-primary">
            <Plus className="w-4 h-4" /> Create Job
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="stat-card !p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Status</span>
            <select className="input-field" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
              <option value="">All statuses</option>
              {JOB_STATUS_LIST.map((s) => <option key={s} value={s}>{JOB_STATUS_LABELS[s]}</option>)}
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
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Location</span>
            <select className="input-field" value={filters.location} onChange={(e) => updateFilter('location', e.target.value)}>
              <option value="">All locations</option>
              {locations.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Recruiter</span>
            <select className="input-field" value={filters.recruiter} onChange={(e) => updateFilter('recruiter', e.target.value)}>
              <option value="">Anyone</option>
              {employees.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Hiring Manager</span>
            <select className="input-field" value={filters.hiringManager} onChange={(e) => updateFilter('hiringManager', e.target.value)}>
              <option value="">Anyone</option>
              {employees.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Employment Type</span>
            <select className="input-field" value={filters.employmentType} onChange={(e) => updateFilter('employmentType', e.target.value)}>
              <option value="">All types</option>
              {JOB_EMPLOYMENT_TYPE_LIST.map((t) => <option key={t} value={t}>{JOB_EMPLOYMENT_TYPE_LABELS[t]}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Work Mode</span>
            <select className="input-field" value={filters.workMode} onChange={(e) => updateFilter('workMode', e.target.value)}>
              <option value="">All modes</option>
              {WORK_MODE_LIST.map((w) => <option key={w} value={w}>{WORK_MODE_LABELS[w]}</option>)}
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
              <Briefcase className="w-6 h-6 text-slate-400" />
            </div>
            {hasActiveFilters ? (
              <p className="text-sm text-slate-400">No job openings match these filters</p>
            ) : (
              <>
                <p className="text-slate-600 dark:text-slate-300 font-medium">No open positions yet.</p>
                <p className="text-sm text-slate-400 max-w-sm">Approved job requisitions can be converted into hiring positions.</p>
                <div className="flex gap-2 mt-2">
                  <Link href="/hr/recruitment/requisitions?status=APPROVED" className="btn-secondary">View Approved Requisitions</Link>
                  {canCreate && <Link href="/hr/recruitment/jobs/new" className="btn-primary"><Plus className="w-4 h-4" /> Create Job</Link>}
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="data-table [&_th]:!px-2.5 [&_td]:!px-2.5 [&_th]:!py-2.5 [&_td]:!py-2.5">
                <thead>
                  <tr>
                    <th>Job ID</th>
                    <th>Job Title</th>
                    <th>Dept</th>
                    <th>Openings</th>
                    <th>Applied</th>
                    <th>Recruiter</th>
                    <th>Published</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((j) => {
                    const actions = session ? getAvailableJobActions(j, session) : ['view']
                    return (
                      <tr key={j._id}>
                        <td className="whitespace-nowrap font-medium text-slate-700 dark:text-slate-200">{j.jobCode}</td>
                        <td className="max-w-[160px] truncate" title={j.jobTitle}>{j.jobTitle}</td>
                        <td className="max-w-[100px] truncate" title={j.department?.name}>{j.department?.name || '—'}</td>
                        <td className="whitespace-nowrap">{j.totalOpenings}</td>
                        <td className="whitespace-nowrap text-slate-400">0</td>
                        <td className="max-w-[100px] truncate" title={j.recruiter ? `${j.recruiter.firstName} ${j.recruiter.lastName}` : ''}>
                          {j.recruiter ? `${j.recruiter.firstName} ${j.recruiter.lastName}` : '—'}
                        </td>
                        <td className="whitespace-nowrap text-slate-400" title="External publishing arrives in Step 4">Not Published</td>
                        <td className="whitespace-nowrap"><Badge>{j.status}</Badge></td>
                        <td>
                          <div className="flex gap-0.5">
                            {actions.map((action) => {
                              const meta = ACTION_META[action]
                              if (!meta) return null
                              if (action === 'view') {
                                return (
                                  <Link key={action} href={`/hr/recruitment/jobs/${j._id}`} title="View" className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                    <meta.icon className="w-3.5 h-3.5" />
                                  </Link>
                                )
                              }
                              if (action === 'edit') {
                                return (
                                  <Link key={action} href={`/hr/recruitment/jobs/${j._id}/edit`} title="Edit" className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                    <meta.icon className="w-3.5 h-3.5" />
                                  </Link>
                                )
                              }
                              if (action === 'duplicate') {
                                return (
                                  <button key={action} type="button" title="Duplicate" disabled={busyId === j._id} onClick={() => runAction('duplicate', j)} className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-40">
                                    <meta.icon className="w-3.5 h-3.5" />
                                  </button>
                                )
                              }
                              const needsConfirm = action === 'pause' || action === 'close' || action === 'cancel'
                              return (
                                <button
                                  key={action}
                                  type="button"
                                  title={meta.label}
                                  disabled={busyId === j._id}
                                  onClick={() => (needsConfirm ? setDialog({ type: action, job: j }) : runAction(action, j))}
                                  className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-40"
                                >
                                  <meta.icon className="w-3.5 h-3.5" />
                                </button>
                              )
                            })}
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

      {dialog?.type === 'pause' && (
        <ConfirmDialog open title="Pause this job opening?" description={`${dialog.job.jobCode} — ${dialog.job.jobTitle}`} requireReason={false} confirmLabel="Pause" variant="default" loading={busyId === dialog.job._id} onConfirm={() => runAction('pause', dialog.job)} onClose={() => setDialog(null)} />
      )}
      {dialog?.type === 'close' && (
        <ConfirmDialog open title="Close this job opening?" description={`${dialog.job.jobCode} — ${dialog.job.jobTitle}. Hiring stops manually; this is different from Cancel.`} requireReason={false} confirmLabel="Close" variant="danger" loading={busyId === dialog.job._id} onConfirm={() => runAction('close', dialog.job)} onClose={() => setDialog(null)} />
      )}
      {dialog?.type === 'cancel' && (
        <ConfirmDialog open title="Cancel this job opening?" description={`${dialog.job.jobCode} — ${dialog.job.jobTitle}. Use this when the requirement no longer exists.`} requireReason={false} confirmLabel="Cancel Job" variant="danger" loading={busyId === dialog.job._id} onConfirm={() => runAction('cancel', dialog.job)} onClose={() => setDialog(null)} />
      )}
    </div>
  )
}
