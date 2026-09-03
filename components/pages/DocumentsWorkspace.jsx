'use client'

import { useEffect, useState } from 'react'
import { FilePlus, Plus, X, FileText } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { DataTable } from '@/components/tables/DataTable'
import { documentApi } from '@/services/documentApi'
import { employeeApi } from '@/services/employeeApi'
import { formatDate } from '@/lib/utils'
import { Portal } from '@/components/common/Portal'

const STATUSES = ['PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED']

export function DocumentsWorkspace({ title, subtitle, employeeMode = false }) {
  const [documents, setDocuments] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ employeeId: '', title: '', category: 'GENERAL', fileUrl: '', notes: '' })

  function load() {
    setLoading(true)
    Promise.all([
      documentApi.list(),
      employeeMode ? Promise.resolve(null) : employeeApi.getAll({ size: 200 }),
    ])
      .then(([docRes, employeeRes]) => {
        setDocuments(docRes.data.data || [])
        if (employeeRes) setEmployees(employeeRes.data.data.content || [])
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [employeeMode])

  async function addDocument(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await documentApi.create(form)
      setForm({ employeeId: '', title: '', category: 'GENERAL', fileUrl: '', notes: '' })
      setMessage('Document added successfully')
      setShowForm(false)
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to add document')
    } finally {
      setSaving(false)
    }
  }

  async function setStatus(row, status) {
    setSaving(true)
    setMessage('')
    try {
      await documentApi.update(row._id, { status })
      setMessage('Document updated')
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update document')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { header: 'Document', accessor: 'title', render: (_, row) => (
      <div>
        <p className="font-medium text-slate-800 dark:text-slate-100">{row.title}</p>
        <p className="text-xs text-slate-400">{row.category || 'GENERAL'}</p>
      </div>
    ) },
    { header: 'Employee', accessor: 'employee', render: (v) => v ? `${v.firstName} ${v.lastName}` : 'Me' },
    { header: 'Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
    { header: 'Expires', accessor: 'expiresAt', render: (v) => formatDate(v) },
  ]

  if (!employeeMode) {
    columns.push({
      header: 'Action',
      key: 'action',
      sortable: false,
      render: (_, row) => (
        <select className="input-field min-w-36" value={row.status} disabled={saving} onChange={(e) => setStatus(row, e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      ),
    })
  }

  return (
    <div className="animate-fade-in space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
            {title}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">
            {subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            className="bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-5 rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)] flex items-center gap-2" 
            onClick={() => { setMessage(''); setShowForm(true); }}
          >
            <Plus className="w-4 h-4" /> Add Document
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
                  <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add New Document</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Upload or link a new record</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={addDocument} className="p-8">
              {message && (
                <div className="mb-6 p-4 rounded-xl text-sm font-medium border bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20">
                  {message}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {!employeeMode && (
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Employee</label>
                    <select required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-base font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm appearance-none cursor-pointer" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
                      <option value="">Select an employee</option>
                      {employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.firstName} {employee.lastName}</option>)}
                    </select>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Document Title</label>
                  <input required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-base font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm" placeholder="e.g. ID Card, Offer Letter" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Category</label>
                  <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-base font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm" placeholder="GENERAL, LEGAL, HR" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Select Document</label>
                  <input 
                    type="file"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3 text-base font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/30 dark:file:text-indigo-400 cursor-pointer" 
                    onChange={(e) => setForm({ ...form, fileUrl: e.target.files[0] ? e.target.files[0].name : '' })} 
                  />
                </div>
              </div>

              <div className="mt-8 flex gap-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-4 rounded-2xl font-bold text-base hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-4 rounded-2xl font-bold text-base transition-all shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)] flex items-center justify-center gap-2">
                  <FilePlus className="w-5 h-5" /> {saving ? 'Adding...' : 'Add Document'}
                </button>
              </div>
            </form>
          </div>
        </div></Portal>
      )}

      {message && <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>}
      <DataTable columns={columns} data={documents} isLoading={loading} searchPlaceholder="Search documents..." emptyMessage="No documents found" />
    </div>
  )
}
