import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { designationApi, departmentApi } from '@/services/departmentApi'

export function DesignationsSection() {
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Designations</h3>
          <p className="text-sm text-slate-500 mt-1 font-medium">Define job titles and their departmental alignment.</p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="p-6 bg-white/40 dark:bg-slate-800/40 rounded-3xl border border-white/50 dark:border-slate-700/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] backdrop-blur-xl flex flex-col sm:flex-row gap-4 items-end">
        <label className="block flex-1">
          <span className="mb-1.5 block text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">Designation Name</span>
          <input className="input-field bg-white/50 focus:bg-white" placeholder="e.g. Senior Developer" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="block sm:w-56">
          <span className="mb-1.5 block text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">Department</span>
          <select className="input-field bg-white/50 focus:bg-white" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
            <option value="">Select Department...</option>
            {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
        </label>
        <button type="submit" disabled={saving} className="btn-primary justify-center h-11 w-full sm:w-auto px-6">
          <Plus className="w-4 h-4" /> Add Designation
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-slate-400 font-medium">Loading...</p>
      ) : error ? (
        <p className="text-sm text-red-500 font-medium">Failed to load designations — <button type="button" onClick={load} className="underline hover:text-red-600 transition-colors">retry</button></p>
      ) : designations.length === 0 ? (
        <div className="p-8 text-center bg-slate-50/50 dark:bg-slate-800/20 rounded-3xl border border-slate-100 dark:border-slate-800/50">
          <p className="text-sm font-medium text-slate-400">No designations yet — add your first one above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {designations.map((d) => (
            <div key={d._id} className="relative group bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl p-6 border border-white/50 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-purple-500/20 transition-colors" />
              <div className="relative z-10 flex flex-col h-full">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4">{d.name}</h3>
                
                <div className="mt-auto pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                  <p className="text-[11px] font-bold tracking-wider uppercase text-slate-400 mb-1">Department</p>
                  <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${d.department ? 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                    {d.department?.name || 'Unassigned'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
