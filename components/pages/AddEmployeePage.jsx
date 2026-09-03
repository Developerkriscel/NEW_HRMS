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
  firstName: '', lastName: '', email: '', phone: '', role: 'EMPLOYEE',
  departmentId: '', designationId: '', joiningDate: '', employmentType: 'Full-time', ctc: '',
  password: '', moduleAccess: [],
  reportingManager: '', status: 'ACTIVE',
  companyCode: '', companyName: '', workingHours: '', inTiming: '', weekOff: '', probationPeriod: '', dateOfExit: '', officialEmail: '',
  personalEmail: '', gender: '', maritalStatus: '', dateOfBirth: '', bloodGroup: '', fatherName: '', motherName: '', spouseName: '', anniversaryDate: '',
  currentAddress: '', permanentAddress: '', emergencyContactNumber: '', emergencyPersonName: '',
  bankName: '', bankAccountNumber: '', bankIfscCode: '', salaryTakeHome: '', panNumber: '', aadhaarNumber: '', pfNumber: '', esiNumber: ''
}

export function AddEmployeePage({ basePath, onClose, initialData }) {
  const router = useRouter()
  const currentUser = useAuthStore((state) => state.user)
  const [departments, setDepartments] = useState([])
  const [designations, setDesignations] = useState([])
  const [employees, setEmployees] = useState([])
  const [form, setForm] = useState(initialData || emptyForm)
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
    if (initialData) setForm(initialData)
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
    <Portal><div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm sm:p-6 lg:p-8">
      <div className="animate-scale-in relative w-full max-w-4xl bg-slate-50 dark:bg-slate-900 rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex-shrink-0 sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{initialData ? 'Edit Employee' : 'Add Employee'}</h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 p-1.5 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <form id="add-employee-form" onSubmit={handleSubmit} className="space-y-6">
        
        {/* Core & Login (Existing) */}
        <div className="stat-card space-y-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">Core Details & Login</h3>
          {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-2">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <p className="text-xs text-slate-400 mt-0.5 mb-3">Employee ID is generated automatically. The employee logs in with email and password.</p>
            <input
              type="text"
              placeholder="Initial password (optional)"
              className="input-field"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <p className="text-xs text-slate-400 mt-2">Leave blank to auto-generate a password after creation.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Authority / Role</span>
              <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, moduleAccess: [] })}>
                {['EMPLOYEE', 'MANAGER', 'HR_MANAGER', 'FINANCE', 'IT_ADMIN', 'SUPPORT_AGENT', 'COMPANY_ADMIN'].map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Employment Type</span>
              <select className="input-field" value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })}>
                {['Full-time', 'Part-time', 'Contract', 'Intern'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Department</span>
              <select className="input-field" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                <option value="">Select Department</option>
                {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Designation</span>
              <select className="input-field" value={form.designationId} onChange={(e) => setForm({ ...form, designationId: e.target.value })}>
                <option value="">Select Designation</option>
                {designations.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
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
          </div>
        </div>

        {/* Access & Workflow */}
        <div className="stat-card space-y-4">
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
        <div className="stat-card space-y-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">Official Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: 'companyCode', label: 'Company Code' },
              { key: 'companyName', label: 'Company Name' },
              { key: 'workingHours', label: 'Working Hours' },
              { key: 'inTiming', label: 'In Timing (HH:MM)' },
              { key: 'weekOff', label: 'Week Off' },
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
        <div className="stat-card space-y-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">Personal & Family</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: 'personalEmail', label: 'Personal Email' },
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
        <div className="stat-card space-y-4">
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
          </div>
        </div>

        {/* Financial & Legal */}
        <div className="stat-card space-y-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">Financial & Legal</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: 'bankName', label: 'Bank Name' },
              { key: 'bankAccountNumber', label: 'Bank Account No' },
              { key: 'bankIfscCode', label: 'Bank IFSC Code' },
              { key: 'panNumber', label: 'PAN Card No' },
              { key: 'aadhaarNumber', label: 'Aadhar No' },
              { key: 'pfNumber', label: 'PF No' },
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
