'use client'

import { useEffect, useState } from 'react'
import { Plus, MapPin } from 'lucide-react'
import { branchApi } from '@/services/departmentApi'

export default function BranchesPage() {
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [form, setForm] = useState({ name: '', city: '', state: '' })
  const [saving, setSaving] = useState(false)

  function load() {
    setLoading(true)
    setError(false)
    branchApi.getAll().then((res) => setBranches(res.data.data)).catch(() => setError(true)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await branchApi.create(form)
      setForm({ name: '', city: '', state: '' })
      load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Branches</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Office locations</p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="flex flex-wrap gap-2 max-w-xl">
        <input className="input-field flex-1" placeholder="Branch name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="input-field w-32" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        <input className="input-field w-32" placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
        <button type="submit" disabled={saving} className="btn-primary">
          <Plus className="w-4 h-4" /> Add
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : error ? (
        <p className="text-sm text-red-500">Failed to load branches — <button onClick={load} className="underline">retry</button></p>
      ) : branches.length === 0 ? (
        <p className="text-sm text-slate-400">No branches yet — add your first one above.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((b) => (
            <div key={b._id} className="stat-card">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-500" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">{b.name}</h3>
                {b.headOffice && <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">HQ</span>}
              </div>
              <p className="text-xs text-slate-400 mt-1">{[b.city, b.state].filter(Boolean).join(', ') || '—'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
