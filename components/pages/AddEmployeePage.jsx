'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { employeeApi } from '@/services/employeeApi'
import { departmentApi, designationApi } from '@/services/departmentApi'
import { useAuthStore } from '@/store/authStore'
import { HR_RESTRICTABLE_ROLES, MODULE_ACCESS_OPTIONS } from '@/lib/moduleAccess'

const emptyForm = {
  firstName: '', lastName: '', email: '', phone: '', role: 'EMPLOYEE',
  departmentId: '', designationId: '', joiningDate: '', employmentType: 'Full-time', ctc: '',
  moduleAccess: [],
}

export function AddEmployeePage({ basePath }) {
  const router = useRouter()
  const currentUser = useAuthStore((state) => state.user)
  const [departments, setDepartments] = useState([])
  const [designations, setDesignations] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tempPassword, setTempPassword] = useState(null)

  useEffect(() => {
    departmentApi.getAll().then((res) => setDepartments(res.data.data))
    designationApi.getAll().then((res) => setDesignations(res.data.data))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const { data } = await employeeApi.create({ ...form, ctc: form.ctc ? Number(form.ctc) : undefined })
      setTempPassword(data.data.tempPassword)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create employee')
    } finally {
      setSaving(false)
    }
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
      <div className="animate-fade-in max-w-md mx-auto mt-12 text-center stat-card">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Employee Created</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Share this temporary password with the new employee:</p>
        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 font-mono text-sm mb-4">{tempPassword}</div>
        <button onClick={() => router.push(basePath)} className="btn-primary w-full justify-center">Done</button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-2xl">
      <div className="page-header">
        <div>
          <button onClick={() => router.push(basePath)} className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 mb-2">
            <ArrowLeft className="w-4 h-4" /> Back to employees
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Add Employee</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="stat-card space-y-4">
        {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-2">{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <input required placeholder="First Name" className="input-field" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          <input required placeholder="Last Name" className="input-field" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <input required type="email" placeholder="Email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder="Phone" className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
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
        <div className="grid grid-cols-2 gap-4">
          <select className="input-field" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
            <option value="">Select Department</option>
            {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          <select className="input-field" value={form.designationId} onChange={(e) => setForm({ ...form, designationId: e.target.value })}>
            <option value="">Select Designation</option>
            {designations.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <input type="date" className="input-field" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} />
          <input type="number" placeholder="Annual CTC" className="input-field" value={form.ctc} onChange={(e) => setForm({ ...form, ctc: e.target.value })} />
        </div>
        {showModuleAccess && (
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 dark:border-blue-900/50 dark:bg-blue-900/10 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Module Authority</p>
                <p className="text-xs text-slate-400 mt-0.5">Select modules this user should see. Leave all unchecked to keep full {form.role.replace('_', ' ')} access.</p>
              </div>
              <button type="button" className="btn-secondary !text-xs !py-1" onClick={() => setForm({ ...form, moduleAccess: MODULE_ACCESS_OPTIONS.map((option) => option.key) })}>Select All</button>
            </div>
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
          </div>
        )}
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Creating...' : 'Create Employee'}
        </button>
      </form>
    </div>
  )
}
