'use client'

import { useEffect, useState } from 'react'
import { Receipt } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { DataTable } from '@/components/tables/DataTable'
import { expenseApi } from '@/services/expenseApi'
import { formatCurrency, formatDate } from '@/lib/utils'

const CATEGORIES = ['TRAVEL', 'FOOD', 'ACCOMMODATION', 'OFFICE_SUPPLIES', 'OTHER']

export function EmployeeExpensesWorkspace() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ category: 'OTHER', amount: '', expenseDate: '', description: '', receiptNote: '' })

  function load() {
    setLoading(true)
    expenseApi.list({ size: 100 })
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
      setMessage('Expense claim submitted')
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to submit expense')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { header: 'Expense', accessor: 'category', render: (_, row) => (
      <div>
        <p className="font-medium text-slate-800 dark:text-slate-100">{row.category}</p>
        <p className="text-xs text-slate-400">{row.description || 'No description'}</p>
      </div>
    ) },
    { header: 'Date', accessor: 'expenseDate', render: (v) => formatDate(v) },
    { header: 'Amount', accessor: 'amount', render: (v) => formatCurrency(v) },
    { header: 'Receipt', accessor: 'receiptNote', render: (v) => v || '-' },
    { header: 'Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
  ]

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Expenses</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Submit expense claims and track manager approval</p>
        </div>
      </div>

      <form onSubmit={submitExpense} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
        <input required type="number" min="1" className="input-field" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <input required type="date" className="input-field" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} />
        <input className="input-field" placeholder="Receipt ref" value={form.receiptNote} onChange={(e) => setForm({ ...form, receiptNote: e.target.value })} />
        <button disabled={saving} className="btn-primary"><Receipt className="w-4 h-4" /> Submit</button>
        <textarea className="input-field md:col-span-5" rows={2} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </form>

      {message && <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>}
      <DataTable columns={columns} data={expenses} isLoading={loading} searchPlaceholder="Search expenses..." emptyMessage="No expense claims found" />
    </div>
  )
}
