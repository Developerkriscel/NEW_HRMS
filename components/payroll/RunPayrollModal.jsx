import { useState, useEffect } from 'react'
import { X, CheckCircle2, AlertTriangle, Users, Play, Loader2 } from 'lucide-react'
import { payrollApi } from '@/services/payrollApi'
import { formatCurrency } from '@/lib/utils'
import { Portal } from '@/components/common/Portal'

export function RunPayrollModal({ isOpen, onClose, month, year, onComplete, onOpenSalarySetup }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [eligibility, setEligibility] = useState(null)
  const [error, setError] = useState('')
  const [runResult, setRunResult] = useState(null)
  const [selectedEmpIds, setSelectedEmpIds] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(month)
  const [selectedYear, setSelectedYear] = useState(year)
  
  useEffect(() => {
    if (isOpen) {
      setSelectedMonth(month)
      setSelectedYear(year)
      setStep(1)
      setError('')
      setRunResult(null)
    }
  }, [isOpen, month, year])

  useEffect(() => {
    if (isOpen && step === 1) {
      setLoading(true)
      setError('')
      payrollApi.getEligibility(selectedMonth, selectedYear)
        .then(res => {
          setEligibility(res.data.data)
        })
        .catch((e) => {
          setEligibility(null)
          setError(e?.response?.data?.message || 'Unable to check payroll eligibility.')
        })
        .finally(() => setLoading(false))
    }
  }, [isOpen, selectedMonth, selectedYear, step])

  if (!isOpen) return null

  const handleNext = () => setStep(2)
  const handleBack = () => setStep(1)

  const handleRun = async () => {
    setLoading(true)
    setError('')
    setRunResult(null)
    try {
      const res = await payrollApi.run(selectedMonth, selectedYear, selectedEmpIds.length > 0 ? selectedEmpIds : undefined)
      const result = res.data.data
      setRunResult(result)
      await onComplete?.()
      if (!result?.failed) {
        onClose()
        setStep(1)
      }
    } catch (e) {
      console.error(e)
      setError(e?.response?.data?.message || 'Unable to run payroll.')
    } finally {
      setLoading(false)
    }
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1]

  return (
    <Portal><div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Run Payroll</h2>
            <div className="flex gap-2">
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                disabled={step === 2 || loading}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 text-slate-700 dark:text-slate-300"
              >
                {months.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                disabled={step === 2 || loading}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 text-slate-700 dark:text-slate-300"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-400 self-start">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading && step === 1 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
              <p>Analyzing employee eligibility for {months[selectedMonth - 1]} {selectedYear}...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                  {error}
                </div>
              )}

              {runResult && (
                <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <div className="font-bold">Payroll run completed</div>
                  <div>{runResult.succeeded || 0} payslips created/updated, {runResult.failed || 0} failed.</div>
                  {runResult.errors?.length > 0 && (
                    <div className="mt-2 max-h-24 overflow-y-auto text-xs">
                      {runResult.errors.slice(0, 5).map((item) => (
                        <div key={item.employeeId}>{item.message}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step Indicators */}
              <div className="flex items-center gap-2 mb-8">
                <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'}`} />
                <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'}`} />
              </div>

              {step === 1 && eligibility && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">Eligible Employees</h4>
                        <p className="text-sm text-slate-500">
                          {eligibility.totalEmployees ?? eligibility.totalEligible} active employees found
                        </p>
                      </div>
                    </div>
                    <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                      {eligibility.totalEligible}
                    </div>
                  </div>

                  {eligibility.missingSalary.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4">
                      <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h4 className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" /> Missing Salary Structures ({eligibility.missingSalary.length})
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            onClose()
                            onOpenSalarySetup?.()
                          }}
                          className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-amber-700"
                        >
                          Fix Salary Setup
                        </button>
                      </div>
                      <p className="text-sm text-amber-700 dark:text-amber-500 mb-3">
                        These employees have no Salary Structure and no employee CTC. Add salary first or they will be skipped.
                      </p>
                      <div className="max-h-32 overflow-y-auto space-y-2">
                        {eligibility.missingSalary.map(emp => (
                          <div key={emp._id} className="text-sm bg-white dark:bg-amber-900/20 px-3 py-2 rounded-lg border border-amber-100 dark:border-amber-800/30">
                            <span className="font-medium">{emp.name}</span> <span className="text-amber-600/70">({emp.code})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {eligibility.missingAttendance.length > 0 && (
                    <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-2xl p-4">
                      <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h4 className="font-bold text-orange-800 dark:text-orange-400 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" /> Missing Attendance ({eligibility.missingAttendance.length})
                        </h4>
                        <a
                          href="/hr/attendance"
                          className="rounded-xl bg-orange-600 px-3 py-2 text-center text-xs font-black text-white shadow-sm hover:bg-orange-700"
                        >
                          Open Attendance
                        </a>
                      </div>
                      <p className="text-sm text-orange-700 dark:text-orange-500 mb-3">
                        These employees have 0 attendance records for the month. LOP will be heavily applied.
                      </p>
                      <div className="max-h-32 overflow-y-auto space-y-2">
                        {eligibility.missingAttendance.map(emp => (
                          <div key={emp._id} className="text-sm bg-white dark:bg-orange-900/20 px-3 py-2 rounded-lg border border-orange-100 dark:border-orange-800/30">
                            <span className="font-medium">{emp.name}</span> <span className="text-orange-600/70">({emp.code})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 text-center py-6">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Ready to Process</h3>
                  <p className="text-slate-500 max-w-sm mx-auto">
                    You are about to generate DRAFT payslips for {eligibility?.totalEligible} employees. 
                    You can review them before finalizing.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end gap-3">
          <button 
            onClick={step === 1 ? onClose : handleBack}
            className="px-5 py-2.5 rounded-xl font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            disabled={loading}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          
          {step === 1 ? (
            <button 
              onClick={handleNext}
              disabled={loading || !eligibility || eligibility.totalEligible === 0}
              className="px-5 py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm"
            >
              Continue
            </button>
          ) : (
            <button 
              onClick={handleRun}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
              Process Payroll
            </button>
          )}
        </div>
      </div>
    </div></Portal>
  )
}
