'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, User, Upload, ArrowRight, X, UserCog, Shield, Lock } from 'lucide-react'
import { PermissionDenied } from '@/components/common/PermissionDenied'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

export default function EditPlatformAdminPage() {
  const { id } = useParams()
  const router = useRouter()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const fileInputRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    mobileNumber: '',
    designation: '',
    profilePhoto: '',
    email: '',
    status: 'ACTIVE'
  })

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/super-admin/admins/${id}`)
        if (res.status === 403) {
          setForbidden(true)
          return
        }
        if (!res.ok) throw new Error('Failed to fetch admin')
        const data = await (res.json()).then(r => r.data)
        
        // Handle case where operator only had a single "name" field previously
        let firstName = data.firstName || ''
        let lastName = data.lastName || ''
        if (!firstName && !lastName && data.name) {
          const parts = data.name.split(' ')
          firstName = parts[0]
          lastName = parts.slice(1).join(' ')
        }

        setForm({
          firstName,
          lastName,
          mobileNumber: data.mobileNumber || '',
          designation: data.designation || '',
          profilePhoto: data.profilePhoto || '',
          email: data.email || '',
          status: data.status || 'ACTIVE'
        })
      } catch (err) {
        setError('Error loading admin details')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handleSave(e) {
    if (e) e.preventDefault()
    setSaving(true)
    setError('')
    setSuccessMsg('')
    try {
      const res = await fetch(`/api/super-admin/admins/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          mobileNumber: form.mobileNumber,
          designation: form.designation,
          profilePhoto: form.profilePhoto,
          status: form.status
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Failed to update admin')
      }
      setSuccessMsg('Admin successfully updated')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert("File is too big! Max 2MB allowed.")
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => setForm({ ...form, profilePhoto: e.target.result })
    reader.readAsDataURL(file)
  }

  const removePhoto = () => {
    setForm({ ...form, profilePhoto: '' })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (forbidden) return <PermissionDenied requiredPermission="operator.update" message="You don't have permission to edit admins." />
  if (loading) return <PageLoader />

  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/super-admin/admins')} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Edit Platform Admin</h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">Update platform administrator details and access</p>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl border border-red-200 dark:border-red-800/50 text-sm font-bold">{error}</div>}
      {successMsg && <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 text-sm font-bold">{successMsg}</div>}

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Admin Information Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-200/60 dark:border-slate-800/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-6 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
              <UserCog className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Administrator Information</h2>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Primary Platform Admin account details.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">First Name <span className="text-red-500">*</span></label>
              <input required placeholder="First name" className="input-field bg-slate-50 dark:bg-slate-800/50 rounded-2xl w-full px-4 py-3 border-slate-200/60 focus:bg-white" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Last Name <span className="text-red-500">*</span></label>
              <input required placeholder="Last name" className="input-field bg-slate-50 dark:bg-slate-800/50 rounded-2xl w-full px-4 py-3 border-slate-200/60 focus:bg-white" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Work Email <span className="text-red-500">*</span> (Read Only)</label>
              <input readOnly disabled placeholder="admin@nexahr.com" className="input-field bg-slate-50 dark:bg-slate-800/50 rounded-2xl w-full px-4 py-3 border-slate-200/60 cursor-not-allowed opacity-70" value={form.email} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Mobile Number</label>
              <input placeholder="+91" className="input-field bg-slate-50 dark:bg-slate-800/50 rounded-2xl w-full px-4 py-3 border-slate-200/60 focus:bg-white" value={form.mobileNumber} onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Designation</label>
              <input placeholder="e.g. Platform Administrator" className="input-field bg-slate-50 dark:bg-slate-800/50 rounded-2xl w-full px-4 py-3 border-slate-200/60 focus:bg-white" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Profile Photo</label>
              <div 
                className={cn(
                  "border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all",
                  form.profilePhoto ? "border-indigo-200 bg-indigo-50/50" : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
                )}
                onClick={() => !form.profilePhoto && fileInputRef.current?.click()}
              >
                {form.profilePhoto ? (
                  <div className="relative w-20 h-20">
                    <img src={form.profilePhoto} alt="Profile" className="w-full h-full object-cover rounded-xl shadow-sm" />
                    <button type="button" onClick={(e) => { e.stopPropagation(); removePhoto() }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center mb-3">
                      <Upload className="w-5 h-5 text-indigo-500" />
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Drop image here or browse</p>
                    <p className="text-[10px] font-semibold text-slate-400">JPG, PNG, WEBP up to 2 MB</p>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept="image/png, image/jpeg, image/webp" className="hidden" onChange={handlePhotoUpload} />
              </div>
            </div>
          </div>
        </div>

        {/* Security & Credentials Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-200/60 dark:border-slate-800/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-6 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Security & Credentials</h2>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Reset the password for this admin account.</p>
            </div>
          </div>

          <div className="max-w-md">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">New Password (Leave blank to keep current)</label>
            <input type="password" placeholder="Enter a new secure password" minLength={8} className="input-field bg-slate-50 dark:bg-slate-800/50 rounded-2xl w-full px-4 py-3 border-slate-200/60 focus:bg-white" value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <p className="text-[10px] text-slate-400 mt-1.5 ml-1 font-medium">Only fill this if you want to change their password</p>
          </div>
        </div>

        {/* Admin Access Card */}
        {hasPermission('operator.suspend') && (
          <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-200/60 dark:border-slate-800/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-6 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Admin Access</h2>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Manage the platform login status.</p>
              </div>
            </div>

            <div className="max-w-md">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Account Status</label>
              <select className="input-field bg-slate-50 dark:bg-slate-800/50 rounded-2xl w-full px-4 py-3 border-slate-200/60" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="ACTIVE">Active (Can Login)</option>
                <option value="SUSPENDED">Suspended (Cannot Login)</option>
              </select>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-[24px] border border-slate-200/60 dark:border-slate-800/60 shadow-sm sticky bottom-6 z-10">
          <button type="button" onClick={() => router.push('/super-admin/admins')} className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            Cancel
          </button>
          <div className="flex-1"></div>
          <button type="submit" disabled={saving} className="btn-primary px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2 transition-all">
            {saving ? 'Saving...' : 'Save Changes'} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  )
}
