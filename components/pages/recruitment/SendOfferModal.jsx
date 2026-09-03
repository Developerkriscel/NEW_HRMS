'use client'

import { useState } from 'react'
import { X, Mail, FileText, CheckCircle2 } from 'lucide-react'
import { Avatar } from '@/components/common/Avatar'
import { Portal } from '@/components/common/Portal'

export function SendOfferModal({ candidate, onClose, onSend }) {
  const defaultSubject = `Job Offer from NexaHR - ${candidate?.role || ''}`;
  const defaultBody = `Dear ${candidate?.name || ''},

We are thrilled to offer you the position of ${candidate?.role || ''} at NexaHR. Your skills and experience, particularly your ${candidate?.score || candidate?.matchScore || 0}% AI match score for this role, make you an ideal fit for our team.

Please find the detailed offer letter attached to this email. We look forward to welcoming you aboard!

Best regards,
The NexaHR Recruitment Team`;

  const [subject, setSubject] = useState(defaultSubject)
  const [emailBody, setEmailBody] = useState(defaultBody)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  
  const handleSend = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSend({ ...candidate, offerEmail: { subject, body: emailBody } })
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to send offer')
    } finally {
      setSaving(false)
    }
  }

  if (!candidate) return null

  return (
    <Portal><div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 sm:px-8 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between relative z-10">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-500" />
              Send Offer Letter
            </h2>
            <p className="text-xs font-medium text-slate-500 mt-1">Review and send automated offer via email</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 relative z-10 custom-scrollbar space-y-6">
          
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-500/10 dark:to-blue-500/10 rounded-2xl p-6 border border-indigo-100 dark:border-indigo-500/20 flex items-center gap-5">
            <Avatar name={candidate.name} size="lg" />
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{candidate.name}</h3>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-0.5">{candidate.email}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">AI Match Score</p>
              <div className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 px-3 py-1 rounded-lg font-black text-lg">
                <CheckCircle2 className="w-4 h-4" /> {candidate.score || candidate.matchScore || 0}%
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">Email Subject</label>
              <input 
                type="text" 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">Email Body</label>
              <textarea 
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full h-48 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm font-medium text-slate-900 dark:text-white leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow resize-none custom-scrollbar"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-400 text-sm font-medium">
            <FileText className="w-5 h-5 flex-shrink-0" />
            An automated PDF offer letter will be generated and attached based on the standard template.
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-700 dark:text-red-300 text-sm font-semibold">
              {error}
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div className="p-5 sm:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/30 flex justify-end gap-3 relative z-10">
          <button 
            type="button" 
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors bg-slate-100 dark:bg-slate-800"
          >
            Cancel
          </button>
          
          <button 
            type="button"
            onClick={handleSend}
            disabled={saving} 
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
          >
            {saving ? (
              <><span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></span> Sending...</>
            ) : (
              <><Mail className="w-4 h-4" /> Send Offer Letter</>
            )}
          </button>
        </div>
      </div>
      </div>
    </Portal>
  )
}
