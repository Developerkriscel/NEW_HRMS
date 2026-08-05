'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { holidayApi } from '@/services/departmentApi'
import { formatDate } from '@/lib/utils'

export default function HolidaysPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [holidays, setHolidays] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [form, setForm] = useState({ name: '', date: '', recurringAnnually: false, optional: false })
  const [saving, setSaving] = useState(false)

  function load() {
    setLoading(true)
    setError(false)
    holidayApi.getAll({ year }).then((res) => setHolidays(res.data.data)).catch(() => setError(true)).finally(() => setLoading(false))
  }
  useEffect(load, [year])

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.date) return
    setSaving(true)
    try {
      await holidayApi.create(form)
      setForm({ name: '', date: '', recurringAnnually: false, optional: false })
      load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Holiday Calendar</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Company-wide holidays</p>
        </div>
        <select className="input-field w-32" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <form onSubmit={handleCreate} className="stat-card grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Holiday Name</span>
          <input className="input-field" placeholder="e.g. Republic Day" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Date</span>
          <input type="date" className="input-field" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 h-10">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={form.optional} onChange={(e) => setForm({ ...form, optional: e.target.checked })} />
          Optional holiday
        </label>
        <button type="submit" disabled={saving} className="btn-primary justify-center">
          <Plus className="w-4 h-4" /> Add Holiday
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : error ? (
        <p className="text-sm text-red-500">Failed to load holidays — <button onClick={load} className="underline">retry</button></p>
      ) : holidays.length === 0 ? (
        <p className="text-sm text-slate-400">No holidays added for {year} yet.</p>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <table className="data-table">
            <thead><tr><th>Holiday</th><th>Date</th><th>Type</th></tr></thead>
            <tbody>
              {holidays.map((h) => (
                <tr key={h._id}>
                  <td className="font-medium text-slate-800 dark:text-slate-100">{h.name}</td>
                  <td className="text-slate-500 dark:text-slate-400">{formatDate(h.date)}</td>
                  <td className="text-slate-500 dark:text-slate-400">{h.optional ? 'Optional' : 'Mandatory'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
