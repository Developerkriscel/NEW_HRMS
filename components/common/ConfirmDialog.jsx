'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'

// Shared confirmation modal for sensitive platform actions — captures a
// required reason and shows a typed confirmation for the most destructive
// ones. Every mutating route this dialog fronts already re-validates the
// reason/permission server-side; this only prevents accidental clicks.
export function ConfirmDialog({
  open,
  title,
  description,
  requireReason = true,
  requireTypedConfirmation,
  confirmLabel = 'Confirm',
  variant = 'danger',
  loading = false,
  error = '',
  onConfirm,
  onClose,
  children,
}) {
  const [reason, setReason] = useState('')
  const [typed, setTyped] = useState('')

  if (!open) return null

  const canSubmit =
    (!requireReason || reason.trim().length > 0) &&
    (!requireTypedConfirmation || typed.trim() === requireTypedConfirmation)

  function handleClose() {
    setReason('')
    setTyped('')
    onClose?.()
  }

  function handleConfirm() {
    onConfirm?.(reason.trim())
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${variant === 'danger' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
              {description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>}
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {children && <div className="mb-4">{children}</div>}

        {requireReason && (
          <label className="block mb-3">
            <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Reason <span className="text-red-500">*</span>
            </span>
            <textarea
              className="input-field min-h-20 resize-none"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this action is being taken..."
              autoFocus
            />
          </label>
        )}

        {requireTypedConfirmation && (
          <label className="block mb-4">
            <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Type <span className="font-mono text-slate-700 dark:text-slate-300">{requireTypedConfirmation}</span> to confirm
            </span>
            <input
              className="input-field"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={requireTypedConfirmation}
            />
          </label>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button type="button" className="btn-secondary justify-center" onClick={handleClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className={`${variant === 'danger' ? 'btn-danger' : 'btn-primary'} justify-center`}
            onClick={handleConfirm}
            disabled={!canSubmit || loading}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
