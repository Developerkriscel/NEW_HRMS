'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { candidateApi } from '@/services/candidateApi'

export function AddNoteDialog({ row, onClose, onAdded }) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!note.trim()) return
    setSaving(true)
    setError('')
    try {
      await candidateApi.addApplicationNote(row.applicationId, note.trim())
      onAdded()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add note')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Add Note</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{row.candidateName} — {row.jobTitle}</p>

        {error && <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}

        <textarea className="input-field min-h-24" placeholder="Write a note for the recruiting team..." value={note} onChange={(e) => setNote(e.target.value)} autoFocus />

        <div className="flex justify-end gap-3 mt-5">
          <button type="button" onClick={onClose} disabled={saving} className="btn-secondary">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving || !note.trim()} className="btn-primary">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Note
          </button>
        </div>
      </div>
    </div>
  )
}
