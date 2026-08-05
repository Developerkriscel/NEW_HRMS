'use client'

import { useEffect, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { DataTable } from '@/components/tables/DataTable'
import { taskApi } from '@/services/taskApi'
import { formatDate } from '@/lib/utils'

const STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED']

export function EmployeeTasksWorkspace() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [commentByTask, setCommentByTask] = useState({})

  function load() {
    setLoading(true)
    taskApi.list({ size: 100 })
      .then((res) => setTasks(res.data.data.content || []))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

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

  async function addComment(task) {
    const text = (commentByTask[task._id] || '').trim()
    if (!text) return
    setSaving(true)
    setMessage('')
    try {
      await taskApi.addComment(task._id, text)
      setCommentByTask((current) => ({ ...current, [task._id]: '' }))
      setMessage('Comment added')
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to add comment')
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
    { header: 'Assigned By', accessor: 'assignedBy', render: (v) => v ? `${v.firstName} ${v.lastName}` : '-' },
    { header: 'Due', accessor: 'dueDate', render: (v) => formatDate(v) },
    { header: 'Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
    { header: 'Update', key: 'update', sortable: false, render: (_, row) => (
      <select className="input-field min-w-36" value={row.status} disabled={saving || ['APPROVED', 'REJECTED'].includes(row.status)} onChange={(e) => setStatus(row, e.target.value)}>
        {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
      </select>
    ) },
    { header: 'Comment', key: 'comment', sortable: false, render: (_, row) => (
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        <input className="input-field min-w-40" value={commentByTask[row._id] || ''} onChange={(e) => setCommentByTask((current) => ({ ...current, [row._id]: e.target.value }))} placeholder="Add note" />
        <button className="btn-secondary py-1.5" disabled={saving} onClick={() => addComment(row)}><MessageSquare className="w-4 h-4" /></button>
      </div>
    ) },
  ]

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tasks</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Track assigned tasks and send progress updates to your manager</p>
        </div>
      </div>
      {message && <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>}
      <DataTable columns={columns} data={tasks} isLoading={loading} searchPlaceholder="Search tasks..." emptyMessage="No assigned tasks found" />
    </div>
  )
}
