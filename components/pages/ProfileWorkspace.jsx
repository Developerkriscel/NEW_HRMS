'use client'

import { useState, useEffect } from 'react'
import { Avatar } from '@/components/common/Avatar'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/services/authApi'
import { employeeApi } from '@/services/employeeApi'
import { LogOut, Key, MapPin, Phone, Briefcase, Calendar, Mail, User, ShieldCheck } from 'lucide-react'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { formatDate } from '@/lib/utils'

export function ProfileWorkspace() {
  const { user, logout } = useAuthStore()
  const [employeeDetails, setEmployeeDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' })
  const [pwMessage, setPwMessage] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwSuccess, setPwSuccess] = useState(false)
  const employeeId = user?.employeeProfile?._id || user?.employeeProfile || user?.id

  useEffect(() => {
    if (employeeId) {
      employeeApi.getById(employeeId)
        .then(res => setEmployeeDetails(res.data.data))
        .catch(console.error)
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [employeeId])

  async function handlePasswordChange(e) {
    e.preventDefault()
    setPwSaving(true)
    setPwMessage('')
    setPwSuccess(false)
    try {
      await authApi.changePassword(pwForm.currentPassword, pwForm.newPassword)
      setPwMessage('Password changed successfully')
      setPwSuccess(true)
      setPwForm({ currentPassword: '', newPassword: '' })
    } catch (err) {
      setPwMessage(err.response?.data?.message || 'Failed to change password')
      setPwSuccess(false)
    } finally {
      setPwSaving(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="animate-fade-in space-y-6 pt-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Profile</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage your account and personal details</p>
        </div>
        <button onClick={logout} className="btn-secondary text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-900/30">
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="stat-card overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
            <div className="relative pt-12 flex flex-col items-center text-center">
              <div className="p-1.5 bg-white dark:bg-slate-900 rounded-full shadow-lg mb-4">
                <Avatar name={user?.name || 'U'} size="2xl" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{user?.name}</h3>
              <p className="text-blue-600 dark:text-blue-400 font-medium text-sm mt-1">{employeeDetails?.designation?.name || user?.role?.replace('_', ' ')}</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">{user?.companyName}</p>
              
              <div className="w-full mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 text-left">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">{user?.email}</span>
                </div>
                {employeeDetails?.phone && (
                  <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 text-left">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{employeeDetails.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 text-left">
                  <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="capitalize">{user?.role?.replace('_', ' ').toLowerCase()} Access</span>
                </div>
              </div>
            </div>
          </div>

          <div className="stat-card space-y-4">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold mb-2">
              <Key className="w-5 h-5 text-blue-500" /> Change Password
            </div>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {pwMessage && (
                <div className={`text-xs p-3 rounded-xl border ${pwSuccess ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  {pwMessage}
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-slate-500 ml-1 mb-1 block">Current Password</label>
                <input required type="password" placeholder="••••••••" className="input-field" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 ml-1 mb-1 block">New Password</label>
                <input required type="password" placeholder="••••••••" className="input-field" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} />
              </div>
              <button type="submit" disabled={pwSaving} className="w-full btn-primary py-2.5">
                {pwSaving ? 'Saving...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>

        {/* Detailed Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="stat-card">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-500" /> Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Full Name</p>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{employeeDetails?.firstName} {employeeDetails?.lastName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Date of Birth</p>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{employeeDetails?.dateOfBirth ? formatDate(employeeDetails.dateOfBirth) : '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Gender</p>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 capitalize">{employeeDetails?.gender?.toLowerCase() || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Blood Group</p>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{employeeDetails?.bloodGroup || '—'}</p>
              </div>
              <div className="sm:col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Address</p>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {employeeDetails?.address || '—'}
                  {employeeDetails?.city && `, ${employeeDetails.city}`}
                  {employeeDetails?.state && `, ${employeeDetails.state}`}
                  {employeeDetails?.country && `, ${employeeDetails.country}`}
                </p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-emerald-500" /> Work Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Employee Code</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{employeeDetails?.employeeCode || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Joining Date</p>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{employeeDetails?.joiningDate ? formatDate(employeeDetails.joiningDate) : '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Department</p>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{employeeDetails?.department?.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Designation</p>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{employeeDetails?.designation?.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Reporting Manager</p>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {employeeDetails?.reportingManager ? `${employeeDetails.reportingManager.firstName} ${employeeDetails.reportingManager.lastName}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Work Location</p>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{employeeDetails?.workLocation || '—'}</p>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  )
}
