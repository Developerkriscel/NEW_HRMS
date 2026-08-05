'use client'

import { useEffect, useState } from 'react'
import { UserCheck } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { DataTable } from '@/components/tables/DataTable'
import { employeeApi } from '@/services/employeeApi'
import { formatDate } from '@/lib/utils'

export function OnboardingWorkspace() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', joiningDate: '' })

  function load() {
    setLoading(true)
    employeeApi.getAll({ status: 'PROBATION', size: 100 })
      .then((res) => setEmployees(res.data.data.content || []))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function createEmployee(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setTempPassword('')
    try {
      const res = await employeeApi.create(form)
      setTempPassword(res.data.data.tempPassword)
      setForm({ firstName: '', lastName: '', email: '', phone: '', joiningDate: '' })
      setMessage('Employee onboarded')
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to onboard employee')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { header: 'Employee', accessor: 'firstName', render: (_, row) => (
      <div>
        <p className="font-medium text-slate-800 dark:text-slate-100">{row.firstName} {row.lastName}</p>
        <p className="text-xs text-slate-400">{row.employeeCode} - {row.email}</p>
      </div>
    ) },
    { header: 'Join Date', accessor: 'joiningDate', render: (v) => formatDate(v) },
    { header: 'Role', accessor: 'role', render: (v) => <Badge>{v}</Badge> },
    { header: 'Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
  ]

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Onboarding</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Create employees and track probation onboarding</p>
        </div>
      </div>

      <form onSubmit={createEmployee} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <input required className="input-field" placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
        <input required className="input-field" placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
        <input required type="email" className="input-field" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="input-field" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input type="date" className="input-field" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} />
        <button disabled={saving} className="btn-primary md:col-span-1"><UserCheck className="w-4 h-4" /> Onboard</button>
      </form>

      {message && <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>}
      {tempPassword && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
          Temporary password: <span className="font-mono font-semibold">{tempPassword}</span>
        </div>
      )}

      <DataTable columns={columns} data={employees} isLoading={loading} searchPlaceholder="Search onboarding employees..." emptyMessage="No probation employees found" />
    </div>
  )
}
