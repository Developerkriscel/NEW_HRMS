import { useEffect, useState } from 'react'
import { CalendarDays, CheckCircle2, Clock, Edit3, Plus, Save, Timer, Trash2, X } from 'lucide-react'
import { shiftApi } from '@/services/departmentApi'
import { Portal } from '@/components/common/Portal'
import { useAuthStore } from '@/store/authStore'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DEFAULT_WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

const DEFAULT_SHIFT_FORM = {
  name: '',
  startTime: '09:00',
  endTime: '18:00',
  gracePeriodMinutes: 15,
  workingDays: DEFAULT_WORKING_DAYS,
  weeklyOff: ['Saturday', 'Sunday'],
  active: true,
}

function normalizeShift(shift) {
  const workingDays = Array.isArray(shift.workingDays) && shift.workingDays.length
    ? shift.workingDays
    : DEFAULT_WORKING_DAYS
  const weeklyOff = Array.isArray(shift.weeklyOff) && shift.weeklyOff.length
    ? shift.weeklyOff
    : DAYS.filter((day) => !workingDays.includes(day))

  return { ...shift, workingDays, weeklyOff }
}

function formatDays(days = []) {
  return days.length ? days.map((day) => day.slice(0, 3)).join(', ') : '-'
}

export function ShiftsSection() {
  const currentUser = useAuthStore((s) => s.user)
  const canManage = ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'].includes(currentUser?.role)
  const canDelete = ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'].includes(currentUser?.role)

  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingShift, setEditingShift] = useState(null)
  const [form, setForm] = useState(DEFAULT_SHIFT_FORM)
  const [savingShift, setSavingShift] = useState(false)

  function load() {
    setLoading(true)
    setError('')
    shiftApi.getAll()
      .then((res) => setShifts((res.data.data || []).map(normalizeShift)))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load shifts.'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  function showMessage(text) {
    setMessage(text)
    window.setTimeout(() => setMessage(''), 3000)
  }

  function toggleWorkingDay(day) {
    const isWorking = form.workingDays.includes(day)
    const workingDays = isWorking
      ? form.workingDays.filter((item) => item !== day)
      : [...form.workingDays, day]
    const weeklyOff = DAYS.filter((item) => !workingDays.includes(item))
    setForm({ ...form, workingDays, weeklyOff })
  }

  function openCreateModal() {
    setEditingShift(null)
    setForm(DEFAULT_SHIFT_FORM)
    setIsModalOpen(true)
  }

  function openEditModal(shift) {
    const normalized = normalizeShift(shift)
    setEditingShift(normalized)
    setForm({
      name: normalized.name || '',
      startTime: normalized.startTime || '09:00',
      endTime: normalized.endTime || '18:00',
      gracePeriodMinutes: Number(normalized.gracePeriodMinutes || 0),
      workingDays: normalized.workingDays,
      weeklyOff: normalized.weeklyOff,
      active: normalized.active !== false,
    })
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditingShift(null)
    setForm(DEFAULT_SHIFT_FORM)
  }

  async function handleSaveShift(e) {
    e.preventDefault()
    if (!canManage) return
    if (!form.name.trim() || !form.startTime || !form.endTime) {
      setError('Please enter shift name, start time, and end time.')
      return
    }
    if (form.startTime === form.endTime) {
      setError('Shift start and end time cannot be same.')
      return
    }
    if (!form.workingDays.length) {
      setError('Please keep at least one working day in the shift.')
      return
    }

    setSavingShift(true)
    setError('')
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        gracePeriodMinutes: Number(form.gracePeriodMinutes || 0),
        weeklyOff: DAYS.filter((day) => !form.workingDays.includes(day)),
      }
      if (editingShift?._id) {
        await shiftApi.update(editingShift._id, payload)
        showMessage('Shift updated')
      } else {
        await shiftApi.create(payload)
        showMessage('Shift created')
      }
      closeModal()
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save shift.')
    } finally {
      setSavingShift(false)
    }
  }

  async function handleDeleteShift(shift) {
    if (!canDelete || !window.confirm(`Delete ${shift.name}?`)) return
    setError('')
    try {
      await shiftApi.delete(shift._id)
      setShifts((items) => items.filter((item) => item._id !== shift._id))
      showMessage('Shift deleted')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete shift.')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Shifts & Weekly Schedule</h2>
          <p className="mt-1 max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
            Create complete shift templates with timing, grace period, working days, and weekly off. These templates feed onboarding and employee profiles.
          </p>
        </div>
        {canManage && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> Add Shift
          </button>
        )}
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" /> {message}
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10">
          {error}
        </div>
      )}

      {shifts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center dark:border-slate-700 dark:bg-slate-800/20">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-100 bg-white text-indigo-500 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <Clock className="h-8 w-8" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">No shifts configured</h3>
          <p className="mx-auto mb-6 max-w-sm text-sm text-slate-500 dark:text-slate-400">Create a shift first so onboarding can show it in the shift dropdown.</p>
          {canManage && (
            <button onClick={openCreateModal} className="rounded-xl bg-indigo-50 px-6 py-2.5 text-sm font-bold text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400">
              Create First Shift
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {shifts.map((shift) => (
            <div key={shift._id} className="group relative overflow-hidden rounded-3xl border border-white/50 bg-white/70 p-6 shadow-sm backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700/50 dark:bg-slate-900/60">
              <div className="absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-500/10 to-transparent transition-transform duration-500 group-hover:scale-150" />
              <div className="relative z-10">
                <div className="mb-5 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div className="flex items-center gap-1">
                    {canManage && (
                      <button onClick={() => openEditModal(shift)} className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800" title="Edit shift">
                        <Edit3 className="h-4 w-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => handleDeleteShift(shift)} className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10" title="Delete shift">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mb-5">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xl font-black text-slate-900 dark:text-white">{shift.name}</h4>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${shift.active === false ? 'bg-slate-100 text-slate-500 dark:bg-slate-800' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'}`}>
                      {shift.active === false ? 'Inactive' : 'Active'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                    <span>{shift.startTime}</span>
                    <span className="h-px w-5 bg-slate-300 dark:bg-slate-700" />
                    <span>{shift.endTime}</span>
                  </div>
                </div>

                <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                      <Timer className="h-3.5 w-3.5" /> {shift.gracePeriodMinutes || 0}m grace
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                      <CalendarDays className="h-3.5 w-3.5" /> {shift.workingDays.length} working days
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-xs font-bold text-slate-500">
                    <p><span className="text-emerald-600">Working:</span> {formatDays(shift.workingDays)}</p>
                    <p><span className="text-rose-600">Weekly off:</span> {formatDays(shift.weeklyOff)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={closeModal} />
            <div className="relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/60 px-8 py-6 dark:border-slate-800 dark:bg-slate-800/20">
                <div>
                  <h3 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
                    {editingShift ? <Edit3 className="h-5 w-5 text-indigo-500" /> : <Plus className="h-5 w-5 text-indigo-500" />}
                    {editingShift ? 'Edit Shift' : 'Create Shift'}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">Timing, grace period, and weekly schedule will auto-fill in onboarding after selection.</p>
                </div>
                <button onClick={closeModal} className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveShift} className="space-y-6 p-8">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">Shift Name</span>
                  <input
                    type="text"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-900"
                    placeholder="e.g. General, Morning Shift, Night Shift"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </label>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">Start Time</span>
                    <input
                      type="time"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-900"
                      value={form.startTime}
                      onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">End Time</span>
                    <input
                      type="time"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-900"
                      value={form.endTime}
                      onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">Grace Minutes</span>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-900"
                      value={form.gracePeriodMinutes}
                      onChange={(e) => setForm({ ...form, gracePeriodMinutes: parseInt(e.target.value, 10) || 0 })}
                    />
                  </label>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Working Days & Weekly Off</p>
                      <p className="mt-1 text-xs font-medium text-slate-500">Click a day to toggle it between working and off for this shift.</p>
                    </div>
                    <div className="flex gap-4 text-xs font-bold text-slate-500">
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Working</span>
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Off</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {DAYS.map((day) => {
                      const isWorking = form.workingDays.includes(day)
                      return (
                        <button
                          type="button"
                          key={day}
                          onClick={() => toggleWorkingDay(day)}
                          className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                            isWorking
                              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                              : 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                          }`}
                        >
                          {day}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <label className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
                  <span>
                    <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">Active shift</span>
                    <span className="block text-xs font-medium text-slate-500">Inactive shifts stay saved but are hidden in onboarding dropdowns.</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </label>

                <div className="flex justify-end gap-3 border-t border-slate-100 pt-6 dark:border-slate-800">
                  <button type="button" onClick={closeModal} className="rounded-xl px-6 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                    Cancel
                  </button>
                  <button type="submit" disabled={savingShift} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700 disabled:opacity-50">
                    <Save className="h-4 w-4" />
                    {savingShift ? 'Saving...' : editingShift ? 'Update Shift' : 'Create Shift'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}
