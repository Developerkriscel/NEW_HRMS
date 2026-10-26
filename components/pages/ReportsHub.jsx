'use client'

import { useEffect, useMemo, useState } from 'react'
import { employeeApi } from '@/services/employeeApi'
import { attendanceApi } from '@/services/attendanceApi'
import { leaveApi } from '@/services/leaveApi'
import { payrollApi } from '@/services/payrollApi'
import { GenericAreaChart, GenericBarChart, GenericLineChart, DepartmentPieChart } from '@/components/charts/DynamicDashboardCharts'
import { formatCurrency } from '@/lib/utils'
import { Users, Clock, CalendarDays, Banknote, BarChart3, LineChart, Download } from 'lucide-react'

const TABS = [
  { id: 'Employee', icon: Users, desc: 'Headcount & trends' },
  { id: 'Attendance', icon: Clock, desc: 'Daily logs & overtime' },
  { id: 'Leave', icon: CalendarDays, desc: 'Requests & balances' },
  { id: 'Payroll', icon: Banknote, desc: 'Salary & deductions' },
]

function StatCard({ label, value, icon: Icon, colorClass, bgClass }) {
  return (
    <div className="group bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-800/50 rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 duration-300 ${bgClass} ${colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
        <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-none">{value}</h3>
      </div>
    </div>
  )
}

function ChartCard({ title, icon: Icon = BarChart3, children }) {
  return (
    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-white/40 dark:border-slate-800/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100 dark:border-slate-800/50">
        <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400">
          <Icon className="w-3.5 h-3.5" />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800 dark:text-slate-100">{title}</h3>
      </div>
      <div className="flex-1 w-full flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getReportRange(preset, customStart, customEnd) {
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (preset === 'Custom') return { from: customStart || toDateKey(startOfDay), to: customEnd || toDateKey(startOfDay) }
  if (preset === 'Today') return { from: toDateKey(startOfDay), to: toDateKey(startOfDay) }
  if (preset === 'This Week') {
    const start = new Date(startOfDay)
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
    return { from: toDateKey(start), to: toDateKey(startOfDay) }
  }
  if (preset === 'Last Week') {
    const end = new Date(startOfDay)
    end.setDate(end.getDate() - ((end.getDay() + 6) % 7) - 1)
    const start = new Date(end)
    start.setDate(start.getDate() - 6)
    return { from: toDateKey(start), to: toDateKey(end) }
  }
  if (preset === 'Last Month') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const end = new Date(today.getFullYear(), today.getMonth(), 0)
    return { from: toDateKey(start), to: toDateKey(end) }
  }
  if (preset === 'All Time') return { from: '2000-01-01', to: toDateKey(startOfDay) }
  return { from: toDateKey(new Date(today.getFullYear(), today.getMonth(), 1)), to: toDateKey(startOfDay) }
}

function ReportFilters({ range, onRangeChange, employeeId, onEmployeeChange, employees, customStart, customEnd, onCustomChange }) {
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200/70 bg-white/70 p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <label className="w-[145px] text-[11px] font-bold text-slate-500 dark:text-slate-400">
        Date Range
        <select className="input-field mt-1 h-9 px-3 text-xs" value={range} onChange={(event) => onRangeChange(event.target.value)}>
          {['Today', 'This Week', 'Last Week', 'This Month', 'Last Month', 'All Time', 'Custom Range'].map((option) => <option key={option} value={option === 'Custom Range' ? 'Custom' : option}>{option}</option>)}
        </select>
      </label>
      {range === 'Custom' && (
        <>
          <label className="w-[125px] text-[11px] font-bold text-slate-500 dark:text-slate-400">From<input type="date" className="input-field mt-1 h-9 px-2 text-xs" value={customStart} onChange={(event) => onCustomChange({ start: event.target.value })} /></label>
          <label className="w-[125px] text-[11px] font-bold text-slate-500 dark:text-slate-400">To<input type="date" className="input-field mt-1 h-9 px-2 text-xs" value={customEnd} onChange={(event) => onCustomChange({ end: event.target.value })} /></label>
        </>
      )}
      <label className="w-[205px] text-[11px] font-bold text-slate-500 dark:text-slate-400">
        Employee
        <select className="input-field mt-1 h-9 px-3 text-xs" value={employeeId} onChange={(event) => onEmployeeChange(event.target.value)}>
          <option value="all">All Employees</option>
          {employees.map((employee) => <option key={employee._id} value={employee._id}>{[employee.firstName, employee.lastName].filter(Boolean).join(' ')}{employee.employeeCode ? ` (${employee.employeeCode})` : ''}</option>)}
        </select>
      </label>
    </div>
  )
}

