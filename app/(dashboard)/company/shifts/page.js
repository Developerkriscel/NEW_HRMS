'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { shiftApi } from '@/services/departmentApi'

export default function ShiftsPage() {
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [form, setForm] = useState({ name: '', startTime: '09:00', endTime: '18:00', gracePeriodMinutes: 0 })
  const [saving, setSaving] = useState(false)

  function load() {
    setLoading(true)
    setError(false)
    shiftApi.getAll().then((res) => setShifts(res.data.data)).catch(() => setError(true)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.startTime || !form.endTime) return
    setSaving(true)
    try {
      await shiftApi.create(form)
      setForm({ name: '', startTime: '09:00', endTime: '18:00', gracePeriodMinutes: 0 })
      load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Shifts</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Define work shifts employees can be assigned to</p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="stat-card grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Shift Name</span>
          <input className="input-field" placeholder="e.g. General" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Start Time</span>
          <input type="time" className="input-field" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">End Time</span>
          <input type="time" className="input-field" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
        </label>
        <button type="submit" disabled={saving} className="btn-primary justify-center">
          <Plus className="w-4 h-4" /> Add Shift
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : error ? (
        <p className="text-sm text-red-500">Failed to load shifts — <button onClick={load} className="underline">retry</button></p>
      ) : shifts.length === 0 ? (
        <p className="text-sm text-slate-400">No shifts yet — add your first one above.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shifts.map((s) => (
            <div key={s._id} className="stat-card">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">{s.name}</h3>
              <p className="text-xs text-slate-400 mt-1">{s.startTime} – {s.endTime}</p>
              {s.gracePeriodMinutes > 0 && <p className="text-xs text-slate-400 mt-1">Grace period: {s.gracePeriodMinutes} min</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
