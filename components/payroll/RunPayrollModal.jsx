import { useState, useEffect, useMemo } from 'react'
import { 
  X, CheckCircle2, AlertTriangle, Users, Play, Loader2, 
  Search, CheckSquare, Square, ChevronRight, ArrowLeft,
  Calendar, Check, UserCheck, ShieldAlert, Sparkles, Building2
} from 'lucide-react'
import { payrollApi } from '@/services/payrollApi'
import { formatCurrency } from '@/lib/utils'
import { Portal } from '@/components/common/Portal'

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function RunPayrollModal({ isOpen, onClose, month, year, onComplete, onOpenSalarySetup }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [eligibility, setEligibility] = useState(null)
  const [error, setError] = useState('')
  const [runResult, setRunResult] = useState(null)
  const [selectedEmpIds, setSelectedEmpIds] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(month)
  const [selectedYear, setSelectedYear] = useState(year)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTab, setFilterTab] = useState('ALL') // 'ALL', 'ELIGIBLE', 'LOCKED', 'NO_SALARY'
  const [allowOverwrite, setAllowOverwrite] = useState(false)
  
  useEffect(() => {
    if (isOpen) {
      setSelectedMonth(month)
      setSelectedYear(year)
      setStep(1)
      setError('')
      setRunResult(null)
      setSearchQuery('')
      setFilterTab('ALL')
      setAllowOverwrite(false)
    }
  }, [isOpen, month, year])

  useEffect(() => {
    if (isOpen && step === 1) {
      setLoading(true)
      setError('')
      payrollApi.getEligibility(selectedMonth, selectedYear)
        .then(res => {
          const data = res.data.data
          setEligibility(data)
          // Default: select all processable/eligible employees
          const processableIds = (data?.employees || [])
            .filter(e => allowOverwrite ? e.hasSalary : e.isProcessable)
            .map(e => e._id.toString())
          setSelectedEmpIds(processableIds)
        })
        .catch((e) => {
          setEligibility(null)
          setSelectedEmpIds([])
          setError(e?.response?.data?.message || 'Unable to check payroll eligibility.')
        })
        .finally(() => setLoading(false))
    }
  }, [isOpen, selectedMonth, selectedYear, step, allowOverwrite])

  if (!isOpen) return null

  const allEmployees = eligibility?.employees || []
  const baseProcessableCount = eligibility?.totalProcessable ?? eligibility?.totalEligible ?? 0
  const processableCount = allowOverwrite
    ? allEmployees.filter(e => e.hasSalary).length
    : baseProcessableCount

  const isEmpSelectable = (emp) => allowOverwrite ? emp.hasSalary : emp.isProcessable

  // Filtered employees for display
  const displayedEmployees = allEmployees.filter(emp => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const match = emp.name.toLowerCase().includes(q) || 
                    emp.code.toLowerCase().includes(q) || 
                    (emp.department && emp.department.toLowerCase().includes(q)) ||
                    (emp.designation && emp.designation.toLowerCase().includes(q))
      if (!match) return false
    }
    if (filterTab === 'ELIGIBLE') return isEmpSelectable(emp)
    if (filterTab === 'LOCKED') return emp.isLocked
    if (filterTab === 'NO_SALARY') return !emp.hasSalary
    return true
  })

  // Selectable employees in the current view
  const selectableDisplayedEmployees = displayedEmployees.filter(isEmpSelectable)
  const isAllSelectableChecked = selectableDisplayedEmployees.length > 0 && 
    selectableDisplayedEmployees.every(e => selectedEmpIds.includes(e._id.toString()))

  const handleToggleSelectAll = () => {
    if (isAllSelectableChecked) {
      // Uncheck all selectable displayed
      const displayedIdsSet = new Set(selectableDisplayedEmployees.map(e => e._id.toString()))
      setSelectedEmpIds(prev => prev.filter(id => !displayedIdsSet.has(id)))
    } else {
      // Check all selectable displayed
      const toAdd = selectableDisplayedEmployees.map(e => e._id.toString())
      setSelectedEmpIds(prev => Array.from(new Set([...prev, ...toAdd])))
    }
  }

  const handleToggleEmployee = (empId) => {
    setSelectedEmpIds(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    )
  }

  const handleNext = () => {
    if (selectedEmpIds.length === 0) {
      setError('Please select at least one employee to run payroll.')
      return
    }
    setError('')
    setStep(2)
  }

  const handleBack = () => {
    setError('')
    setStep(1)
  }

  const handleRun = async () => {
    setLoading(true)
    setError('')
    setRunResult(null)
    try {
      const res = await payrollApi.run(selectedMonth, selectedYear, selectedEmpIds, allowOverwrite)
      const result = res.data.data
      setRunResult(result)
      await onComplete?.(selectedMonth, selectedYear)
    } catch (e) {
      console.error(e)
      setError(e?.response?.data?.message || 'Unable to run payroll.')
    } finally {
      setLoading(false)
    }
  }

  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1]

  // Summary calculations for Step 2
  const selectedEmployeesList = allEmployees.filter(e => selectedEmpIds.includes(e._id.toString()))
  const totalSelectedMonthlyGross = selectedEmployeesList.reduce((acc, e) => acc + (e.monthlyCtc || 0), 0)

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">Run Payroll</h2>
                  <p className="text-xs text-slate-500">Calculate attendance, earnings, deductions &amp; generate payslips</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-sm">
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  disabled={step === 2 || loading}
                  className="bg-transparent text-xs font-bold px-2.5 py-1 outline-none text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-50"
                >
                  {months.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
                <span className="text-slate-300 dark:text-slate-600">/</span>
                <select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  disabled={step === 2 || loading}
                  className="bg-transparent text-xs font-bold px-2.5 py-1 outline-none text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-50"
                >
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <button 
                onClick={onClose} 
                className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Stepper Bar */}
          {!runResult && (
            <div className="px-6 pt-3 pb-1 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                <span className={step >= 1 ? 'text-indigo-600 dark:text-indigo-400' : ''}>
                  Step 1: Select Employees &amp; Verify Attendance
                </span>
                <span className={step >= 2 ? 'text-indigo-600 dark:text-indigo-400' : ''}>
                  Step 2: Preview &amp; Process
                </span>
              </div>
              <div className="flex gap-2">
                <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${step >= 1 ? 'bg-indigo-600' : 'bg-slate-100 dark:bg-slate-800'}`} />
                <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${step >= 2 ? 'bg-indigo-600' : 'bg-slate-100 dark:bg-slate-800'}`} />
              </div>
            </div>
          )}

          {/* Modal Content */}
          <div className="p-6 overflow-y-auto flex-1 space-y-5">
            {error && (
              <div className="p-4 rounded-2xl border border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 text-sm flex items-start gap-3 animate-in fade-in">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Payroll Action Notice</p>
                  <p className="text-xs mt-0.5 leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            {/* Run Result State */}
            {runResult && (
              <div className="space-y-6 py-6 text-center animate-in zoom-in-95 duration-200">
                <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-3xl ${
                  runResult.failed ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30'
                } shadow-lg`}>
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                    Payroll Generation Completed!
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
                    Processed payroll for <strong className="text-slate-800 dark:text-slate-200">{months[selectedMonth - 1]} {selectedYear}</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Succeeded</p>
                    <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{runResult.succeeded || 0}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Skipped</p>
                    <p className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1">{runResult.skipped || 0}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Failed</p>
                    <p className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-1">{runResult.failed || 0}</p>
                  </div>
                </div>

                {runResult.errors?.length > 0 && (
                  <div className="max-w-xl mx-auto text-left rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/50 p-4">
                    <h5 className="font-bold text-xs text-amber-800 dark:text-amber-200 mb-2">Processing Warnings:</h5>
                    <div className="max-h-32 overflow-y-auto space-y-1 text-xs text-amber-700 dark:text-amber-300">
                      {runResult.errors.map((e, idx) => (
                        <p key={idx}>• {e.message}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 1: Employee Selection & Attendance Breakdown */}
            {!runResult && step === 1 && (
              <>
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
                    <p className="font-semibold text-sm">Evaluating employees, attendance &amp; salary structures...</p>
                    <p className="text-xs text-slate-400 mt-1">{months[selectedMonth - 1]} {selectedYear}</p>
                  </div>
                ) : eligibility ? (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    
                    {/* Summary KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Active</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                          {eligibility.totalEmployees || 0}
                        </p>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Processable</p>
                        <p className="text-2xl font-black text-indigo-700 dark:text-indigo-300 mt-1">
                          {processableCount}
                        </p>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/60">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Locked / Paid</p>
                        <p className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-1">
                          {eligibility.blockedPayslips?.length || 0}
                        </p>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/60">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Missing Salary</p>
                        <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">
                          {eligibility.missingSalary?.length || 0}
                        </p>
                      </div>
                    </div>

                    {/* Notice if 0 employees are processable (e.g. October 2026 all Paid) */}
                    {baseProcessableCount === 0 && (
                      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
                        <div className="flex-1">
                          <h5 className="font-bold text-sm">All Payslips for {months[selectedMonth - 1]} {selectedYear} are Locked / Paid</h5>
                          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                            All {eligibility.totalEmployees} active employees already have finalized or paid payslips for this period. Paid/finalized payroll cannot be regenerated by default. You can choose another month above, or enable the override below to recalculate paid payslips.
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            <button 
                              type="button" 
                              onClick={onClose}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-sm"
                            >
                              View Payroll Register
                            </button>
                            <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700/80 shadow-sm">
                              <input 
                                type="checkbox"
                                checked={allowOverwrite}
                                onChange={(e) => {
                                  const val = e.target.checked
                                  setAllowOverwrite(val)
                                  if (val) {
                                    const readyIds = allEmployees.filter(emp => emp.hasSalary).map(emp => emp._id.toString())
                                    setSelectedEmpIds(readyIds)
                                  } else {
                                    const procIds = allEmployees.filter(emp => emp.isProcessable).map(emp => emp._id.toString())
                                    setSelectedEmpIds(procIds)
                                  }
                                }}
                                className="h-4 w-4 rounded border-amber-400 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                              <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                                Allow Recalculating Paid Payslips (Force Re-run)
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Notice if missing salary structures exist */}
                    {eligibility.missingSalary?.length > 0 && processableCount > 0 && (
                      <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>{eligibility.missingSalary.length} employee(s) are missing Salary Structure / CTC and cannot be processed.</span>
                        </div>
                        {onOpenSalarySetup && (
                          <button
                            type="button"
                            onClick={() => { onClose(); onOpenSalarySetup() }}
                            className="text-amber-700 dark:text-amber-300 font-bold underline hover:text-amber-800 shrink-0"
                          >
                            Fix Salary Setup
                          </button>
                        )}
                      </div>
                    )}

                    {/* Table Toolbar: Search, Filter Tabs, Select All Counter */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input 
                            type="text"
                            placeholder="Search employee or code..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-52 sm:w-64"
                          />
                        </div>

                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-bold">
                          <button 
                            type="button"
                            onClick={() => setFilterTab('ALL')}
                            className={`px-2.5 py-1 rounded-lg transition-all ${filterTab === 'ALL' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
                          >
                            All ({allEmployees.length})
                          </button>
                          <button 
                            type="button"
                            onClick={() => setFilterTab('ELIGIBLE')}
                            className={`px-2.5 py-1 rounded-lg transition-all ${filterTab === 'ELIGIBLE' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'}`}
                          >
                            Eligible ({processableCount})
                          </button>
                          {eligibility.blockedPayslips?.length > 0 && (
                            <button 
                              type="button"
                              onClick={() => setFilterTab('LOCKED')}
                              className={`px-2.5 py-1 rounded-lg transition-all ${filterTab === 'LOCKED' ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-500'}`}
                            >
                              Locked ({eligibility.blockedPayslips.length})
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                        <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                          {selectedEmpIds.length} of {processableCount} Selected
                        </span>
                      </div>
                    </div>

                    {/* Employee Selection Table with Attendance */}
                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                      <div className="max-h-[380px] overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="py-2.5 px-3 w-10 text-center">
                                <button 
                                  type="button" 
                                  onClick={handleToggleSelectAll}
                                  disabled={selectableDisplayedEmployees.length === 0}
                                  className="text-slate-500 hover:text-indigo-600 disabled:opacity-30"
                                  title="Select / Deselect all eligible"
                                >
                                  {isAllSelectableChecked ? (
                                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                                  ) : (
                                    <Square className="w-4 h-4" />
                                  )}
                                </button>
                              </th>
                              <th className="py-2.5 px-3 font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                                Employee
                              </th>
                              <th className="py-2.5 px-3 font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                                Base Salary (CTC)
                              </th>
                              <th className="py-2.5 px-3 font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                                Attendance Breakdown
                              </th>
                              <th className="py-2.5 px-3 font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[10px] text-right">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {displayedEmployees.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                                  No employees match your search or filter.
                                </td>
                              </tr>
                            ) : (
                              displayedEmployees.map(emp => {
                                const isSelected = selectedEmpIds.includes(emp._id.toString())
                                const isDisabled = !isEmpSelectable(emp)

                                return (
                                  <tr 
                                    key={emp._id}
                                    onClick={() => !isDisabled && handleToggleEmployee(emp._id.toString())}
                                    className={`transition-colors ${
                                      isDisabled 
                                        ? 'bg-slate-50/50 dark:bg-slate-900/30 opacity-70' 
                                        : isSelected
                                          ? 'bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50/60 cursor-pointer'
                                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer'
                                    }`}
                                  >
                                    <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                      <input 
                                        type="checkbox"
                                        checked={isSelected}
                                        disabled={isDisabled}
                                        onChange={() => handleToggleEmployee(emp._id.toString())}
                                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                                      />
                                    </td>
                                    
                                    <td className="py-3 px-3">
                                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                        <span>{emp.name}</span>
                                        <span className="text-[10px] font-semibold text-slate-400">({emp.code})</span>
                                      </div>
                                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                                        <span>{emp.department || 'General'}</span>
                                        {emp.designation && (
                                          <>
                                            <span>•</span>
                                            <span>{emp.designation}</span>
                                          </>
                                        )}
                                      </div>
                                    </td>

                                    <td className="py-3 px-3">
                                      {emp.hasSalary ? (
                                        <div>
                                          <span className="font-bold text-slate-800 dark:text-slate-200">
                                            ₹{emp.monthlyCtc?.toLocaleString('en-IN') || 0}
                                          </span>
                                          <span className="text-[10px] text-slate-400 block">/ month</span>
                                        </div>
                                      ) : (
                                        <span className="text-amber-600 font-bold text-[11px]">
                                          Missing Salary
                                        </span>
                                      )}
                                    </td>

                                    <td className="py-3 px-3">
                                      {emp.totalLogged > 0 ? (
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20 text-[11px]">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                            {emp.presentDays} Present
                                          </span>
                                          {emp.halfDays > 0 && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20 text-[11px]">
                                              {emp.halfDays} Half
                                            </span>
                                          )}
                                          {emp.leaveDays > 0 && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-200/50 dark:border-purple-500/20 text-[11px]">
                                              {emp.leaveDays} Leave
                                            </span>
                                          )}
                                          {emp.absentDays > 0 && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200/50 dark:border-rose-500/20 text-[11px]">
                                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                              {emp.absentDays} Absent
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                          <span>No attendance logged</span>
                                        </div>
                                      )}
                                    </td>

                                    <td className="py-3 px-3 text-right">
                                      {emp.isLocked ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                                          {emp.payslipStatus}
                                        </span>
                                      ) : !emp.hasSalary ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                                          NO SALARY
                                        </span>
                                      ) : emp.isDraft ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                                          DRAFT (RE-RUN)
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                                          READY
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                )
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                ) : null}
              </>
            )}

            {/* STEP 2: Preview & Confirm */}
            {!runResult && step === 2 && (
              <div className="space-y-6 py-4 animate-in slide-in-from-right-4 duration-200">
                <div className="text-center max-w-md mx-auto">
                  <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-indigo-500/20">
                    <Users className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    Review Payroll Run
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    You are about to generate draft payslips for the selected employees.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Payroll Period</p>
                    <p className="text-lg font-black text-slate-800 dark:text-white mt-1">
                      {months[selectedMonth - 1]} {selectedYear}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-center">
                    <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Selected Employees</p>
                    <p className="text-2xl font-black text-indigo-700 dark:text-indigo-300 mt-0.5">
                      {selectedEmpIds.length}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Est. Total Monthly Gross</p>
                    <p className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-1">
                      ₹{totalSelectedMonthlyGross.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                <div className="max-w-2xl mx-auto border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-300">
                    <span>Selected Employees ({selectedEmployeesList.length})</span>
                    <button 
                      type="button" 
                      onClick={handleBack}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Change selection
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-1">
                    {selectedEmployeesList.map(emp => (
                      <div key={emp._id} className="p-2.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{emp.name}</span>
                          <span className="text-slate-400 ml-1.5">({emp.code})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-600 font-semibold">{emp.presentDays}P</span>
                          {emp.absentDays > 0 && <span className="text-rose-600 font-semibold">{emp.absentDays}A</span>}
                          <span className="font-bold text-slate-700 dark:text-slate-300 ml-2">
                            ₹{emp.monthlyCtc?.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
            {runResult ? (
              <div className="w-full flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md text-sm"
                >
                  View in Payroll Register
                </button>
              </div>
            ) : (
              <>
                <button 
                  type="button"
                  onClick={step === 1 ? onClose : handleBack}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                  disabled={loading}
                >
                  {step === 2 && <ArrowLeft className="w-3.5 h-3.5" />}
                  {step === 1 ? 'Cancel' : 'Back to Selection'}
                </button>
                
                {step === 1 ? (
                  <button 
                    type="button"
                    onClick={handleNext}
                    disabled={loading || selectedEmpIds.length === 0}
                    className="px-6 py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2 text-xs sm:text-sm"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Checking Eligibility...</span>
                      </>
                    ) : selectedEmpIds.length === 0 ? (
                      processableCount === 0 ? 'No Processable Employees' : 'Select Employees to Continue'
                    ) : (
                      <>
                        <span>Continue with {selectedEmpIds.length} Employees</span>
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={handleRun}
                    disabled={loading || selectedEmpIds.length === 0}
                    className="px-6 py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2 text-xs sm:text-sm"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating Payslips...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span>Generate Payroll for {selectedEmpIds.length} Employees</span>
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>

        </div>
      </div>
    </Portal>
  )
}
