'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Check, X, Clock, Users, Building2 } from 'lucide-react'
import { DataTable } from '@/components/tables/DataTable'
import { Badge } from '@/components/common/Badge'
import { Avatar } from '@/components/common/Avatar'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { attendanceApi } from '@/services/attendanceApi'
import { employeeApi } from '@/services/employeeApi'

const EmployeeAttendanceWorkspace = dynamic(
  () => import('@/components/pages/EmployeeAttendanceWorkspace').then((mod) => mod.EmployeeAttendanceWorkspace),
  { ssr: false, loading: () => <PageLoader /> }
)

function CompanyAttendanceTab({ headerAction }) {
  const [records, setRecords] = useState([])
  const [filteredRecords, setFilteredRecords] = useState([])
  const [summary, setSummary] = useState({ present: 0, absent: 0, late: 0, onLeave: 0 })
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedEmployee, setSelectedEmployee] = useState('all')
  const [employeesList, setEmployeesList] = useState([])

  function formatAttendanceDate(value) {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'
    return date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })
  }

  function formatWorkDuration(row) {
    if (row.workDurationLabel) return row.workDurationLabel
    if (Number(row.workingMinutes || 0) > 0) {
      const minutes = Math.round(Number(row.workingMinutes))
      return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
    }
    if (!row.checkInTime || !row.checkOutTime) return row.checkInTime ? 'In progress' : '0h 0m'
    const start = new Date(row.checkInTime)
    const end = new Date(row.checkOutTime)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return '0h 0m'
    const minutes = Math.max(0, Math.round((end - start) / 60000) - Number(row.breakMinutes || 0))
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
  }

  function loadData() {
    setLoading(true)
    Promise.all([
      attendanceApi.getAll({ date: selectedDate, employeeId: selectedEmployee }), 
      attendanceApi.getPendingRegularizations()
    ])
      .then(([attRes, pendRes]) => {
        const fetchedRecords = attRes.data.data.records || []
        setRecords(fetchedRecords)
        const s = attRes.data.data.summary
        setSummary({
          present: s.present || 0,
          absent: s.absent || 0,
          late: s.late || 0,
          onLeave: fetchedRecords.filter(r => r.status === 'ON_LEAVE').length || 0,
        })
        setPending(pendRes.data.data)
      })
      .finally(() => setLoading(false))
  }
  
  useEffect(() => {
    loadData()
  }, [selectedDate, selectedEmployee]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    employeeApi.getAll({ size: 1000 }).then(empRes => {
      if (empRes?.data?.data?.content) {
        setEmployeesList(empRes.data.data.content)
      }
    }).catch(console.error)
  }, [])

  useEffect(() => {
    setFilteredRecords(records)
  }, [selectedEmployee, records])

  async function approve(id) {
    await attendanceApi.approveRegularization(id)
    loadData()
  }
  async function reject(id) {
    await attendanceApi.rejectRegularization(id, 'Rejected by HR')
    loadData()
  }

  const columns = [
    { header: 'Employee', accessor: 'employee', render: (v, row) => {
      const name = v ? `${v.firstName} ${v.lastName}` : 'Unknown'
      return (
        <div className="flex items-center gap-3">
          <Avatar name={name} size="sm" />
          <div>
            <span className="font-medium text-slate-800 dark:text-slate-100">{name}</span>
            <div className="text-xs text-slate-400">{v?.employeeCode || row.employeeCode || '-'}</div>
          </div>
        </div>
      )
    } },
    { header: 'Date', accessor: 'attendanceDate', render: (v, row) => <span className="font-medium text-slate-700 dark:text-slate-300">{formatAttendanceDate(v || row.date)}</span> },
    { header: 'Check In', accessor: 'checkInTime', render: (v) => v ? <span className="font-medium text-slate-700 dark:text-slate-300">{new Date(v).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span> : <span className="text-slate-400">—</span> },
    { header: 'Check Out', accessor: 'checkOutTime', render: (v) => v ? <span className="font-medium text-slate-700 dark:text-slate-300">{new Date(v).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span> : <span className="text-slate-400">—</span> },
    { header: 'Duration', accessor: 'workDurationMinutes', render: (_, row) => (
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${row.checkInTime && !row.checkOutTime ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
        {formatWorkDuration(row)}
      </span>
    ) },
    { header: 'Status', accessor: 'status', render: (v) => <Badge variant={v === 'PRESENT' ? 'success' : v === 'ABSENT' ? 'danger' : 'warning'}>{v}</Badge> },
  ]

  const stats = [
    { label: 'Present Today', value: summary.present, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { label: 'Absent Today', value: summary.absent, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10' },
    { label: 'Late Arrivals', value: summary.late, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
    { label: 'Pending Req.', value: pending.length, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
  ]

  return (
    <div className="animate-fade-in space-y-8 mt-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
              Company Attendance
            </h2>
          </div>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="group relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full ${stat.bg} -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-500 ease-out`}></div>
            <div className="relative z-10">
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
              <h3 className={`text-2xl font-bold tracking-tight ${stat.color}`}>{loading ? '-' : stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Pending Regularizations */}
      {pending.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg overflow-hidden relative">
          <div className="absolute top-0 left-0 -ml-20 -mt-20 w-64 h-64 rounded-full bg-amber-500/5 blur-3xl pointer-events-none"></div>
          <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20 relative z-10">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
              Pending Regularizations
            </h2>
          </div>
          <div className="p-6 relative z-10 divide-y divide-slate-100 dark:divide-slate-800">
            {pending.map((r) => (
              <div key={r._id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                <div className="flex items-center gap-4">
                  <Avatar name={`${r.employee?.firstName} ${r.employee?.lastName}`} size="md" />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-base">{r.employee?.firstName} {r.employee?.lastName}</p>
                    <div className="flex items-center gap-2 mt-1 text-sm text-slate-500 dark:text-slate-400">
                      <span className="font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">{new Date(r.date).toDateString()}</span>
                      <span className="text-slate-300">&bull;</span>
                      <span>{r.regularizationReason}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approve(r._id)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors">
                    <Check className="w-4 h-4" /> Approve
                  </button>
                  <button onClick={() => reject(r._id)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold text-sm hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                    <X className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none"></div>
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-slate-50/50 dark:bg-slate-800/20 relative z-10">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 shrink-0">
            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg text-indigo-600 dark:text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
            All Employees
          </h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full sm:w-48 pl-3 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 appearance-none text-slate-700 dark:text-slate-300"
              >
                <option value="all">All Employees</option>
                {employeesList.map(emp => (
                  <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
          </div>
        </div>
        <div className="p-1 relative z-10">
          <DataTable 
            columns={columns} 
            data={filteredRecords} 
            isLoading={loading} 
            searchable={false} 
            searchPlaceholder="Search employees..."
            emptyMessage={filteredRecords.length === 0 && !loading ? 'No records found' : 'No records found'} 
          />
        </div>
      </div>

    </div>
  )
}

export default function HRAttendancePage() {
  const [activeTab, setActiveTab] = useState('mine')

  const Tabs = (
    <div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl w-fit border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl mb-6">
      <button
        onClick={() => setActiveTab('mine')}
        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all duration-300 ${
          activeTab === 'mine'
            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
        }`}
      >
        <Clock className="w-3.5 h-3.5" />
        My Attendance
      </button>
      <button
        onClick={() => setActiveTab('company')}
        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all duration-300 ${
          activeTab === 'company'
            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
        }`}
      >
        <Building2 className="w-3.5 h-3.5" />
        Company Attendance
      </button>
    </div>
  )

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex justify-end -mb-4 relative z-10">
        {Tabs}
      </div>
      {activeTab === 'mine' ? (
        <EmployeeAttendanceWorkspace />
      ) : (
        <CompanyAttendanceTab />
      )}
    </div>
  )
}
