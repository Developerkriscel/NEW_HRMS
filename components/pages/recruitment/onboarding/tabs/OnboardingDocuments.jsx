import React, { useState } from 'react'
import { FileText, CheckCircle2, Upload, AlertCircle, Eye, ShieldCheck, ShieldAlert, Clock } from 'lucide-react'
import { Portal } from '@/components/common/Portal'
import { preboardingApi } from '@/services/preboardingApi'

export function OnboardingDocuments({ record, onRefresh }) {
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')

  const handleVerify = async (docId) => {
    setSaving(docId)
    setError('')
    try {
      await preboardingApi.verifyDocument(record.id, docId)
      await onRefresh?.()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify document')
    } finally {
      setSaving('')
    }
  }

  const handleReject = async (docId) => {
    setSaving(docId)
    setError('')
    try {
      await preboardingApi.rejectDocument(record.id, docId, 'Other')
      await onRefresh?.()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject document')
    } finally {
      setSaving('')
    }
  }

  const handleUpload = async (docId, file) => {
    if (!file) return
    setSaving(docId)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      await preboardingApi.uploadDocument(record.id, docId, formData)
      await onRefresh?.()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload document')
    } finally {
      setSaving('')
    }
  }

  const getStatusIcon = (status) => {
    switch(status) {
      case 'VERIFIED': return <ShieldCheck className="w-5 h-5 text-emerald-500" />
      case 'REJECTED': return <ShieldAlert className="w-5 h-5 text-red-500" />
      case 'PENDING_VERIFICATION': return <Clock className="w-5 h-5 text-amber-500" />
      default: return <AlertCircle className="w-5 h-5 text-slate-400" />
    }
  }

  const [isAdding, setIsAdding] = useState(false)
  const [newDocName, setNewDocName] = useState('')
  const [newDocRequired, setNewDocRequired] = useState(true)

  const handleAddDocument = async () => {
    if (newDocName.trim()) {
      setSaving('new')
      setError('')
      try {
        await preboardingApi.addDocument(record.id, {
          name: newDocName,
          required: newDocRequired
        })
        setNewDocName('')
        setIsAdding(false)
        await onRefresh?.()
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to request document')
      } finally {
        setSaving('')
      }
    }
  }

  const handleRemoveDocument = async (docId) => {
    setSaving(docId)
    setError('')
    try {
      await preboardingApi.deleteDocument(record.id, docId)
      await onRefresh?.()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove document')
    } finally {
      setSaving('')
    }
  }

  return (
    <div className="p-6 md:p-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Documents</h3>
          <p className="text-sm text-slate-500">Collect and verify mandatory joining documents.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsAdding(true)} className="btn-secondary">
            + Add Document
          </button>
          <button className="btn-secondary">
            <Upload className="w-4 h-4" /> Request Upload
          </button>
        </div>
      </div>
      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {isAdding && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="max-h-[90dvh] overflow-y-auto bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Request New Document</h2>
                <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Document Name *</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Police Clearance Certificate" 
                    className="input-field py-2"
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    autoFocus
                  />
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl p-4 flex items-center justify-between cursor-pointer" onClick={() => setNewDocRequired(!newDocRequired)}>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Is this document mandatory?</h4>
                    <p className="text-xs text-slate-500">Candidate cannot complete onboarding without this.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={newDocRequired}
                    onChange={(e) => setNewDocRequired(e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                  />
                </div>
              </div>
              
              <div className="p-6 pt-0 flex gap-3">
                <button onClick={() => setIsAdding(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button onClick={handleAddDocument} disabled={!newDocName.trim() || saving === 'new'} className="btn-primary flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving === 'new' ? 'Saving...' : 'Add Document'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {record.documents.map(doc => (
          <div key={doc.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  doc.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' :
                  doc.status === 'REJECTED' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' :
                  doc.status === 'PENDING_VERIFICATION' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' :
                  'bg-slate-100 text-slate-500 dark:bg-slate-700'
                }`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{doc.name}</h4>
                  {doc.required && <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Required</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(doc.status)}
                {doc.status === 'NOT_SUBMITTED' && (
                  <button 
                    onClick={() => handleRemoveDocument(doc.id)}
                    disabled={saving === doc.id}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                    title="Remove Document Request"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1">
              {doc.status !== 'NOT_SUBMITTED' ? (
                <div className="text-xs text-slate-500 mb-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
                  <p className="mb-1"><span className="font-medium">Uploaded:</span> {new Date(doc.uploadedAt).toLocaleString()}</p>
                  {doc.verifiedBy && <p><span className="font-medium">Verified by:</span> {doc.verifiedBy}</p>}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic mb-4 py-2">Document not uploaded yet.</p>
              )}
            </div>

            <div className="flex items-center gap-2 mt-auto pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => doc.fileUrl && window.open(doc.fileUrl, '_blank', 'noopener,noreferrer')}
                disabled={!doc.fileUrl}
                className="flex-1 btn-secondary text-xs justify-center py-2 h-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Eye className="w-4 h-4" /> View
              </button>
              
              {doc.status === 'NOT_SUBMITTED' ? (
                <div className="flex-1 relative">
                  <input 
                    type="file" 
                    id={`file-upload-${doc.id}`}
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleUpload(doc.id, e.target.files[0])
                      }
                    }}
                  />
                  <label 
                    htmlFor={`file-upload-${doc.id}`}
                    className="flex-1 btn-primary text-xs justify-center py-2 h-auto cursor-pointer"
                  >
                    <Upload className="w-4 h-4" /> Upload
                  </label>
                </div>
              ) : doc.status === 'PENDING_VERIFICATION' ? (
                <>
                  <button onClick={() => handleVerify(doc.id)} disabled={saving === doc.id} className="flex-1 btn-primary text-xs justify-center py-2 h-auto bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">
                    {saving === doc.id ? 'Saving...' : 'Approve'}
                  </button>
                  <button onClick={() => handleReject(doc.id)} disabled={saving === doc.id} className="flex-1 btn-secondary text-xs justify-center py-2 h-auto text-red-600 hover:text-red-700 disabled:opacity-50">
                    Reject
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => handleReject(doc.id)} 
                  className="flex-1 btn-secondary text-xs justify-center py-2 h-auto"
                >
                  Re-evaluate
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
