'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Receipt, Plus, X } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { DataTable } from '@/components/tables/DataTable'
import { expenseApi } from '@/services/expenseApi'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Portal } from '@/components/common/Portal'

const CATEGORIES = ['TRAVEL', 'FOOD', 'ACCOMMODATION', 'OFFICE_SUPPLIES', 'OTHER']

export function EmployeeExpensesWorkspace() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [form, setForm] = useState({ category: 'OTHER', amount: '', expenseDate: '', description: '', receiptNote: '' })

  useEffect(() => {
    setMounted(true)
  }, [])

  function load() {
    setLoading(true)
    expenseApi.list({ size: 100, myExpenses: true })
      .then((res) => setExpenses(res.data.data.content || []))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function submitExpense(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await expenseApi.submit({ ...form, amount: Number(form.amount) })
      setForm({ category: 'OTHER', amount: '', expenseDate: '', description: '', receiptNote: '' })
      setShowForm(false)
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to submit expense')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { header: 'Expense', accessor: 'category', render: (_, row) => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
          <Receipt className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <p className="font-bold text-slate-800 dark:text-slate-100">{row.category.replace('_', ' ')}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-[200px] truncate">{row.description || 'No description'}</p>
        </div>
      </div>
    ) },
    { header: 'Date', accessor: 'expenseDate', render: (v) => <span className="font-medium text-slate-600 dark:text-slate-300">{formatDate(v)}</span> },
    { header: 'Amount', accessor: 'amount', render: (v) => <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(v)}</span> },
    { header: 'Receipt', accessor: 'receiptNote', render: (v) => v ? <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{v}</span> : <span className="text-sm text-slate-400">—</span> },
    { header: 'Status', accessor: 'status', render: (v) => <Badge variant={v === 'APPROVED' ? 'success' : v === 'PENDING' ? 'warning' : 'danger'}>{v}</Badge> },
  ]

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Expenses
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Submit expense claims and track manager approval
          </p>
        </div>
        <button 
          onClick={() => { setMessage(''); setShowForm(true); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)] flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      {showForm && (
        <Portal><div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowForm(false)}></div>
          <div className="max-h-[90dvh] overflow-y-auto relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-fade-in-up border border-slate-200 dark:border-slate-800">
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none"></div>
            
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">New Expense Claim</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Fill out the details below</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={submitExpense} className="p-6">
              {message && (
                <div className={`mb-5 p-3 rounded-xl text-sm font-medium border ${message.includes('Failed') ? 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'}`}>
                  {message}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Category</label>
                  <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map((category) => <option key={category} value={category}>{category.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Amount</label>
                  <input required type="number" min="1" step="0.01" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Date</label>
                  <input required type="date" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Receipt Ref (Optional)</label>
                  <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="INV-123" value={form.receiptNote} onChange={(e) => setForm({ ...form, receiptNote: e.target.value })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Description</label>
                  <textarea className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none" rows={3} placeholder="What was this expense for?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)] flex items-center justify-center gap-2">
                  <Receipt className="w-4 h-4" /> {saving ? 'Submitting...' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </div></Portal>
      )}

      <div className="pt-2">
        <DataTable columns={columns} data={expenses} isLoading={loading} searchPlaceholder="Search expense history..." emptyMessage="No expense claims found" />
      </div>
    </div>
  )
}
