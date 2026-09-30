'use client'

import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { Portal } from '@/components/common/Portal'
import { platformApi } from '@/services/platformApi'
import { useAuthStore } from '@/store/authStore'

const STATUS_OPTIONS = [
  { value: 'TRIAL', label: 'Free Trial', desc: 'Temporary access for evaluation' },
  { value: 'ACTIVE', label: 'Active', desc: 'Fully activated and billing normally' },
  { value: 'GRACE', label: 'Grace Period', desc: 'Past due, but access remains temporarily' },
  { value: 'SUSPENDED', label: 'Suspended', desc: 'Access blocked due to non-payment or policy' },
  { value: 'CANCELLED', label: 'Cancelled', desc: 'Subscription permanently ended' }
]

export function StatusModal({ open, onClose, subscriptionId, currentStatus, onSuccess }) {
  const hasPermission = useAuthStore((s) => s.hasPermission)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState({ toStatus: '', reason: '' })

  useEffect(() => {
    if (open) {
      setFields({ toStatus: currentStatus || 'ACTIVE', reason: '' })
      setError('')
    }
  }, [open, currentStatus])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!fields.toStatus || !fields.reason?.trim()) {
      setError('A status and reason are required.')
      return
    }
    if (fields.toStatus === currentStatus) {
      setError('The status is already set to ' + currentStatus + '.')
      return
    }

    setLoading(true)
    setError('')
    try {
      await platformApi.changeSubscriptionStatus(subscriptionId, { toStatus: fields.toStatus, reason: fields.reason })
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.message || 'Status change failed')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const canManage = hasPermission('subscription.update')

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
        <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
          
          <div className="shrink-0 px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Change Status</h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {!canManage ? (
              <div className="text-center py-6 text-slate-500">You don't have permission to change subscription statuses.</div>
            ) : (
              <form id="status-form" onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block mb-3 text-sm font-bold text-slate-900 dark:text-white">New Status <span className="text-red-500">*</span></label>
                  <div className="grid gap-3">
                    {STATUS_OPTIONS.map((opt) => (
                      <label 
                        key={opt.value} 
                        className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${fields.toStatus === opt.value ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                      >
                        <input 
                          type="radio" 
                          name="status" 
                          value={opt.value} 
                          checked={fields.toStatus === opt.value}
                          onChange={(e) => setFields({ ...fields, toStatus: e.target.value })}
                          className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        <div>
                          <div className={`font-bold ${fields.toStatus === opt.value ? 'text-blue-700 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>
                            {opt.label}
                            {opt.value === currentStatus && <span className="ml-2 text-[10px] uppercase bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full tracking-wider">Current</span>}
                          </div>
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-bold text-slate-900 dark:text-white">Reason for change <span className="text-red-500">*</span></label>
                  <textarea 
                    className="w-full min-h-[100px] resize-none text-sm bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" 
                    placeholder="Provide a mandatory reason for this status change..."
                    value={fields.reason}
                    onChange={(e) => setFields({ ...fields, reason: e.target.value })}
                  />
                </div>

                {error && <div className="text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 p-4 rounded-xl">{error}</div>}
              </form>
            )}
          </div>

          {canManage && (
            <div className="shrink-0 p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button type="button" className="btn-secondary px-6 py-3 flex-1 justify-center text-sm font-bold" onClick={onClose} disabled={loading}>Cancel</button>
              <button type="submit" form="status-form" className="btn-primary flex-1 justify-center py-3 text-sm font-bold" disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirm Change'}
              </button>
            </div>
          )}

        </div>
      </div>
    </Portal>
  )
}
