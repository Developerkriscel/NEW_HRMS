'use client'

import { useEffect, useState, useCallback } from 'react'
import { Play, CheckCircle2, Banknote, TrendingUp, Calendar, Users, FileText, Search, Filter, FileDown, Eye, Settings2, X, Save, AlertTriangle } from 'lucide-react'
import { DataTable } from '@/components/tables/DataTable'
import { Badge } from '@/components/common/Badge'
import { payrollApi } from '@/services/payrollApi'
import { formatCurrency } from '@/lib/utils'
import { RunPayrollModal } from '@/components/payroll/RunPayrollModal'
import { PayrollDetailDrawer } from '@/components/payroll/PayrollDetailDrawer'
import debounce from 'lodash/debounce'
import { EmployeePayslipsWorkspace } from '@/components/pages/EmployeePayslipsWorkspace'

const now = new Date()
const KPI_STYLES = {
  blue: {
    blob: 'bg-blue-50 dark:bg-blue-900/10',
    icon: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800/30',
  },
  indigo: {
    blob: 'bg-indigo-50 dark:bg-indigo-900/10',
    icon: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800/30',
  },
  red: {
    blob: 'bg-red-50 dark:bg-red-900/10',
    icon: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800/30',
  },
  emerald: {
    blob: 'bg-emerald-50 dark:bg-emerald-900/10',
    icon: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/30',
  },
}

const DEFAULT_STRUCTURE = {
  ctc: '',
  basicPercent: 40,
  hraPercent: 20,
  conveyanceAllowance: 1600,
  medicalAllowance: 1250,
  pfPercent: 12,
  esiPercent: 0.75,
  pfEligible: true,
  esiEligible: true,
  ptEligible: true,
  insuranceGroup: 'Tier 2',
  revisionNote: '',
  effectiveFrom: new Date().toISOString().slice(0, 10),
}

function statusPill(status) {
  if (status === 'STRUCTURED') return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20'
  if (status === 'CTC_ONLY') return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20'
  return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20'
}

