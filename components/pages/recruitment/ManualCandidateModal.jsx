import React, { useState } from 'react'
import { X, User, Mail, Phone, Briefcase, MapPin, DollarSign, FileText, Sparkles } from 'lucide-react'

export default function ManualCandidateModal({ position, onClose, onSave, onAnalyze, onOpenExisting }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [existingApplication, setExistingApplication] = useState(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    currentLocation: '',
    currentCompany: '',
    currentDesignation: '',
    exp: '',
    expectedCtcText: '',
    skills: '',
    educationText: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setExistingApplication(null)
    try {
      await onSave({
        ...formData,
        source: 'MANUAL'
      })
    } catch (err) {
      setError(err.message || 'Failed to add candidate')
      setExistingApplication(err.existingApplication || null)
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async () => {
    setLoading(true)
    setError('')
    setExistingApplication(null)
    try {
      await onAnalyze({ ...formData, name: [formData.firstName, formData.lastName].filter(Boolean).join(' '), source: 'MANUAL' })
    } catch (err) {
      setError(err.message || 'Failed to analyze candidate')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add Candidate Manually</h2>
            <p className="text-sm text-slate-500 mt-1">Add a candidate to the {position?.title || 'selected'} pipeline</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="manual-candidate-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">First Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input required name="firstName" value={formData.firstName} onChange={handleChange} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="John" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Last Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input name="lastName" value={formData.lastName} onChange={handleChange} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Doe" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="john@example.com" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input name="phone" value={formData.phone} onChange={handleChange} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="+1 234 567 8900" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Current Role/Designation</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input name="currentDesignation" value={formData.currentDesignation} onChange={handleChange} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Software Engineer" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Current Company</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input name="currentCompany" value={formData.currentCompany} onChange={handleChange} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Tech Corp" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Total Experience (Years)</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input name="exp" type="number" step="0.5" min="0" value={formData.exp} onChange={handleChange} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="3.5" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Expected CTC</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input name="expectedCtcText" value={formData.expectedCtcText} onChange={handleChange} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="1500000" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Skills (Comma separated)</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <textarea name="skills" value={formData.skills} onChange={handleChange} rows="2" className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="React, Node.js, Python..." />
              </div>
            </div>

          </form>
          {error ? (
            <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${existingApplication ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'}`}>
              {existingApplication && <span className="mb-1 block text-xs uppercase tracking-wider">Existing application found</span>}
              <span className="block font-bold">{error}</span>
            </div>
          ) : null}
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 rounded-xl transition-colors">
            {existingApplication ? 'Close' : 'Cancel'}
          </button>
          {existingApplication && onOpenExisting ? (
            <button
              type="button"
              onClick={() => onOpenExisting(existingApplication)}
              className="px-6 py-2 bg-amber-700 hover:bg-amber-800 text-white text-sm font-bold rounded-xl shadow-md shadow-amber-500/20 transition-all"
            >
              Open Existing Application
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {onAnalyze && <button type="button" onClick={handleAnalyze} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-2 text-sm font-bold text-indigo-700 transition-all hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
                <Sparkles className="h-4 w-4" /> {loading ? 'Analyzing...' : 'Analyze with AI'}
              </button>}
              <button type="submit" form="manual-candidate-form" disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2 text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                {loading ? 'Adding...' : 'Add Candidate'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
