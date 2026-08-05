'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { employeeApi, permissionApi } from '@/services/employeeApi'
import { useAuthStore } from '@/store/authStore'

const ROLES = ['COMPANY_ADMIN', 'HR_MANAGER', 'MANAGER', 'EMPLOYEE', 'FINANCE', 'IT_ADMIN', 'SUPPORT_AGENT']

export default function RolesPermissionsPage() {
  const router = useRouter()
  const currentUser = useAuthStore((s) => s.user)
  const canChangeRole = currentUser?.role === 'COMPANY_ADMIN'

  const [employees, setEmployees] = useState([])
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState(null)

  function load() {
    setLoading(true)
    Promise.all([employeeApi.getAll({ size: 500 }), permissionApi.getAll()])
      .then(([empRes, permRes]) => {
        setEmployees(empRes.data.data.content)
        setPermissions(permRes.data.data)
      })
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function changeRole(employeeId, role) {
    setSavingId(employeeId)
    setError('')
    try {
      await employeeApi.update(employeeId, { role })
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change role')
    } finally {
      setSavingId(null)
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading...</p>

  const permissionsByModule = permissions.reduce((acc, p) => {
    acc[p.module] = acc[p.module] || []
    acc[p.module].push(p)
    return acc
  }, {})

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Roles & Permissions</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Who has access to what across your company</p>
        </div>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {ROLES.map((role) => (
          <div key={role} className="stat-card">
            <p className="text-xs text-slate-400 uppercase tracking-wide">{role.replace(/_/g, ' ')}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{employees.filter((e) => e.role === role).length}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800"><p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Employees & Roles</p></div>
        <table className="data-table">
          <thead><tr><th>Employee</th><th>Email</th><th>Role</th><th>Custom Permissions</th></tr></thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e._id}>
                <td className="font-medium text-slate-800 dark:text-slate-100 cursor-pointer" onClick={() => router.push(`/company/employees/${e._id}`)}>{e.firstName} {e.lastName}</td>
                <td className="text-slate-500 dark:text-slate-400">{e.email}</td>
                <td>
                  <select
                    className="input-field !py-1.5 !text-xs"
                    value={e.role}
                    disabled={!canChangeRole || savingId === e._id}
                    onChange={(ev) => changeRole(e._id, ev.target.value)}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                  </select>
                </td>
                <td className="text-slate-500 dark:text-slate-400">{(e.permissions || []).length || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">Permission Catalog</h3>
        <p className="text-xs text-slate-400 mb-4">Reference only — grant these to a specific employee from their profile's Edit screen for module-wise access beyond what their role already gives them.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(permissionsByModule).map(([module, perms]) => (
            <div key={module} className="rounded-xl border border-slate-100 dark:border-slate-800 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{module}</p>
              <div className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                {perms.map((p) => <p key={p._id}>{p.name}</p>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
