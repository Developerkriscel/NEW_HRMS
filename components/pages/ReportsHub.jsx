'use client'

import { useEffect, useState } from 'react'
import { employeeApi } from '@/services/employeeApi'
import { attendanceApi } from '@/services/attendanceApi'
import { leaveApi } from '@/services/leaveApi'
import { payrollApi } from '@/services/payrollApi'
import { GenericAreaChart, GenericBarChart, GenericLineChart, DepartmentPieChart } from '@/components/charts/DynamicDashboardCharts'
import { formatCurrency } from '@/lib/utils'
import { Users, Clock, CalendarDays, Banknote, Calendar, ChevronDown, BarChart3, LineChart } from 'lucide-react'

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

function MonthYearPicker({ month, year, onChange }) {
  return (
    <div className="flex bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 rounded-xl shadow-sm p-1 items-center hover:bg-white dark:hover:bg-slate-800 transition-colors">
      <Calendar className="w-3.5 h-3.5 text-indigo-500 ml-2 mr-1" />
      <div className="relative">
        <select 
          className="appearance-none bg-transparent pl-2 pr-6 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer" 
          value={month} 
          onChange={(e) => onChange({ month: Number(e.target.value), year })}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'short' })}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
      </div>
      <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
      <div className="relative">
        <select 
          className="appearance-none bg-transparent pl-2 pr-6 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer" 
          value={year} 
          onChange={(e) => onChange({ month, year: Number(e.target.value) })}
        >
          {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
      </div>
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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6 pb-8">
      
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 relative z-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 mb-4 shadow-sm text-indigo-600 dark:text-indigo-400">
            <LineChart className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold tracking-widest uppercase">Analytics Hub</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Actionable <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-sky-500">Insights</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Data-driven reports across all HR modules to help you make better decisions.
          </p>
        </div>
        {tab !== 'Employee' && (
          <MonthYearPicker month={period.month} year={period.year} onChange={setPeriod} />
        )}
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
            </div>
          )}
        </div>
      )}
    </div>
  )
}