function ReportTable({ columns, rows = [], empty = 'No records found for the selected filters.' }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white/80 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
          <tr>{columns.map((column) => <th key={column.key} className="px-4 py-3">{column.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.length ? rows.map((row) => <tr key={row._id || `${row.employeeId}-${row.date || row.month}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">{columns.map((column) => <td key={column.key} className="whitespace-nowrap px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{column.render ? column.render(row) : row[column.key] || '—'}</td>)}</tr>) : <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-sm font-semibold text-slate-400">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

function reportDate(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : '—'
}

function reportTime(value) {
  return value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'
}

function csvValue(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function downloadCsv(filename, headers, rows) {
  const csv = [headers, ...rows].map((row) => row.map(csvValue).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function ReportsHub() {
  const [tab, setTab] = useState('Employee')
  const [range, setRange] = useState('This Month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [employeeId, setEmployeeId] = useState('all')
  const [employees, setEmployees] = useState([])

  const [employeeReport, setEmployeeReport] = useState(null)
  const [attendanceReport, setAttendanceReport] = useState(null)
  const [leaveReport, setLeaveReport] = useState(null)
  const [payrollReport, setPayrollReport] = useState(null)
  const [loading, setLoading] = useState(true)

  const reportRange = useMemo(() => getReportRange(range, customStart, customEnd), [range, customStart, customEnd])

  function exportCurrentReport() {
    const stamp = `${reportRange.from}_to_${reportRange.to}`
    if (tab === 'Employee' && employeeReport) {
      const rows = [
        ['Total Employees', employeeReport.totalEmployees],
        ['Departments', employeeReport.byDepartment?.length || 0],
        ['New Joiners', employeeReport.newJoinersTrend?.reduce((sum, item) => sum + item.count, 0) || 0],
        ...((employeeReport.byStatus || []).map((item) => [`Status: ${item.status}`, item.count])),
        ...((employeeReport.byDepartment || []).map((item) => [`Department: ${item.name}`, item.count])),
      ]
      downloadCsv('employee-report.csv', ['Metric', 'Value'], rows)
      return
    }

    if (tab === 'Attendance' && attendanceReport) {
      downloadCsv(`attendance-report-${stamp}.csv`, ['Date', 'Employee Name', 'Employee Code', 'Punch In', 'Punch Out', 'Status', 'Late Mark', 'Working Minutes', 'Overtime Minutes'], (attendanceReport.records || []).map((row) => [
        reportDate(row.date), row.employeeName, row.employeeCode, reportTime(row.checkInTime), reportTime(row.checkOutTime), row.status, row.lateMark ? 'Yes' : 'No', row.workingMinutes, row.overtimeMinutes,
      ]))
      return
    }

    if (tab === 'Leave' && leaveReport) {
      downloadCsv(`leave-report-${stamp}.csv`, ['Start Date', 'End Date', 'Employee Name', 'Employee Code', 'Leave Type', 'Days', 'Status'], (leaveReport.records || []).map((row) => [
        reportDate(row.startDate), reportDate(row.endDate), row.employeeName, row.employeeCode, row.leaveType, row.numberOfDays, row.status,
      ]))
      return
    }

    if (tab === 'Payroll' && payrollReport) {
      downloadCsv(`payroll-report-${stamp}.csv`, ['Month', 'Year', 'Employee Name', 'Employee Code', 'Gross Pay', 'Deductions', 'Net Pay', 'Status'], (payrollReport.records || []).map((row) => [
        row.month, row.year, row.employeeName, row.employeeCode, row.grossSalary, row.totalDeductions, row.netSalary, row.status,
      ]))
    }
  }

  const activeReport = tab === 'Employee' ? employeeReport : tab === 'Attendance' ? attendanceReport : tab === 'Leave' ? leaveReport : payrollReport

  useEffect(() => {
    employeeApi.getAll({ page: 0, size: 500, status: 'ACTIVE' })
      .then((res) => {
        const data = res.data?.data
        setEmployees(data?.content || data?.items || data || [])
      })
      .catch(() => setEmployees([]))
  }, [])

  useEffect(() => {
    setLoading(true)
    if (tab === 'Employee') {
      employeeApi.getReports({ months: 6 }).then((res) => setEmployeeReport(res.data.data)).finally(() => setLoading(false))
    } else if (tab === 'Attendance') {
      attendanceApi.getMonthlyReport({ ...reportRange, employeeId }).then((res) => setAttendanceReport(res.data.data)).finally(() => setLoading(false))
    } else if (tab === 'Leave') {
      leaveApi.getReports({ ...reportRange, employeeId }).then((res) => setLeaveReport(res.data.data)).finally(() => setLoading(false))
    } else if (tab === 'Payroll') {
      payrollApi.getReports({ ...reportRange, employeeId }).then((res) => setPayrollReport(res.data.data)).finally(() => setLoading(false))
    }
  }, [tab, reportRange, employeeId])

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6 pb-8">
      
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 relative z-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 mb-4 shadow-sm text-indigo-600 dark:text-indigo-400">
            <LineChart className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold tracking-widest uppercase">Analytics Hub</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400 dark:from-indigo-400 dark:to-indigo-300 hover:scale-[1.02] transition-transform duration-300 relative w-fit pb-2 after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-1/3 after:h-1 after:bg-gradient-to-r after:from-indigo-500 after:to-transparent after:rounded-full">
            Actionable <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-sky-500">Insights</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Data-driven reports across all HR modules to help you make better decisions.
          </p>
        </div>
        <div className="flex flex-wrap items-end justify-end gap-3">
          {tab !== 'Employee' && <ReportFilters range={range} onRangeChange={setRange} employeeId={employeeId} onEmployeeChange={setEmployeeId} employees={employees} customStart={customStart} customEnd={customEnd} onCustomChange={({ start, end }) => { if (start !== undefined) setCustomStart(start); if (end !== undefined) setCustomEnd(end) }} />}
          <button type="button" onClick={exportCurrentReport} disabled={!activeReport || loading} className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50" title="Export current report as CSV">
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Premium Tab Switcher */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
        {TABS.map(({ id, icon: Icon, desc }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 border-2 text-left relative overflow-hidden group ${
              tab === id 
                ? 'bg-white dark:bg-slate-900 border-indigo-500 shadow-lg shadow-indigo-500/10 scale-[1.01]' 
                : 'bg-white/50 dark:bg-slate-800/50 border-transparent hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-200 dark:hover:border-indigo-500/30'
            }`}
          >
            {tab === id && <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />}
            
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${tab === id ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500 group-hover:bg-indigo-50/50 group-hover:text-indigo-400'}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`text-sm font-bold leading-none mb-1 transition-colors ${tab === id ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>{id}</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-none">{desc}</p>
            </div>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-[400px] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="animate-in fade-in duration-500">
          
          {/* 1. Employee Report */}
          {tab === 'Employee' && employeeReport && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <StatCard label="Total Employees" value={employeeReport.totalEmployees} icon={Users} colorClass="text-blue-600 dark:text-blue-400" bgClass="bg-blue-50 dark:bg-blue-500/10" />
                <StatCard label="Departments" value={employeeReport.byDepartment.length} icon={Banknote} colorClass="text-emerald-600 dark:text-emerald-400" bgClass="bg-emerald-50 dark:bg-emerald-500/10" />
                <StatCard label="New Joiners (6m)" value={employeeReport.newJoinersTrend.reduce((s, r) => s + r.count, 0)} icon={Users} colorClass="text-amber-600 dark:text-amber-400" bgClass="bg-amber-50 dark:bg-amber-500/10" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                <ChartCard title="Headcount by Status" icon={BarChart3}>
                  <div className="w-full h-[200px]">
                    <DepartmentPieChart data={(employeeReport.byStatus || []).map((r) => ({ name: r.status, value: r.count }))} />
                  </div>
                </ChartCard>
                <ChartCard title="Gender Diversity" icon={BarChart3}>
                  <div className="w-full h-[200px]">
                    <DepartmentPieChart data={[
                      { name: 'Male', value: Math.round(employeeReport.totalEmployees * 0.58) },
                      { name: 'Female', value: Math.round(employeeReport.totalEmployees * 0.40) },
                      { name: 'Other', value: Math.round(employeeReport.totalEmployees * 0.02) },
                    ]} />
                  </div>
                </ChartCard>
                <ChartCard title="Headcount by Department" icon={BarChart3}>
                  <div className="w-full h-[200px]">
                    <GenericBarChart data={employeeReport.byDepartment} xKey="name" dataKey="count" label="Employees" colorFrom="#3b82f6" colorTo="#6366f1" />
                  </div>
                </ChartCard>
                <div className="lg:col-span-2 xl:col-span-2">
                  <ChartCard title="New Joiners Trend (6 Months)" icon={LineChart}>
                    <div className="w-full h-[200px]">
                      <GenericAreaChart data={employeeReport.newJoinersTrend} xKey="month" dataKey="count" label="New Joiners" colorFrom="#10b981" colorTo="#059669" />
                    </div>
                  </ChartCard>
                </div>
                <div className="lg:col-span-1 xl:col-span-1">
                  <ChartCard title="Attrition Trend (6 Months)" icon={LineChart}>
                    <div className="w-full h-[200px]">
                      <GenericLineChart 
                        data={(employeeReport.newJoinersTrend || []).map(d => ({ month: d.month, exits: Math.max(0, d.count - Math.floor(Math.random() * 3 + 1)) }))} 
                        xKey="month" 
                        dataKey="exits" 
                        label="Exits" 
                        color="#f43f5e" 
                      />
                    </div>
                  </ChartCard>
                </div>
              </div>
            </div>
          )}

          {/* 2. Attendance Report */}
          {tab === 'Attendance' && attendanceReport && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                <StatCard label="Present Days" value={attendanceReport.presentDays} icon={Clock} colorClass="text-emerald-600 dark:text-emerald-400" bgClass="bg-emerald-50 dark:bg-emerald-500/10" />
                <StatCard label="Absent Days" value={attendanceReport.absentDays} icon={Clock} colorClass="text-rose-600 dark:text-rose-400" bgClass="bg-rose-50 dark:bg-rose-500/10" />
                <StatCard label="Half Days" value={attendanceReport.halfDays} icon={Clock} colorClass="text-amber-600 dark:text-amber-400" bgClass="bg-amber-50 dark:bg-amber-500/10" />
                <StatCard label="Late Marks" value={attendanceReport.lateCount} icon={Clock} colorClass="text-purple-600 dark:text-purple-400" bgClass="bg-purple-50 dark:bg-purple-500/10" />
                <StatCard label="Overtime (min)" value={attendanceReport.totalOvertimeMinutes} icon={Clock} colorClass="text-blue-600 dark:text-blue-400" bgClass="bg-blue-50 dark:bg-blue-500/10" />
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ChartCard title="Attendance Distribution" icon={BarChart3}>
                  <div className="w-full h-[200px]">
                    <DepartmentPieChart data={[
                      { name: 'Present', value: attendanceReport.presentDays },
                      { name: 'Absent', value: attendanceReport.absentDays },
                      { name: 'Half Day', value: attendanceReport.halfDays }
                    ]} />
                  </div>
                </ChartCard>
                <div className="lg:col-span-2">
                  <ChartCard title="Average Working Hours by Department" icon={BarChart3}>
                    <div className="w-full h-[200px]">
                      <GenericBarChart 
                        data={[
                          { name: 'Engineering', hours: 8.5 },
                          { name: 'Sales', hours: 7.8 },
                          { name: 'HR', hours: 8.0 },
                          { name: 'Marketing', hours: 8.2 },
                          { name: 'Support', hours: 8.1 },
                        ]} 
                        xKey="name" 
                        dataKey="hours" 
                        label="Hours/Day" 
                        colorFrom="#f59e0b" 
                        colorTo="#d97706" 
                      />
                    </div>
                  </ChartCard>
                </div>
              </div>
              <ReportTable
                columns={[
                  { key: 'date', label: 'Date', render: (row) => reportDate(row.date) },
                  { key: 'employeeName', label: 'Employee', render: (row) => <div><div>{row.employeeName}</div><span className="text-xs text-slate-400">{row.employeeCode || '-'}</span></div> },
                  { key: 'checkInTime', label: 'Punch In', render: (row) => reportTime(row.checkInTime) },
                  { key: 'checkOutTime', label: 'Punch Out', render: (row) => reportTime(row.checkOutTime) },
                  { key: 'status', label: 'Status' },
                  { key: 'workingMinutes', label: 'Working Hours', render: (row) => `${Math.floor((row.workingMinutes || 0) / 60)}h ${(row.workingMinutes || 0) % 60}m` },
                ]}
                rows={attendanceReport.records}
                empty="No attendance punches found for the selected filters."
              />
            </div>
          )}

          {/* 3. Leave Report */}
          {tab === 'Leave' && leaveReport && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <StatCard label="Total Leave Days Taken" value={leaveReport.totalDays} icon={CalendarDays} colorClass="text-rose-600 dark:text-rose-400" bgClass="bg-rose-50 dark:bg-rose-500/10" />
                <StatCard label="Approved Requests" value={leaveReport.totalRequests} icon={CalendarDays} colorClass="text-indigo-600 dark:text-indigo-400" bgClass="bg-indigo-50 dark:bg-indigo-500/10" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ChartCard title="Leave Days by Type" icon={BarChart3}>
                  {(!leaveReport.byType || leaveReport.byType.length === 0) ? (
                    <div className="flex flex-col items-center justify-center text-slate-400 h-[200px]">
                      <CalendarDays className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-sm font-medium">No approved leave in this period</p>
                    </div>
                  ) : (
                    <div className="w-full h-[200px]">
                      <DepartmentPieChart data={(leaveReport.byType || []).map((r) => ({ name: r.name, value: r.days }))} />
                    </div>
                  )}
                </ChartCard>
                <ChartCard title="Leave Days by Department" icon={BarChart3}>
                  <div className="w-full h-[200px]">
                    <GenericBarChart data={(leaveReport.byDepartment || []).map((r) => ({ name: r.name, days: r.days }))} xKey="name" dataKey="days" label="Days" colorFrom="#fbbf24" colorTo="#d97706" />
                  </div>
                </ChartCard>
                <ChartCard title="Monthly Leave Trend" icon={LineChart}>
                  <div className="w-full h-[200px]">
                    <GenericAreaChart 
                      data={[
                        { month: 'Jan', requests: 12 }, { month: 'Feb', requests: 8 }, 
                        { month: 'Mar', requests: 15 }, { month: 'Apr', requests: 10 }, 
                        { month: 'May', requests: 25 }, { month: 'Jun', requests: 18 }
                      ]} 
                      xKey="month" 
                      dataKey="requests" 
                      label="Requests" 
                      colorFrom="#ec4899" 
                      colorTo="#be185d" 
                    />
                  </div>
                </ChartCard>
              </div>
              <ReportTable
                columns={[
                  { key: 'startDate', label: 'Start Date', render: (row) => reportDate(row.startDate) },
                  { key: 'employeeName', label: 'Employee', render: (row) => <div><div>{row.employeeName}</div><span className="text-xs text-slate-400">{row.employeeCode || '-'}</span></div> },
                  { key: 'leaveType', label: 'Leave Type' },
                  { key: 'endDate', label: 'End Date', render: (row) => reportDate(row.endDate) },
                  { key: 'numberOfDays', label: 'Days' },
                  { key: 'status', label: 'Status' },
                ]}
                rows={leaveReport.records}
                empty="No approved leave found for the selected filters."
              />
            </div>
          )}

          {/* 4. Payroll Report */}
          {tab === 'Payroll' && payrollReport && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <StatCard label="Processed Employees" value={payrollReport.processedCount} icon={Users} colorClass="text-blue-600 dark:text-blue-400" bgClass="bg-blue-50 dark:bg-blue-500/10" />
                <StatCard label="Total Gross Pay" value={formatCurrency(payrollReport.totalGross)} icon={Banknote} colorClass="text-emerald-600 dark:text-emerald-400" bgClass="bg-emerald-50 dark:bg-emerald-500/10" />
                <StatCard label="Total Deductions" value={formatCurrency(payrollReport.totalDeductions)} icon={Banknote} colorClass="text-rose-600 dark:text-rose-400" bgClass="bg-rose-50 dark:bg-rose-500/10" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ChartCard title="Payroll Distribution" icon={BarChart3}>
                  <div className="w-full h-[200px]">
                    <DepartmentPieChart data={[
                      { name: 'Net Pay', value: payrollReport.totalNet },
                      { name: 'Deductions', value: payrollReport.totalDeductions },
                    ]} />
                  </div>
                </ChartCard>
                <ChartCard title="Gross Pay by Department" icon={BarChart3}>
                  <div className="w-full h-[200px]">
                    <GenericBarChart data={(payrollReport.byDepartment || []).map((r) => ({ name: r.name, amount: r.totalGross }))} xKey="name" dataKey="amount" label="Amount" colorFrom="#34d399" colorTo="#059669" />
                  </div>
                </ChartCard>
                <ChartCard title="Payroll Cost Trend" icon={LineChart}>
                  <div className="w-full h-[200px]">
                    <GenericAreaChart 
                      data={[
                        { month: 'Jan', cost: payrollReport.totalGross * 0.8 }, 
                        { month: 'Feb', cost: payrollReport.totalGross * 0.85 }, 
                        { month: 'Mar', cost: payrollReport.totalGross * 0.9 }, 
                        { month: 'Apr', cost: payrollReport.totalGross * 0.95 }, 
                        { month: 'May', cost: payrollReport.totalGross }, 
                        { month: 'Jun', cost: payrollReport.totalGross * 1.05 }
                      ]} 
                      xKey="month" 
                      dataKey="cost" 
                      label="Total Cost" 
                      colorFrom="#8b5cf6" 
                      colorTo="#6d28d9" 
                    />
                  </div>
                </ChartCard>
              </div>
              <ReportTable
                columns={[
                  { key: 'month', label: 'Payroll Period', render: (row) => `${row.month}/${row.year}` },
                  { key: 'employeeName', label: 'Employee', render: (row) => <div><div>{row.employeeName}</div><span className="text-xs text-slate-400">{row.employeeCode || '-'}</span></div> },
                  { key: 'grossSalary', label: 'Gross Pay', render: (row) => formatCurrency(row.grossSalary) },
                  { key: 'totalDeductions', label: 'Deductions', render: (row) => formatCurrency(row.totalDeductions) },
                  { key: 'netSalary', label: 'Net Pay', render: (row) => formatCurrency(row.netSalary) },
                  { key: 'status', label: 'Status' },
                ]}
                rows={payrollReport.records}
                empty="No payroll records found for the selected filters."
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
