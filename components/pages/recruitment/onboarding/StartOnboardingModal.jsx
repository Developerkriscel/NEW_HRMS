import React, { useState, useEffect } from 'react'
import { X, Search, ChevronRight, CheckCircle2, User, Building, FileText, Settings, ArrowLeft, ArrowRight, MapPin, CalendarDays, Briefcase } from 'lucide-react'
import { Portal } from '@/components/common/Portal'
import { offerApi } from '@/services/offerApi'
import { preboardingApi } from '@/services/preboardingApi'
import { employeeApi } from '@/services/employeeApi'

const STEPS = [
  { id: 'candidate', label: 'Candidate', icon: User },
  { id: 'employment', label: 'Employment', icon: Building },
  { id: 'configuration', label: 'Configuration', icon: Settings },
  { id: 'review', label: 'Review', icon: FileText }
]

export function StartOnboardingModal({ isOpen, onClose, onRefresh }) {
  const [loadingOffers, setLoadingOffers] = useState(false)
  const [availableCandidates, setAvailableCandidates] = useState([])
  const [managers, setManagers] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const [formData, setFormData] = useState({
    candidate: null,
    position: '',
    department: '',
    designation: '',
    employmentType: 'Full Time',
    workMode: 'On-site',
    workLocation: '',
    reportingManager: '',
    joiningDate: '',
    onboardingOwner: '',
    priority: 'Medium',
    tasks: [
      { name: 'Document Verification', assignedTo: 'HR Department', dueDate: '', priority: 'High', required: true },
      { name: 'Employee Profile', assignedTo: 'HR Department', dueDate: '', priority: 'Medium', required: true },
      { name: 'Bank Details', assignedTo: 'Finance', dueDate: '', priority: 'High', required: true },
      { name: 'IT Equipment', assignedTo: 'IT Support', dueDate: '', priority: 'Medium', required: true },
    ]
  })

  useEffect(() => {
    if (isOpen) {
      setLoadingOffers(true)
      Promise.all([
        offerApi.list({ limit: 100 }).catch(() => ({ data: { items: [] } })),
        preboardingApi.list({ limit: 500 }).catch(() => ({ data: { items: [] } })),
        employeeApi.getAll().catch(() => ({ data: { items: [] } }))
      ]).then(([offersRes, preboardingRes, empRes]) => {
        const offers = offersRes.data?.items || []
        const records = preboardingRes.data?.items || []
        const emps = empRes.data?.items || []
        
        // Filter out those already onboarding
        const accepted = offers.filter(o => o.status === 'ACCEPTED' || o.offerStatus === 'ACCEPTED')
        const onboardingNames = new Set(records.map(r => r.candidate?.name || r.candidateName))
        
        const available = accepted
          .filter(o => !onboardingNames.has(o.candidate?.name || o.candidateName || o.name))
          .map(o => ({
            id: o._id || o.id,
            offerId: o._id || o.id,
            name: o.candidate?.name || o.candidateName || o.name || 'Unknown',
            email: o.candidate?.email || o.email || '',
            phone: o.candidate?.phone || o.phone || '',
            position: o.job?.title || o.role || 'Unknown Position',
            department: o.job?.department || 'Engineering',
            status: 'Hired'
          }))
          
        setAvailableCandidates(available)

        const filteredManagers = emps.filter(m => m.role === 'MANAGER' || m.role === 'COMPANY_ADMIN' || m.role === 'HR_MANAGER')
        setManagers(filteredManagers)
      }).finally(() => {
        setLoadingOffers(false)
      })
    } else {
      setCurrentStep(0)
      setFormData(prev => ({ ...prev, candidate: null }))
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(s => s + 1)
  }

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1)
  }

  const handleStart = async () => {
    setSubmitting(true)
    try {
      const payload = {
        offerId: formData.candidate?.offerId,
        department: formData.department,
        designation: formData.designation,
        employmentType: formData.employmentType,
        workMode: formData.workMode,
        workLocation: formData.workLocation,
        managerId: formData.reportingManager,
        proposedJoiningDate: formData.joiningDate,
        priority: formData.priority
      }
      
      await preboardingApi.start(payload)
      onRefresh?.()
      onClose()
      setCurrentStep(0)
      setFormData({ ...formData, candidate: null })
    } catch (err) {
      console.error('Failed to start onboarding', err)
      alert(err.response?.data?.message || err.message || 'Failed to start onboarding')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Portal><div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">Start Onboarding</span>
            </h2>
            <p className="text-sm font-medium text-slate-500 mt-1">Configure preboarding experience for new hire</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors dark:hover:bg-slate-800 dark:hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-8 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {STEPS.map((step, idx) => {
              const Icon = step.icon
              const isActive = currentStep === idx
              const isPassed = currentStep > idx

              return (
                <div key={step.id} className="flex flex-col items-center gap-2 relative z-10">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110' : isPassed ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                    {isPassed ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs font-bold ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                    {step.label}
                  </span>
                </div>
              )
            })}
            
            {/* Connecting Lines */}
            <div className="absolute top-1/2 left-[10%] right-[10%] h-0.5 bg-slate-100 dark:bg-slate-800 -z-0 -translate-y-1/2">
              <div 
                className="h-full bg-blue-600 transition-all duration-500" 
                style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 dark:bg-slate-900/50">
          {currentStep === 0 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search hired candidates..." 
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-shadow shadow-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loadingOffers ? (
                  <div className="col-span-full p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <p className="text-slate-500">Loading accepted offers from database...</p>
                  </div>
                ) : availableCandidates.length === 0 ? (
                  <div className="col-span-full p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <p className="text-slate-500">No accepted offers available for onboarding.</p>
                  </div>
                ) : (
                  availableCandidates.map(candidate => (
                    <div 
                      key={candidate.id} 
                      onClick={() => {
                        setFormData({
                          ...formData,
                          candidate,
                          position: candidate.position,
                          department: candidate.department,
                          designation: candidate.position
                        })
                        handleNext()
                      }}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
                          {candidate.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{candidate.name}</h4>
                          <p className="text-xs text-slate-500 mb-1">{candidate.id}</p>
                          <div className="flex gap-2 text-xs">
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">{candidate.position}</span>
                            <span className="bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded text-emerald-700 dark:text-emerald-400 font-medium">Accepted</span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              {/* Section 1: Role */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <h4 className="font-bold text-slate-900 dark:text-white mb-4 text-sm flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-500" /> Role & Department
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <label className="block group">
                    <span className="mb-2 block text-[11px] font-bold text-slate-500 uppercase tracking-wider group-focus-within:text-blue-600 transition-colors">Department *</span>
                    <select className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
                      <option value="">Select Department</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Human Resources">Human Resources</option>
                      <option value="Sales">Sales</option>
                      <option value="Design">Design</option>
                    </select>
                  </label>
                  <label className="block group">
                    <span className="mb-2 block text-[11px] font-bold text-slate-500 uppercase tracking-wider group-focus-within:text-blue-600 transition-colors">Designation *</span>
                    <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} />
                  </label>
                </div>
              </div>

              {/* Section 2: Work Arrangement */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <h4 className="font-bold text-slate-900 dark:text-white mb-4 text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-500" /> Work Arrangement
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <label className="block group">
                    <span className="mb-2 block text-[11px] font-bold text-slate-500 uppercase tracking-wider group-focus-within:text-blue-600 transition-colors">Employment Type *</span>
                    <select className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white" value={formData.employmentType} onChange={e => setFormData({...formData, employmentType: e.target.value})}>
                      <option value="Full Time">Full Time</option>
                      <option value="Part Time">Part Time</option>
                      <option value="Contract">Contract</option>
                      <option value="Intern">Intern</option>
                    </select>
                  </label>
                  <label className="block group">
                    <span className="mb-2 block text-[11px] font-bold text-slate-500 uppercase tracking-wider group-focus-within:text-blue-600 transition-colors">Work Mode</span>
                    <select className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white" value={formData.workMode} onChange={e => setFormData({...formData, workMode: e.target.value})}>
                      <option value="On-site">On-site</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Remote">Remote</option>
                    </select>
                  </label>
                  <label className="block group">
                    <span className="mb-2 block text-[11px] font-bold text-slate-500 uppercase tracking-wider group-focus-within:text-blue-600 transition-colors">Work Location *</span>
                    <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white" value={formData.workLocation} onChange={e => setFormData({...formData, workLocation: e.target.value})} />
                  </label>
                </div>
              </div>

              {/* Section 3: Joining & Reporting */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <h4 className="font-bold text-slate-900 dark:text-white mb-4 text-sm flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-indigo-500" /> Joining & Reporting
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <label className="block group">
                    <span className="mb-2 block text-[11px] font-bold text-slate-500 uppercase tracking-wider group-focus-within:text-blue-600 transition-colors">Proposed Joining Date *</span>
                    <input type="date" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white" value={formData.joiningDate} onChange={e => setFormData({...formData, joiningDate: e.target.value})} />
                  </label>
                  <label className="block group">
                    <span className="mb-2 block text-[11px] font-bold text-slate-500 uppercase tracking-wider group-focus-within:text-blue-600 transition-colors">Reporting Manager</span>
                    <select className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white" value={formData.reportingManager} onChange={e => setFormData({...formData, reportingManager: e.target.value})}>
                      <option value="">Select Manager</option>
                      {managers.map(m => (
                        <option key={m._id} value={m._id}>{m.firstName} {m.lastName} ({m.email})</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              {/* Task Configuration */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Default Task Template
                  </h4>
                  <button className="text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors">
                    Edit Template
                  </button>
                </div>
                
                <div className="space-y-3">
                  {formData.tasks.map((task, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{task.name}</h5>
                          {task.required && <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-full shrink-0">Required</span>}
                        </div>
                        <p className="text-xs font-medium text-slate-500 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                          Assigned to: {task.assignedTo}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${task.priority === 'High' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30' : 'bg-slate-100 text-slate-600 dark:bg-slate-800'}`}>
                          {task.priority} Priority
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Document Configuration */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <h4 className="font-bold text-slate-900 dark:text-white mb-4 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-rose-500" /> Required Documents
                </h4>
                <div className="flex flex-wrap gap-2">
                  {['Aadhaar Card', 'PAN Card', 'Bank Passbook', 'Relieving Letter', 'Degree Certificate'].map(doc => (
                    <span key={doc} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700">
                      {doc}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-2">Ready to Start Onboarding</h3>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                  Review the details below. Once started, the candidate will receive an invitation email to the preboarding portal.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Candidate Snapshot</h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300">
                        {formData.candidate?.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white">{formData.candidate?.name}</p>
                        <p className="text-xs text-slate-500">{formData.candidate?.email}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Employment Summary</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Role</p>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{formData.designation || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Department</p>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{formData.department || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Reporting Manager</p>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{managers.find(m => m._id === formData.reportingManager)?.firstName || formData.reportingManager || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Configuration</p>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{formData.tasks.length} Tasks</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${currentStep === 0 ? 'opacity-0 pointer-events-none' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          
          <div className="flex gap-3">
            {currentStep < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={currentStep === 0 && !formData.candidate}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button 
                onClick={handleStart} 
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-500/30"
              >
                {submitting ? 'Starting...' : 'Start Onboarding'}
              </button>
            )}
          </div>
        </div>

      </div>
      </div>
    </Portal>
  )
}
