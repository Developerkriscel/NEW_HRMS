'use client'

import { useEffect, useState } from 'react'
import { GraduationCap, Plus, X, Calendar, User, Tag, Check, Users, Eye, BookOpen, Clock, StickyNote, Play, CheckCircle2, Ban, Pause, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { DataTable } from '@/components/tables/DataTable'
import { employeeApi } from '@/services/employeeApi'
import { trainingApi } from '@/services/trainingApi'
import { formatDate } from '@/lib/utils'
import { Portal } from '@/components/common/Portal'

export function TrainingWorkspace() {
  const [sessions, setSessions] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [viewTraining, setViewTraining] = useState(null)
  const [form, setForm] = useState({ title: '', category: '', trainer: '', scheduledAt: '', attendeeIds: [] })
  const [isModalOpen, setIsModalOpen] = useState(false)

  function durationText(minutes) {
    const total = Number(minutes || 0)
    if (!total) return '-'
    const hours = Math.floor(total / 60)
    const mins = total % 60
    if (!hours) return `${mins} min`
    return `${hours}h ${mins}m`
  }

  function currentDurationMinutes(training) {
    const saved = Number(training?.totalDurationMinutes || 0)
    if (training?.status !== 'IN_PROGRESS' || !training?.activeStartedAt) return saved
    const activeDiff = Math.max(0, Math.round((Date.now() - new Date(training.activeStartedAt).getTime()) / 60000))
    return saved + activeDiff
  }

  function load() {
    setLoading(true)
    Promise.all([trainingApi.list({ size: 20 }), employeeApi.getAll({ size: 50 })])
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
    const confirmation = status === 'CANCELLED'
      ? 'Cancel this training session?'
      : status === 'COMPLETED'
        ? 'Mark this training session as completed?'
        : ''
    if (confirmation && !window.confirm(confirmation)) return

    setSaving(true)
    setMessage('')
    try {
      const res = await trainingApi.update(row._id, { status })
      const updated = res.data?.data
      if (updated?._id) {
        const mergeTraining = (base) => {
          if (!base || base._id !== updated._id) return base
          const next = { ...base, ...updated }
          const firstAttendee = Array.isArray(updated.attendees) ? updated.attendees[0] : null
          if (typeof firstAttendee === 'string' || firstAttendee?._bsontype === 'ObjectId') {
            next.attendees = base.attendees
          }
          return next
        }
        setSessions((prev) => prev.map(mergeTraining))
        setViewTraining((current) => mergeTraining(current))
      } else {
        load()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update training')
    } finally {
      setSaving(false)
    }
  }

  function TrainingActions({ row }) {
    const actions = []
    if (row.status === 'PLANNED') {
      actions.push({ label: 'Start', status: 'IN_PROGRESS', icon: Play, className: 'text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100' })
      actions.push({ label: 'Cancel', status: 'CANCELLED', icon: Ban, className: 'text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100' })
    }
    if (row.status === 'IN_PROGRESS') {
      actions.push({ label: 'Pause', status: 'PAUSED', icon: Pause, className: 'text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100' })
      actions.push({ label: 'Complete', status: 'COMPLETED', icon: CheckCircle2, className: 'text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100' })
    }
    if (row.status === 'PAUSED') {
      actions.push({ label: 'Resume', status: 'IN_PROGRESS', icon: RotateCcw, className: 'text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100' })
      actions.push({ label: 'Complete', status: 'COMPLETED', icon: CheckCircle2, className: 'text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100' })
    }

    return (
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {actions.map((action) => (
          <button
            key={action.status}
            type="button"
            disabled={saving}
            onClick={() => updateStatus(row, action.status)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60 ${action.className}`}
          >
            <action.icon className="h-3.5 w-3.5" />
            {action.label}
          </button>
        ))}
        {actions.length === 0 && (
          <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-extrabold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {row.status === 'COMPLETED' ? 'Completed' : 'Closed'}
          </span>
        )}
        <button
          type="button"
          onClick={() => setViewTraining(row)}
          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-indigo-500/10"
          title="View Details"
        >
          <Eye className="h-4 w-4" />
        </button>
      </div>
    )
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
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-indigo-500" />
        </div>
        <p className="font-bold text-slate-900 dark:text-slate-100">{row.title}</p>
      </div>
    ) },
    { header: 'Category', accessor: 'category', render: (v) => <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{v || 'General'}</span> },
    { header: 'Trainer', accessor: 'trainer', render: (v) => <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{v || 'Unassigned'}</span> },
    { header: 'Date', accessor: 'scheduledAt', render: (v) => formatDate(v) },
    { header: 'Attendees', accessor: 'attendees', render: (v) => Array.isArray(v) ? (
      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
        <Users className="w-4 h-4 text-slate-400" />
        {v.length}
      </div>
    ) : 0 },
    { header: 'Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
    { header: 'Action', key: 'action', sortable: false, render: (_, row) => <TrainingActions row={row} /> },
  ]

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400 dark:from-indigo-400 dark:to-indigo-300 hover:scale-[1.02] transition-transform duration-300 relative w-fit pb-2 after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-1/3 after:h-1 after:bg-gradient-to-r after:from-indigo-500 after:to-transparent after:rounded-full flex items-center gap-2">
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

      {/* View Training Details Drawer */}
      {viewTraining && (
        <Portal>
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={() => setViewTraining(null)} />
            <div className="relative w-full max-w-md bg-white dark:bg-slate-950 h-full shadow-2xl flex flex-col animate-slide-in-right border-l border-slate-200 dark:border-slate-800">
              
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shadow-inner">
                    <GraduationCap className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Training Details</h2>
                    <p className="text-sm font-medium text-slate-500 mt-0.5">{viewTraining.category || 'General'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewTraining(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                
                {/* Training Overview */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">{viewTraining.title}</h3>
                    <Badge>{viewTraining.status}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Trainer</span>
                      <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">{viewTraining.trainer || 'Unassigned'}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Date</span>
                      <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">{formatDate(viewTraining.scheduledAt) || 'Not set'}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Started At</span>
                      <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">{viewTraining.startedAt ? formatDate(viewTraining.startedAt, 'dd MMM yyyy hh:mm a') : '-'}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Paused At</span>
                      <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">{viewTraining.pausedAt ? formatDate(viewTraining.pausedAt, 'dd MMM yyyy hh:mm a') : '-'}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Running Since</span>
                      <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">{viewTraining.activeStartedAt ? formatDate(viewTraining.activeStartedAt, 'dd MMM yyyy hh:mm a') : '-'}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Completed At</span>
                      <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">{viewTraining.completedAt ? formatDate(viewTraining.completedAt, 'dd MMM yyyy hh:mm a') : '-'}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500">Actual Duration</span>
                      <p className="mt-1 text-sm font-semibold text-indigo-900 dark:text-indigo-100">{durationText(currentDurationMinutes(viewTraining))}</p>
                    </div>
                  </div>
                  
                  {viewTraining.notes && (
                    <div className="mt-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20">
                      <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-500 mb-2">
                        <StickyNote className="w-3.5 h-3.5" /> Notes
                      </h4>
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-200 leading-relaxed">{viewTraining.notes}</p>
                    </div>
                  )}
                </section>

                {/* Attendees List */}
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
                    <Users className="h-4 w-4 text-indigo-600" /> Attendees ({viewTraining.attendees?.length || 0})
                  </h3>
                  
                  {viewTraining.attendees && viewTraining.attendees.length > 0 ? (
                    <div className="space-y-3">
                      {viewTraining.attendees.map((attendee) => (
                        <div key={attendee._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                              {attendee.firstName?.[0]}{attendee.lastName?.[0]}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">{attendee.firstName} {attendee.lastName}</p>
                              <p className="text-xs font-medium text-slate-500">{attendee.employeeCode}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-slate-500 italic">No attendees added to this session.</p>
                  )}
                </section>
                
              </div>

              {!['COMPLETED', 'CANCELLED'].includes(viewTraining.status) && (
                <div className="border-t border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                  {viewTraining.status === 'PLANNED' && (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => updateStatus(viewTraining, 'CANCELLED')}
                        className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-extrabold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                      >
                        Cancel Training
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => updateStatus(viewTraining, 'IN_PROGRESS')}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700 disabled:opacity-60"
                      >
                        <Play className="h-4 w-4" /> Start Training
                      </button>
                    </div>
                  )}

                  {viewTraining.status === 'IN_PROGRESS' && (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => updateStatus(viewTraining, 'PAUSED')}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-extrabold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
                      >
                        <Pause className="h-4 w-4" /> Pause
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => updateStatus(viewTraining, 'COMPLETED')}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-700 disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4" /> End Training
                      </button>
                    </div>
                  )}

                  {viewTraining.status === 'PAUSED' && (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => updateStatus(viewTraining, 'IN_PROGRESS')}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-extrabold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
                      >
                        <RotateCcw className="h-4 w-4" /> Resume
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => updateStatus(viewTraining, 'COMPLETED')}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-700 disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4" /> End Training
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}
