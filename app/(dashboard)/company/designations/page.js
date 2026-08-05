'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { designationApi, departmentApi } from '@/services/departmentApi'

export default function DesignationsPage() {
  const [designations, setDesignations] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [form, setForm] = useState({ name: '', departmentId: '' })
  const [saving, setSaving] = useState(false)

  function load() {
    setLoading(true)
    setError(false)
    designationApi.getAll().then((res) => setDesignations(res.data.data)).catch(() => setError(true)).finally(() => setLoading(false))
  }
  useEffect(() => {
    load()
    departmentApi.getAll().then((res) => setDepartments(res.data.data)).catch(() => setDepartments([]))
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await designationApi.create({ name: form.name, department: form.departmentId || undefined })
      setForm({ name: '', departmentId: '' })
      load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Designations</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Job titles across your organization</p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="flex flex-wrap gap-2 max-w-lg">
        <input className="input-field flex-1" placeholder="New designation name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <select className="input-field w-40" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
          <option value="">Department</option>
          {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
        </select>
        <button type="submit" disabled={saving} className="btn-primary">
          <Plus className="w-4 h-4" /> Add
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : error ? (
        <p className="text-sm text-red-500">Failed to load designations — <button onClick={load} className="underline">retry</button></p>
      ) : designations.length === 0 ? (
        <p className="text-sm text-slate-400">No designations yet — add your first one above.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {designations.map((d) => (
            <div key={d._id} className="stat-card">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">{d.name}</h3>
              <p className="text-xs text-slate-400 mt-1">{d.department?.name || 'No department'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
