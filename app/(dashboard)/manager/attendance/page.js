'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { DataTable } from '@/components/tables/DataTable'
import { Avatar } from '@/components/common/Avatar'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { attendanceApi } from '@/services/attendanceApi'
import { Clock, Users } from 'lucide-react'

const EmployeeAttendanceWorkspace = dynamic(
  () => import('@/components/pages/EmployeeAttendanceWorkspace').then((mod) => mod.EmployeeAttendanceWorkspace),
  { ssr: false, loading: () => <PageLoader /> }
)

function TeamAttendanceTab() {
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedEmployee, setSelectedEmployee] = useState('all')
  const [employeesList, setEmployeesList] = useState([])
  const [filteredTeam, setFilteredTeam] = useState([])

  useEffect(() => {
    setLoading(true)
    attendanceApi.getTeamAttendance({ date: selectedDate })
      .then((res) => {
        const teamData = res.data.data || []
        setTeam(teamData)
        setEmployeesList(teamData.map(t => t.employee).filter(Boolean))
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [selectedDate])

  useEffect(() => {
    if (selectedEmployee && selectedEmployee !== 'all') {
      setFilteredTeam(team.filter(t => t.employee?._id === selectedEmployee))
    } else {
      setFilteredTeam(team)
    }
  }, [selectedEmployee, team])

  const columns = [
    { header: 'Employee', accessor: 'name', render: (v, row) => {
      const name = v || (row.employee ? `${row.employee.firstName} ${row.employee.lastName}` : 'Unknown')
      return (
        <div className="flex items-center gap-3">
          <Avatar name={name} size="sm" />
          <span className="font-medium text-slate-800 dark:text-slate-100">{name}</span>
        </div>
      )
    } },
    { header: 'Check In', accessor: 'checkInTime', render: (v) => v ? <span className="font-medium text-slate-700 dark:text-slate-300">{new Date(v).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span> : <span className="text-slate-400">—</span> },
    { header: 'Check Out', accessor: 'checkOutTime', render: (v) => v ? <span className="font-medium text-slate-700 dark:text-slate-300">{new Date(v).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span> : <span className="text-slate-400">—</span> },
    { header: 'Status', accessor: 'status', render: (v) => <Badge variant={v === 'PRESENT' ? 'success' : v === 'ABSENT' ? 'danger' : 'warning'}>{v}</Badge> },
  ]

  const stats = [
    { label: 'Total Team', value: team.length, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
    { label: 'Present Today', value: team.filter(t => t.status === 'PRESENT').length, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { label: 'Absent Today', value: team.filter(t => t.status === 'ABSENT').length, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10' },
    { label: 'On Leave', value: team.filter(t => t.status === 'ON_LEAVE').length, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10' },
  ]

  return (
    <div className="animate-fade-in space-y-8 mt-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 flex items-center gap-3">
            Team Attendance
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">
            Monitor real-time presence and activity for your direct reports
          </p>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="group relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full ${stat.bg} -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-500 ease-out`}></div>
            <div className="relative z-10">
              <div className="text-slate-500 dark:text-slate-400 text-sm font-semibold tracking-wide uppercase mb-3">{stat.label}</div>
              <div className={`text-4xl font-black tracking-tight ${stat.color}`}>{loading ? '-' : stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg overflow-hidden relative">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none"></div>
        <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-slate-50/50 dark:bg-slate-800/20 relative z-10">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3 shrink-0">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            Direct Reports
          </h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full sm:w-48 pl-3 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 appearance-none text-slate-700 dark:text-slate-300"
              >
                <option value="all">All Team</option>
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
        <div className="p-2 relative z-10">
          <DataTable 
            columns={columns} 
            data={filteredTeam} 
            isLoading={loading} 
            searchable={true} 
            searchPlaceholder="Search team members..."
            emptyMessage={error ? 'Failed to load attendance data — try refreshing' : 'No records found for today'} 
          />
        </div>
      </div>

    </div>
  )
}

export default function ManagerAttendancePage() {
  const [activeTab, setActiveTab] = useState('mine')

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('mine')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'mine'
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
          }`}
        >
          <Clock className="w-4 h-4" /> My Attendance
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'team'
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
          }`}
        >
          <Users className="w-4 h-4" /> Team Attendance
        </button>
      </div>

      <div className="mt-6">
        {activeTab === 'mine' ? <EmployeeAttendanceWorkspace /> : <TeamAttendanceTab />}
      </div>
    </div>
  )
}
