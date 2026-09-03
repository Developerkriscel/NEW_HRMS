'use client'

import { useEffect, useState } from 'react'
import { authApi } from '@/services/authApi'
import { companyApi } from '@/services/companyApi'
import { useAuthStore } from '@/store/authStore'
import { HolidaysSection } from '@/components/pages/HolidaysSection'
import { DepartmentsSection } from '@/components/pages/DepartmentsSection'
import { BranchesSection } from '@/components/pages/BranchesSection'
import { ShiftsSection } from '@/components/pages/ShiftsSection'
import { SubscriptionSection } from '@/components/pages/SubscriptionSection'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { Building, Clock, Layers, MapPin, Clock3, CalendarDays, Settings, Lock, CheckCircle2, CreditCard } from 'lucide-react'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const MENU = [
  { id: 'profile', label: 'Company Profile', icon: Building },
  { id: 'subscription', label: 'Subscription & Plans', icon: CreditCard },
  { id: 'departments', label: 'Departments', icon: Layers },
  { id: 'branches', label: 'Branches', icon: MapPin },
  { id: 'shifts', label: 'Working Hours & Shifts', icon: Clock3 },
  { id: 'holidays', label: 'Holidays', icon: CalendarDays },
  { id: 'modules', label: 'Modules & Features', icon: Settings },
  { id: 'security', label: 'Security', icon: Lock },
]

