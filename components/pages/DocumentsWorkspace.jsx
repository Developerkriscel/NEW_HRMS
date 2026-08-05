'use client'

import { useEffect, useState } from 'react'
import { FilePlus } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { DataTable } from '@/components/tables/DataTable'
import { documentApi } from '@/services/documentApi'
import { employeeApi } from '@/services/employeeApi'
import { formatDate } from '@/lib/utils'

const STATUSES = ['PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED']

export function DocumentsWorkspace({ title, subtitle, employeeMode = false }) {
  const [documents, setDocuments] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
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
      setMessage('Document added')
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
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{subtitle}</p>
        </div>
      </div>

      <form onSubmit={addDocument} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        {!employeeMode && (
          <select required className="input-field" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
            <option value="">Employee</option>
            {employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.firstName} {employee.lastName}</option>)}
          </select>
        )}
        <input required className="input-field" placeholder="Document title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className="input-field" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <input className="input-field md:col-span-2" placeholder="File URL" value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} />
        <button disabled={saving} className="btn-primary"><FilePlus className="w-4 h-4" /> Add</button>
      </form>

      {message && <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>}
      <DataTable columns={columns} data={documents} isLoading={loading} searchPlaceholder="Search documents..." emptyMessage="No documents found" />
    </div>
  )
}
