'use client'

import { useEffect, useState } from 'react'
import { employeeApi } from '@/services/employeeApi'
import { attendanceApi } from '@/services/attendanceApi'
import { leaveApi } from '@/services/leaveApi'
import { payrollApi } from '@/services/payrollApi'
import { GenericAreaChart, GenericBarChart, DepartmentPieChart } from '@/components/charts/DynamicDashboardCharts'
import { formatCurrency } from '@/lib/utils'

const TABS = ['Employee', 'Attendance', 'Leave', 'Payroll']

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">{title}</h3>
      {children}
    </div>
  )
}

function MonthYearPicker({ month, year, onChange }) {
  return (
    <div className="flex gap-2">
      <select className="input-field w-32" value={month} onChange={(e) => onChange({ month: Number(e.target.value), year })}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
        ))}
      </select>
      <select className="input-field w-24" value={year} onChange={(e) => onChange({ month, year: Number(e.target.value) })}>
        {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  )
}

export function ReportsHub() {
  const now = new Date()
  const [tab, setTab] = useState('Employee')
  const [period, setPeriod] = useState({ month: now.getMonth() + 1, year: now.getFullYear() })

  const [employeeReport, setEmployeeReport] = useState(null)
  const [attendanceReport, setAttendanceReport] = useState(null)
  const [leaveReport, setLeaveReport] = useState(null)
  const [payrollReport, setPayrollReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    if (tab === 'Employee') {
      employeeApi.getReports({ months: 6 }).then((res) => setEmployeeReport(res.data.data)).finally(() => setLoading(false))
    } else if (tab === 'Attendance') {
      attendanceApi.getMonthlyReport(period).then((res) => setAttendanceReport(res.data.data)).finally(() => setLoading(false))
    } else if (tab === 'Leave') {
      leaveApi.getReports(period).then((res) => setLeaveReport(res.data.data)).finally(() => setLoading(false))
    } else if (tab === 'Payroll') {
      payrollApi.getReports(period).then((res) => setPayrollReport(res.data.data)).finally(() => setLoading(false))
    }
  }, [tab, period])

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Employee, attendance, leave and payroll reports</p>
        </div>
        {tab !== 'Employee' && <MonthYearPicker month={period.month} year={period.year} onChange={setPeriod} />}
      </div>

      <div className="flex gap-2 border-b border-slate-100 dark:border-slate-800">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : (
        <>
          {tab === 'Employee' && employeeReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="Total Employees" value={employeeReport.totalEmployees} />
                <StatCard label="Departments Represented" value={employeeReport.byDepartment.length} />
                <StatCard label="New Joiners (this window)" value={employeeReport.newJoinersTrend.reduce((s, r) => s + r.count, 0)} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Headcount by Status">
                  <DepartmentPieChart data={employeeReport.byStatus.map((r) => ({ name: r.status, value: r.count }))} />
                </ChartCard>
                <ChartCard title="Headcount by Department">
                  <GenericBarChart data={employeeReport.byDepartment} xKey="name" dataKey="count" label="Employees" />
                </ChartCard>
                <ChartCard title="New Joiners Trend">
                  <GenericAreaChart data={employeeReport.newJoinersTrend} xKey="month" dataKey="count" color="#059669" label="New Joiners" />
                </ChartCard>
              </div>
            </div>
          )}

          {tab === 'Attendance' && attendanceReport && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard label="Present Days" value={attendanceReport.presentDays} />
              <StatCard label="Absent Days" value={attendanceReport.absentDays} />
              <StatCard label="Half Days" value={attendanceReport.halfDays} />
              <StatCard label="Late Marks" value={attendanceReport.lateCount} />
              <StatCard label="Overtime (min)" value={attendanceReport.totalOvertimeMinutes} />
            </div>
          )}

          {tab === 'Leave' && leaveReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatCard label="Total Leave Days Taken" value={leaveReport.totalDays} />
                <StatCard label="Approved Requests" value={leaveReport.totalRequests} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Leave Days by Type">
                  {leaveReport.byType.length === 0 ? <p className="text-sm text-slate-400 py-8 text-center">No approved leave in this period</p> : <DepartmentPieChart data={leaveReport.byType.map((r) => ({ name: r.name, value: r.days }))} />}
                </ChartCard>
                <ChartCard title="Leave Days by Department">
                  <GenericBarChart data={leaveReport.byDepartment.map((r) => ({ name: r.name, days: r.days }))} xKey="name" dataKey="days" color="#f59e0b" label="Days" />
                </ChartCard>
              </div>
            </div>
          )}

          {tab === 'Payroll' && payrollReport && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard label="Gross Salary" value={formatCurrency(payrollReport.grossSalary)} />
              <StatCard label="Net Salary" value={formatCurrency(payrollReport.netSalary)} />
              <StatCard label="Basic Salary" value={formatCurrency(payrollReport.basicSalary)} />
              <StatCard label="PF Deduction" value={formatCurrency(payrollReport.pfDeduction)} />
              <StatCard label="ESI Deduction" value={formatCurrency(payrollReport.esiDeduction)} />
              <StatCard label="TDS Deduction" value={formatCurrency(payrollReport.tdsDeduction)} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
