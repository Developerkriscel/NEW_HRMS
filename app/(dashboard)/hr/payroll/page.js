'use client'

import { useEffect, useState, useCallback } from 'react'
import { Play, CheckCircle2, Banknote, TrendingUp, Calendar, Users, FileText, Search, Filter, MoreHorizontal, FileDown, Eye } from 'lucide-react'
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

export default function HRPayrollPage() {
  const [activeTab, setActiveTab] = useState('company') // 'company' or 'mine'
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  
  const [payslips, setPayslips] = useState([])
  const [totals, setTotals] = useState({ totalGross: 0, totalNet: 0, totalDeductions: 0 })
  const [totalElements, setTotalElements] = useState(0)
  
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  
  // Modals & Drawers
  const [isRunModalOpen, setIsRunModalOpen] = useState(false)
  const [selectedPayslip, setSelectedPayslip] = useState(null)

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
          <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded font-medium">{row.workingDays - row.absentDays} Paid</span>
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
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-lg">
              Manage, review, and process employee payroll accurately and securely.
            </p>
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

      <RunPayrollModal 
        isOpen={isRunModalOpen} 
        onClose={() => setIsRunModalOpen(false)} 
        month={month} 
        year={year} 
        onComplete={load}
      />

      <PayrollDetailDrawer 
        isOpen={!!selectedPayslip} 
        onClose={() => setSelectedPayslip(null)} 
        payslip={selectedPayslip}
        onStatusChange={handleStatusChange}
        onDownload={handleDownloadPayslip}
      />
        </>
      ) : (
        <EmployeePayslipsWorkspace />
      )}
    </div>
  )
}
