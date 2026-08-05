'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { employeeApi } from '@/services/employeeApi'
import { departmentApi, designationApi } from '@/services/departmentApi'

const emptyForm = {
  firstName: '', lastName: '', email: '', phone: '', role: 'EMPLOYEE',
  departmentId: '', designationId: '', joiningDate: '', employmentType: 'Full-time', ctc: '',
}

export default function AddEmployeePage() {
  const router = useRouter()
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

  if (tempPassword) {
    return (
      <div className="animate-fade-in max-w-md mx-auto mt-12 text-center stat-card">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Employee Created</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Share this temporary password with the new employee:</p>
        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 font-mono text-sm mb-4">{tempPassword}</div>
        <button onClick={() => router.push('/company/employees')} className="btn-primary w-full justify-center">Done</button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-2xl">
      <div className="page-header">
        <div>
          <button onClick={() => router.push('/company/employees')} className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 mb-2">
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
          <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {['EMPLOYEE', 'MANAGER', 'HR_MANAGER', 'FINANCE', 'IT_ADMIN', 'SUPPORT_AGENT', 'COMPANY_ADMIN'].map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
          </select>
          <select className="input-field" value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })}>
            {['Full-time', 'Part-time', 'Contract', 'Intern'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <input type="date" className="input-field" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} />
          <input type="number" placeholder="Annual CTC" className="input-field" value={form.ctc} onChange={(e) => setForm({ ...form, ctc: e.target.value })} />
        </div>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Creating...' : 'Create Employee'}
        </button>
      </form>
    </div>
  )
}
