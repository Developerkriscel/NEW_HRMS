'use client'

import { useEffect, useState } from 'react'
import { companyApi } from '@/services/companyApi'
import { useAuthStore } from '@/store/authStore'

const FIELDS = [
  { key: 'companyName', label: 'Company Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'logoUrl', label: 'Logo URL' },
  { key: 'industryType', label: 'Industry' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'country', label: 'Country' },
  { key: 'gstNumber', label: 'GST Number' },
  { key: 'panNumber', label: 'PAN Number' },
]

export default function CompanyProfilePage() {
  const currentUser = useAuthStore((s) => s.user)
  const canEdit = currentUser?.role === 'COMPANY_ADMIN'

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function load() {
    setLoading(true)
    setLoadError(false)
    companyApi.getProfile().then((res) => setProfile(res.data.data)).catch(() => setLoadError(true)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const { data } = await companyApi.updateProfile(profile)
      setProfile(data.data)
      setMessage('Company profile saved')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save company profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading...</p>
  if (loadError) return <p className="text-sm text-red-500">Failed to load company profile — <button onClick={load} className="underline">retry</button></p>
  if (!profile) return <p className="text-sm text-slate-400">Company profile not found.</p>

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Company Profile</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Company details, branding and legal information</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="stat-card space-y-4">
        {message && <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {profile.logoUrl && (
          <img src={profile.logoUrl} alt="Company logo" className="h-12 w-12 rounded-xl object-cover border border-slate-100 dark:border-slate-800" onError={(e) => { e.target.style.display = 'none' }} />
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FIELDS.map(({ key, label }) => (
            <label key={key} className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
              <input
                className="input-field"
                disabled={!canEdit}
                value={profile[key] || ''}
                onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
              />
            </label>
          ))}
        </div>
        {canEdit && <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Company Profile'}</button>}
        {!canEdit && <p className="text-xs text-slate-400">Only a Company Admin can edit the company profile.</p>}
      </form>
    </div>
  )
}
