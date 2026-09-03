import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, Edit3, Gift, Plus, Repeat2, Save, Sparkles, Trash2, X } from 'lucide-react'
import { holidayApi } from '@/services/departmentApi'
import { formatDate } from '@/lib/utils'
import { Portal } from '@/components/common/Portal'

const emptyForm = {
  name: '',
  date: '',
  recurringAnnually: false,
  optional: false,
}

function toInputDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function toForm(holiday) {
  return {
    name: holiday.name || '',
    date: toInputDate(holiday.date),
    recurringAnnually: !!holiday.recurringAnnually,
    optional: !!holiday.optional,
  }
}

function dayName(dateValue) {
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-US', { weekday: 'long' })
}

export function HolidaysSection() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [typeFilter, setTypeFilter] = useState('all')
  const [holidays, setHolidays] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingHoliday, setEditingHoliday] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  function load() {
    setLoading(true)
    setError('')
    holidayApi.getAll({ year })
      .then((res) => setHolidays(res.data.data || []))
      .catch(() => setError('Failed to load holidays'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [year])

  const filteredHolidays = useMemo(() => {
    if (typeFilter === 'mandatory') return holidays.filter((holiday) => !holiday.optional)
    if (typeFilter === 'optional') return holidays.filter((holiday) => holiday.optional)
    if (typeFilter === 'recurring') return holidays.filter((holiday) => holiday.recurringAnnually)
    return holidays
  }, [holidays, typeFilter])

  const stats = useMemo(() => ({
    total: holidays.length,
    mandatory: holidays.filter((holiday) => !holiday.optional).length,
    optional: holidays.filter((holiday) => holiday.optional).length,
    recurring: holidays.filter((holiday) => holiday.recurringAnnually).length,
  }), [holidays])

  function showMessage(text) {
    setMessage(text)
    window.setTimeout(() => setMessage(''), 3000)
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function openCreateModal() {
    setEditingHoliday(null)
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  function openEditModal(holiday) {
    setEditingHoliday(holiday)
    setForm(toForm(holiday))
    setError('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingHoliday(null)
    setForm(emptyForm)
  }

  function validateForm() {
    if (!form.name.trim()) return 'Holiday name is required.'
    if (!form.date) return 'Holiday date is required.'
    const selectedDate = new Date(form.date)
    if (Number.isNaN(selectedDate.getTime())) return 'Holiday date is invalid.'
    return ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name.trim(),
        date: form.date,
        recurringAnnually: form.recurringAnnually,
        optional: form.optional,
      }

      if (editingHoliday?._id) {
        await holidayApi.update(editingHoliday._id, payload)
        showMessage('Holiday updated')
      } else {
        await holidayApi.create(payload)
        showMessage('Holiday added')
      }
      closeModal()
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save holiday')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(holiday) {
    const confirmed = window.confirm(`Delete ${holiday.name}? It will be removed from the holiday calendar.`)
    if (!confirmed) return

    setSaving(true)
    setError('')
    try {
      await holidayApi.delete(holiday._id)
      setHolidays((items) => items.filter((item) => item._id !== holiday._id))
      showMessage('Holiday deleted')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete holiday')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Holiday Calendar</h3>
          <p className="mt-1 text-sm font-medium text-slate-500">Manage mandatory holidays, optional leaves, and annually recurring holidays.</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Add Holiday
        </button>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" /> {message}
        </div>
      )}

      {error && !modalOpen && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10">
          {error} {error === 'Failed to load holidays' && <button type="button" onClick={load} className="ml-1 underline">Retry</button>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Holidays', value: stats.total, icon: CalendarDays, color: 'blue' },
          { label: 'Mandatory', value: stats.mandatory, icon: Gift, color: 'emerald' },
          { label: 'Optional', value: stats.optional, icon: Sparkles, color: 'amber' },
          { label: 'Recurring', value: stats.recurring, icon: Repeat2, color: 'violet' },
        ].map((stat) => {
          const Icon = stat.icon
          const colorClasses = {
            blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300',
            emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
            amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300',
            violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300',
          }[stat.color]

          return (
            <div key={stat.label} className="rounded-3xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/60">
              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${colorClasses}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{stat.value}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">{stat.label}</p>
            </div>
          )
        })}
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/60 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All' },
            { id: 'mandatory', label: 'Mandatory' },
            { id: 'optional', label: 'Optional' },
            { id: 'recurring', label: 'Recurring' },
          ].map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setTypeFilter(filter.id)}
              className={`rounded-xl px-4 py-2 text-xs font-black transition-all ${
                typeFilter === filter.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <select className="input-field w-full bg-white/70 !py-2 text-sm sm:w-36" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
        </div>
      ) : filteredHolidays.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center dark:border-slate-700 dark:bg-slate-800/20">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-100 bg-white text-amber-500 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <CalendarDays className="h-8 w-8" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">No holidays found</h3>
          <p className="mx-auto mb-6 max-w-sm text-sm text-slate-500 dark:text-slate-400">Add holidays for {year} so leave calendars and attendance planning stay accurate.</p>
          <button onClick={openCreateModal} className="rounded-xl bg-indigo-50 px-6 py-2.5 text-sm font-bold text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400">
            Add Holiday
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredHolidays.map((holiday) => (
            <div key={holiday._id} className="group relative overflow-hidden rounded-3xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700/50 dark:bg-slate-900/70">
              <div className="absolute right-0 top-0 h-28 w-28 -translate-y-1/2 translate-x-1/2 rounded-full bg-amber-500/10 blur-2xl transition-colors group-hover:bg-amber-500/20" />
              <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${holiday.optional ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'}`}>
                    {holiday.optional ? <Sparkles className="h-5 w-5" /> : <Gift className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <h4 className="truncate text-base font-black text-slate-900 dark:text-white">{holiday.name}</h4>
                    <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{formatDate(holiday.date)} · {dayName(holiday.date)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${holiday.optional ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'}`}>
                        {holiday.optional ? 'Optional' : 'Mandatory'}
                      </span>
                      {holiday.recurringAnnually && (
                        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
                          Recurring
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button type="button" onClick={() => openEditModal(holiday)} className="rounded-xl border border-slate-200 bg-white/80 p-2 text-slate-500 transition-colors hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800">
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => handleDelete(holiday)} disabled={saving} className="rounded-xl border border-slate-200 bg-white/80 p-2 text-slate-500 transition-colors hover:text-rose-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={closeModal} />
            <div className="relative max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/60 px-8 py-6 dark:border-slate-800 dark:bg-slate-800/20">
                <div>
                  <h3 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
                    {editingHoliday ? <Edit3 className="h-5 w-5 text-indigo-500" /> : <Plus className="h-5 w-5 text-indigo-500" />}
                    {editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">Add a calendar holiday with mandatory, optional, or annual recurring settings.</p>
                </div>
                <button onClick={closeModal} className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-6 p-8">
                {error && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Holiday Name</span>
                    <input
                      className="input-field bg-slate-50/70 focus:bg-white"
                      placeholder="e.g. Republic Day"
                      value={form.name}
                      onChange={(e) => updateField('name', e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Holiday Date</span>
                    <input
                      type="date"
                      className="input-field bg-slate-50/70 focus:bg-white"
                      value={form.date}
                      onChange={(e) => updateField('date', e.target.value)}
                    />
                  </label>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Preview</p>
                    <p className="mt-2 text-sm font-black text-slate-900 dark:text-white">{form.date ? dayName(form.date) : 'Select a date'}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">{form.date ? formatDate(form.date) : 'Date will appear here'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
                    <span>
                      <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">Optional Leave</span>
                      <span className="block text-xs font-medium text-slate-500">Employee may choose to use it.</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={form.optional}
                      onChange={(e) => updateField('optional', e.target.checked)}
                      className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
                    <span>
                      <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">Repeat Every Year</span>
                      <span className="block text-xs font-medium text-slate-500">Useful for fixed-date holidays.</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={form.recurringAnnually}
                      onChange={(e) => updateField('recurringAnnually', e.target.checked)}
                      className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 pt-6 dark:border-slate-800">
                  <button type="button" onClick={closeModal} className="rounded-xl px-6 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700 disabled:opacity-50">
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : editingHoliday ? 'Update Holiday' : 'Create Holiday'}
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
