'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, X } from 'lucide-react'
import { employeeApi } from '@/services/employeeApi'
import { departmentApi, designationApi } from '@/services/departmentApi'
import { useAuthStore } from '@/store/authStore'
import { HR_RESTRICTABLE_ROLES, MODULE_ACCESS_OPTIONS } from '@/lib/moduleAccess'
import { Portal } from '@/components/common/Portal'

const emptyForm = {
  firstName: '', lastName: '', employeeCode: '', preferredName: '', email: '', phone: '', alternatePhone: '', role: 'EMPLOYEE',
  departmentId: '', designationId: '', joiningDate: '', employmentType: 'Full-time', ctc: '',
  password: '', moduleAccess: [],
  reportingManager: '', status: 'ACTIVE',
  companyCode: '', companyName: '', workingHours: '', inTiming: '', weekOff: '', probationPeriod: '', dateOfExit: '', officialEmail: '',
  personalEmail: '', gender: '', maritalStatus: '', dateOfBirth: '', bloodGroup: '', fatherName: '', motherName: '', spouseName: '', anniversaryDate: '',
  currentAddress: '', permanentAddress: '', emergencyContactNumber: '', emergencyPersonName: '', emergencyRelationship: '',
  bankName: '', bankAccountNumber: '', accountHolderName: '', bankBranch: '', bankIfscCode: '', salaryTakeHome: '', panNumber: '', aadhaarNumber: '', pfNumber: '', uanNumber: '', esiNumber: '',
  previousEmployment: [], education: [], joiningPreferences: { availableToJoin: null, relocationRequired: null, accommodationRequired: null, requestedJoiningDate: '', requestedJoiningReason: '' },
  declarations: { accurate: false, willNotify: false }
}

function normalizeEmployeeForm(employee) {
  if (!employee) return emptyForm
  return {
    ...emptyForm,
    ...employee,
    departmentId: employee.departmentId || employee.department?._id || employee.department || '',
    designationId: employee.designationId || employee.designation?._id || employee.designation || '',
    branchId: employee.branchId || employee.branch?._id || employee.branch || '',
    shiftId: employee.shiftId || employee.shift?._id || employee.shift || '',
    reportingManager: employee.reportingManagerId || employee.reportingManager?._id || employee.reportingManager || '',
    joiningDate: employee.joiningDate ? String(employee.joiningDate).slice(0, 10) : '',
    dateOfBirth: employee.dateOfBirth ? String(employee.dateOfBirth).slice(0, 10) : '',
    anniversaryDate: employee.anniversaryDate ? String(employee.anniversaryDate).slice(0, 10) : '',
    dateOfExit: employee.dateOfExit ? String(employee.dateOfExit).slice(0, 10) : '',
    previousEmployment: Array.isArray(employee.previousEmployment) ? employee.previousEmployment : [],
    education: Array.isArray(employee.education) ? employee.education : [],
    joiningPreferences: { ...emptyForm.joiningPreferences, ...(employee.joiningPreferences || {}) },
    declarations: { ...emptyForm.declarations, ...(employee.declarations || {}) },
  }
}

