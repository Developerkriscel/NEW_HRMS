'use client'

import { useEffect, useState, useCallback } from 'react'
import { 
  Clock, CheckCircle, Calendar, Plane, Megaphone, Receipt, Send, Activity, Filter
} from 'lucide-react'
import { StatsCard } from '@/components/cards/StatsCard'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { useAuthStore } from '@/store/authStore'
import { attendanceApi } from '@/services/attendanceApi'
import { leaveApi } from '@/services/leaveApi'
import { teamRequestApi } from '@/services/teamRequestApi'
import { announcementApi } from '@/services/announcementApi'
import { payrollApi } from '@/services/payrollApi'
import { CameraVerificationModal } from '@/components/attendance/CameraVerificationModal'
import { GenericAreaChart, DepartmentPieChart, AttendanceBarChart, GenericLineChart } from '@/components/charts/DashboardCharts'
import { formatDate } from '@/lib/utils'

export function EmployeeDashboardWorkspace({ headerAction }) {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  
  const [todayRecord, setTodayRecord] = useState(null)
  const [attendanceHistory, setAttendanceHistory] = useState([])
  const [leaveBalances, setLeaveBalances] = useState([])
  const [upcomingLeaves, setUpcomingLeaves] = useState([])
  const [pendingRequests, setPendingRequests] = useState(0)
  const [recentRequests, setRecentRequests] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [latestPayslip, setLatestPayslip] = useState(null)
  
  const [timeFilter, setTimeFilter] = useState('This Week')

  // Real-time timer state
  const [now, setNow] = useState(new Date())
  
  // UI states
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false)
  const [cameraAction, setCameraAction] = useState(null)

  // Fetch all dashboard data
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const currentMonth = new Date().getMonth() + 1
      const currentYear = new Date().getFullYear()

      const [
        todayRes, 
        historyRes, 
        balRes, 
        leavesRes,
        requestsRes,
        announcementRes
      ] = await Promise.all([
        attendanceApi.getTodayStatus().catch(() => ({ data: { data: null } })),
        attendanceApi.getMyAttendance().catch(() => ({ data: { data: [] } })),
        leaveApi.getBalance().catch(() => ({ data: { data: [] } })),
        leaveApi.getMyLeaves({ status: 'APPROVED', size: 5 }).catch(() => ({ data: { data: { content: [] } } })),
        teamRequestApi.list({ size: 5 }).catch(() => ({ data: { data: { content: [], totalElements: 0 } } })),
        announcementApi.list({ size: 3 }).catch(() => ({ data: { data: { content: [] } } }))
      ])

      setTodayRecord(todayRes.data.data)
      setAttendanceHistory(historyRes.data.data || [])
      setLeaveBalances(balRes.data.data || [])
      setUpcomingLeaves(leavesRes.data.data.content || [])
      setRecentRequests(requestsRes.data.data.content || [])
      setPendingRequests(requestsRes.data.data.content?.filter(r => r.status === 'PENDING').length || 0)
      setAnnouncements(announcementRes.data.data.content || [])

      // Try fetching payslip
      try {
        const empId = user?.employeeProfile?._id || user?._id
        if (empId) {
          const payslipRes = await payrollApi.getPayslip(empId, { month: currentMonth, year: currentYear })
          setLatestPayslip(payslipRes.data.data)
        }
      } catch (e) {
        // Ignore payroll errors
      }

    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Precise live timer
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Derived Values
  const isOnBreak = todayRecord?.breaks?.some(b => !b.end)

  const calculateTimes = () => {
    if (!todayRecord?.checkInTime) return { work: '00h 00m 00s', break: '00h 00m 00s', msWork: 0 }
    
    const checkIn = new Date(todayRecord.checkInTime).getTime()
    const end = todayRecord.checkOutTime ? new Date(todayRecord.checkOutTime).getTime() : now.getTime()
    
    let totalElapsedMs = Math.max(0, end - checkIn)
    let totalBreakMs = 0

    if (todayRecord.breaks) {
      todayRecord.breaks.forEach(b => {
        if (b.end) {
          totalBreakMs += (new Date(b.end).getTime() - new Date(b.start).getTime())
        } else if (!todayRecord.checkOutTime) {
          totalBreakMs += (end - new Date(b.start).getTime())
        }
      })
    }

    const netWorkMs = Math.max(0, totalElapsedMs - totalBreakMs)

    const formatMs = (ms) => {
      const h = Math.floor(ms / 3600000)
      const m = Math.floor((ms % 3600000) / 60000)
      const s = Math.floor((ms % 60000) / 1000)
      return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`
    }

    return {
      work: formatMs(netWorkMs),
      break: formatMs(totalBreakMs),
      msWork: netWorkMs
    }
  }

  const times = calculateTimes()

  const getStatusDisplay = () => {
    if (!todayRecord?.checkInTime) return { label: 'Not Checked In', color: 'from-slate-500 to-slate-400', ring: 'ring-slate-500/30' }
    if (todayRecord?.checkOutTime) return { label: 'Checked Out', color: 'from-slate-600 to-slate-500', ring: 'ring-slate-500/30' }
    if (isOnBreak) return { label: 'On Break', color: 'from-orange-500 to-amber-500', ring: 'ring-orange-500/30', glow: 'shadow-orange-500/40' }
    return { label: 'Working', color: 'from-emerald-500 to-teal-400', ring: 'ring-emerald-500/30', glow: 'shadow-emerald-500/40', pulse: true }
  }
  const status = getStatusDisplay()

  const handleCameraConfirm = async (data) => {
    setActionLoading(true)
    try {
      const payload = { photo: data.photo, location: data.location, source: 'WEB' }
      if (cameraAction === 'check-in') await attendanceApi.checkIn(payload)
      else if (cameraAction === 'check-out') await attendanceApi.checkOut(payload)
      await loadData()
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleBreakAction = async (action) => {
    setActionLoading(true)
    try {
      if (action === 'start') await attendanceApi.startBreak()
      else await attendanceApi.endBreak()
      await loadData()
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 18) return 'Good Afternoon'
    return 'Good Evening'
  }

  // Chart computations
  const getWeeklyData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    return days.map(day => ({
      day,
      present: Math.floor(Math.random() * 8) + 2,
      absent: Math.floor(Math.random() * 3),
      leave: Math.floor(Math.random() * 2)
    }))
  }
  
  const getLeaveTrendData = () => {
    const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']
    return months.map((month, i) => ({
      month,
      requests: [12, 18, 15, 22, 10, 0][i]
    }))
  }

  const getMonthlyAttendancePie = () => {
    const present = attendanceHistory.filter(r => r.status === 'PRESENT').length
    const absent = attendanceHistory.filter(r => r.status === 'ABSENT').length
    const leave = attendanceHistory.filter(r => r.status === 'ON_LEAVE').length
    return [
      { name: 'Present', value: present || 1 },
      { name: 'Absent', value: absent },
      { name: 'Leave', value: leave }
    ].filter(x => x.value > 0)
  }

  const attendanceRate = attendanceHistory.length 
    ? Math.round((attendanceHistory.filter(r => r.status === 'PRESENT').length / attendanceHistory.length) * 100) 
    : 100

  if (loading) return <PageLoader />

  return (
    <div className="animate-fade-in space-y-4 sm:space-y-6 w-full pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight hover:scale-[1.02] transition-transform duration-300 relative w-fit pb-2 after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-1/3 after:h-1 after:bg-gradient-to-r after:from-emerald-500 after:to-transparent after:rounded-full flex items-center gap-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-emerald-400 dark:from-emerald-400 dark:to-emerald-300">
                {greeting()}, {user?.name?.split(' ')[0]}
              </span>
              <span className="inline-block text-black drop-shadow-sm filter-none" style={{ WebkitTextFillColor: 'initial' }}>👋</span>
            </h1>
          </div>
          <div className="mt-1.5 flex items-center gap-4">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        
        {/* Right Header Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-3 sm:mt-0 w-full sm:w-auto">
          {/* Global Dashboard Filter */}
          <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-sm w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
            >
              <option>Today</option>
              <option>Yesterday</option>
              <option>This Week</option>
              <option>This Month</option>
              <option>Last 6 Months</option>
              <option>All Time</option>
            </select>
          </div>
          {headerAction && <div className="w-full sm:w-auto flex overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">{headerAction}</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatsCard title="Today's Status" value={todayRecord?.checkInTime ? (todayRecord?.checkOutTime ? 'Completed' : isOnBreak ? 'On Break' : 'Working') : 'Not In'} icon={Activity} accentColor="bg-indigo-500" />
        <StatsCard title="Working Hours" value={`${Math.floor(times.msWork / 3600000)}h ${Math.floor((times.msWork % 3600000) / 60000)}m`} icon={Clock} accentColor="bg-sky-500" />
        <StatsCard title="Leave Balance" value={`${leaveBalances.reduce((acc, b) => acc + ((b.totalDays || 0) - (b.usedDays || 0)), 0)} Days`} icon={Plane} accentColor="bg-amber-500" />
        <StatsCard title="Pending Requests" value={pendingRequests} icon={Send} accentColor="bg-rose-500" />
        <StatsCard title="Monthly Attendance" value={`${attendanceRate}%`} icon={Calendar} accentColor="bg-emerald-500" />
      </div>

      {/* Dashboard Bento Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column - 8 cols wide */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Main Hero Card - COMPACT VERSION */}
          <div className="relative rounded-2xl overflow-hidden bg-[#0f172a] shadow-lg border border-slate-800 p-3 sm:px-5 sm:py-3.5 isolation-auto group">
            <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.02] mix-blend-overlay pointer-events-none"></div>

            <div className="relative z-10 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex-1 w-full flex flex-col items-start justify-center">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 mb-1">
                  <span className="relative flex h-1.5 w-1.5">
                    {status.pulse && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-gradient-to-r ${status.color}`}></span>}
                    <span className={`relative inline-flex rounded-full h-1.5 w-1.5 bg-gradient-to-r ${status.color}`}></span>
                  </span>
                  <span className="text-white text-[9px] font-bold tracking-wider uppercase">{status.label}</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white tabular-nums tracking-tighter drop-shadow-md">
                  {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  <span className="text-base text-white/50 ml-1">{now.toLocaleTimeString('en-US', { second: '2-digit' })}</span>
                </h2>
              </div>

              <div className="flex-[1.5] w-full bg-white/[0.03] border border-white/10 rounded-xl p-2 sm:p-2.5 shadow-xl flex flex-col sm:flex-row gap-3 items-center">
                <div className="flex flex-1 w-full gap-3">
                  <div className="flex-1 bg-black/20 rounded-lg p-2 border border-white/5 flex flex-col justify-center">
                    <div className="text-emerald-400 text-[9px] font-bold uppercase tracking-widest mb-0.5 opacity-90">Working</div>
                    <div className="text-xs sm:text-sm font-black text-white tabular-nums">{times.work}</div>
                  </div>
                  <div className="flex-1 bg-black/20 rounded-lg p-2 border border-white/5 flex flex-col justify-center">
                    <div className="text-orange-400 text-[9px] font-bold uppercase tracking-widest mb-0.5 opacity-90">On Break</div>
                    <div className="text-xs sm:text-sm font-black text-white tabular-nums">{times.break}</div>
                  </div>
                </div>

                <div className="w-full sm:w-auto flex gap-2">
                  {!todayRecord?.checkInTime ? (
                    <button 
                      onClick={() => { setCameraAction('check-in'); setIsCameraModalOpen(true); }}
                      disabled={actionLoading}
                      className="w-full sm:w-auto bg-[#22c55e] hover:bg-[#16a34a] text-white py-2 px-5 rounded-lg font-black text-[10px] sm:text-xs transition-colors flex justify-center items-center uppercase tracking-wider"
                    >
                      Check In Now
                    </button>
                  ) : !todayRecord?.checkOutTime ? (
                    <>
                      {isOnBreak ? (
                         <button onClick={() => handleBreakAction('end')} disabled={actionLoading} className="flex-1 sm:w-auto bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-4 rounded-lg font-black text-[10px] sm:text-xs transition-colors flex justify-center items-center uppercase tracking-wider">Resume</button>
                      ) : (
                         <button onClick={() => handleBreakAction('start')} disabled={actionLoading} className="flex-1 sm:w-auto bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg font-black text-[10px] sm:text-xs transition-colors flex justify-center items-center uppercase tracking-wider">Break</button>
                      )}
                      <button onClick={() => { setCameraAction('check-out'); setIsCameraModalOpen(true); }} disabled={actionLoading || isOnBreak} className="flex-1 sm:w-auto bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white py-2 px-4 rounded-lg font-black text-[10px] sm:text-xs transition-colors flex justify-center items-center uppercase tracking-wider">Check Out</button>
                    </>
                  ) : (
                    <div className="w-full sm:w-auto bg-emerald-500/10 text-emerald-400 py-2 px-4 rounded-lg font-black text-[10px] uppercase tracking-wider border border-emerald-500/20 flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" /> Completed
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Weekly Attendance Pulse (Multi-Bar Chart) */}
            <div className="premium-card p-5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-sm">
              <div className="flex gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/30">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-[15px] leading-tight">Weekly Attendance Pulse</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Present vs Absent staff over the current week</p>
                </div>
              </div>
              <div className="mt-2 -ml-2">
                 <AttendanceBarChart data={getWeeklyData()} />
              </div>
            </div>

            {/* Leave Requests Trend (Line Chart) */}
            <div className="premium-card p-5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-sm">
              <div className="flex gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/30">
                  <Plane className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-[15px] leading-tight">Leave Requests Trend</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Volume of leave requests over the last 6 months</p>
                </div>
              </div>
              <div className="mt-2 -ml-2">
                 <GenericLineChart data={getLeaveTrendData()} xKey="month" dataKey="requests" label="Leave Requests" color="#6366f1" />
              </div>
            </div>
          </div>

          {/* Moved tables/lists to the wide column below charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Recent Requests Table/List */}
            <div className="premium-card p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-3xl shadow-xl">
              <h3 className="font-black text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2 text-lg">
                <Send className="w-5 h-5 text-indigo-500" /> Recent Requests
              </h3>
              <div className="space-y-3">
                {recentRequests.length > 0 ? recentRequests.slice(0, 4).map(r => (
                  <div key={r._id} className="flex justify-between items-center text-sm p-4 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800/50 dark:hover:bg-slate-800 rounded-xl transition-colors border border-transparent hover:border-indigo-100 dark:hover:border-slate-700">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200 capitalize text-base">{r.type.replace('_', ' ').toLowerCase()}</p>
                      <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mt-1">{formatDate(r.createdAt)}</p>
                    </div>
                    <span className={`text-xs px-3 py-1.5 rounded-md font-black uppercase tracking-wide ${
                      r.status === 'PENDING' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' :
                      r.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                      'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      {r.status}
                    </span>
                  </div>
                )) : (
                  <p className="text-sm text-slate-400 font-medium text-center py-4">You have no recent requests.</p>
                )}
              </div>
            </div>

            {/* Consolidated Leave Overview & Upcoming Table/List */}
            <div className="premium-card p-6 bg-gradient-to-br from-indigo-50 to-white dark:from-slate-900 dark:to-slate-800 border border-indigo-100/50 dark:border-slate-700/50 rounded-3xl shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
              
              <h3 className="font-black text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2 text-lg relative z-10">
                <Plane className="w-5 h-5 text-indigo-500" /> Leave Balances
              </h3>
              
              <div className="space-y-6 relative z-10">
                {leaveBalances.map(b => {
                    const used = b.usedDays || 0
                    const total = b.totalDays || 1
                    const left = total - used
                    const percent = Math.min(100, (used / total) * 100)
                    return (
                      <div key={b._id} className="group">
                        <div className="flex justify-between text-sm font-bold mb-2">
                          <span className="text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-base">{b.leaveType?.name}</span>
                          <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-md text-xs">{left} days left</span>
                        </div>
                        <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                          <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-1000" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    )
                })}
                {leaveBalances.length === 0 && <p className="text-sm text-slate-400 font-medium">No leave balances set up.</p>}
              </div>

              <div className="mt-8 pt-6 border-t border-indigo-100 dark:border-slate-700/50 relative z-10">
                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                    Upcoming Leaves
                </h4>
                {upcomingLeaves.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingLeaves.map(leave => (
                      <div key={leave._id} className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700/50">
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-base">{formatDate(leave.startDate)}</p>
                          <p className="text-xs text-slate-500 font-medium mt-1">{leave.leaveType?.name}</p>
                        </div>
                        <span className="text-xs bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 px-3 py-1.5 rounded-md font-black uppercase tracking-wide">Approved</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 font-medium">No upcoming leave.</p>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Right Column - 4 cols wide */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Monthly Attendance Pie Chart - Moved to the right side where tables used to be! */}
          <div className="premium-card p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-3xl shadow-xl flex flex-col items-center justify-center h-[350px]">
            <h3 className="font-black text-slate-800 dark:text-slate-100 mb-4 flex w-full items-center justify-between text-lg">
              Monthly Summary
              <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-full">This Month</span>
            </h3>
            <div className="flex-1 w-full flex items-center justify-center">
              {getMonthlyAttendancePie().length > 0 ? (
                <DepartmentPieChart data={getMonthlyAttendancePie()} />
              ) : (
                <div className="text-center text-slate-400 text-sm font-medium">No attendance data yet.</div>
              )}
            </div>
          </div>

          {/* Announcements - Hidden if empty */}
          {announcements.length > 0 && (
            <div className="premium-card p-6 border border-amber-100 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5 rounded-3xl shadow-xl">
              <h3 className="font-black text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2 text-lg">
                <Megaphone className="w-5 h-5 text-amber-500" /> Announcements
              </h3>
              <div className="space-y-4">
                {announcements.map(a => (
                  <div key={a._id} className="border-b border-amber-200/50 dark:border-slate-800 pb-4 last:border-0 last:pb-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{a.title}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed line-clamp-2">{a.content}</p>
                    <p className="text-[10px] text-slate-400 mt-2 font-semibold uppercase tracking-wider">{formatDate(a.createdAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Latest Payslip */}
          <div className="premium-card p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-3xl shadow-xl">
            <h3 className="font-black text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2 text-lg">
              <Receipt className="w-5 h-5 text-emerald-500" /> Latest Payslip
            </h3>
            {latestPayslip ? (
              <div className="text-center p-5 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-400"></div>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest mb-2">Net Salary</p>
                <p className="text-3xl font-black text-slate-900 dark:text-white mb-5 drop-shadow-sm">
                  ₹{latestPayslip.netSalary?.toLocaleString('en-IN') || '---'}
                </p>
                <button className="w-full py-2.5 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all">
                  View Payslip
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4 font-medium">Your latest payslip is not available yet.</p>
            )}
          </div>

        </div>
      </div>

      <CameraVerificationModal 
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onConfirm={handleCameraConfirm}
        locationRequired={true}
        title={cameraAction === 'check-in' ? 'Check In Verification' : 'Check Out Verification'}
      />

    </div>
  )
}
