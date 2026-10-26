import React, { useEffect, useState } from 'react'
import { X, CheckCircle2, AlertTriangle, KeyRound, Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Portal } from '@/components/common/Portal'
import { preboardingApi } from '@/services/preboardingApi'

export function ConvertToEmployeeModal({ isOpen, onClose, onCompleted, record, mode = 'convert' }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [duplicateReview, setDuplicateReview] = useState(null)
  const [conversionResult, setConversionResult] = useState(null)
  const [loginEmail, setLoginEmail] = useState(record?.loginEmail || record?.candidate?.email || '')
  const [initialPassword, setInitialPassword] = useState('')
  const setupOnly = mode === 'access'

  useEffect(() => {
    if (!isOpen) return
    setLoginEmail(record?.loginEmail || record?.candidate?.email || '')
    setInitialPassword('')
    setError('')
    setDuplicateReview(null)
    setConversionResult(null)
    setSuccess(false)
  }, [isOpen, record?.id, record?.loginEmail, record?.candidate?.email])

  if (!isOpen || !record) return null

  const handleCredentialsSubmit = (event) => {
    event.preventDefault()
    if (setupOnly) handleSetupAccess()
    else handleConvert()
  }

  const handleConvert = async (overrideDuplicate = false) => {
    setLoading(true)
    setError('')
    setDuplicateReview(null)
    try {
      if (record.rawStatus === 'READY_TO_JOIN') {
        await preboardingApi.markJoined(record.id)
      }
      const res = await preboardingApi.convertToEmployee(record.id, { loginEmail, initialPassword, overrideDuplicate })
      const result = res.data.data
      setConversionResult(result)
      setLoading(false)
      setSuccess(true)
    } catch (err) {
      const responseData = err.response?.data?.data || {}
      const errorCode = err.response?.data?.errorCode
      if (errorCode === 'DUPLICATE_EMPLOYEE' || errorCode === 'LOGIN_EMAIL_IN_USE') {
        setDuplicateReview({ code: errorCode, matches: responseData.duplicates || [], message: err.response?.data?.message || '' })
      }
      const validationFields = err.response?.data?.data?.fields
      const validationMessage = validationFields ? Object.values(validationFields).join(', ') : ''
      const message = err.response?.data?.message
        || (err.code === 'ECONNABORTED'
          ? 'The conversion request timed out. Check the employee list before retrying to avoid creating a duplicate.'
          : !err.response
            ? 'Could not reach the server. Check your connection and try again.'
            : 'Employee conversion failed. Please retry or contact your HR administrator.')
      const missing = err.response?.data?.data?.missingRequired || []
      setError(errorCode === 'DUPLICATE_EMPLOYEE'
        ? ''
        : missing.length
        ? `${message}: ${missing.map((item) => item.label || item.key).join(', ')}`
        : validationMessage ? `${message}: ${validationMessage}` : message)
      setLoading(false)
    }
  }

  const handleSetupAccess = async () => {
    setLoading(true)
    setError('')
    try {
      await preboardingApi.setupAccess(record.id, { loginEmail, initialPassword })
      setConversionResult({ accessOnly: true, email: loginEmail })
      setSuccess(true)
      onCompleted?.()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save login access.')
    } finally {
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
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{conversionResult?.accessOnly ? 'Login Access Saved' : 'Employee Created Successfully'}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                {conversionResult?.accessOnly ? 'Login ID and password are saved. You can convert this profile when the remaining checklist items are complete.' : 'Employee master has been created in MongoDB and will now appear in All Employees.'}
              </p>

              <div className="space-y-3 text-left mb-8">
                {!conversionResult?.accessOnly && <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3 flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Employee ID</span>
                  <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">{conversionResult?.employee?.employeeCode || '-'}</span>
                </div>}
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3 flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Login Email</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{conversionResult?.employee?.email || record.candidate.email}</span>
                </div>
                {!conversionResult?.accessOnly && <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3 flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Password</span>
                  <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">{conversionResult?.tempPassword || (conversionResult?.alreadyCompleted ? 'Already created' : '-')}</span>
                </div>}
              </div>

              <div className="flex gap-3">
                <button onClick={() => {
                  onClose()
                  if (!conversionResult?.accessOnly) router.push('/hr/employees')
                }} className="btn-primary w-full justify-center">
                  {conversionResult?.accessOnly ? 'Done' : 'View in Employees'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {setupOnly ? 'Setup Login Access' : 'Convert & Setup Login'}
                </h2>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCredentialsSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="p-6">
                {error && (
                  <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                    {error}
                  </div>
                )}
                {duplicateReview && (
                  <div className={`mb-4 rounded-2xl border p-4 text-sm ${duplicateReview.code === 'DUPLICATE_EMPLOYEE' ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200' : 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'}`}>
                    <p className="font-bold">{duplicateReview.code === 'DUPLICATE_EMPLOYEE' ? 'Review possible employee match' : 'Login email is already in use'}</p>
                    <p className="mt-1">{duplicateReview.code === 'DUPLICATE_EMPLOYEE'
                      ? 'We found an employee with matching personal information. Check the match before continuing. If this is the same person, cancel and contact your HR administrator instead of creating a second employee.'
                      : duplicateReview.message || 'Choose a different login email to continue.'}</p>
                    {duplicateReview.matches.map((match, index) => (
                      <div key={`${match.employee?.employeeCode || 'match'}-${index}`} className="mt-3 rounded-xl border border-current/10 bg-white/70 p-3 dark:bg-slate-950/30">
                        <p className="font-bold">{[match.employee?.firstName, match.employee?.lastName].filter(Boolean).join(' ') || 'Existing employee'}{match.employee?.employeeCode ? ` · ${match.employee.employeeCode}` : ''}</p>
                        <p className="mt-1 text-xs">{match.employee?.email || match.employee?.personalEmail || match.employee?.phone || 'Contact details unavailable'}</p>
                        {match.matches?.length > 0 && <p className="mt-1 text-xs">Matched on: {match.matches.join(', ')}</p>}
                      </div>
                    ))}
                  </div>
                )}
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-4 mb-6 flex gap-4 text-amber-800 dark:text-amber-400">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-bold mb-1">Confirm action</p>
                    <p>{setupOnly ? 'Save the employee login email and initial password now. Employee creation can be completed later.' : 'Enter the login credentials below. This action will create the employee profile and save its login access.'}</p>
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

                <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-5 dark:border-blue-500/20 dark:bg-blue-500/10">
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                      <KeyRound className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">Login ID & Password Setup</h4>
                      <p className="text-xs font-medium text-slate-500">These credentials will be saved securely on the employee account.</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="block">
                      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                        <Mail className="h-3.5 w-3.5" /> Login Email
                      </span>
                      <input
                        type="email"
                        required
                        autoComplete="username"
                        value={loginEmail}
                        onChange={(event) => {
                          setLoginEmail(event.target.value)
                          if (duplicateReview?.code === 'LOGIN_EMAIL_IN_USE') setDuplicateReview(null)
                        }}
                        className="input-field"
                        placeholder="employee@company.com"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                        <KeyRound className="h-3.5 w-3.5" /> Initial Password
                      </span>
                      <input
                        type="password"
                        required
                        minLength={8}
                        autoComplete="new-password"
                        value={initialPassword}
                        onChange={(event) => setInitialPassword(event.target.value)}
                        className="input-field font-mono"
                        placeholder="Minimum 8 characters"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-6 pt-0 flex gap-3">
                <button type="button" onClick={onClose} className="btn-secondary w-full justify-center">Cancel</button>
                {duplicateReview?.code === 'DUPLICATE_EMPLOYEE' ? (
                  <button type="button" onClick={() => handleConvert(true)} disabled={loading || !loginEmail || initialPassword.length < 8} className="btn-primary w-full justify-center bg-amber-600 shadow-amber-500/25 hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60">
                    {loading ? 'Checking and creating...' : <>Confirm different person & continue</>}
                  </button>
                ) : (
                  <button type="submit" disabled={loading || !loginEmail || initialPassword.length < 8} className="btn-primary w-full justify-center bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60">
                    {loading ? 'Saving...' : <><CheckCircle2 className="w-4 h-4" /> {setupOnly ? 'Save Login Access' : 'Create Employee'}</>}
                  </button>
                )}
              </div>
              </form>
            </>
          )}
        </div>
      </div>
    </Portal>
  )
}
