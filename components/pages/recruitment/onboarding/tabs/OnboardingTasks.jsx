import React, { useState } from 'react'
import { Plus, Check, Trash2, X, Calendar as CalendarIcon } from 'lucide-react'
import { Portal } from '@/components/common/Portal'
import { preboardingApi } from '@/services/preboardingApi'

export function OnboardingTasks({ record, onRefresh }) {
  const [isAdding, setIsAdding] = useState(false)
  const [newTask, setNewTask] = useState({ name: '', assignedTo: '', dueDate: '', priority: 'Medium', required: true })
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')

  const handleToggleStatus = async (taskId, currentStatus) => {
    setSaving(taskId)
    setError('')
    try {
      await preboardingApi.updateTask(record.id, taskId, { status: currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED' })
      await onRefresh?.()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update task')
    } finally {
      setSaving('')
    }
  }

  const handleAddTask = async () => {
    if (newTask.name && newTask.assignedTo) {
      setSaving('new')
      setError('')
      try {
        await preboardingApi.addTask(record.id, newTask)
        setIsAdding(false)
        setNewTask({ name: '', assignedTo: '', dueDate: '', priority: 'Medium', required: true })
        await onRefresh?.()
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to add task')
      } finally {
        setSaving('')
      }
    }
  }

  const handleDeleteTask = async (taskId) => {
    setSaving(taskId)
    setError('')
    try {
      await preboardingApi.deleteTask(record.id, taskId)
      await onRefresh?.()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete task')
    } finally {
      setSaving('')
    }
  }

  const getPriorityColor = (prio) => {
    switch(prio) {
      case 'High': return 'text-red-600 bg-red-100 dark:bg-red-900/30'
      case 'Medium': return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30'
      case 'Low': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30'
      default: return 'text-slate-600 bg-slate-100 dark:bg-slate-800'
    }
  }

  return (
    <div className="p-6 md:p-8 animate-in fade-in duration-300 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Onboarding Tasks</h3>
          <p className="text-sm text-slate-500">Manage and track checklist items for this candidate.</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>
      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden mb-6 flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider w-12 text-center">Done</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Task Details</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned To</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Due Date</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {record.tasks.map(task => {
              const isCompleted = task.status === 'COMPLETED'
              return (
                <tr key={task.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors ${isCompleted ? 'opacity-60' : ''}`}>
                  <td className="py-4 px-6 text-center">
                    <button 
                      onClick={() => handleToggleStatus(task.id, task.status)}
                      disabled={saving === task.id}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'}`}
                    >
                      {isCompleted && <Check className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="py-4 px-6">
                    <p className={`font-bold text-slate-900 dark:text-white ${isCompleted ? 'line-through text-slate-500' : ''}`}>{task.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getPriorityColor(task.priority)}`}>{task.priority} Priority</span>
                      {task.required && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">Required</span>}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold">{task.assignedTo.charAt(0)}</div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{task.assignedTo}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <CalendarIcon className="w-4 h-4 text-slate-400" /> {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${isCompleted ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      disabled={saving === task.id}
                      className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 disabled:opacity-50"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {isAdding && (
        <Portal><div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="max-h-[90dvh] overflow-y-auto bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white">Add New Task</h3>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <label className="block">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Task Name</span>
                <input className="input-field" placeholder="e.g. Provide Laptop" value={newTask.name} onChange={e => setNewTask({...newTask, name: e.target.value})} />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Assign To</span>
                <input className="input-field" placeholder="e.g. IT Admin" value={newTask.assignedTo} onChange={e => setNewTask({...newTask, assignedTo: e.target.value})} />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Due Date</span>
                  <input type="date" className="input-field" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Priority</span>
                  <select className="input-field" value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})}>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </label>
              </div>
              <label className="flex items-center gap-2 mt-4 cursor-pointer">
                <input type="checkbox" checked={newTask.required} onChange={e => setNewTask({...newTask, required: e.target.checked})} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">This task is mandatory for Employee Conversion</span>
              </label>
              <div className="pt-4 flex gap-3">
                <button onClick={() => setIsAdding(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button onClick={handleAddTask} disabled={!newTask.name || !newTask.assignedTo || saving === 'new'} className="btn-primary flex-1 justify-center">
                  {saving === 'new' ? 'Saving...' : 'Add Task'}
                </button>
              </div>
            </div>
          </div>
        </div></Portal>
      )}
    </div>
  )
}
