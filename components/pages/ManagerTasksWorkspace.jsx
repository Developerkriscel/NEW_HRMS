'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { DataTable } from '@/components/tables/DataTable'
import { employeeApi } from '@/services/employeeApi'
import { taskApi } from '@/services/taskApi'
import { formatDate } from '@/lib/utils'

const STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'APPROVED', 'REJECTED']

export function ManagerTasksWorkspace() {
  const [employees, setEmployees] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ assignedTo: '', title: '', priority: 'MEDIUM', dueDate: '', description: '' })

  function load() {
    setLoading(true)
    Promise.all([employeeApi.getAll({ size: 200 }), taskApi.list({ size: 100 })])
      .then(([employeeRes, taskRes]) => {
        setEmployees(employeeRes.data.data.content || [])
        setTasks(taskRes.data.data.content || [])
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function assignTask(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await taskApi.assign(form)
      setForm({ assignedTo: '', title: '', priority: 'MEDIUM', dueDate: '', description: '' })
      setMessage('Task assigned')
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to assign task')
    } finally {
      setSaving(false)
    }
  }

  async function setStatus(task, status) {
    setSaving(true)
    setMessage('')
    try {
      await taskApi.setStatus(task._id, status)
      setMessage('Task updated')
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update task')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { header: 'Task', accessor: 'title', render: (_, row) => (
      <div>
        <p className="font-medium text-slate-800 dark:text-slate-100">{row.title}</p>
        <p className="text-xs text-slate-400">{row.priority} - {row.description || 'No description'}</p>
      </div>
    ) },
    { header: 'Assigned To', accessor: 'assignedTo', render: (v) => v ? `${v.firstName} ${v.lastName}` : '-' },
    { header: 'Due', accessor: 'dueDate', render: (v) => formatDate(v) },
    { header: 'Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
    { header: 'Action', key: 'action', sortable: false, render: (_, row) => (
      <select className="input-field min-w-36" value={row.status} disabled={saving} onChange={(e) => setStatus(row, e.target.value)}>
        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    ) },
  ]

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tasks</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Assign and track work for your direct reports</p>
        </div>
      </div>

      <form onSubmit={assignTask} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <select required className="input-field" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}>
          <option value="">Assign to</option>
          {employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.firstName} {employee.lastName}</option>)}
        </select>
        <input required className="input-field md:col-span-2" placeholder="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <select className="input-field" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
          {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <input type="date" className="input-field" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        <textarea className="input-field md:col-span-4" rows={2} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <button disabled={saving} className="btn-primary self-start"><Plus className="w-4 h-4" /> Assign</button>
      </form>

      {message && <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>}
      <DataTable columns={columns} data={tasks} isLoading={loading} searchPlaceholder="Search tasks..." emptyMessage="No tasks found" />
    </div>
  )
}
