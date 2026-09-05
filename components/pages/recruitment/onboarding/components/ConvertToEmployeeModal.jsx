import React, { useState } from 'react'
import { X, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Portal } from '@/components/common/Portal'
import { preboardingApi } from '@/services/preboardingApi'

export function ConvertToEmployeeModal({ isOpen, onClose, record }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [conversionResult, setConversionResult] = useState(null)

  if (!isOpen || !record) return null

  const handleConvert = async () => {
    setLoading(true)
    setError('')
    setConversionResult(null)
    try {
      if (record.rawStatus === 'READY_TO_JOIN') {
        await preboardingApi.markJoined(record.id)
      }
      const res = await preboardingApi.convertToEmployee(record.id)
      const result = res.data.data
      setConversionResult(result)
      setLoading(false)
      setSuccess(true)
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create employee from onboarding.'
      const missing = err.response?.data?.data?.missingRequired || []
      setError(missing.length
        ? `${message}: ${missing.map((item) => item.label || item.key).join(', ')}`
        : message)
      setLoading(false)
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
        <div className="max-h-[90dvh] overflow-y-auto bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
          
          {success ? (
            <div className="p-8 text-center animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Employee Created Successfully</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Employee master has been created in MongoDB and will now appear in All Employees.
              </p>

              <div className="space-y-3 text-left mb-8">
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3 flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Employee ID</span>
                  <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">{conversionResult?.employee?.employeeCode || '-'}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3 flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Login Email</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{conversionResult?.employee?.email || record.candidate.email}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3 flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Password</span>
                  <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">{conversionResult?.tempPassword || (conversionResult?.alreadyCompleted ? 'Already created' : '-')}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => {
                  onClose()
                  router.push('/hr/employees')
                }} className="btn-primary w-full justify-center">
                  View in Employees
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Convert to Employee
                </h2>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                {error && (
                  <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                    {error}
                  </div>
                )}
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-4 mb-6 flex gap-4 text-amber-800 dark:text-amber-400">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-bold mb-1">Confirm action</p>
                    <p>All mandatory onboarding requirements have been completed. This action will create a permanent active employee profile for this candidate.</p>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-4 mb-5 pb-5 border-b border-slate-200 dark:border-slate-700">
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
                      {record.candidate.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">{record.candidate.name}</h4>
                      <p className="text-xs text-slate-500">{record.candidate.id}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-4 text-sm">
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase mb-1">Position</p>
                      <p className="font-medium text-slate-900 dark:text-slate-200">{record.position}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase mb-1">Department</p>
                      <p className="font-medium text-slate-900 dark:text-slate-200">{record.department}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase mb-1">Joining Date</p>
                      <p className="font-medium text-slate-900 dark:text-slate-200">{new Date(record.joiningDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase mb-1">Reporting Manager</p>
                      <p className="font-medium text-slate-900 dark:text-slate-200">{record.reportingManager}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 pt-0 flex gap-3">
                <button onClick={onClose} className="btn-secondary w-full justify-center">Cancel</button>
                <button onClick={handleConvert} disabled={loading} className="btn-primary w-full justify-center bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-500/25">
                  {loading ? 'Creating...' : <><CheckCircle2 className="w-4 h-4" /> Create Employee</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Portal>
  )
}