export function AddEmployeePage({ basePath, onClose, initialData }) {
  const router = useRouter()
  const currentUser = useAuthStore((state) => state.user)
  const [departments, setDepartments] = useState([])
  const [designations, setDesignations] = useState([])
  const [employees, setEmployees] = useState([])
  const [form, setForm] = useState(normalizeEmployeeForm(initialData))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tempPassword, setTempPassword] = useState(null)
  const [createdEmployee, setCreatedEmployee] = useState(null)
  const [invitation, setInvitation] = useState(null)

  useEffect(() => {
    departmentApi.getAll().then((res) => setDepartments(res.data.data))
    designationApi.getAll().then((res) => setDesignations(res.data.data))
    employeeApi.getAll({ size: 100 }).then((res) => setEmployees(res.data.data.content || []))
  }, [])

  useEffect(() => {
    if (initialData) setForm(normalizeEmployeeForm(initialData))
  }, [initialData])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = { ...form }
      if (payload.ctc) payload.ctc = Number(payload.ctc)
      if (payload.salaryTakeHome) payload.salaryTakeHome = Number(payload.salaryTakeHome)
      if (!payload.reportingManager) delete payload.reportingManager
      if (!['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'].includes(payload.gender)) delete payload.gender
      
      if (initialData?._id) {
        await employeeApi.update(initialData._id, payload)
        if (onClose) onClose()
        else router.push(basePath)
      } else {
        const { data } = await employeeApi.create(payload)
        setCreatedEmployee(data.data.employee)
        setInvitation(data.data.invitation)
        setTempPassword(data.data.tempPassword)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create employee')
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    if (onClose) onClose()
    else router.push(basePath)
  }

  function toggleModuleAccess(moduleKey) {
    setForm((current) => ({
      ...current,
      moduleAccess: current.moduleAccess.includes(moduleKey)
        ? current.moduleAccess.filter((key) => key !== moduleKey)
        : [...current.moduleAccess, moduleKey],
    }))
  }

  const canAssignModuleAccess = ['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(currentUser?.role)
  const showModuleAccess = canAssignModuleAccess && HR_RESTRICTABLE_ROLES.includes(form.role)
  const modulesByGroup = MODULE_ACCESS_OPTIONS.reduce((acc, option) => {
    acc[option.group] = acc[option.group] || []
    acc[option.group].push(option)
    return acc
  }, {})

  if (tempPassword) {
    return (
      <Portal><div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-h-[90dvh] overflow-y-auto animate-fade-in w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 text-center">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Employee Created</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            {invitation?.sent ? 'Invitation email sent with these login details.' : 'Share these login details with the employee.'}
          </p>
          {invitation && !invitation.sent && (
            <div className="mb-4 rounded-lg border border-amber-100 bg-amber-50 p-3 text-left text-xs text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
              Invitation email not sent: {invitation.reason || 'email delivery failed'}.
            </div>
          )}
          <div className="space-y-2 text-left mb-6">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">Employee ID</p>
              <p className="font-mono text-sm text-slate-800 dark:text-slate-100">{createdEmployee?.employeeCode || '-'}</p>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">Login Email</p>
              <p className="font-mono text-sm text-slate-800 dark:text-slate-100">{createdEmployee?.email || form.email}</p>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">Password</p>
              <p className="font-mono text-sm text-slate-800 dark:text-slate-100">{tempPassword}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleClose} className="btn-secondary justify-center">Done</button>
            <button
              onClick={() => router.push(`${basePath}/${createdEmployee?._id}`)}
              disabled={!createdEmployee?._id}
              className="btn-primary justify-center disabled:opacity-50"
            >
              Edit Authority
            </button>
          </div>
        </div>
      </div></Portal>
    )
  }

  return (
    <Portal><div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-md sm:p-6 lg:p-8">
      <div className="animate-scale-in relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/70 bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 shadow-2xl shadow-indigo-950/20 dark:border-slate-700 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/30">
        {/* Header */}
        <div className="flex-shrink-0 sticky top-0 z-10 flex items-center justify-between border-b border-indigo-100/80 bg-gradient-to-r from-white via-indigo-50/80 to-purple-50/80 px-6 py-5 backdrop-blur dark:border-slate-800 dark:from-slate-900 dark:via-indigo-950/30 dark:to-purple-950/20">
          <div><p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-indigo-500">Employee workspace</p><h2 className="text-2xl font-black text-slate-900 dark:text-white">{initialData ? 'Edit Employee' : 'Add Employee'}</h2></div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 p-1.5 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 space-y-6 overflow-y-auto bg-gradient-to-b from-white/70 to-indigo-50/30 p-5 sm:p-7 dark:from-slate-900/80 dark:to-indigo-950/20">
          <form id="add-employee-form" onSubmit={handleSubmit} className="space-y-6">
        
        {/* Core & Login (Existing) */}
        <div className="stat-card space-y-4 rounded-3xl border border-indigo-100/80 bg-gradient-to-br from-white via-indigo-50/40 to-blue-50/70 p-6 shadow-sm shadow-indigo-100/50 dark:border-indigo-900/50 dark:from-slate-900 dark:via-indigo-950/20 dark:to-blue-950/20">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">Core Details & Login</h3>
          {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-2">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Employee ID</span>
              <input className="input-field" value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value.toUpperCase() })} placeholder="EMP00001" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">First Name *</span>
              <input required className="input-field" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Last Name *</span>
              <input required className="input-field" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Email *</span>
              <input required type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Phone</span>
              <input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
          </div>
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 p-4">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Login Access</p>
            <p className="text-xs text-slate-400 mt-0.5 mb-3">Employee ID is used as an alternative login username. Leave blank to generate one automatically.</p>
            <input
              type="text"
              placeholder="Initial password (optional)"
              className="input-field"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <p className="text-xs text-slate-400 mt-2">Leave blank to auto-generate a password after creation.</p>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-white p-4 dark:border-indigo-900/50 dark:from-indigo-950/30 dark:to-slate-900">
            <div className="mb-3">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Job &amp; Access</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Set the employee&apos;s job title and system permission level.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Designation</span>
                <select className="input-field" value={form.designationId} onChange={(e) => setForm({ ...form, designationId: e.target.value })}>
                  <option value="">Select Designation</option>
                  {designations.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Authority / Role</span>
                <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, moduleAccess: [] })}>
                  {['EMPLOYEE', 'MANAGER', 'HR_MANAGER', 'SUPPORT_AGENT', 'COMPANY_ADMIN'].map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                </select>
              </label>
            </div>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 dark:border-blue-900/50 dark:bg-blue-900/10 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Module Authority</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {showModuleAccess
                    ? `Select modules this HR Manager should see. Leave all unchecked to keep full HR Manager access.`
                    : 'Module-level access appears here when Authority / Role is set to HR Manager.'}
                </p>
              </div>
              {showModuleAccess && (
                <button type="button" className="btn-secondary !text-xs !py-1" onClick={() => setForm({ ...form, moduleAccess: MODULE_ACCESS_OPTIONS.map((option) => option.key) })}>Select All</button>
              )}
            </div>

            {showModuleAccess ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(modulesByGroup).map(([group, options]) => (
                  <div key={group} className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{group}</p>
                    <div className="space-y-1.5">
                      {options.map((option) => (
                        <label key={option.key} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={form.moduleAccess.includes(option.key)} onChange={() => toggleModuleAccess(option.key)} />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-blue-200 bg-white/60 p-3 text-xs text-slate-500 dark:border-blue-900/60 dark:bg-slate-900/40 dark:text-slate-400">
                Choose <span className="font-semibold text-slate-700 dark:text-slate-200">HR Manager</span> in Authority / Role to assign Recruitment, Interviews, Assessments, Onboarding, Offers, and other HR modules.
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Department</span>
              <select className="input-field" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                <option value="">Select Department</option>
                {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Joining Date</span>
              <input type="date" className="input-field" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Annual CTC</span>
              <input type="number" className="input-field" value={form.ctc} onChange={(e) => setForm({ ...form, ctc: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Employment Type</span>
              <select className="input-field" value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })}>
                {['Full-time', 'Part-time', 'Contract', 'Intern'].map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
          </div>
        </div>

        {/* Access & Workflow */}
        <div className="stat-card space-y-4 rounded-3xl border border-rose-100/80 bg-gradient-to-br from-white via-rose-50/30 to-orange-50/60 p-6 shadow-sm shadow-rose-100/50 dark:border-rose-900/50 dark:from-slate-900 dark:via-rose-950/20 dark:to-orange-950/20">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">Access & Workflow</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Reporting Manager</span>
              <select className="input-field" value={form.reportingManager} onChange={(e) => setForm({ ...form, reportingManager: e.target.value })}>
                <option value="">Select Manager</option>
                {employees.map((emp) => <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</span>
              <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {['ACTIVE', 'INACTIVE', 'PROBATION', 'NOTICE_PERIOD', 'RESIGNED', 'TERMINATED', 'ABSCONDED', 'RETIRED'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </label>
          </div>
        </div>

        {/* Official Details */}
        <div className="stat-card space-y-4 rounded-3xl border border-sky-100/80 bg-gradient-to-br from-white via-sky-50/30 to-cyan-50/60 p-6 shadow-sm shadow-sky-100/50 dark:border-sky-900/50 dark:from-slate-900 dark:via-sky-950/20 dark:to-cyan-950/20">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">Official Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: 'companyCode', label: 'Company Code' },
              { key: 'companyName', label: 'Company Name' },
              { key: 'workingHours', label: 'Working Hours' },
              { key: 'inTiming', label: 'In Timing (HH:MM)' },
              { key: 'weekOff', label: 'Week Off' },
              { key: 'workLocation', label: 'Work Location' },
              { key: 'officialPhoneNumber', label: 'Official Phone' },
              { key: 'probationPeriod', label: 'Probation Period' },
              { key: 'officialEmail', label: 'Official Email' },
            ].map(({ key, label }) => (
              <label key={key} className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
                <input className="input-field" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              </label>
            ))}
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Date of Exit</span>
              <input type="date" className="input-field" value={form.dateOfExit} onChange={(e) => setForm({ ...form, dateOfExit: e.target.value })} />
            </label>
          </div>
        </div>

        {/* Personal & Family */}
        <div className="stat-card space-y-4 rounded-3xl border border-amber-100/80 bg-gradient-to-br from-white via-amber-50/30 to-yellow-50/60 p-6 shadow-sm shadow-amber-100/50 dark:border-amber-900/50 dark:from-slate-900 dark:via-amber-950/20 dark:to-yellow-950/20">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">Personal & Family</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: 'personalEmail', label: 'Personal Email' },
              { key: 'preferredName', label: 'Preferred Name' },
              { key: 'fatherName', label: 'Father Name' },
              { key: 'motherName', label: 'Mother Name' },
              { key: 'spouseName', label: 'Spouse Name' },
              { key: 'bloodGroup', label: 'Blood Group' },
            ].map(({ key, label }) => (
              <label key={key} className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
                <input className="input-field" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              </label>
            ))}
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Gender</span>
              <select className="input-field" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="">Select Gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Marital Status</span>
              <select className="input-field" value={form.maritalStatus} onChange={(e) => setForm({ ...form, maritalStatus: e.target.value })}>
                <option value="">Select Status</option>
                <option value="SINGLE">Single</option>
                <option value="MARRIED">Married</option>
                <option value="DIVORCED">Divorced</option>
                <option value="WIDOWED">Widowed</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Date of Birth</span>
              <input type="date" className="input-field" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Anniversary Date</span>
              <input type="date" className="input-field" value={form.anniversaryDate} onChange={(e) => setForm({ ...form, anniversaryDate: e.target.value })} />
            </label>
          </div>
        </div>

        {/* Address & Emergency */}
        <div className="stat-card space-y-4 rounded-3xl border border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/60 p-6 shadow-sm shadow-emerald-100/50 dark:border-emerald-900/50 dark:from-slate-900 dark:via-emerald-950/20 dark:to-teal-950/20">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">Address & Emergency</h3>
          <div className="grid grid-cols-1 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Current Address</span>
              <textarea className="input-field min-h-[80px]" value={form.currentAddress} onChange={(e) => setForm({ ...form, currentAddress: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Permanent Address</span>
              <textarea className="input-field min-h-[80px]" value={form.permanentAddress} onChange={(e) => setForm({ ...form, permanentAddress: e.target.value })} />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Emergency Contact No.</span>
              <input className="input-field" value={form.emergencyContactNumber} onChange={(e) => setForm({ ...form, emergencyContactNumber: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Emergency Person Name</span>
              <input className="input-field" value={form.emergencyPersonName} onChange={(e) => setForm({ ...form, emergencyPersonName: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Emergency Relationship</span>
              <input className="input-field" value={form.emergencyRelationship} onChange={(e) => setForm({ ...form, emergencyRelationship: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Alternate Phone</span>
              <input className="input-field" value={form.alternatePhone} onChange={(e) => setForm({ ...form, alternatePhone: e.target.value })} />
            </label>
          </div>
        </div>

        {/* Onboarding History */}
        <div className="stat-card space-y-4 rounded-3xl border border-violet-100/80 bg-gradient-to-br from-white via-violet-50/30 to-fuchsia-50/60 p-6 shadow-sm shadow-violet-100/50 dark:border-violet-900/50 dark:from-slate-900 dark:via-violet-950/20 dark:to-fuchsia-950/20">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800"><h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Previous Employment</h3><button type="button" className="btn-secondary !text-xs !py-1.5" onClick={() => setForm((f) => ({ ...f, previousEmployment: [...(f.previousEmployment || []), { employerName: '', designation: '', startDate: '', endDate: '', employeeId: '', reasonForLeaving: '' }] }))}>+ Add</button></div>
          {(form.previousEmployment || []).map((row, index) => <div key={index} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-2 dark:border-slate-800">
            {['employerName', 'designation', 'startDate', 'endDate', 'employeeId', 'reasonForLeaving'].map((key) => <label key={key} className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{key.replace(/([A-Z])/g, ' $1')}</span><input type={key.includes('Date') ? 'date' : 'text'} className="input-field" value={row[key] || ''} onChange={(e) => setForm((f) => ({ ...f, previousEmployment: f.previousEmployment.map((item, i) => i === index ? { ...item, [key]: e.target.value } : item) }))} /></label>)}
            <button type="button" className="text-left text-xs font-bold text-red-600" onClick={() => setForm((f) => ({ ...f, previousEmployment: f.previousEmployment.filter((_, i) => i !== index) }))}>Remove record</button>
          </div>)}
          {!form.previousEmployment?.length && <p className="text-sm text-slate-400">No previous employment records.</p>}
        </div>

        <div className="stat-card space-y-4 rounded-3xl border border-blue-100/80 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/60 p-6 shadow-sm shadow-blue-100/50 dark:border-blue-900/50 dark:from-slate-900 dark:via-blue-950/20 dark:to-indigo-950/20">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800"><h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Education</h3><button type="button" className="btn-secondary !text-xs !py-1.5" onClick={() => setForm((f) => ({ ...f, education: [...(f.education || []), { degree: '', specialization: '', institution: '', university: '', startYear: '', completionYear: '', score: '' }] }))}>+ Add</button></div>
          {(form.education || []).map((row, index) => <div key={index} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-2 dark:border-slate-800">
            {['degree', 'specialization', 'institution', 'university', 'startYear', 'completionYear', 'score'].map((key) => <label key={key} className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{key.replace(/([A-Z])/g, ' $1')}</span><input className="input-field" value={row[key] || ''} onChange={(e) => setForm((f) => ({ ...f, education: f.education.map((item, i) => i === index ? { ...item, [key]: e.target.value } : item) }))} /></label>)}
            <button type="button" className="text-left text-xs font-bold text-red-600" onClick={() => setForm((f) => ({ ...f, education: f.education.filter((_, i) => i !== index) }))}>Remove record</button>
          </div>)}
          {!form.education?.length && <p className="text-sm text-slate-400">No education records.</p>}
        </div>

        <div className="stat-card space-y-4 rounded-3xl border border-cyan-100/80 bg-gradient-to-br from-white via-cyan-50/30 to-blue-50/60 p-6 shadow-sm shadow-cyan-100/50 dark:border-cyan-900/50 dark:from-slate-900 dark:via-cyan-950/20 dark:to-blue-950/20">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 pb-2 dark:border-slate-800">Joining Information &amp; Declaration</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {['availableToJoin', 'relocationRequired', 'accommodationRequired'].map((key) => <label key={key} className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{key.replace(/([A-Z])/g, ' $1')}</span><select className="input-field" value={form.joiningPreferences?.[key] == null ? '' : String(form.joiningPreferences[key])} onChange={(e) => setForm((f) => ({ ...f, joiningPreferences: { ...f.joiningPreferences, [key]: e.target.value === '' ? null : e.target.value === 'true' } }))}><option value="">Not specified</option><option value="true">Yes</option><option value="false">No</option></select></label>)}
          </div>
          <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Requested Joining Reason</span><textarea className="input-field min-h-[70px]" value={form.joiningPreferences?.requestedJoiningReason || ''} onChange={(e) => setForm((f) => ({ ...f, joiningPreferences: { ...f.joiningPreferences, requestedJoiningReason: e.target.value } }))} /></label>
          <div className="space-y-2 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={!!form.declarations?.accurate} onChange={(e) => setForm((f) => ({ ...f, declarations: { ...f.declarations, accurate: e.target.checked } }))} /> Information is accurate</label><label className="flex items-center gap-2"><input type="checkbox" checked={!!form.declarations?.willNotify} onChange={(e) => setForm((f) => ({ ...f, declarations: { ...f.declarations, willNotify: e.target.checked } }))} /> Employee will notify changes</label></div>
        </div>

        {/* Financial & Legal */}
        <div className="stat-card space-y-4 rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-indigo-50/50 p-6 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">Financial & Legal</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: 'bankName', label: 'Bank Name' },
              { key: 'bankAccountNumber', label: 'Bank Account No' },
              { key: 'bankIfscCode', label: 'Bank IFSC Code' },
              { key: 'accountHolderName', label: 'Account Holder Name' },
              { key: 'bankBranch', label: 'Bank Branch' },
              { key: 'panNumber', label: 'PAN Card No' },
              { key: 'aadhaarNumber', label: 'Aadhar No' },
              { key: 'pfNumber', label: 'PF No' },
              { key: 'uanNumber', label: 'UAN No' },
              { key: 'esiNumber', label: 'ESIC No' },
            ].map(({ key, label }) => (
              <label key={key} className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
                <input className="input-field" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              </label>
            ))}
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Salary (Take Home)</span>
              <input type="number" className="input-field" value={form.salaryTakeHome} onChange={(e) => setForm({ ...form, salaryTakeHome: e.target.value })} />
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-6 py-3 rounded-xl text-sm font-bold shadow-md transition-all">
            {saving ? (initialData ? 'Saving...' : 'Creating...') : (initialData ? 'Save Changes' : 'Create Employee')}
          </button>
        </div>
      </form>
        </div>
      </div>
      </div>
    </Portal>
  )
}
