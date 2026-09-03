'use client'

import { useState } from 'react'
import { X, Briefcase, ChevronRight, Check } from 'lucide-react'
import { Portal } from '@/components/common/Portal'

const STEPS = [
  'Position Details',
  'Job Requirements',
  'Compensation',
  'Hiring Details',
  'Status'
]

export function OpenPositionModal({ onClose, onSave, initialData }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [saving, setSaving] = useState(false)
  
  // Basic form state
  const [form, setForm] = useState(initialData || {
    // Step 1
    title: '', department: '', jobType: 'Full-time', employmentType: 'Permanent', openings: 1, location: '', workMode: 'On-site',
    // Step 2
    description: '', requiredSkills: '', experience: '', education: '', preferredSkills: '', responsibilities: '',
    // Step 3
    salaryMin: '', salaryMax: '', salaryType: 'Annual', currency: 'USD', benefits: '',
    // Step 4
    hiringManager: '', recruiter: '', priority: 'Medium', openingDate: '', targetClosingDate: '', expectedJoiningDate: '',
    // Step 5
    status: 'Draft'
  })

  const handleNext = () => setCurrentStep(p => Math.min(p + 1, STEPS.length - 1))
  const handlePrev = () => setCurrentStep(p => Math.max(p - 1, 0))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    // Simulate API call
    setTimeout(() => {
      setSaving(false)
      if (onSave) {
        onSave(form)
      } else {
        onClose()
      }
    }, 1500)
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Job Title / Position Name <span className="text-rose-500">*</span></label>
                <input required className="input-field" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Department <span className="text-rose-500">*</span></label>
                <input required className="input-field" value={form.department} onChange={e => setForm({...form, department: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Number of Openings <span className="text-rose-500">*</span></label>
                <input type="number" min="1" required className="input-field" value={form.openings} onChange={e => setForm({...form, openings: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Job Type</label>
                <select className="input-field" value={form.jobType} onChange={e => setForm({...form, jobType: e.target.value})}>
                  <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Intern</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Employment Type</label>
                <select className="input-field" value={form.employmentType} onChange={e => setForm({...form, employmentType: e.target.value})}>
                  <option>Permanent</option><option>Temporary</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Work Mode</label>
                <select className="input-field" value={form.workMode} onChange={e => setForm({...form, workMode: e.target.value})}>
                  <option>On-site</option><option>Hybrid</option><option>Remote</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Location</label>
                <input className="input-field" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
              </div>
            </div>
          </div>
        )
      case 1:
        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Job Description <span className="text-rose-500">*</span></label>
              <textarea required rows={3} className="input-field" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Responsibilities</label>
              <textarea rows={3} className="input-field" value={form.responsibilities} onChange={e => setForm({...form, responsibilities: e.target.value})} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Required Skills <span className="text-rose-500">*</span></label>
                <input required className="input-field" placeholder="e.g. React, Node.js" value={form.requiredSkills} onChange={e => setForm({...form, requiredSkills: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Preferred Skills</label>
                <input className="input-field" value={form.preferredSkills} onChange={e => setForm({...form, preferredSkills: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Experience Required</label>
                <input className="input-field" placeholder="e.g. 3-5 Years" value={form.experience} onChange={e => setForm({...form, experience: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Education / Qualification</label>
                <input className="input-field" value={form.education} onChange={e => setForm({...form, education: e.target.value})} />
              </div>
            </div>
          </div>
        )
      case 2:
        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Salary Range (Min)</label>
                <input type="number" className="input-field" value={form.salaryMin} onChange={e => setForm({...form, salaryMin: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Salary Range (Max)</label>
                <input type="number" className="input-field" value={form.salaryMax} onChange={e => setForm({...form, salaryMax: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Salary Type</label>
                <select className="input-field" value={form.salaryType} onChange={e => setForm({...form, salaryType: e.target.value})}>
                  <option>Annual</option><option>Monthly</option><option>Hourly</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Currency</label>
                <select className="input-field" value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}>
                  <option>USD</option><option>EUR</option><option>INR</option><option>GBP</option>
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Additional Benefits</label>
                <textarea rows={3} className="input-field" placeholder="Health insurance, stock options..." value={form.benefits} onChange={e => setForm({...form, benefits: e.target.value})} />
              </div>
            </div>
          </div>
        )
      case 3:
        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Hiring Manager <span className="text-rose-500">*</span></label>
                <input required className="input-field" value={form.hiringManager} onChange={e => setForm({...form, hiringManager: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Recruiter / HR <span className="text-rose-500">*</span></label>
                <input required className="input-field" value={form.recruiter} onChange={e => setForm({...form, recruiter: e.target.value})} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Priority</label>
                <div className="flex gap-3">
                  {['Low', 'Medium', 'High', 'Urgent'].map(p => (
                    <label key={p} className={`flex-1 flex items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${
                      form.priority === p ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}>
                      <input type="radio" className="hidden" checked={form.priority === p} onChange={() => setForm({...form, priority: p})} />
                      <span className="text-sm font-bold">{p}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Opening Date <span className="text-rose-500">*</span></label>
                <input required type="date" className="input-field" value={form.openingDate} onChange={e => setForm({...form, openingDate: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Target Closing Date</label>
                <input type="date" className="input-field" value={form.targetClosingDate} onChange={e => setForm({...form, targetClosingDate: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Expected Joining Date</label>
                <input type="date" className="input-field" value={form.expectedJoiningDate} onChange={e => setForm({...form, expectedJoiningDate: e.target.value})} />
              </div>
            </div>
          </div>
        )
      case 4:
        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300 text-center py-8">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Set Position Status</h3>
            <div className="flex flex-wrap justify-center gap-4 max-w-lg mx-auto">
              {['Draft', 'Open', 'On Hold', 'Closed', 'Cancelled'].map(s => (
                <label key={s} className={`flex-1 min-w-[120px] flex items-center justify-center p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  form.status === s ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-md transform scale-105' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}>
                  <input type="radio" className="hidden" checked={form.status === s} onChange={() => setForm({...form, status: s})} />
                  <span className="text-base font-bold">{s}</span>
                </label>
              ))}
            </div>
            <p className="text-slate-500 mt-8 text-sm">You can change this status later at any time.</p>
          </div>
        )
    }
  }

  return (
    <Portal><div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="max-h-[90dvh] overflow-y-auto relative bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col h-[85vh] sm:h-auto sm:max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 sm:px-8 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between relative z-10">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-500" />
              {initialData ? 'Edit Position' : 'Create Open Position'}
            </h2>
            <p className="text-xs font-medium text-slate-500 mt-1">Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep]}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress */}
        <div className="px-6 sm:px-8 pt-6 pb-2 relative z-10 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-100 dark:bg-slate-800 -z-10 -translate-y-1/2"></div>
            <div className="absolute left-0 top-1/2 h-0.5 bg-indigo-500 -z-10 -translate-y-1/2 transition-all duration-300" style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}></div>
            
            {STEPS.map((step, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                  idx < currentStep ? 'bg-indigo-500 border-indigo-500 text-white' 
                  : idx === currentStep ? 'bg-white dark:bg-slate-900 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.3)]'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400'
                }`}>
                  {idx < currentStep ? <Check className="w-4 h-4" /> : idx + 1}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 px-1 hidden sm:flex">
            {STEPS.map((step, idx) => (
              <span key={idx} className={`text-[10px] font-bold ${idx <= currentStep ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                {step}
              </span>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 relative z-10 custom-scrollbar">
          <form id="open-position-form" onSubmit={handleSubmit}>
            {renderStepContent()}
          </form>
        </div>

        {/* Footer Navigation */}
        <div className="p-5 sm:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/30 flex justify-between gap-3 relative z-10">
          <button 
            type="button" 
            onClick={currentStep === 0 ? onClose : handlePrev}
            className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors bg-slate-100 dark:bg-slate-800"
          >
            {currentStep === 0 ? 'Cancel' : 'Back'}
          </button>
          
          {currentStep < STEPS.length - 1 ? (
            <button 
              type="button"
              onClick={handleNext} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button 
              type="submit" 
              form="open-position-form"
              disabled={saving} 
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              {saving ? 'Saving...' : 'Publish Position'}
            </button>
          )}
        </div>
      </div>
      </div>
    </Portal>
  )
}
