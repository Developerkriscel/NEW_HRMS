'use client'

import { useEffect, useState } from 'react'
import { LogOut, Plus, X, ClipboardList } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { DataTable } from '@/components/tables/DataTable'
import { resignationApi } from '@/services/resignationApi'
import { formatDate } from '@/lib/utils'
import { Portal } from '@/components/common/Portal'

export function EmployeeOffboardingWorkspace() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ resignationDate: '', lastWorkingDate: '', reason: '' })

  function load() {
    setLoading(true)
    resignationApi.list({ size: 50, myResignation: true })
      .then((res) => setItems(res.data.data.content || []))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function submitResignation(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await resignationApi.submit(form)
      setForm({ resignationDate: '', lastWorkingDate: '', reason: '' })
      setMessage('Resignation submitted successfully')
      setShowForm(false)
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to submit resignation')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { header: 'Resignation Date', accessor: 'resignationDate', render: (v) => formatDate(v) },
    { header: 'Last Working Date', accessor: 'lastWorkingDate', render: (v) => formatDate(v) },
    { header: 'Reason', accessor: 'reason', render: (v) => v || '-' },
    { header: 'Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
    { header: 'Handover To', accessor: 'handoverEmployee', render: (v) => v ? `${v.firstName} ${v.lastName}` : '-' },
  ]

  return (
    <div className="animate-fade-in space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
            Offboarding
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">
            Submit and track your resignation workflow
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            className="bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-5 rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)] flex items-center gap-2" 
            onClick={() => { setMessage(''); setShowForm(true); }}
          >
            <LogOut className="w-4 h-4" /> Submit Resignation
          </button>
        </div>
      </div>

      {showForm && (
        <Portal><div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowForm(false)}></div>
          <div className="max-h-[90dvh] overflow-y-auto relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up border border-slate-200 dark:border-slate-800">
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none"></div>
            
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Submit Resignation</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Start your offboarding process</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={submitResignation} className="p-8">
              {message && (
                <div className="mb-6 p-4 rounded-xl text-sm font-medium border bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20">
                  {message}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Resignation Date</label>
                  <input required type="date" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-base font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm" value={form.resignationDate} onChange={(e) => setForm({ ...form, resignationDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Last Working Date</label>
                  <input required type="date" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-base font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm" value={form.lastWorkingDate} onChange={(e) => setForm({ ...form, lastWorkingDate: e.target.value })} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Reason (Optional)</label>
                  <textarea className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-base font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none shadow-sm" rows={4} placeholder="Please provide a detailed reason..." value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
                </div>
              </div>

              <div className="mt-8 flex gap-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-4 rounded-2xl font-bold text-base hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-[2] bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white py-4 rounded-2xl font-bold text-base transition-all shadow-[0_0_20px_-5px_rgba(225,29,72,0.4)] flex items-center justify-center gap-2">
                  <LogOut className="w-5 h-5" /> {saving ? 'Submitting...' : 'Submit Resignation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Portal>
      )}

      {message && <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>}
      <DataTable columns={columns} data={items} isLoading={loading} searchPlaceholder="Search resignations..." emptyMessage="No resignation records found" />
    </div>
  )
}
