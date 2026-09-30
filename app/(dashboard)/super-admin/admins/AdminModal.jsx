'use client'

import { useState, useEffect, useRef } from 'react'
import { X, UserCog, Upload, ArrowRight, Shield, Lock, Loader2, Eye, EyeOff } from 'lucide-react'
import { Portal } from '@/components/common/Portal'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

export function AdminModal({ open, onClose, adminId, tenantId, onSuccess, mode = 'edit' }) {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const fileInputRef = useRef(null)

  const isEdit = !!adminId
  const isView = mode === 'view'

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [tenants, setTenants] = useState([])
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    mobileNumber: '',
    designation: '',
    profilePhoto: '',
    email: '',
    password: '',
    status: 'ACTIVE'
  })

  useEffect(() => {
    
    if (open && !isEdit) {
      fetch('/api/super-admin/tenants?size=1000')
        .then(res => res.json())
        .then(res => setTenants(res.tenants || res))
        .catch(console.error)
    }

    if (open && isEdit) {
      setLoading(true)
      setError('')
      fetch(`/api/super-admin/admins/${adminId}?tenantId=${tenantId}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch admin')
          return res.json()
        })
        .then(res => {
          const data = res.data
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
            profilePhoto: data.profilePhotoUrl || data.profilePhoto || '',
            email: data.email || '',
            password: '', // blank for edit unless they want to change
            status: data.status || 'ACTIVE'
          })
        })
        .catch(err => {
          setError('Error loading admin details')
        })
        .finally(() => {
          setLoading(false)
        })
    } else if (open && !isEdit) {
      // Reset form on open create
      setForm({
        firstName: '',
        lastName: '',
        mobileNumber: '',
        designation: '',
        profilePhoto: '',
        email: '',
        password: '',
        status: 'ACTIVE'
      })
      setError('')
    }
  }, [open, isEdit, adminId])

  async function handleSave(e) {
    if (e) e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const url = isEdit ? `/api/super-admin/admins/${adminId}` : `/api/super-admin/admins`
      const method = isEdit ? 'PUT' : 'POST'
      
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        mobileNumber: form.mobileNumber,
        designation: form.designation,
        profilePhoto: form.profilePhoto,
        status: form.status
      }

      if (!isEdit) {
        payload.email = form.email
        payload.password = form.password
      } else if (form.password) {
        // Only include password in edit if explicitly provided
        payload.password = form.password
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, tenantId: isEdit ? tenantId : form.tenantId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Failed to save admin')
      }
      onSuccess()
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

  if (!open) return null

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-slate-50 dark:bg-slate-950 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 relative">
          
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-white dark:bg-slate-900 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors shadow-sm border border-slate-200 dark:border-slate-800 z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-8 pb-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-0 rounded-t-3xl">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">{isEdit ? 'Edit Admin' : 'Create Admin'}</h1>
            <p className="text-sm font-semibold text-slate-500 mt-1">{isEdit ? 'Update administrator details and access' : 'Add a new administrator and set credentials'}</p>
          </div>

          <div className="p-8 overflow-y-auto">
            {error && <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl border border-red-200 dark:border-red-800/50 text-sm font-bold">{error}</div>}

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            ) : (
              <form id="admin-form" onSubmit={handleSave} className="space-y-6">
                
                {/* Admin Information Card */}
                <div className="bg-white dark:bg-slate-900 rounded-[24px] p-6 border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                  <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800/60 pb-4 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                      <UserCog className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900 dark:text-white">Administrator Profile</h2>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Basic identity information</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {!isEdit && (
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Company (Tenant) <span className="text-red-500">*</span></label>
                        <select required disabled={isView} className="input-field bg-slate-50 dark:bg-slate-800/50 rounded-xl w-full px-4 py-2.5 border-slate-200/60" value={form.tenantId || ''} onChange={(e) => setForm({ ...form, tenantId: e.target.value })}>
                          <option value="">Select a company</option>
                          {tenants.map(t => (
                            <option key={t._id} value={t._id}>{t.companyName}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {!isEdit && (
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Company (Tenant) <span className="text-red-500">*</span></label>
                        <select required disabled={isView} className="input-field bg-slate-50 dark:bg-slate-800/50 rounded-xl w-full px-4 py-2.5 border-slate-200/60" value={form.tenantId || ''} onChange={(e) => setForm({ ...form, tenantId: e.target.value })}>
                          <option value="">Select a company</option>
                          {tenants.map(t => (
                            <option key={t._id} value={t._id}>{t.companyName}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">First Name <span className="text-red-500">*</span></label>
                      <input disabled={isView} required placeholder="First name" className="input-field bg-slate-50 dark:bg-slate-800/50 rounded-xl w-full px-4 py-2.5 border-slate-200/60 focus:bg-white" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Last Name <span className="text-red-500">*</span></label>
                      <input disabled={isView} required placeholder="Last name" className="input-field bg-slate-50 dark:bg-slate-800/50 rounded-xl w-full px-4 py-2.5 border-slate-200/60 focus:bg-white" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Work Email <span className="text-red-500">*</span> {isEdit && '(Read Only)'}</label>
                      <input required={!isEdit} readOnly={isEdit} disabled={isEdit || isView} type="email" placeholder="admin@acme.com" className={cn("input-field bg-slate-50 dark:bg-slate-800/50 rounded-xl w-full px-4 py-2.5 border-slate-200/60 focus:bg-white", isEdit && "cursor-not-allowed opacity-70")} value={form.email} onChange={(e) => !isEdit && setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Mobile Number</label>
                      <input disabled={isView} placeholder="+91" className="input-field bg-slate-50 dark:bg-slate-800/50 rounded-xl w-full px-4 py-2.5 border-slate-200/60 focus:bg-white" value={form.mobileNumber} onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Designation</label>
                      <input disabled={isView} placeholder="e.g. Administrator" className="input-field bg-slate-50 dark:bg-slate-800/50 rounded-xl w-full px-4 py-2.5 border-slate-200/60 focus:bg-white" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Profile Photo</label>
                      <div 
                        className={cn(
                          "border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all",
                          form.profilePhoto ? "border-indigo-200 bg-indigo-50/50" : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
                        )}
                        onClick={() => !form.profilePhoto && fileInputRef.current?.click()}
                      >
                        {form.profilePhoto ? (
                          <div className="relative w-16 h-16">
                            <img src={form.profilePhoto} alt="Profile" className="w-full h-full object-cover rounded-xl shadow-sm" />
                            {!isView && <button type="button" onClick={(e) => { e.stopPropagation(); removePhoto() }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors">
                              <X className="w-3 h-3" />
                            </button>}
                          </div>
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center mb-2">
                              <Upload className="w-4 h-4 text-indigo-500" />
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
                <div className="bg-white dark:bg-slate-900 rounded-[24px] p-6 border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                  <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800/60 pb-4 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center shrink-0">
                      <Lock className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900 dark:text-white">Security & Credentials</h2>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{isEdit ? 'Reset the password for this account.' : 'Set the initial password for this account.'}</p>
                    </div>
                  </div>

                  <div className="max-w-md">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">{isEdit ? 'New Password (Leave blank to keep current)' : 'Password'} {(!isEdit) && <span className="text-red-500">*</span>}</label>
                    <div className="relative">
                      <input disabled={isView} type={showPassword ? 'text' : 'password'} required={!isEdit} placeholder="Enter a secure password" minLength={8} className="input-field bg-slate-50 dark:bg-slate-800/50 rounded-xl w-full px-4 py-2.5 pr-10 border-slate-200/60 focus:bg-white" value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors focus:outline-none z-10 cursor-pointer">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {isEdit && <p className="text-[10px] text-slate-400 mt-1.5 ml-1 font-medium">Only fill this if you want to change their password</p>}
                  </div>
                </div>

                {/* Admin Access Card */}
                {hasPermission('operator.suspend') && (
                  <div className="bg-white dark:bg-slate-900 rounded-[24px] p-6 border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                    <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800/60 pb-4 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                        <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-slate-900 dark:text-white">Admin Access</h2>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Manage the platform login status.</p>
                      </div>
                    </div>

                    <div className="max-w-md">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Account Status</label>
                      <select disabled={isView} className="input-field bg-slate-50 dark:bg-slate-800/50 rounded-xl w-full px-4 py-2.5 border-slate-200/60" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                        <option value="ACTIVE">Active (Can Login)</option>
                        <option value="SUSPENDED">Suspended (Cannot Login)</option>
                      </select>
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>

          <div className="p-6 bg-slate-100/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 rounded-b-3xl">
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
              {isView ? 'Close' : 'Cancel'}
            </button>
            {!isView && <button type="submit" form="admin-form" disabled={saving || loading} className="btn-primary px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2 transition-all">
              {saving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Admin')} {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            </button>}
          </div>

        </div>
      </div>
    </Portal>
  )
}
