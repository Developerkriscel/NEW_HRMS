import { useEffect, useState } from 'react'
import { Building2, CheckCircle2, Edit3, MapPin, Navigation, Phone, Plus, Save, Trash2, X } from 'lucide-react'
import { branchApi } from '@/services/departmentApi'
import { Portal } from '@/components/common/Portal'

const emptyForm = {
  name: '',
  address: '',
  city: '',
  state: '',
  country: '',
  phone: '',
  latitude: '',
  longitude: '',
  geoFenceRadius: 100,
  headOffice: false,
  active: true,
}

function toForm(branch) {
  return {
    name: branch.name || '',
    address: branch.address || '',
    city: branch.city || '',
    state: branch.state || '',
    country: branch.country || '',
    phone: branch.phone || '',
    latitude: branch.latitude ?? '',
    longitude: branch.longitude ?? '',
    geoFenceRadius: branch.geoFenceRadius ?? 100,
    headOffice: !!branch.headOffice,
    active: branch.active !== false,
  }
}

function formatLocation(branch) {
  return [branch.city, branch.state, branch.country].filter(Boolean).join(', ') || 'Location not specified'
}

function normalizeNumber(value, fallback = null) {
  if (value === '' || value == null) return fallback
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export function BranchesSection() {
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingBranch, setEditingBranch] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  function load() {
    setLoading(true)
    setError('')
    branchApi.getAll()
      .then((res) => setBranches(res.data.data || []))
      .catch(() => setError('Failed to load branches'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  function showMessage(text) {
    setMessage(text)
    window.setTimeout(() => setMessage(''), 3000)
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function openCreateModal() {
    setEditingBranch(null)
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  function openEditModal(branch) {
    setEditingBranch(branch)
    setForm(toForm(branch))
    setError('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingBranch(null)
    setForm(emptyForm)
  }

  function validateForm() {
    if (!form.name.trim()) return 'Branch name is required.'
    if (!form.city.trim()) return 'City is required.'
    if (!form.state.trim()) return 'State is required.'
    if (!form.country.trim()) return 'Country is required.'

    const latitude = normalizeNumber(form.latitude)
    const longitude = normalizeNumber(form.longitude)
    if ((form.latitude !== '' && latitude == null) || (form.longitude !== '' && longitude == null)) {
      return 'Latitude and longitude must be valid numbers.'
    }
    if (latitude != null && (latitude < -90 || latitude > 90)) return 'Latitude must be between -90 and 90.'
    if (longitude != null && (longitude < -180 || longitude > 180)) return 'Longitude must be between -180 and 180.'

    const radius = normalizeNumber(form.geoFenceRadius, 100)
    if (!radius || radius < 1) return 'Geo fence radius must be at least 1 meter.'
    return ''
  }

  function buildPayload() {
    return {
      ...form,
      name: form.name.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      country: form.country.trim(),
      phone: form.phone.trim(),
      latitude: normalizeNumber(form.latitude),
      longitude: normalizeNumber(form.longitude),
      geoFenceRadius: normalizeNumber(form.geoFenceRadius, 100),
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
      if (editingBranch?._id) {
        await branchApi.update(editingBranch._id, payload)
        showMessage('Branch updated')
      } else {
        await branchApi.create(payload)
        showMessage('Branch created')
      }
      closeModal()
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save branch')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(branch) {
    const confirmed = window.confirm(`Delete ${branch.name}? It will be removed from future dropdowns.`)
    if (!confirmed) return

    setSaving(true)
    setError('')
    try {
      await branchApi.delete(branch._id)
      setBranches((items) => items.filter((item) => item._id !== branch._id))
      showMessage('Branch deleted')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete branch')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Branches</h3>
          <p className="mt-1 text-sm font-medium text-slate-500">Manage office locations, geo-fence radius, branch contact details, and status.</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Add Branch
        </button>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" /> {message}
        </div>
      )}

      {error && !modalOpen && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10">
          {error} {error === 'Failed to load branches' && <button type="button" onClick={load} className="ml-1 underline">Retry</button>}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
        </div>
      ) : branches.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center dark:border-slate-700 dark:bg-slate-800/20">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-100 bg-white text-rose-500 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <MapPin className="h-8 w-8" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">No branches added</h3>
          <p className="mx-auto mb-6 max-w-sm text-sm text-slate-500 dark:text-slate-400">Create your first office branch so onboarding can auto-fill work location details.</p>
          <button onClick={openCreateModal} className="rounded-xl bg-indigo-50 px-6 py-2.5 text-sm font-bold text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400">
            Create Branch
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {branches.map((branch) => (
            <div key={branch._id} className="group relative overflow-hidden rounded-3xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700/50 dark:bg-slate-900/70">
              <div className="absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 rounded-full bg-rose-500/10 blur-2xl transition-colors group-hover:bg-rose-500/20" />
              <div className="relative z-10 space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-xl bg-rose-50 p-2 text-rose-500 dark:bg-rose-900/30 dark:text-rose-400">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-slate-800 dark:text-slate-100">{branch.name}</h3>
                      <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{formatLocation(branch)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => openEditModal(branch)} className="rounded-lg border border-slate-200 bg-white/70 p-2 text-slate-500 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800">
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => handleDelete(branch)} disabled={saving} className="rounded-lg border border-slate-200 bg-white/70 p-2 text-slate-500 hover:text-red-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {branch.headOffice && <span className="rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-bold text-white">HQ</span>}
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${branch.active === false ? 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300' : 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300'}`}>
                    {branch.active === false ? 'Inactive' : 'Active'}
                  </span>
                </div>

                <div className="space-y-3 border-t border-slate-200/60 pt-4 dark:border-slate-700/60">
                  <div className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <span>{branch.address || 'Address not specified'}</span>
                  </div>
                  <div className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <span>{branch.phone || 'Phone not specified'}</span>
                  </div>
                  <div className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <span>
                      {branch.latitude != null && branch.longitude != null
                        ? `${branch.latitude}, ${branch.longitude} (${branch.geoFenceRadius || 100}m radius)`
                        : `Geo location not set (${branch.geoFenceRadius || 100}m radius)`}
                    </span>
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
            <div className="relative max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/60 px-8 py-6 dark:border-slate-800 dark:bg-slate-800/20">
                <div>
                  <h3 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
                    {editingBranch ? <Edit3 className="h-5 w-5 text-indigo-500" /> : <Plus className="h-5 w-5 text-indigo-500" />}
                    {editingBranch ? 'Edit Branch' : 'Add Branch'}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">Branch details will auto-fill work location fields in onboarding.</p>
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

                <div>
                  <h4 className="mb-4 text-sm font-black uppercase tracking-wider text-slate-500">Basic Details</h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Branch Name</span>
                      <input className="input-field bg-slate-50/70 focus:bg-white" placeholder="e.g. Bangalore HQ" value={form.name} onChange={(e) => updateField('name', e.target.value)} />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Phone</span>
                      <input className="input-field bg-slate-50/70 focus:bg-white" placeholder="+91 ..." value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
                    </label>
                  </div>
                </div>

                <div>
                  <h4 className="mb-4 text-sm font-black uppercase tracking-wider text-slate-500">Location</h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <label className="block md:col-span-3">
                      <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Full Address</span>
                      <input className="input-field bg-slate-50/70 focus:bg-white" placeholder="Building, street, area" value={form.address} onChange={(e) => updateField('address', e.target.value)} />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">City</span>
                      <input className="input-field bg-slate-50/70 focus:bg-white" placeholder="City" value={form.city} onChange={(e) => updateField('city', e.target.value)} />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">State</span>
                      <input className="input-field bg-slate-50/70 focus:bg-white" placeholder="State" value={form.state} onChange={(e) => updateField('state', e.target.value)} />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Country</span>
                      <input className="input-field bg-slate-50/70 focus:bg-white" placeholder="Country" value={form.country} onChange={(e) => updateField('country', e.target.value)} />
                    </label>
                  </div>
                </div>

                <div>
                  <h4 className="mb-4 text-sm font-black uppercase tracking-wider text-slate-500">Geo Fence</h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <label className="block">
                      <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Latitude</span>
                      <input type="number" step="any" className="input-field bg-slate-50/70 focus:bg-white" placeholder="26.2183" value={form.latitude} onChange={(e) => updateField('latitude', e.target.value)} />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Longitude</span>
                      <input type="number" step="any" className="input-field bg-slate-50/70 focus:bg-white" placeholder="78.1828" value={form.longitude} onChange={(e) => updateField('longitude', e.target.value)} />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Radius (meters)</span>
                      <input type="number" min="1" className="input-field bg-slate-50/70 focus:bg-white" placeholder="100" value={form.geoFenceRadius} onChange={(e) => updateField('geoFenceRadius', e.target.value)} />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
                    <span>
                      <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">Head Office</span>
                      <span className="block text-xs font-medium text-slate-500">Only one branch can be head office.</span>
                    </span>
                    <input type="checkbox" checked={form.headOffice} onChange={(e) => updateField('headOffice', e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  </label>
                  <label className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
                    <span>
                      <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">Active Branch</span>
                      <span className="block text-xs font-medium text-slate-500">Inactive branches stay saved but should not be assigned.</span>
                    </span>
                    <input type="checkbox" checked={form.active} onChange={(e) => updateField('active', e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  </label>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 pt-6 dark:border-slate-800">
                  <button type="button" onClick={closeModal} className="rounded-xl px-6 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700 disabled:opacity-50">
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : editingBranch ? 'Update Branch' : 'Create Branch'}
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