function SalaryStructureModal({ employeeRow, isOpen, onClose, onSaved }) {
  const [form, setForm] = useState(DEFAULT_STRUCTURE)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])

  useEffect(() => {
    if (!isOpen || !employeeRow) return
    const structure = employeeRow.structure
    setForm({
      ctc: structure?.ctc || employeeRow.annualCtc || '',
      basicPercent: structure?.basicPercent ?? 40,
      hraPercent: structure?.hraPercent ?? 20,
      conveyanceAllowance: structure?.conveyanceAllowance ?? 1600,
      medicalAllowance: structure?.medicalAllowance ?? 1250,
      pfPercent: structure?.pfPercent ?? 12,
      esiPercent: structure?.esiPercent ?? 0.75,
      pfEligible: structure?.pfEligible !== false,
      esiEligible: structure?.esiEligible !== false,
      ptEligible: structure?.ptEligible !== false,
      insuranceGroup: structure?.insuranceGroup || 'Tier 2',
      revisionNote: '',
      effectiveFrom: structure?.effectiveFrom
        ? new Date(structure.effectiveFrom).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    })
    setError('')
    payrollApi.getSalaryStructure(employeeRow.employee._id)
      .then((res) => setHistory(res.data.data.history || []))
      .catch(() => setHistory([]))
  }, [isOpen, employeeRow])

  if (!isOpen || !employeeRow) return null

  const employee = employeeRow.employee
  const monthlyCtc = Number(form.ctc || 0) / 12
  const basic = monthlyCtc * (Number(form.basicPercent || 0) / 100)
  const hra = monthlyCtc * (Number(form.hraPercent || 0) / 100)

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      await payrollApi.saveSalaryStructure(employee._id, {
        ...form,
        pfPercent: form.pfEligible ? form.pfPercent : 0,
        esiPercent: form.esiEligible ? form.esiPercent : 0,
        name: `${employee.firstName} ${employee.lastName} Salary Structure`,
      })
      await onSaved?.()
      onClose()
    } catch (e) {
      setError(e?.response?.data?.message || 'Unable to save salary structure.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between border-b border-slate-100 bg-gradient-to-r from-indigo-50 via-white to-emerald-50 px-6 py-5 dark:border-slate-800 dark:from-indigo-950/30 dark:via-slate-950 dark:to-emerald-950/20">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-300">
              <Settings2 className="h-3.5 w-3.5" /> Payroll Setup
            </div>
            <h3 className="text-xl font-black text-slate-950 dark:text-white">{employee.firstName} {employee.lastName}</h3>
            <p className="text-sm font-medium text-slate-500">{employee.employeeCode} · {employee.department?.name || 'No department'}</p>
          </div>
          <button onClick={onClose} className="rounded-2xl p-2 text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-slate-900 dark:hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6">
          {error && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Annual CTC</span>
              <input type="number" min="1" value={form.ctc} onChange={(e) => updateField('ctc', e.target.value)} className="input-field" placeholder="e.g. 600000" />
            </label>
            <label className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Effective From</span>
              <input type="date" value={form.effectiveFrom} onChange={(e) => updateField('effectiveFrom', e.target.value)} className="input-field" />
            </label>
            <label className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Basic %</span>
              <input type="number" min="0" max="100" value={form.basicPercent} onChange={(e) => updateField('basicPercent', e.target.value)} className="input-field" />
            </label>
            <label className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">HRA %</span>
              <input type="number" min="0" max="100" value={form.hraPercent} onChange={(e) => updateField('hraPercent', e.target.value)} className="input-field" />
            </label>
            <label className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Conveyance Allowance / Month</span>
              <input type="number" min="0" value={form.conveyanceAllowance} onChange={(e) => updateField('conveyanceAllowance', e.target.value)} className="input-field" />
            </label>
            <label className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Medical Allowance / Month</span>
              <input type="number" min="0" value={form.medicalAllowance} onChange={(e) => updateField('medicalAllowance', e.target.value)} className="input-field" />
            </label>
            <label className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">PF %</span>
              <input type="number" min="0" value={form.pfPercent} disabled={!form.pfEligible} onChange={(e) => updateField('pfPercent', e.target.value)} className="input-field disabled:opacity-50" />
            </label>
            <label className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">ESI %</span>
              <input type="number" min="0" value={form.esiPercent} disabled={!form.esiEligible} onChange={(e) => updateField('esiPercent', e.target.value)} className="input-field disabled:opacity-50" />
            </label>
            <label className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Insurance Group</span>
              <select value={form.insuranceGroup} onChange={(e) => updateField('insuranceGroup', e.target.value)} className="input-field">
                <option value="Not Applicable">Not Applicable</option>
                <option value="Tier 1">Tier 1</option>
                <option value="Tier 2">Tier 2</option>
                <option value="Tier 3">Tier 3</option>
              </select>
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Revision Note</span>
              <input value={form.revisionNote} onChange={(e) => updateField('revisionNote', e.target.value)} className="input-field" placeholder="Reason for salary setup/revision" />
            </label>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              ['pfEligible', 'PF Eligible'],
              ['esiEligible', 'ESI Eligible'],
              ['ptEligible', 'PT Eligible'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/50">
                <span className="text-sm font-black text-slate-700 dark:text-slate-200">{label}</span>
                <input type="checkbox" checked={form[key]} onChange={(e) => updateField(key, e.target.checked)} className="h-4 w-4 accent-indigo-600" />
              </label>
            ))}
          </div>

          <div className="mt-5 grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50 md:grid-cols-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Monthly CTC</p>
              <p className="text-lg font-black text-slate-900 dark:text-white">{formatCurrency(monthlyCtc)}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Basic</p>
              <p className="text-lg font-black text-slate-900 dark:text-white">{formatCurrency(basic)}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">HRA</p>
              <p className="text-lg font-black text-slate-900 dark:text-white">{formatCurrency(hra)}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Fixed Allowances</p>
              <p className="text-lg font-black text-slate-900 dark:text-white">{formatCurrency(Number(form.conveyanceAllowance || 0) + Number(form.medicalAllowance || 0))}</p>
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">Salary History</h4>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">{history.length}</span>
            </div>
            {history.length === 0 ? (
              <p className="text-sm font-medium text-slate-400">No previous salary structure revisions.</p>
            ) : (
              <div className="max-h-40 space-y-2 overflow-y-auto">
                {history.map((item) => (
                  <div key={item._id} className="grid gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300 sm:grid-cols-4">
                    <span>{formatCurrency(item.ctc)}</span>
                    <span>Basic {item.basicPercent}% · HRA {item.hraPercent}%</span>
                    <span>{item.isActive ? 'Active' : 'Inactive'} · {item.approvalStatus || 'APPROVED'}</span>
                    <span>{item.effectiveFrom ? new Date(item.effectiveFrom).toLocaleDateString() : '-'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
          <button onClick={onClose} className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 disabled:opacity-60">
            <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Structure'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function HRPayrollPage() {
  const [activeTab, setActiveTab] = useState('company') // 'company' or 'mine'
  const [companyView, setCompanyView] = useState('register')
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [salarySearch, setSalarySearch] = useState('')
  const [salaryStatusFilter, setSalaryStatusFilter] = useState('ALL')
  
  const [payslips, setPayslips] = useState([])
  const [salaryRows, setSalaryRows] = useState([])
  const [salaryTotals, setSalaryTotals] = useState({ total: 0, structured: 0, ctcOnly: 0, missing: 0 })
  const [totals, setTotals] = useState({ totalGross: 0, totalNet: 0, totalDeductions: 0 })
  const [totalElements, setTotalElements] = useState(0)
  
  const [loading, setLoading] = useState(true)
  const [salaryLoading, setSalaryLoading] = useState(false)
  const [page, setPage] = useState(0)
  
  // Modals & Drawers
  const [isRunModalOpen, setIsRunModalOpen] = useState(false)
  const [selectedPayslip, setSelectedPayslip] = useState(null)
  const [selectedSalaryRow, setSelectedSalaryRow] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    payrollApi.getMonthly({ month, year, page, size: 20, status: statusFilter, search })
      .then((res) => {
        setPayslips(res.data.data.content)
        setTotalElements(res.data.data.totalElements)
        setTotals({ 
          totalGross: res.data.data.totalGross, 
          totalNet: res.data.data.totalNet,
          totalDeductions: res.data.data.totalDeductions
        })
      })
      .finally(() => setLoading(false))
  }, [month, year, page, statusFilter, search])

  useEffect(() => {
    load()
  }, [load])

  const loadSalarySetup = useCallback(() => {
    setSalaryLoading(true)
    payrollApi.listSalaryStructures({ search: salarySearch, status: salaryStatusFilter })
      .then((res) => {
        setSalaryRows(res.data.data.rows || [])
        setSalaryTotals(res.data.data.totals || { total: 0, structured: 0, ctcOnly: 0, missing: 0 })
      })
      .catch((e) => {
        console.error(e)
        setSalaryRows([])
      })
      .finally(() => setSalaryLoading(false))
  }, [salarySearch, salaryStatusFilter])

  useEffect(() => {
    if (activeTab === 'company' && companyView === 'setup') loadSalarySetup()
  }, [activeTab, companyView, loadSalarySetup])

  const handleSearchChange = debounce((val) => {
    setSearch(val)
    setPage(0)
  }, 500)

  const handleStatusChange = async (id, newStatus) => {
    try {
      await payrollApi.updatePayslipStatus(id, newStatus)
      if (selectedPayslip?._id === id) {
        setSelectedPayslip(prev => ({ ...prev, status: newStatus, paymentDate: newStatus === 'PAID' ? new Date().toISOString() : prev.paymentDate }))
      }
      load()
    } catch (e) {
      console.error(e)
    }
  }

  const salaryColumns = [
    {
      key: 'salaryEmployee',
      header: 'Employee',
      accessor: 'employee',
      render: (employee) => (
        <div>
          <div className="font-black text-slate-900 dark:text-white">{employee.firstName} {employee.lastName}</div>
          <div className="text-xs font-bold text-slate-400">{employee.employeeCode} · {employee.email}</div>
        </div>
      ),
    },
    {
      key: 'salaryDepartment',
      header: 'Department',
      accessor: 'employee',
      render: (employee) => (
        <div>
          <div className="font-bold text-slate-700 dark:text-slate-200">{employee.department?.name || 'Not assigned'}</div>
          <div className="text-xs text-slate-400">{employee.branch?.name || 'No branch'}</div>
        </div>
      ),
    },
    {
      key: 'salarySource',
      header: 'Salary Source',
      accessor: 'source',
      render: (source, row) => (
        <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wider ${statusPill(row.setupStatus)}`}>
          {source}
        </span>
      ),
    },
    {
      key: 'salaryCtc',
      header: 'Annual CTC',
      accessor: 'annualCtc',
      render: (value) => <span className="font-black text-slate-900 dark:text-white">{value ? formatCurrency(value) : 'Missing'}</span>,
    },
    {
      key: 'salaryStructure',
      header: 'Structure',
      accessor: 'structure',
      render: (structure) => structure ? (
        <div className="text-xs font-semibold text-slate-500">
          Basic {structure.basicPercent}% · HRA {structure.hraPercent}%
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600">
          <AlertTriangle className="h-3.5 w-3.5" /> Needs setup
        </div>
      ),
    },
    {
      key: 'salaryAction',
      header: 'Action',
      accessor: '_id',
      render: (_, row) => (
        <button
          onClick={() => setSelectedSalaryRow(row)}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700"
        >
          {row.structure ? 'Revise Structure' : row.annualCtc ? 'Generate Structure' : 'Add Salary'}
        </button>
      ),
    },
  ]

  const handleDownloadPayslip = async (payslipId) => {
    try {
      const res = await payrollApi.downloadPayslipPdf(payslipId)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `Payslip_${month}_${year}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
    }
  }

  const columns = [
    { 
      header: 'Employee', 
      accessor: 'employee', 
      render: (v) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white">{v ? `${v.firstName} ${v.lastName}` : '—'}</div>
          <div className="text-xs text-slate-500">{v?.employeeCode}</div>
        </div>
      ) 
    },
    { 
      header: 'Attendance', 
      accessor: 'workingDays', 
      render: (_, row) => (
        <div className="flex gap-2 text-xs">
          <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded font-medium">{row.paidDays || Math.max(0, row.workingDays - row.absentDays)} Paid</span>
          {row.absentDays > 0 && <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded font-medium">{row.absentDays} LOP</span>}
        </div>
      )
    },
    { header: 'Gross Pay', accessor: 'grossSalary', render: (v) => <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(v)}</span> },
    { header: 'Deductions', accessor: 'totalDeductions', render: (v) => <span className="text-red-500">- {formatCurrency(v)}</span> },
    { header: 'Net Pay', accessor: 'netSalary', render: (v) => <span className="font-black text-emerald-600">{formatCurrency(v)}</span> },
    { header: 'Status', accessor: 'status', render: (v) => <Badge>{v}</Badge> },
    { 
      header: 'Actions', 
      accessor: '_id', 
      render: (id, row) => (
        <button 
          onClick={() => setSelectedPayslip(row)}
          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
        >
          <Eye className="w-4 h-4" />
        </button>
      ) 
    },
  ]

  const handleExport = () => {
    if (!payslips || payslips.length === 0) return;

    const headers = ['Employee Name', 'Employee Code', 'Month', 'Year', 'Paid Days', 'LOP Days', 'Gross Pay', 'Deductions', 'Net Pay', 'Status'];
    const rows = payslips.map(p => [
      p.employee ? `${p.employee.firstName} ${p.employee.lastName}` : '—',
      p.employee?.employeeCode || '—',
      p.month,
      p.year,
      p.workingDays - p.absentDays,
      p.absentDays,
      p.grossSalary,
      p.totalDeductions,
      p.netSalary,
      p.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Payroll_Export_${month}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleBulkStatus = async (status) => {
    try {
      setLoading(true)
      await payrollApi.updateBulkStatus(month, year, status)
      load()
    } catch (e) {
      console.error(e)
      setLoading(false)
    }
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-5 pb-6">
      
      <div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl w-fit border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl">
        <button
          onClick={() => setActiveTab('company')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 ${
            activeTab === 'company'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
          }`}
        >
          <Banknote className="w-4 h-4" /> Company Payroll
        </button>
        <button
          onClick={() => setActiveTab('mine')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 ${
            activeTab === 'mine'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" /> My Payroll
        </button>
      </div>

      {activeTab === 'company' ? (
        <>
          {/* Header Section */}
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-800 z-50">
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mt-20 -mr-20"></div>
        </div>
        
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-bold uppercase tracking-wider mb-2">
              <Banknote className="w-3.5 h-3.5" /> Core HRMS
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-1.5">Payroll Operations</h1>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button 
              onClick={() => setIsRunModalOpen(true)}
              className="group bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 text-sm"
            >
              <Play className="w-4 h-4 fill-current" /> 
              <span>Run Payroll</span>
            </button>
            <div className="relative group">
              <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4" /> Bulk Actions
              </button>
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button onClick={() => handleBulkStatus('REVIEW')} className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-sm font-medium text-slate-700 dark:text-slate-300">Send to Review</button>
                <button onClick={() => handleBulkStatus('APPROVED')} className="w-full text-left px-4 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-sm font-bold text-emerald-600 dark:text-emerald-400">Approve All</button>
                <button onClick={() => handleBulkStatus('FINALIZED')} className="w-full text-left px-4 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-sm font-bold text-indigo-600 dark:text-indigo-400">Finalize All</button>
                <button onClick={() => handleBulkStatus('PAID')} className="w-full text-left px-4 py-2 hover:bg-sky-50 dark:hover:bg-sky-900/30 text-sm font-bold text-sky-600 dark:text-sky-400">Mark Paid</button>
              </div>
            </div>
            <button 
              onClick={handleExport}
              className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 text-sm"
            >
              <FileDown className="w-4 h-4" /> 
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex w-fit rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {[
          { key: 'register', label: 'Payroll Register', icon: FileText },
          { key: 'setup', label: 'Salary Setup', icon: Settings2 },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setCompanyView(tab.key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition-all ${
              companyView === tab.key
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
          >
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Premium KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Employees', value: totalElements, icon: Users, color: 'blue' },
          { label: 'Gross Payroll', value: formatCurrency(totals.totalGross), icon: Banknote, color: 'indigo' },
          { label: 'Total Deductions', value: formatCurrency(totals.totalDeductions), icon: TrendingUp, color: 'red' },
          { label: 'Net Payroll', value: formatCurrency(totals.totalNet), icon: CheckCircle2, color: 'emerald' },
        ].map((kpi, i) => {
          const style = KPI_STYLES[kpi.color]
          return (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col relative overflow-hidden group">
            <div className={`absolute -right-4 -top-4 w-24 h-24 ${style.blob} rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500`}></div>
            <div className={`w-10 h-10 rounded-xl ${style.icon} flex items-center justify-center mb-4 relative z-10 border`}>
              <kpi.icon className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider relative z-10">{kpi.label}</h3>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 relative z-10">{kpi.value}</div>
          </div>
        )})}
      </div>

      {/* Register Section */}
      {companyView === 'register' ? (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
            <FileText className="w-4 h-4 text-indigo-500" /> Payroll Register
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Search employee..."
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-48 transition-all"
              />
            </div>

            {/* Period Selector */}
            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden text-sm h-10">
              <div className="px-3 text-slate-400 border-r border-slate-200 dark:border-slate-700 h-full flex items-center bg-slate-50 dark:bg-slate-800/50">
                <Calendar className="w-4 h-4" />
              </div>
              <select 
                className="bg-transparent border-none text-slate-900 dark:text-white font-medium px-3 h-full focus:ring-0 outline-none cursor-pointer"
                value={month} onChange={(e) => setMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => <option key={i+1} value={i+1}>{new Date(2000, i, 1).toLocaleString('default', { month: 'short' })}</option>)}
              </select>
              <select 
                className="bg-transparent border-none text-slate-900 dark:text-white font-medium px-3 border-l border-slate-200 dark:border-slate-700 h-full focus:ring-0 outline-none cursor-pointer"
                value={year} onChange={(e) => setYear(Number(e.target.value))}
              >
                {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden text-sm h-10">
               <div className="px-3 text-slate-400 border-r border-slate-200 dark:border-slate-700 h-full flex items-center bg-slate-50 dark:bg-slate-800/50">
                <Filter className="w-4 h-4" />
              </div>
              <select 
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }}
                className="bg-transparent border-none text-slate-900 dark:text-white font-medium px-3 py-2 h-full focus:ring-0 outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="PROCESSING">Processing</option>
                <option value="REVIEW">Review</option>
                <option value="APPROVED">Approved</option>
                <option value="FINALIZED">Finalized</option>
                <option value="PAID">Paid</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="p-4 flex-1">
          <DataTable 
            columns={columns} 
            data={payslips} 
            isLoading={loading} 
            hideSearch 
          />
        </div>
        
        {/* Pagination */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm text-slate-500">
          <div>Showing {payslips.length} of {totalElements} records</div>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))} className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50">Prev</button>
            <button disabled={payslips.length < 20} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
      ) : (
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 bg-gradient-to-r from-amber-50 via-white to-indigo-50 p-5 dark:border-slate-800 dark:from-amber-950/20 dark:via-slate-900 dark:to-indigo-950/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-600 shadow-sm dark:bg-slate-950 dark:text-amber-300">
                <Settings2 className="h-3.5 w-3.5" /> Finance Control
              </div>
              <h2 className="text-xl font-black text-slate-950 dark:text-white">Salary Setup</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ['Total', salaryTotals.total],
                ['Structured', salaryTotals.structured],
                ['CTC Only', salaryTotals.ctcOnly],
                ['Missing', salaryTotals.missing],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
                  <p className="text-lg font-black text-slate-900 dark:text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={salarySearch}
                onChange={(e) => setSalarySearch(e.target.value)}
                placeholder="Search employee for salary setup..."
                className="input-field pl-10"
              />
            </div>
            <select value={salaryStatusFilter} onChange={(e) => setSalaryStatusFilter(e.target.value)} className="input-field sm:w-56">
              <option value="ALL">All salary statuses</option>
              <option value="MISSING">Missing salary</option>
              <option value="CTC_ONLY">CTC only</option>
              <option value="STRUCTURED">Structured</option>
            </select>
          </div>
        </div>

        <div className="p-4">
          <DataTable
            columns={salaryColumns}
            data={salaryRows}
            isLoading={salaryLoading}
            searchable={false}
            emptyMessage="No active employees found for salary setup"
          />
        </div>
      </div>
      )}

      <RunPayrollModal 
        isOpen={isRunModalOpen} 
        onClose={() => setIsRunModalOpen(false)} 
        month={month} 
        year={year} 
        onComplete={load}
        onOpenSalarySetup={() => setCompanyView('setup')}
      />

      <PayrollDetailDrawer 
        isOpen={!!selectedPayslip} 
        onClose={() => setSelectedPayslip(null)} 
        payslip={selectedPayslip}
        onStatusChange={handleStatusChange}
        onDownload={handleDownloadPayslip}
      />

      <SalaryStructureModal
        isOpen={!!selectedSalaryRow}
        employeeRow={selectedSalaryRow}
        onClose={() => setSelectedSalaryRow(null)}
        onSaved={() => {
          loadSalarySetup()
          load()
        }}
      />
        </>
      ) : (
        <EmployeePayslipsWorkspace />
      )}
    </div>
  )
}
