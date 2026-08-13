'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, KeyRound, Pencil, X } from 'lucide-react'
import { Avatar } from '@/components/common/Avatar'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { employeeApi, permissionApi } from '@/services/employeeApi'
import { departmentApi, designationApi, branchApi, shiftApi } from '@/services/departmentApi'
import { formatDate, formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { HR_RESTRICTABLE_ROLES, MODULE_ACCESS_OPTIONS } from '@/lib/moduleAccess'

const STATUSES = ['ACTIVE', 'INACTIVE', 'PROBATION', 'NOTICE_PERIOD', 'RESIGNED', 'TERMINATED', 'ABSCONDED', 'RETIRED']
const ROLES = ['COMPANY_ADMIN', 'HR_MANAGER', 'MANAGER', 'EMPLOYEE', 'FINANCE', 'IT_ADMIN', 'SUPPORT_AGENT']

export function EmployeeDetail({ basePath }) {
  const { id } = useParams()
  const router = useRouter()
  const currentUser = useAuthStore((s) => s.user)
  const canEdit = ['COMPANY_ADMIN', 'HR_MANAGER'].includes(currentUser?.role)
  const canChangeRole = currentUser?.role === 'COMPANY_ADMIN'

  const [employee, setEmployee] = useState(null)
  const [leaveBalance, setLeaveBalance] = useState([])
  const [payslips, setPayslips] = useState([])
  const [loading, setLoading] = useState(true)

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)
  const [options, setOptions] = useState({ departments: [], designations: [], branches: [], shifts: [], managers: [], permissions: [] })
  const [selectedPermissionIds, setSelectedPermissionIds] = useState([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [showReset, setShowReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [copied, setCopied] = useState(false)

  function load() {
    setLoading(true)
    Promise.all([
      employeeApi.getById(id),
      employeeApi.getLeaveBalance(id),
      employeeApi.getPayslips(id),
    ])
      .then(([empRes, balRes, paysRes]) => {
        setEmployee(empRes.data.data)
        setLeaveBalance(balRes.data.data)
        setPayslips(paysRes.data.data)
      })
      .finally(() => setLoading(false))
  }
  useEffect(load, [id])

  useEffect(() => {
    if (!canEdit) return
    Promise.all([
      departmentApi.getAll(), designationApi.getAll(), branchApi.getAll(), shiftApi.getAll(),
      employeeApi.getAll({ size: 200 }), permissionApi.getAll(),
    ]).then(([deptRes, desigRes, branchRes, shiftRes, empRes, permRes]) => {
      setOptions({
        departments: deptRes.data.data,
        designations: desigRes.data.data,
        branches: branchRes.data.data,
        shifts: shiftRes.data.data,
        managers: empRes.data.data.content.filter((e) => e._id !== id),
        permissions: permRes.data.data,
      })
    })
  }, [canEdit, id])

  function startEdit() {
    setForm({
      status: employee.status,
      role: employee.role,
      departmentId: employee.department?._id || '',
      designationId: employee.designation?._id || '',
      branchId: employee.branch?._id || '',
      shiftId: employee.shift?._id || '',
      reportingManagerId: employee.reportingManager?._id || '',
      moduleAccess: employee.moduleAccess || [],
    })
    setSelectedPermissionIds((employee.permissions || []).map((p) => p._id))
    setSaveError('')
    setEditing(true)
  }

  async function saveEdit() {
    setSaving(true)
    setSaveError('')
    try {
      const payload = canChangeRole ? form : Object.fromEntries(
        Object.entries(form).filter(([key]) => key !== 'moduleAccess')
      )
      await employeeApi.update(id, payload)
      if (canChangeRole) await employeeApi.updatePermissions(id, selectedPermissionIds)
      setEditing(false)
      load()
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  function togglePermission(permId) {
    setSelectedPermissionIds((ids) => (ids.includes(permId) ? ids.filter((i) => i !== permId) : [...ids, permId]))
  }

  function toggleModuleAccess(moduleKey) {
    setForm((current) => ({
      ...current,
      moduleAccess: current.moduleAccess.includes(moduleKey)
        ? current.moduleAccess.filter((key) => key !== moduleKey)
        : [...current.moduleAccess, moduleKey],
    }))
  }

  async function handleResetPassword(reason) {
    setResetting(true)
    setResetError('')
    try {
      const { data } = await employeeApi.resetPassword(id, reason)
      setTempPassword(data.data.tempPassword)
      setShowReset(false)
    } catch (err) {
      setResetError(err.response?.data?.message || 'Failed to reset password')
    } finally {
      setResetting(false)
    }
  }

  function copyPassword() {
    navigator.clipboard?.writeText(tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <PageLoader />
  if (!employee) return <div className="text-center text-slate-400 py-12">Employee not found</div>

  const permissionsByModule = options.permissions.reduce((acc, p) => {
    acc[p.module] = acc[p.module] || []
    acc[p.module].push(p)
    return acc
  }, {})
  const modulesByGroup = MODULE_ACCESS_OPTIONS.reduce((acc, option) => {
    acc[option.group] = acc[option.group] || []
    acc[option.group].push(option)
    return acc
  }, {})
  const showModuleAccess = form && canChangeRole && HR_RESTRICTABLE_ROLES.includes(form.role)

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <button onClick={() => router.push(basePath)} className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 mb-2">
            <ArrowLeft className="w-4 h-4" /> Back to employees
          </button>
          <div className="flex items-center gap-4">
            <Avatar name={`${employee.firstName} ${employee.lastName}`} size="xl" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{employee.firstName} {employee.lastName}</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                {employee.employeeCode} · {employee.designation?.name || 'No designation'} · <Badge>{employee.status}</Badge>
              </p>
            </div>
          </div>
        </div>
        {canEdit && !editing && (
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setShowReset(true)}><KeyRound className="w-4 h-4" /> Reset Password</button>
            <button className="btn-primary" onClick={startEdit}><Pencil className="w-4 h-4" /> Edit</button>
          </div>
        )}
      </div>

      {tempPassword && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-4 text-sm text-emerald-700 dark:text-emerald-300">
          <p>New password set for {employee.email}. Copy it now — it will not be shown again.</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 bg-white dark:bg-slate-900 rounded-lg p-3 font-mono text-center">{tempPassword}</div>
            <button className="btn-secondary flex-shrink-0" onClick={copyPassword}>{copied ? 'Copied' : 'Copy'}</button>
          </div>
        </div>
      )}

      {editing ? (
        <div className="stat-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Edit Employee</h3>
            <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          {saveError && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">{saveError}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Status</span>
              <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Role{!canChangeRole && ' (Company Admin only)'}</span>
              <select className="input-field" value={form.role} disabled={!canChangeRole} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Department</span>
              <select className="input-field" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                <option value="">—</option>
                {options.departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Designation</span>
              <select className="input-field" value={form.designationId} onChange={(e) => setForm({ ...form, designationId: e.target.value })}>
                <option value="">—</option>
                {options.designations.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Branch</span>
              <select className="input-field" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
                <option value="">—</option>
                {options.branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Shift</span>
              <select className="input-field" value={form.shiftId} onChange={(e) => setForm({ ...form, shiftId: e.target.value })}>
                <option value="">—</option>
                {options.shifts.map((s) => <option key={s._id} value={s._id}>{s.name} ({s.startTime}–{s.endTime})</option>)}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Reporting Manager</span>
              <select className="input-field" value={form.reportingManagerId} onChange={(e) => setForm({ ...form, reportingManagerId: e.target.value })}>
                <option value="">—</option>
                {options.managers.map((m) => <option key={m._id} value={m._id}>{m.firstName} {m.lastName}</option>)}
              </select>
            </label>
          </div>

          {Object.keys(permissionsByModule).length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Custom permissions{!canChangeRole && ' (Company Admin only)'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(permissionsByModule).map(([module, perms]) => (
                  <div key={module} className="rounded-xl border border-slate-100 dark:border-slate-800 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{module}</p>
                    <div className="space-y-1.5">
                      {perms.map((p) => (
                        <label key={p._id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <input type="checkbox" className="h-4 w-4 rounded border-slate-300" disabled={!canChangeRole} checked={selectedPermissionIds.includes(p._id)} onChange={() => togglePermission(p._id)} />
                          {p.name}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showModuleAccess && (
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Visible modules for this HR user</p>
                <button type="button" className="btn-secondary !text-xs !py-1" onClick={() => setForm({ ...form, moduleAccess: MODULE_ACCESS_OPTIONS.map((option) => option.key) })}>Select All</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(modulesByGroup).map(([group, moduleOptions]) => (
                  <div key={group} className="rounded-xl border border-slate-100 dark:border-slate-800 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{group}</p>
                    <div className="space-y-1.5">
                      {moduleOptions.map((option) => (
                        <label key={option.key} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={form.moduleAccess.includes(option.key)} onChange={() => toggleModuleAccess(option.key)} />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-400">Leave all unchecked to use the full default menu for this role.</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn-primary" onClick={saveEdit} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="stat-card">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Employment Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-400">Email:</span> <p className="text-slate-800 dark:text-slate-200">{employee.email}</p></div>
                <div><span className="text-slate-400">Phone:</span> <p className="text-slate-800 dark:text-slate-200">{employee.phone || '—'}</p></div>
                <div><span className="text-slate-400">Department:</span> <p className="text-slate-800 dark:text-slate-200">{employee.department?.name || '—'}</p></div>
                <div><span className="text-slate-400">Branch:</span> <p className="text-slate-800 dark:text-slate-200">{employee.branch?.name || '—'}</p></div>
                <div><span className="text-slate-400">Shift:</span> <p className="text-slate-800 dark:text-slate-200">{employee.shift ? `${employee.shift.name} (${employee.shift.startTime}–${employee.shift.endTime})` : '—'}</p></div>
                <div><span className="text-slate-400">Reporting Manager:</span> <p className="text-slate-800 dark:text-slate-200">{employee.reportingManager ? `${employee.reportingManager.firstName} ${employee.reportingManager.lastName}` : '—'}</p></div>
                <div><span className="text-slate-400">Joining Date:</span> <p className="text-slate-800 dark:text-slate-200">{formatDate(employee.joiningDate)}</p></div>
                <div><span className="text-slate-400">Employment Type:</span> <p className="text-slate-800 dark:text-slate-200">{employee.employmentType || '—'}</p></div>
                <div><span className="text-slate-400">Role:</span> <p className="text-slate-800 dark:text-slate-200">{employee.role}</p></div>
              </div>
            </div>

            {(employee.permissions || []).length > 0 && (
              <div className="stat-card">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Custom Permissions</h3>
                <div className="flex flex-wrap gap-2">
                  {employee.permissions.map((p) => <Badge key={p._id}>{p.name}</Badge>)}
                </div>
              </div>
            )}

            {HR_RESTRICTABLE_ROLES.includes(employee.role) && (
              <div className="stat-card">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Module Access</h3>
                {(employee.moduleAccess || []).length === 0 ? (
                  <p className="text-sm text-slate-400">Full default access for {employee.role.replace('_', ' ')}.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {MODULE_ACCESS_OPTIONS.filter((option) => employee.moduleAccess.includes(option.key)).map((option) => (
                      <Badge key={option.key}>{option.label}</Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="stat-card">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Payslips</h3>
              {payslips.length === 0 ? (
                <p className="text-sm text-slate-400">No payslips generated yet</p>
              ) : (
                <table className="data-table">
                  <thead><tr><th>Period</th><th>Gross</th><th>Net</th><th>Status</th></tr></thead>
                  <tbody>
                    {payslips.map((p) => (
                      <tr key={p._id}>
                        <td>{p.month}/{p.year}</td>
                        <td>{formatCurrency(p.grossSalary)}</td>
                        <td>{formatCurrency(p.netSalary)}</td>
                        <td><Badge>{p.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="stat-card">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Leave Balance ({new Date().getFullYear()})</h3>
            {leaveBalance.length === 0 ? (
              <p className="text-sm text-slate-400">No leave balances set up yet</p>
            ) : (
              <div className="space-y-3">
                {leaveBalance.map((b) => (
                  <div key={b._id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-700 dark:text-slate-300">{b.leaveType?.name}</span>
                      <span className="text-slate-400">{b.usedDays}/{b.totalDays}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${Math.min(100, (b.usedDays / (b.totalDays || 1)) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showReset}
        title="Reset this employee's password?"
        description={`This immediately invalidates ${employee.email}'s current password and issues a new one-time password shown only once.`}
        confirmLabel="Reset Password"
        variant="danger"
        loading={resetting}
        error={resetError}
        onConfirm={handleResetPassword}
        onClose={() => setShowReset(false)}
      />
    </div>
  )
}
