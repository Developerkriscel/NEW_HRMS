'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Briefcase, Building2, CalendarDays, CheckCircle2, ClipboardCheck, Clock, Eye, FileText, Mail, Phone, UserCheck, UserMinus, X } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { Portal } from '@/components/common/Portal'
import { DataTable } from '@/components/tables/DataTable'
import { resignationApi } from '@/services/resignationApi'
import { employeeApi } from '@/services/employeeApi'
import { formatDate } from '@/lib/utils'

const STATUSES = ['SUBMITTED', 'MANAGER_REVIEWED', 'FORWARDED_TO_HR', 'APPROVED', 'REJECTED']
const FINAL_STATUSES = ['APPROVED', 'REJECTED']

function employeeName(employee) {
  return [employee?.firstName, employee?.lastName].filter(Boolean).join(' ').trim() || 'Employee'
}

function noticeDays(row) {
  if (!row?.resignationDate || !row?.lastWorkingDate) return '-'
  const start = new Date(row.resignationDate)
  const end = new Date(row.lastWorkingDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '-'
  return `${Math.max(0, Math.ceil((end - start) / 86400000))} days`
}

function handoverProgress(row) {
  if (!row.handoverEmployee) {
    return { done: 0, total: 0, confirmed: 0, confirmationTotal: 3, label: 'Not assigned' }
  }
  const checklist = Array.isArray(row?.handoverChecklist) ? row.handoverChecklist : []
  const done = checklist.filter((item) => item.done).length
  const total = checklist.length
  const confirmations = [
    row?.pendingTasksReviewed,
    row?.workHandoverConfirmed,
    row?.projectHandoverConfirmed,
  ]
  const confirmed = confirmations.filter(Boolean).length
  return {
    done,
    total,
    confirmed,
    confirmationTotal: confirmations.length,
    label: total ? `${done}/${total} checklist` : `${confirmed}/${confirmations.length} confirmations`,
  }
}

function statusTone(status) {
  if (status === 'APPROVED') return 'text-emerald-700 bg-emerald-50 border-emerald-200'
  if (status === 'REJECTED') return 'text-rose-700 bg-rose-50 border-rose-200'
  if (status === 'FORWARDED_TO_HR') return 'text-blue-700 bg-blue-50 border-blue-200'
  if (status === 'MANAGER_REVIEWED') return 'text-amber-700 bg-amber-50 border-amber-200'
  return 'text-slate-700 bg-slate-50 border-slate-200'
}

function OffboardingDetailDrawer({ row, onClose, onDecision, onUpdate, saving }) {
  const [isEditingHandover, setIsEditingHandover] = useState(false)
  const [employees, setEmployees] = useState([])
  const [handoverForm, setHandoverForm] = useState({
    handoverEmployeeId: row?.handoverEmployee?._id || '',
    pendingTasksReviewed: row?.pendingTasksReviewed || false,
    workHandoverConfirmed: row?.workHandoverConfirmed || false,
    projectHandoverConfirmed: row?.projectHandoverConfirmed || false,
  })
  const [savingHandover, setSavingHandover] = useState(false)

  useEffect(() => {
    if (isEditingHandover && employees.length === 0) {
      employeeApi.getAll({ size: 100, status: 'ACTIVE' }).then(res => setEmployees(res.data.data?.content || []))
    }
  }, [isEditingHandover, employees.length])

  if (!row) return null

  const employee = row.employee || {}
  const handover = row.handoverEmployee
  const progress = handoverProgress(row)
  const canDecide = !FINAL_STATUSES.includes(row.status)

  async function handleSaveHandover() {
    setSavingHandover(true)
    try {
      await resignationApi.update(row._id, handoverForm)
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Failed to update handover')
    } finally {
      setSavingHandover(false)
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
        <aside
          className="h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl animate-in slide-in-from-right duration-300 dark:border-slate-800 dark:bg-slate-950"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-6 py-5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <UserMinus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Offboarding Details</h2>
                <p className="text-xs font-semibold text-slate-500">{employee.employeeCode || 'Employee'} resignation workflow</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-6 p-6">
            <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-600 text-2xl font-black text-white shadow-lg shadow-blue-500/25">
                    {employeeName(employee).charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">{employeeName(employee)}</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{employee.designation?.name || 'No designation'} - {employee.department?.name || 'No department'}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                      {employee.email && <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"><Mail className="h-3.5 w-3.5" /> {employee.email}</span>}
                      {employee.phone && <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"><Phone className="h-3.5 w-3.5" /> {employee.phone}</span>}
                    </div>
                  </div>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusTone(row.status)}`}>{row.status}</span>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3">
              {[
                { label: 'Resignation Date', value: formatDate(row.resignationDate), icon: CalendarDays },
                { label: 'Last Working Date', value: formatDate(row.lastWorkingDate), icon: Clock },
                { label: 'Notice Period', value: noticeDays(row), icon: AlertTriangle },
                { label: 'Submitted On', value: formatDate(row.createdAt), icon: FileText },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500 dark:bg-slate-800">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{item.label}</p>
                  <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">{item.value}</p>
                </div>
              ))}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
                <Briefcase className="h-4 w-4 text-blue-600" /> Employment Snapshot
              </h3>
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between gap-4"><span className="font-semibold text-slate-500">Department</span><span className="font-bold text-slate-900 dark:text-white">{employee.department?.name || '-'}</span></div>
                <div className="flex justify-between gap-4"><span className="font-semibold text-slate-500">Designation</span><span className="font-bold text-slate-900 dark:text-white">{employee.designation?.name || '-'}</span></div>
                <div className="flex justify-between gap-4"><span className="font-semibold text-slate-500">Branch</span><span className="font-bold text-slate-900 dark:text-white">{employee.branch?.name || employee.branch?.city || '-'}</span></div>
                <div className="flex justify-between gap-4"><span className="font-semibold text-slate-500">Manager</span><span className="font-bold text-slate-900 dark:text-white">{employeeName(employee.reportingManager)}</span></div>
                <div className="flex justify-between gap-4"><span className="font-semibold text-slate-500">Joining Date</span><span className="font-bold text-slate-900 dark:text-white">{formatDate(employee.joiningDate)}</span></div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
                  <ClipboardCheck className="h-4 w-4 text-emerald-600" /> Handover & Clearance
                </h3>
                {canDecide && !isEditingHandover && (
                  <button onClick={() => setIsEditingHandover(true)} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">Manage Handover</button>
                )}
              </div>
              
              {isEditingHandover ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">Handover Employee</label>
                    <select className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800" value={handoverForm.handoverEmployeeId} onChange={e => setHandoverForm(f => ({ ...f, handoverEmployeeId: e.target.value }))}>
                      <option value="">-- Unassigned --</option>
                      {employees.map(emp => (
                        <option key={emp._id} value={emp._id}>{employeeName(emp)} ({emp.employeeCode})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3">
                      <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" checked={handoverForm.pendingTasksReviewed} onChange={e => setHandoverForm(f => ({ ...f, pendingTasksReviewed: e.target.checked }))} />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Pending Tasks Reviewed</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" checked={handoverForm.workHandoverConfirmed} onChange={e => setHandoverForm(f => ({ ...f, workHandoverConfirmed: e.target.checked }))} />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Work Handover Confirmed</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" checked={handoverForm.projectHandoverConfirmed} onChange={e => setHandoverForm(f => ({ ...f, projectHandoverConfirmed: e.target.checked }))} />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Project Handover Confirmed</span>
                    </label>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => setIsEditingHandover(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400">Cancel</button>
                    <button onClick={handleSaveHandover} disabled={savingHandover} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60">{savingHandover ? 'Saving...' : 'Save Changes'}</button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 text-sm">
                  <div className="flex justify-between gap-4"><span className="font-semibold text-slate-500">Handover To</span><span className="font-bold text-slate-900 dark:text-white">{handover ? `${employeeName(handover)} (${handover.employeeCode || 'Employee'})` : '-'}</span></div>
                  <div className="flex justify-between gap-4"><span className="font-semibold text-slate-500">Checklist</span><span className="font-bold text-slate-900 dark:text-white">{progress.label}</span></div>
                  <div className="flex justify-between gap-4"><span className="font-semibold text-slate-500">Pending Tasks Reviewed</span><span className="font-bold text-slate-900 dark:text-white">{row.pendingTasksReviewed ? 'Yes' : 'No'}</span></div>
                  <div className="flex justify-between gap-4"><span className="font-semibold text-slate-500">Work Handover</span><span className="font-bold text-slate-900 dark:text-white">{row.workHandoverConfirmed ? 'Confirmed' : 'Pending'}</span></div>
                  <div className="flex justify-between gap-4"><span className="font-semibold text-slate-500">Project Handover</span><span className="font-bold text-slate-900 dark:text-white">{row.projectHandoverConfirmed ? 'Confirmed' : 'Pending'}</span></div>
                </div>
              )}

              {Array.isArray(row.handoverChecklist) && row.handoverChecklist.length > 0 && (
                <div className="mt-4 space-y-2">
                  {row.handoverChecklist.map((item, index) => (
                    <div key={`${item.item}-${index}`} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800/50">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{item.item}</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-black ${item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {item.done ? 'Done' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
                <FileText className="h-4 w-4 text-purple-600" /> Decision Notes
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Resignation Reason</p>
                  <p className="mt-1 rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-700 dark:bg-slate-800/50 dark:text-slate-200">{row.reason || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Manager Recommendation</p>
                  <p className="mt-1 rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-700 dark:bg-slate-800/50 dark:text-slate-200">{row.managerRecommendation || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Final Remarks / HR Decision</p>
                  <p className="mt-1 rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-700 dark:bg-slate-800/50 dark:text-slate-200">{row.managerFinalRemarks || row.hrDecision || '-'}</p>
                </div>
              </div>
            </section>
          </div>

          {canDecide && (
            <div className="sticky bottom-0 border-t border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
              <div className="grid grid-cols-2 gap-3">
                <button disabled={saving} onClick={() => onDecision(row, 'REJECTED')} className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-extrabold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60">
                  Reject
                </button>
                <button disabled={saving} onClick={() => onDecision(row, 'APPROVED')} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-700 disabled:opacity-60">
                  Approve Exit
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </Portal>
  )
}

export function OffboardingWorkspace() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState(null)

  function load() {
    setLoading(true)
    const params = { size: 100 }
    if (status) params.status = status
    resignationApi.list(params)
      .then((res) => setItems(res.data.data.content || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [status])

  async function decide(row, decision) {
    setSaving(true)
    setMessage('')
    try {
      await resignationApi.update(row._id, {
        hrDecision: decision,
        hrDecisionNote: decision === 'APPROVED' ? 'Approved by HR' : 'Rejected by HR',
      })
      setMessage(`Resignation ${decision.toLowerCase()}`)
      setSelected(null)
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update resignation')
    } finally {
      setSaving(false)
    }
  }

  const summary = useMemo(() => ({
    total: items.length,
    pending: items.filter((item) => !FINAL_STATUSES.includes(item.status)).length,
    approved: items.filter((item) => item.status === 'APPROVED').length,
    handoverPending: items.filter((item) => {
      const progress = handoverProgress(item)
      return progress.confirmed < progress.confirmationTotal || (progress.total > 0 && progress.done < progress.total)
    }).length,
  }), [items])

  const columns = [
    {
      header: 'Employee',
      accessor: 'employee',
      render: (employee) => (
        <div className="min-w-52">
          <p className="font-extrabold text-slate-900 dark:text-slate-100">{employeeName(employee)}</p>
          <p className="text-xs font-bold text-slate-400">{employee?.employeeCode || 'Employee'} - {employee?.designation?.name || 'No designation'}</p>
        </div>
      ),
    },
    {
      header: 'Department',
      accessor: 'employee',
      render: (employee) => (
        <div className="min-w-40">
          <p className="font-bold text-slate-800 dark:text-slate-100">{employee?.department?.name || '-'}</p>
          <p className="text-xs text-slate-400">{employee?.branch?.name || employee?.branch?.city || '-'}</p>
        </div>
      ),
    },
    { header: 'Resigned On', accessor: 'resignationDate', render: (v) => formatDate(v) },
    {
      header: 'Last Working',
      accessor: 'lastWorkingDate',
      render: (v, row) => (
        <div>
          <p className="font-bold">{formatDate(v)}</p>
          <p className="text-xs font-semibold text-slate-400">{noticeDays(row)}</p>
        </div>
      ),
    },
    {
      header: 'Reason',
      accessor: 'reason',
      render: (reason) => <span className="line-clamp-2 max-w-56 text-sm">{reason || '-'}</span>,
    },
    {
      header: 'Handover',
      accessor: 'handoverEmployee',
      render: (handover, row) => {
        const progress = handoverProgress(row)
        return (
          <div className="min-w-44">
            <p className="font-bold text-slate-800 dark:text-slate-100">{handover ? employeeName(handover) : '-'}</p>
            <p className="text-xs font-semibold text-slate-400">{progress.label}</p>
          </div>
        )
      },
    },
    {
      header: 'Manager Review',
      accessor: 'managerRecommendation',
      render: (value, row) => (
        <div className="min-w-36">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{value ? 'Reviewed' : 'Pending'}</p>
          <p className="text-xs text-slate-400">{row.managerRecommendedAt ? formatDate(row.managerRecommendedAt) : '-'}</p>
        </div>
      ),
    },
    { header: 'Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
    {
      header: 'Action',
      key: 'action',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900" onClick={() => setSelected(row)} title="View offboarding details">
            <Eye className="h-4 w-4" />
          </button>
          {!FINAL_STATUSES.includes(row.status) && (
            <>
              <button disabled={saving} className="btn-secondary py-1.5 text-emerald-700" onClick={() => decide(row, 'APPROVED')}>Approve</button>
              <button disabled={saving} className="btn-secondary py-1.5 text-red-600" onClick={() => decide(row, 'REJECTED')}>Reject</button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400 dark:from-indigo-400 dark:to-indigo-300 hover:scale-[1.02] transition-transform duration-300 relative w-fit pb-2 after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-1/3 after:h-1 after:bg-gradient-to-r after:from-indigo-500 after:to-transparent after:rounded-full">Offboarding</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Review resignations, handovers, clearance, and final HR decisions</p>
        </div>
        <select className="input-field max-w-52" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Exits', value: summary.total, icon: UserMinus, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Pending Decisions', value: summary.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Handover Pending', value: summary.handoverPending, icon: ClipboardCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Approved Exits', value: summary.approved, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-xl ${card.bg} ${card.color}`}>
              <card.icon className="h-4 w-4" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{card.label}</p>
            <p className="mt-0.5 text-xl font-extrabold text-slate-900 dark:text-white">{card.value}</p>
          </div>
        ))}
      </div>

      {message && <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">{message}</p>}

      <DataTable
        columns={columns}
        data={items}
        isLoading={loading}
        onRowClick={setSelected}
        searchPlaceholder="Search employee, department, reason, handover..."
        emptyMessage="No resignations found"
        pageSize={8}
      />

      {selected && (
        <OffboardingDetailDrawer
          row={selected}
          onClose={() => setSelected(null)}
          onDecision={decide}
          onUpdate={() => { load(); setSelected(null) }}
          saving={saving}
        />
      )}
    </div>
  )
}