export default function CompanySettingsPage() {
  const currentUser = useAuthStore((s) => s.user)
  const canEdit = currentUser?.role === 'COMPANY_ADMIN'

  const [activeTab, setActiveTab] = useState('profile')
  const [tenant, setTenant] = useState(null)
  const [hrSettings, setHrSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  
  const [profMessage, setProfMessage] = useState('')
  const [profSaving, setProfSaving] = useState(false)
  const [profError, setProfError] = useState('')

  const [hrMessage, setHrMessage] = useState('')
  const [hrSaving, setHrSaving] = useState(false)

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' })
  const [pwMessage, setPwMessage] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  useEffect(() => {
    companyApi.getProfile()
      .then((res) => {
        setTenant(res.data.data)
        setHrSettings(res.data.data.hrSettings)
      })
      .finally(() => setLoading(false))
  }, [])

  function toggleDay(list, day) {
    return list.includes(day) ? list.filter((d) => d !== day) : [...list, day]
  }

  async function handleSaveProfile(e) {
    e.preventDefault()
    setProfSaving(true)
    setProfError('')
    setProfMessage('')
    try {
      const { data } = await companyApi.updateProfile(tenant)
      setTenant(data.data)
      setProfMessage('Company profile saved')
      setTimeout(() => setProfMessage(''), 3000)
    } catch (err) {
      setProfError(err.response?.data?.message || 'Failed to save company profile')
    } finally {
      setProfSaving(false)
    }
  }

  async function handleSaveHrSettings(e) {
    e.preventDefault()
    setHrSaving(true)
    setHrMessage('')
    try {
      await companyApi.updateProfile({ hrSettings })
      setHrMessage('Settings saved')
      setTimeout(() => setHrMessage(''), 3000)
    } finally {
      setHrSaving(false)
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault()
    setPwSaving(true)
    setPwMessage('')
    try {
      await authApi.changePassword(pwForm.currentPassword, pwForm.newPassword)
      setPwMessage('Password changed successfully')
      setPwForm({ currentPassword: '', newPassword: '' })
    } catch (err) {
      setPwMessage(err.response?.data?.message || 'Failed to change password')
    } finally {
      setPwSaving(false)
    }
  }

  if (loading) return <PageLoader />

  const enabledModules = Object.entries(tenant?.features || {}).filter(([, enabled]) => enabled).map(([key]) => key)

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage company profile, organization structure, and preferences</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Sidebar Menu */}
        <div className="w-full md:w-72 flex-shrink-0 flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar relative">
          {MENU.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300 whitespace-nowrap relative overflow-hidden group ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)]'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {isActive && <div className="absolute inset-0 bg-white/20 w-full h-full skew-x-12 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />}
                <Icon className={`w-5 h-5 relative z-10 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                <span className="relative z-10">{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 space-y-6 w-full">
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="glass-panel animate-in fade-in slide-in-from-bottom-4 duration-500 rounded-3xl p-8 border border-white/40 dark:border-slate-700/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="mb-8 pb-5 border-b border-slate-200/50 dark:border-slate-700/50 relative z-10">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
                    <Building className="w-6 h-6" />
                  </div>
                  Company Profile
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">Manage your company's core identity and contact information.</p>
              </div>

              {profMessage && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> {profMessage}
                </div>
              )}
              {profError && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-sm font-medium">
                  {profError}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-8 mb-8 items-start">
                {tenant?.logoUrl ? (
                  <div className="relative group">
                    <img src={tenant.logoUrl} alt="Company logo" className="h-24 w-24 rounded-2xl object-cover shadow-md border-2 border-white dark:border-slate-800" onError={(e) => { e.target.style.display = 'none' }} />
                    {canEdit && (
                      <div className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-sm">
                        <span className="text-xs font-bold text-white">Change</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-24 w-24 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 shadow-sm cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                    <span className="text-xs font-bold text-center px-2">Upload Logo</span>
                  </div>
                )}
                
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
                  {[
                    { key: 'companyName', label: 'Company Name' },
                    { key: 'phone', label: 'Phone' },
                    { key: 'logoUrl', label: 'Logo URL' },
                    { key: 'industryType', label: 'Industry' },
                  ].map(({ key, label }) => (
                    <label key={key} className="block group">
                      <span className="mb-2 block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">{label}</span>
                      <input
                        className="input-field border border-transparent focus:border-blue-500/30"
                        disabled={!canEdit}
                        value={tenant[key] || ''}
                        onChange={(e) => setTenant({ ...tenant, [key]: e.target.value })}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                {[
                  { key: 'address', label: 'Address' },
                  { key: 'city', label: 'City' },
                  { key: 'state', label: 'State' },
                  { key: 'country', label: 'Country' },
                  { key: 'gstNumber', label: 'GST Number' },
                  { key: 'panNumber', label: 'PAN Number' },
                ].map(({ key, label }) => (
                  <label key={key} className="block group">
                    <span className="mb-2 block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">{label}</span>
                    <input
                      className="input-field border border-transparent focus:border-blue-500/30"
                      disabled={!canEdit}
                      value={tenant[key] || ''}
                      onChange={(e) => setTenant({ ...tenant, [key]: e.target.value })}
                    />
                  </label>
                ))}
              </div>
              {canEdit && (
                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800/60 mt-8">
                  <button type="submit" disabled={profSaving} className="btn-primary min-w-[140px] justify-center">{profSaving ? 'Saving...' : 'Save Profile'}</button>
                </div>
              )}
            </form>
          )}

          {activeTab === 'hr' && (
            <form onSubmit={handleSaveHrSettings} className="glass-panel animate-in fade-in slide-in-from-bottom-4 duration-500 rounded-3xl p-8 border border-white/40 dark:border-slate-700/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="mb-8 pb-5 border-b border-slate-200/50 dark:border-slate-700/50 relative z-10">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
                    <Clock className="w-6 h-6" />
                  </div>
                  Employee & Working Hours
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">Configure standard working hours and default employee settings.</p>
              </div>

              {hrMessage && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> {hrMessage}
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                <label className="block group">
                  <span className="mb-2 block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-focus-within:text-blue-600 transition-colors">Employee ID Prefix</span>
                  <input className="input-field uppercase border border-transparent focus:border-blue-500/30" disabled={!canEdit} value={hrSettings.employeeIdPrefix} onChange={(e) => setHrSettings({ ...hrSettings, employeeIdPrefix: e.target.value.toUpperCase() })} />
                </label>
                <label className="block group">
                  <span className="mb-2 block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-focus-within:text-blue-600 transition-colors">Office Start Time</span>
                  <input type="time" className="input-field border border-transparent focus:border-blue-500/30" disabled={!canEdit} value={hrSettings.officeStartTime} onChange={(e) => setHrSettings({ ...hrSettings, officeStartTime: e.target.value })} />
                </label>
                <label className="block group">
                  <span className="mb-2 block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-focus-within:text-blue-600 transition-colors">Office End Time</span>
                  <input type="time" className="input-field border border-transparent focus:border-blue-500/30" disabled={!canEdit} value={hrSettings.officeEndTime} onChange={(e) => setHrSettings({ ...hrSettings, officeEndTime: e.target.value })} />
                </label>
              </div>

              <div className="mb-8 p-6 bg-white/40 dark:bg-slate-800/40 rounded-2xl border border-white/50 dark:border-slate-700/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] relative z-10 backdrop-blur-xl">
                <div>
                  <div className="flex justify-between items-end mb-4">
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Working Days & Weekly Off</p>
                    <div className="flex gap-4 text-xs font-medium text-slate-500">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Working</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Off</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {DAYS.map((day) => {
                      const isWorking = hrSettings.workingDays.includes(day);
                      return (
                        <button 
                          type="button" 
                          key={day} 
                          disabled={!canEdit} 
                          onClick={() => {
                            const newWorkingDays = toggleDay(hrSettings.workingDays, day);
                            const newWeeklyOff = DAYS.filter(d => !newWorkingDays.includes(d));
                            setHrSettings({ ...hrSettings, workingDays: newWorkingDays, weeklyOff: newWeeklyOff });
                          }} 
                          className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                            isWorking 
                              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 scale-[1.02]' 
                              : 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/40 scale-[1.02] opacity-90'
                          }`}
                        >
                          {day}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {canEdit && (
                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800/60 mt-8">
                  <button type="submit" disabled={hrSaving} className="btn-primary min-w-[140px] justify-center">{hrSaving ? 'Saving...' : 'Save Settings'}</button>
                </div>
              )}
            </form>
          )}

          {activeTab === 'subscription' && (
            <div className="glass-panel rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative overflow-hidden border border-white/40 dark:border-slate-700/50">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="relative z-10">
                <SubscriptionSection />
              </div>
            </div>
          )}

          {activeTab === 'departments' && (
            <div className="glass-panel rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative overflow-hidden border border-white/40 dark:border-slate-700/50">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="relative z-10">
                <DepartmentsSection />
              </div>
            </div>
          )}

          {activeTab === 'branches' && (
            <div className="glass-panel rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative overflow-hidden border border-white/40 dark:border-slate-700/50">
              <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 dark:bg-rose-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="relative z-10">
                <BranchesSection />
              </div>
            </div>
          )}

          {activeTab === 'shifts' && (
            <div className="glass-panel rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative overflow-hidden border border-white/40 dark:border-slate-700/50">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="relative z-10">
                <ShiftsSection />
              </div>
            </div>
          )}

          {activeTab === 'holidays' && (
            <div className="glass-panel rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative overflow-hidden border border-white/40 dark:border-slate-700/50">
              <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 dark:bg-pink-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="relative z-10">
                <HolidaysSection />
              </div>
            </div>
          )}

          {activeTab === 'modules' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="glass-panel rounded-3xl p-8 border border-white/40 dark:border-slate-700/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 relative z-10">Enabled Modules</h3>
                <div className="flex flex-wrap gap-2.5 relative z-10">
                  {enabledModules.length === 0 ? (
                    <p className="text-sm text-slate-400">No modules enabled yet.</p>
                  ) : enabledModules.map((m) => (
                    <span key={m} className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-100 dark:border-blue-500/30 shadow-sm">{m.replace(/_/g, ' ')}</span>
                  ))}
                </div>
                <p className="text-sm text-slate-500 mt-6 relative z-10 font-medium">Enabling additional modules requires a plan upgrade — contact your platform administrator.</p>
              </div>

              <div className="glass-panel rounded-3xl p-8 border border-white/40 dark:border-slate-700/50">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">Coming Soon</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Approval workflows, notifications and email settings aren't built yet — this app has no email-delivery service in place, so these would be non-functional forms today. They'll land once that's in place.</p>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handlePasswordChange} className="glass-panel rounded-3xl p-8 max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-500 border border-white/40 dark:border-slate-700/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="relative z-10">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-3">
                  <div className="p-2.5 bg-red-50 dark:bg-red-500/10 rounded-xl text-red-600 dark:text-red-400">
                    <Lock className="w-6 h-6" />
                  </div>
                  Change Password
                </h3>
                {pwMessage && <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-4">{pwMessage}</p>}
                <div className="space-y-4">
                  <input required type="password" placeholder="Current password" className="input-field" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} />
                  <input required type="password" placeholder="New password" className="input-field" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} />
                  <button type="submit" disabled={pwSaving} className="btn-primary w-full justify-center mt-2">
                    {pwSaving ? 'Saving...' : 'Change Password'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
