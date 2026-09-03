import React, { useState } from 'react'
import { X, Search, ChevronRight, CheckCircle2, User, Building, FileText, Settings, ArrowLeft, ArrowRight, MapPin, CalendarDays, Briefcase } from 'lucide-react'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useRecruitmentStore } from '@/store/recruitmentStore'
import { Portal } from '@/components/common/Portal'

const STEPS = [
  { id: 'candidate', label: 'Candidate', icon: User },
  { id: 'employment', label: 'Employment', icon: Building },
  { id: 'configuration', label: 'Configuration', icon: Settings },
  { id: 'review', label: 'Review', icon: FileText }
]

export function StartOnboardingModal({ isOpen, onClose }) {
  const { startOnboarding, records } = useOnboardingStore()
  const { offers } = useRecruitmentStore()
  
  const availableCandidates = offers
    .filter(o => o.offerStatus === 'Accepted')
    .filter(o => !records.some(r => r.candidate.name === o.name)) // Simple check by name to avoid duplicate onboardings
    .map(o => ({
      id: `CAN-${1000 + o.id}`,
      name: o.name,
      email: o.email,
      phone: '+91 XXXXXXXXXX',
      position: o.role,
      department: 'Engineering', // Defaulting based on typical roles for now
      status: 'Hired'
    }))
  
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

  if (!isOpen) return null

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(s => s + 1)
  }

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1)
  }

  const handleStart = () => {
    startOnboarding(formData)
    onClose()
    setCurrentStep(0)
    setFormData({ ...formData, candidate: null }) // reset
  }

  return (
    <Portal><div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Start Onboarding</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Configure joining formalities for a hired candidate.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full z-0" />
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 rounded-full z-0 transition-all duration-500"
              style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
            />
            {STEPS.map((step, index) => {
              const Icon = step.icon
              const isCompleted = index < currentStep
              const isActive = index === currentStep
              return (
                <div key={step.id} className="relative z-10 flex flex-col items-center gap-2 bg-white dark:bg-slate-900 px-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isCompleted ? 'bg-blue-600 border-blue-600 text-white' : isActive ? 'bg-white dark:bg-slate-900 border-blue-600 text-blue-600' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'}`}>
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider ${isActive || isCompleted ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30 dark:bg-slate-900/20">
          
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
                {availableCandidates.length === 0 ? (
                  <div className="col-span-full p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <p className="text-slate-500">No hired candidates available for onboarding.</p>
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
                            <span className="bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded text-emerald-700 dark:text-emerald-400 font-medium">Hired</span>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <label className="block group">
                    <span className="mb-2 block text-[11px] font-bold text-slate-500 uppercase tracking-wider group-focus-within:text-blue-600 transition-colors">Position *</span>
                    <input className="input-field bg-slate-50/50" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} />
                  </label>
                  <label className="block group">
                    <span className="mb-2 block text-[11px] font-bold text-slate-500 uppercase tracking-wider group-focus-within:text-blue-600 transition-colors">Department *</span>
                    <select className="input-field bg-slate-50/50" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
                      <option value="">Select Department</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Human Resources">Human Resources</option>
                      <option value="Sales">Sales</option>
                      <option value="Design">Design</option>
                    </select>
                  </label>
                  <label className="block group">
                    <span className="mb-2 block text-[11px] font-bold text-slate-500 uppercase tracking-wider group-focus-within:text-blue-600 transition-colors">Designation *</span>
                    <input className="input-field bg-slate-50/50" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} />
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
                    <select className="input-field bg-slate-50/50" value={formData.employmentType} onChange={e => setFormData({...formData, employmentType: e.target.value})}>
                      <option value="Full Time">Full Time</option>
                      <option value="Part Time">Part Time</option>
                      <option value="Contract">Contract</option>
                      <option value="Intern">Intern</option>
                    </select>
                  </label>
                  <label className="block group">
                    <span className="mb-2 block text-[11px] font-bold text-slate-500 uppercase tracking-wider group-focus-within:text-blue-600 transition-colors">Work Mode</span>
                    <select className="input-field bg-slate-50/50" value={formData.workMode} onChange={e => setFormData({...formData, workMode: e.target.value})}>
                      <option value="On-site">On-site</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Remote">Remote</option>
                    </select>
                  </label>
                  <label className="block group">
                    <span className="mb-2 block text-[11px] font-bold text-slate-500 uppercase tracking-wider group-focus-within:text-blue-600 transition-colors">Work Location *</span>
                    <input className="input-field bg-slate-50/50" value={formData.workLocation} onChange={e => setFormData({...formData, workLocation: e.target.value})} />
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
                    <span className="mb-2 block text-[11px] font-bold text-slate-500 uppercase tracking-wider group-focus-within:text-blue-600 transition-colors">Joining Date *</span>
                    <input type="date" className="input-field bg-slate-50/50" value={formData.joiningDate} onChange={e => setFormData({...formData, joiningDate: e.target.value})} />
                  </label>
                  <label className="block group">
                    <span className="mb-2 block text-[11px] font-bold text-slate-500 uppercase tracking-wider group-focus-within:text-blue-600 transition-colors">Reporting Manager *</span>
                    <input className="input-field bg-slate-50/50" placeholder="e.g. Amit Verma" value={formData.reportingManager} onChange={e => setFormData({...formData, reportingManager: e.target.value})} />
                  </label>
                </div>
              </div>

            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <label className="block group">
                    <span className="mb-2 block text-[11px] font-bold text-slate-500 uppercase tracking-wider group-focus-within:text-blue-600 transition-colors">Onboarding Owner *</span>
                    <input className="input-field bg-slate-50/50" placeholder="HR Person in charge" value={formData.onboardingOwner} onChange={e => setFormData({...formData, onboardingOwner: e.target.value})} />
                  </label>
                  <label className="block group">
                    <span className="mb-2 block text-[11px] font-bold text-slate-500 uppercase tracking-wider group-focus-within:text-blue-600 transition-colors">Overall Priority</span>
                    <select className="input-field bg-slate-50/50" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </label>
                </div>
              </div>
              
                <h4 className="font-bold text-slate-900 dark:text-white mb-2">Automated Tasks Checklist</h4>
                <p className="text-xs text-slate-500 mb-4">These tasks will be automatically generated and assigned to the respective departments.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {formData.tasks.map((task, idx) => (
                    <div key={idx} className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="mt-0.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /></div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{task.name}</p>
                        <p className="text-[11px] text-slate-500 font-medium mt-1">Assigned to: <span className="text-indigo-600 dark:text-indigo-400">{task.assignedTo}</span></p>
                      </div>
                      <div className="ml-auto">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${task.priority === 'High' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30'}`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-100 dark:border-blue-900/30 rounded-3xl p-8 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-8">
                <div className="w-24 h-24 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-4xl shadow-xl shadow-blue-500/30 shrink-0">
                  {formData.candidate?.name?.charAt(0) || 'C'}
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{formData.candidate?.name}</h3>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm font-medium">
                    <span className="bg-white dark:bg-slate-800 px-3 py-1 rounded-full text-slate-600 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-700">{formData.position}</span>
                    <span className="bg-white dark:bg-slate-800 px-3 py-1 rounded-full text-slate-600 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-700">{formData.department}</span>
                    <span className="bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full text-blue-700 dark:text-blue-400 shadow-sm border border-blue-200 dark:border-blue-800/50">Joining: {formData.joiningDate || 'TBD'}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-slate-200/50 dark:border-slate-700/50">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Reporting Manager</p>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{formData.reportingManager || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Onboarding Owner</p>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{formData.onboardingOwner || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tasks Configured</p>
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
            {currentStep > 0 && currentStep < STEPS.length - 1 && (
              <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-all">
                Save as Draft
              </button>
            )}
            
            {currentStep < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={currentStep === 0 && !formData.candidate}
                className="btn-primary min-w-[120px] justify-center"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleStart} className="btn-primary min-w-[160px] justify-center shadow-[0_8px_20px_rgba(37,99,235,0.3)] bg-gradient-to-r from-blue-600 to-indigo-600">
                Start Onboarding
              </button>
            )}
          </div>
        </div>

      </div>
      </div>
    </Portal>
  )
}
