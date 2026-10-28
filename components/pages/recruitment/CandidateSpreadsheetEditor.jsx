'use client'

import { useMemo, useState } from 'react'
import { Check, Plus, Sparkles, Trash2, UploadCloud, X } from 'lucide-react'
import { candidateApi } from '@/services/candidateApi'

const DEFAULT_COLUMNS = [
  { key: 'firstName', label: 'First Name', required: true },
  { key: 'lastName', label: 'Last Name' },
  { key: 'email', label: 'Email', required: true },
  { key: 'phone', label: 'Phone' },
  { key: 'currentDesignation', label: 'Current Role' },
  { key: 'currentCompany', label: 'Current Company' },
  { key: 'exp', label: 'Experience (Years)' },
  { key: 'expectedCtcText', label: 'Expected CTC' },
  { key: 'skills', label: 'Skills' },
  { key: 'location', label: 'Location' },
]

function emptyRow(columns) {
  return Object.fromEntries(columns.map((column) => [column.key, '']))
}

export default function CandidateSpreadsheetEditor({ position, onClose, onSave, onAnalyze }) {
  const [columns, setColumns] = useState(DEFAULT_COLUMNS)
  const [rows, setRows] = useState(() => [emptyRow(DEFAULT_COLUMNS)])
  const [newColumnName, setNewColumnName] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingRow, setUploadingRow] = useState(null)

  const filledRows = useMemo(() => rows.filter((row) => Object.values(row).some((value) => String(value || '').trim())), [rows])

  const updateCell = (rowIndex, key, value) => {
    setRows((current) => current.map((row, index) => index === rowIndex ? { ...row, [key]: value } : row))
  }

  const addColumn = () => {
    const label = newColumnName.trim()
    if (!label) return
    const key = `custom_${Date.now()}`
    setColumns((current) => [...current, { key, label, custom: true }])
    setRows((current) => current.map((row) => ({ ...row, [key]: '' })))
    setNewColumnName('')
  }

  const removeColumn = (key) => {
    setColumns((current) => current.filter((column) => column.key !== key))
    setRows((current) => current.map((row) => {
      const next = { ...row }
      delete next[key]
      return next
    }))
  }

  const handleResumeUpload = async (rowIndex, event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    const extension = String(file.name || '').toLowerCase().split('.').pop()
    if (!allowed.includes(file.type) && !['pdf', 'doc', 'docx'].includes(extension)) {
      setError('Resume must be a PDF, DOC, or DOCX file.')
      return
    }
    setError('')
    setUploadingRow(rowIndex)
    try {
      const formData = new FormData()
      formData.append('resume', file)
      const response = await candidateApi.uploadDraftResume(formData)
      const resume = response.data?.data || response.data || {}
      if (!resume.resumeId) throw new Error('The resume could not be uploaded. Please try again.')
      setRows((current) => current.map((row, index) => index === rowIndex
        ? { ...row, draftResumeId: resume.resumeId, resumeFileName: file.name }
        : row
      ))
    } catch (uploadError) {
      setError(uploadError.response?.data?.message || uploadError.message || 'Failed to upload resume.')
    } finally {
      setUploadingRow(null)
    }
  }

  const getPayload = () => {
    const knownKeys = new Set([...DEFAULT_COLUMNS.map((column) => column.key), 'draftResumeId', 'resumeFileName'])
    return filledRows.map((row) => ({
      ...row,
      name: [row.firstName, row.lastName].filter(Boolean).join(' '),
      skills: String(row.skills || '').split(/[,;|/]+/).map((skill) => skill.trim()).filter(Boolean),
      customFields: Object.fromEntries(
        Object.entries(row).filter(([key, value]) => !knownKeys.has(key) && String(value || '').trim())
      ),
      source: 'EXCEL',
    }))
  }

  const validateRows = () => {
    setError('')
    if (!filledRows.length) {
      setError('Add at least one candidate row before saving.')
      return false
    }
    const invalidIndex = filledRows.findIndex((row) => !String(row.firstName || '').trim() || !String(row.email || '').trim())
    if (invalidIndex >= 0) {
      setError(`Row ${invalidIndex + 1} needs both First Name and Email.`)
      return false
    }
    return true
  }

  const handleSave = async () => {
    if (!validateRows()) return
    setSaving(true)
    try {
      await onSave(getPayload())
    } catch (saveError) {
      setError(saveError.message || 'Failed to save candidates.')
    } finally {
      setSaving(false)
    }
  }

  const handleAnalyze = async () => {
    if (!validateRows()) return
    if (!onAnalyze) return
    setSaving(true)
    try {
      await onAnalyze(getPayload())
    } catch (analyzeError) {
      setError(analyzeError.message || 'Failed to analyze candidates.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Add Candidates in Spreadsheet</h2>
            <p className="mt-1 text-sm text-slate-500">Rows will be saved directly to Applied for {position?.title || 'the selected position'}.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" title="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 px-6 py-3 dark:border-slate-800 dark:bg-slate-950/40">
          <button type="button" onClick={() => setRows((current) => [...current, emptyRow(columns)])} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> Add Row
          </button>
          <div className="flex items-center gap-2">
            <input value={newColumnName} onChange={(event) => setNewColumnName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addColumn()} placeholder="New category" className="w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900" />
            <button type="button" onClick={addColumn} className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-500/30 dark:bg-slate-900 dark:text-indigo-300">
              <Plus className="h-4 w-4" /> Add Category
            </button>
          </div>
          <span className="ml-auto text-xs font-semibold text-slate-500">{filledRows.length} candidate row{filledRows.length === 1 ? '' : 's'}</span>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          <table className="min-w-[1150px] border-collapse text-left text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 border border-slate-200 bg-slate-100 px-3 py-3 text-center dark:border-slate-700 dark:bg-slate-800">#</th>
                {columns.map((column) => (
                  <th key={column.key} className="border border-slate-200 bg-slate-100 px-3 py-3 font-black text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <div className="flex items-center justify-between gap-2">
                      <span>{column.label}{column.required ? ' *' : ''}</span>
                      {column.custom && <button type="button" onClick={() => removeColumn(column.key)} className="text-slate-400 hover:text-red-600" title={`Remove ${column.label}`}><X className="h-3.5 w-3.5" /></button>}
                    </div>
                  </th>
                ))}
                <th className="border border-slate-200 bg-slate-100 px-3 py-3 text-center font-black text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">Resume</th>
                <th className="border border-slate-200 bg-slate-100 px-3 py-3 text-center font-black text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <td className="sticky left-0 z-10 border border-slate-200 bg-white px-3 py-2 text-center font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900">{rowIndex + 1}</td>
                  {columns.map((column) => (
                    <td key={column.key} className="border border-slate-200 p-1 dark:border-slate-700">
                      <input value={row[column.key] || ''} onChange={(event) => updateCell(rowIndex, column.key, event.target.value)} className="w-full min-w-[120px] rounded-md border border-transparent bg-transparent px-2 py-2 outline-none focus:border-indigo-400 focus:bg-indigo-50/50 dark:focus:bg-indigo-500/10" />
                    </td>
                  ))}
                  <td className="border border-slate-200 p-1 text-center dark:border-slate-700">
                    <input id={`spreadsheet-resume-${rowIndex}`} type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => handleResumeUpload(rowIndex, event)} className="hidden" />
                    <label htmlFor={`spreadsheet-resume-${rowIndex}`} className="inline-flex max-w-[150px] cursor-pointer items-center justify-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-2 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
                      <UploadCloud className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{uploadingRow === rowIndex ? 'Uploading...' : row.resumeFileName || 'Upload'}</span>
                    </label>
                  </td>
                  <td className="border border-slate-200 p-1 text-center dark:border-slate-700">
                    <button type="button" onClick={() => setRows((current) => current.filter((_, index) => index !== rowIndex))} disabled={rows.length === 1} className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30" title="Delete row"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && <div className="mx-6 mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
        <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/40">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
          {onAnalyze && <button type="button" onClick={handleAnalyze} disabled={saving} className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-5 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
            <Sparkles className="h-4 w-4" /> {saving ? 'Processing...' : 'Analyze with AI'}
          </button>}
          <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
            <Check className="h-4 w-4" /> {saving ? 'Saving...' : 'Save to Applied'}
          </button>
        </div>
      </div>
    </div>
  )
}
