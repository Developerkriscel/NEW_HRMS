import { useEffect, useMemo, useState } from 'react'
import { Building2, CheckCircle2, Edit3, Layers, Plus, Save, ShieldCheck, Trash2, UserRound, X } from 'lucide-react'
import { departmentApi } from '@/services/departmentApi'
import { employeeApi } from '@/services/employeeApi'
import { Portal } from '@/components/common/Portal'

const emptyForm = {
  name: '',
  code: '',
  description: '',
  head: '',
  active: true,
}

function toForm(department) {
  return {
    name: department.name || '',
    code: department.code || '',
    description: department.description || '',
    head: department.head?._id || department.head || '',
    active: department.active !== false,
  }
}

function headName(head) {
  if (!head) return 'No department head assigned'
  return [head.firstName, head.lastName].filter(Boolean).join(' ') || head.email || 'Assigned head'
}

export function DepartmentsSection() {
  const [departments, setDepartments] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingDepartment, setEditingDepartment] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  function load() {
    setLoading(true)
    setError('')
    Promise.allSettled([
      departmentApi.getAll(),
      employeeApi.getAll({ size: 200, status: 'ACTIVE' }),
    ])
      .then(([departmentResult, employeeResult]) => {
        if (departmentResult.status === 'fulfilled') {
          setDepartments(departmentResult.value.data.data || [])
        } else {
          setError('Failed to load departments')
        }

        if (employeeResult.status === 'fulfilled') {
          setEmployees(employeeResult.value.data.data?.content || employeeResult.value.data.data || [])
        } else {
          setEmployees([])
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const stats = useMemo(() => ({
    total: departments.length,
    active: departments.filter((department) => department.active !== false).length,
    inactive: departments.filter((department) => department.active === false).length,
    withHead: departments.filter((department) => department.head).length,
  }), [departments])

  function showMessage(text) {
    setMessage(text)
    window.setTimeout(() => setMessage(''), 3000)
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function openCreateModal() {
    setEditingDepartment(null)
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  function openEditModal(department) {
    setEditingDepartment(department)
    setForm(toForm(department))
    setError('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingDepartment(null)
    setForm(emptyForm)
  }

  function validateForm() {
    if (!form.name.trim()) return 'Department name is required.'
    if (form.code.trim() && !/^[a-z0-9-_]+$/i.test(form.code.trim())) {
      return 'Department code can use only letters, numbers, hyphen, and underscore.'
    }
    return ''
  }

  function buildPayload() {
    return {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      description: form.description.trim(),
      head: form.head || null,
      active: form.active,
    }
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
      const payload = buildPayload()
      if (editingDepartment?._id) {
        await departmentApi.update(editingDepartment._id, payload)
        showMessage('Department updated')
      } else {
        await departmentApi.create(payload)
        showMessage('Department created')
      }
      closeModal()
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save department')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(department) {
    const confirmed = window.confirm(`Delete ${department.name}? It will be removed from future dropdowns.`)
    if (!confirmed) return

    setSaving(true)
    setError('')
    try {
      await departmentApi.delete(department._id)
      setDepartments((items) => items.filter((item) => item._id !== department._id))
      showMessage('Department deleted')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete department')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Departments</h3>
          <p className="mt-1 text-sm font-medium text-slate-500">Manage department structure, codes, ownership, and active status.</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Add Department
        </button>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" /> {message}
        </div>
      )}

      {error && !modalOpen && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10">
          {error} {error === 'Failed to load departments' && <button type="button" onClick={load} className="ml-1 underline">Retry</button>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total', value: stats.total, icon: Layers, color: 'blue' },
          { label: 'Active', value: stats.active, icon: ShieldCheck, color: 'emerald' },
          { label: 'Inactive', value: stats.inactive, icon: X, color: 'slate' },
          { label: 'With Head', value: stats.withHead, icon: UserRound, color: 'violet' },
        ].map((stat) => {
          const Icon = stat.icon
          const colorClasses = {
            blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300',
            emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
            slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
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

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
        </div>
      ) : departments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center dark:border-slate-700 dark:bg-slate-800/20">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-100 bg-white text-indigo-500 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <Layers className="h-8 w-8" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">No departments added</h3>
          <p className="mx-auto mb-6 max-w-sm text-sm text-slate-500 dark:text-slate-400">Create departments so onboarding, employee profiles, and reporting can use structured data.</p>
          <button onClick={openCreateModal} className="rounded-xl bg-indigo-50 px-6 py-2.5 text-sm font-bold text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400">
            Create Department
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {departments.map((department) => (
            <div key={department._id} className="group relative overflow-hidden rounded-3xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700/50 dark:bg-slate-900/70">
              <div className="absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 rounded-full bg-blue-500/10 blur-2xl transition-colors group-hover:bg-blue-500/20" />
              <div className="relative z-10 space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-black text-slate-900 dark:text-white">{department.name}</h3>
                      <p className="mt-0.5 text-xs font-bold uppercase tracking-wider text-slate-400">{department.code || 'No code'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => openEditModal(department)} className="rounded-lg border border-slate-200 bg-white/70 p-2 text-slate-500 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800">
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => handleDelete(department)} disabled={saving} className="rounded-lg border border-slate-200 bg-white/70 p-2 text-slate-500 hover:text-red-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${department.active === false ? 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'}`}>
                    {department.active === false ? 'Inactive' : 'Active'}
                  </span>
                  {department.head && <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">Head Assigned</span>}
                </div>

                {department.description ? (
                  <p className="line-clamp-3 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">{department.description}</p>
                ) : (
                  <p className="text-sm font-medium italic text-slate-400">No description added</p>
                )}

                <div className="border-t border-slate-200/60 pt-4 dark:border-slate-700/60">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <UserRound className="h-4 w-4 text-slate-400" />
                    <span className="font-semibold">{headName(department.head)}</span>
                  </div>
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
            <div className="relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/60 px-8 py-6 dark:border-slate-800 dark:bg-slate-800/20">
                <div>
                  <h3 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
                    {editingDepartment ? <Edit3 className="h-5 w-5 text-indigo-500" /> : <Plus className="h-5 w-5 text-indigo-500" />}
                    {editingDepartment ? 'Edit Department' : 'Add Department'}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">Department details power onboarding, employee records, filters, and reports.</p>
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
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Department Name</span>
                    <input className="input-field bg-slate-50/70 focus:bg-white" placeholder="e.g. Engineering" value={form.name} onChange={(e) => updateField('name', e.target.value)} />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Department Code</span>
                    <input className="input-field uppercase bg-slate-50/70 focus:bg-white" placeholder="e.g. ENG" value={form.code} onChange={(e) => updateField('code', e.target.value.toUpperCase())} />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Description</span>
                  <textarea
                    className="input-field min-h-[110px] resize-none bg-slate-50/70 focus:bg-white"
                    placeholder="What does this department own?"
                    value={form.description}
                    onChange={(e) => updateField('description', e.target.value)}
                  />
                </label>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Department Head</span>
                    <select className="input-field bg-slate-50/70 focus:bg-white" value={form.head} onChange={(e) => updateField('head', e.target.value)}>
                      <option value="">No head assigned</option>
                      {employees.map((employee) => (
                        <option key={employee._id} value={employee._id}>
                          {[employee.firstName, employee.lastName].filter(Boolean).join(' ') || employee.email}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
                    <span>
                      <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">Active Department</span>
                      <span className="block text-xs font-medium text-slate-500">Inactive departments stay saved but should not be assigned.</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => updateField('active', e.target.checked)}
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
                    {saving ? 'Saving...' : editingDepartment ? 'Update Department' : 'Create Department'}
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
