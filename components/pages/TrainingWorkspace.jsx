'use client'

import { useEffect, useState } from 'react'
import { GraduationCap, Plus, X, Calendar, User, Tag, Check, Users } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { DataTable } from '@/components/tables/DataTable'
import { employeeApi } from '@/services/employeeApi'
import { trainingApi } from '@/services/trainingApi'
import { formatDate } from '@/lib/utils'
import { Portal } from '@/components/common/Portal'

const STATUSES = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

export function TrainingWorkspace() {
  const [sessions, setSessions] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ title: '', category: '', trainer: '', scheduledAt: '', attendeeIds: [] })
  const [isModalOpen, setIsModalOpen] = useState(false)

  function load() {
    setLoading(true)
    Promise.all([trainingApi.list(), employeeApi.getAll({ size: 200 })])
      .then(([trainingRes, employeeRes]) => {
        setSessions(trainingRes.data.data || [])
        setEmployees(employeeRes.data.data.content || [])
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function createTraining(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await trainingApi.create(form)
      setForm({ title: '', category: '', trainer: '', scheduledAt: '', attendeeIds: [] })
      setIsModalOpen(false)
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to create training')
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(row, status) {
    setSaving(true)
    setMessage('')
    try {
      await trainingApi.update(row._id, { status })
      load()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update training')
    } finally {
      setSaving(false)
    }
  }

  const toggleAttendee = (id) => {
    setForm(prev => {
      const isSelected = prev.attendeeIds.includes(id)
      if (isSelected) {
        return { ...prev, attendeeIds: prev.attendeeIds.filter(a => a !== id) }
      } else {
        return { ...prev, attendeeIds: [...prev.attendeeIds, id] }
      }
    })
  }

  const selectAllAttendees = () => {
    if (form.attendeeIds.length === employees.length) {
      setForm({ ...form, attendeeIds: [] })
    } else {
      setForm({ ...form, attendeeIds: employees.map(e => e._id) })
    }
  }

  const columns = [
    { header: 'Training', accessor: 'title', render: (_, row) => (
      <div>
        <p className="font-medium text-slate-800 dark:text-slate-100">{row.title}</p>
        <p className="text-xs text-slate-400">{row.category || 'General'} - {row.trainer || 'No trainer'}</p>
      </div>
    ) },
    { header: 'Date', accessor: 'scheduledAt', render: (v) => formatDate(v) },
    { header: 'Attendees', accessor: 'attendees', render: (v) => Array.isArray(v) ? (
      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
        <Users className="w-4 h-4 text-slate-400" />
        {v.length}
      </div>
    ) : 0 },
    { header: 'Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
    { header: 'Action', key: 'action', sortable: false, render: (_, row) => (
      <select className="input-field min-w-36 text-sm" value={row.status} disabled={saving} onChange={(e) => updateStatus(row, e.target.value)}>
        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    ) },
  ]

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-indigo-500" /> Training Programs
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Schedule sessions, assign courses, and track completion.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary shadow-[0_0_15px_-3px_rgba(79,70,229,0.4)]">
          <Plus className="w-4 h-4 mr-2" /> Schedule Training
        </button>
      </div>

      <DataTable columns={columns} data={sessions} isLoading={loading} searchPlaceholder="Search training..." emptyMessage="No training sessions found" />

      {/* Premium Modal Overlay */}
      {isModalOpen && (
        <Portal><div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>
            
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between relative z-10">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-500" />
                  Schedule New Training
                </h2>
                <p className="text-xs text-slate-500 mt-1">Configure and assign a new training program</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 relative z-10 custom-scrollbar">
              <form id="create-training-form" onSubmit={createTraining} className="space-y-6">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                       Title <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      required 
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-900 dark:text-white placeholder:text-slate-400" 
                      placeholder="e.g. Next.js Advanced Workshop" 
                      value={form.title} 
                      onChange={(e) => setForm({ ...form, title: e.target.value })} 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-slate-400" /> Category
                    </label>
                    <input 
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-900 dark:text-white placeholder:text-slate-400" 
                      placeholder="e.g. Technical Skills" 
                      value={form.category} 
                      onChange={(e) => setForm({ ...form, category: e.target.value })} 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-slate-400" /> Trainer Name
                    </label>
                    <input 
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-900 dark:text-white placeholder:text-slate-400" 
                      placeholder="e.g. John Doe" 
                      value={form.trainer} 
                      onChange={(e) => setForm({ ...form, trainer: e.target.value })} 
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" /> Schedule Date & Time <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      required 
                      type="datetime-local" 
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-900 dark:text-white" 
                      value={form.scheduledAt} 
                      onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-slate-400" /> Select Attendees
                    </label>
                    <button type="button" onClick={selectAllAttendees} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-lg">
                      {form.attendeeIds.length === employees.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  
                  <div className="bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-3 max-h-[260px] overflow-y-auto custom-scrollbar shadow-inner">
                    {employees.length === 0 ? (
                      <div className="text-center py-8 text-sm text-slate-500 font-medium">No employees found.</div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {employees.map(employee => {
                          const isSelected = form.attendeeIds.includes(employee._id)
                          return (
                            <div 
                              key={employee._id}
                              onClick={() => toggleAttendee(employee._id)}
                              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                                isSelected 
                                  ? 'bg-white dark:bg-slate-800 border-indigo-500 shadow-[0_0_0_1px_rgba(99,102,241,1)]' 
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm'
                              }`}
                            >
                              <div className={`w-5 h-5 shrink-0 rounded flex items-center justify-center transition-colors border ${
                                isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600'
                              }`}>
                                {isSelected && <Check className="w-3.5 h-3.5" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={`text-sm font-bold truncate ${isSelected ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-300'}`}>
                                  {employee.firstName} {employee.lastName}
                                </p>
                                <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">{employee.department?.name || 'No Department'}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{form.attendeeIds.length} {form.attendeeIds.length === 1 ? 'employee' : 'employees'} selected</p>
                </div>

                {message && (
                  <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium">
                    {message}
                  </div>
                )}
              </form>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex justify-end gap-3 relative z-10">
              <button 
                type="button" 
                disabled={saving} 
                onClick={() => setIsModalOpen(false)} 
                className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="create-training-form" 
                disabled={saving} 
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
              >
                {saving ? (
                  <><span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></span> Scheduling...</>
                ) : (
                  'Schedule Training'
                )}
              </button>
            </div>
          </div>
        </div>
      </Portal>
      )}
    </div>
  )
}
