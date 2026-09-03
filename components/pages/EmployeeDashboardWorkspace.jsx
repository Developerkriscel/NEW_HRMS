'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { 
  Clock, CheckCircle, Coffee, Calendar, MapPin, 
  Activity, FileText, Send, Plane, Megaphone, Receipt, ChevronRight, Briefcase
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
import { AttendanceDetailsDrawer } from '@/components/attendance/AttendanceDetailsDrawer'
import { GenericBarChart, DepartmentPieChart } from '@/components/charts/DashboardCharts'
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
  const [holidays, setHolidays] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [latestPayslip, setLatestPayslip] = useState(null)

  // Real-time timer state
  const [now, setNow] = useState(new Date())
  
  // UI states
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false)
  const [cameraAction, setCameraAction] = useState(null)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

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
        holidayRes,
        announcementRes
      ] = await Promise.all([
        attendanceApi.getTodayStatus().catch(() => ({ data: { data: null } })),
        attendanceApi.getMyAttendance().catch(() => ({ data: { data: [] } })),
        leaveApi.getBalance().catch(() => ({ data: { data: [] } })),
        leaveApi.getMyLeaves({ status: 'APPROVED', size: 5 }).catch(() => ({ data: { data: { content: [] } } })),
        teamRequestApi.list({ size: 5 }).catch(() => ({ data: { data: { content: [], totalElements: 0 } } })),
        leaveApi.getHolidays({ month: currentMonth, year: currentYear }).catch(() => ({ data: { data: [] } })),
        announcementApi.list({ size: 3 }).catch(() => ({ data: { data: { content: [] } } }))
      ])

      setTodayRecord(todayRes.data.data)
      setAttendanceHistory(historyRes.data.data || [])
      setLeaveBalances(balRes.data.data || [])
      setUpcomingLeaves(leavesRes.data.data.content || [])
      setRecentRequests(requestsRes.data.data.content || [])
      setPendingRequests(requestsRes.data.data.content?.filter(r => r.status === 'PENDING').length || 0)
      setHolidays(holidayRes.data.data || [])
      setAnnouncements(announcementRes.data.data.content || [])

      // Try fetching payslip for current/last month (silent fail if none/unauthorized)
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
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const data = []
    
    // Generate the last 7 days ending today
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dayName = days[d.getDay()]
      const dateString = d.toISOString().split('T')[0]
      
      const record = attendanceHistory.find(r => r.date && r.date.split('T')[0] === dateString)
      
      data.push({
        day: dayName,
        hours: record ? Number((record.workingMinutes / 60).toFixed(1)) : 0,
        expected: 9
      })
    }
    return data
  }

  const getMonthlyAttendancePie = () => {
    const present = attendanceHistory.filter(r => r.status === 'PRESENT').length
    const absent = attendanceHistory.filter(r => r.status === 'ABSENT').length
    const leave = attendanceHistory.filter(r => r.status === 'ON_LEAVE').length
    return [
      { name: 'Present', value: present },
      { name: 'Absent', value: absent },
      { name: 'Leave', value: leave }
    ].filter(x => x.value > 0)
  }

  const attendanceRate = attendanceHistory.length 
    ? Math.round((attendanceHistory.filter(r => r.status === 'PRESENT').length / attendanceHistory.length) * 100) 
    : 0

  if (loading) return <PageLoader />

  return (
    <div className="animate-fade-in space-y-4 sm:space-y-5 w-full pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              {greeting()}, {user?.name?.split(' ')[0]} 👋
            </h1>
            {headerAction && <div>{headerAction}</div>}
          </div>
          <div className="mt-1.5">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard 
          title="Today's Status" 
          value={todayRecord?.checkInTime ? (todayRecord?.checkOutTime ? 'Completed' : isOnBreak ? 'On Break' : 'Working') : 'Not In'} 
          icon={Activity} 
          accentColor="bg-indigo-500"
        />
        <StatsCard 
          title="Working Hours" 
          value={`${Math.floor(times.msWork / 3600000)}h ${Math.floor((times.msWork % 3600000) / 60000)}m`} 
          icon={Clock} 
          accentColor="bg-sky-500"
        />
        <StatsCard 
          title="Leave Balance" 
          value={`${leaveBalances.reduce((acc, b) => acc + ((b.totalDays || 0) - (b.usedDays || 0)), 0)} Days`} 
          icon={Plane} 
          accentColor="bg-amber-500"
        />
        <StatsCard 
          title="Pending Requests" 
          value={pendingRequests} 
          icon={Send} 
          accentColor="bg-rose-500"
        />
        <StatsCard 
          title="Monthly Attendance" 
          value={`${attendanceRate}%`} 
          icon={Calendar} 
          accentColor="bg-emerald-500"
        />
      </div>

      {/* Dashboard Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Hero & Charts) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Hero Card */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 shadow-lg border border-slate-800 p-3 sm:px-5 sm:py-3.5 isolation-auto">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none animate-pulse"></div>
            <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none"></div>

            <div className="relative z-10 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex-1 w-full flex flex-col items-start">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-1.5">
                  <span className="relative flex h-2 w-2">
                    {status.pulse && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-gradient-to-r ${status.color}`}></span>}
                    <span className={`relative inline-flex rounded-full h-2 w-2 bg-gradient-to-r ${status.color}`}></span>
                  </span>
                  <span className="text-white text-[9px] font-semibold tracking-wide uppercase">{status.label}</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60 tabular-nums tracking-tighter mb-0.5">
                  {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  <span className="text-sm text-white/40 ml-1">{now.toLocaleTimeString('en-US', { second: '2-digit' })}</span>
                </h2>
                
                {todayRecord?.checkInTime && (
                  <p className="text-slate-400 text-[9px] sm:text-[10px] mt-0.5">
                    Checked in at {new Date(todayRecord.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                )}
              </div>

              <div className="flex-[1.2] w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-2 sm:p-2.5 shadow-2xl">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="bg-white/5 rounded-lg px-2 py-1.5 border border-white/5 flex flex-col justify-center">
                    <div className="text-emerald-400 text-[9px] font-bold uppercase tracking-wider mb-0.5">Working</div>
                    <div className="text-xs sm:text-sm font-bold text-white tabular-nums">{times.work}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg px-2 py-1.5 border border-white/5 flex flex-col justify-center">
                    <div className="text-orange-400 text-[9px] font-bold uppercase tracking-wider mb-0.5">On Break</div>
                    <div className="text-xs sm:text-sm font-bold text-white tabular-nums">{times.break}</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  {!todayRecord?.checkInTime ? (
                    <button 
                      onClick={() => { setCameraAction('check-in'); setIsCameraModalOpen(true); }}
                      disabled={actionLoading}
                      className="w-full relative overflow-hidden group bg-emerald-500 hover:bg-emerald-600 text-white py-1.5 px-3 rounded-xl font-bold text-xs transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)] flex justify-center items-center gap-2"
                    >
                      Check In Now
                    </button>
                  ) : !todayRecord?.checkOutTime ? (
                    <>
                      {isOnBreak ? (
                        <button onClick={() => handleBreakAction('end')} disabled={actionLoading} className="flex-1 bg-gradient-to-b from-indigo-500 to-indigo-600 text-white py-1.5 px-3 rounded-xl font-bold text-xs shadow-[0_0_20px_-5px_rgba(99,102,241,0.5)] flex justify-center items-center gap-2">Resume</button>
                      ) : (
                        <button onClick={() => handleBreakAction('start')} disabled={actionLoading} className="flex-1 bg-white/10 hover:bg-white/20 text-white py-1.5 px-3 rounded-xl font-bold text-xs flex justify-center items-center gap-2">Break</button>
                      )}
                      <button onClick={() => { setCameraAction('check-out'); setIsCameraModalOpen(true); }} disabled={actionLoading || isOnBreak} className="flex-1 bg-gradient-to-b from-rose-500 to-rose-600 disabled:opacity-50 text-white py-1.5 px-3 rounded-xl font-bold text-xs shadow-[0_0_20px_-5px_rgba(244,63,94,0.5)] flex justify-center items-center gap-2">Check Out</button>
                    </>
                  ) : (
                    <div className="w-full bg-white/5 text-white/40 py-1.5 rounded-xl font-bold text-center text-xs border border-white/10 flex items-center justify-center gap-2">
                      <CheckCircle className="w-3 h-3" /> Shift Completed
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Weekly Working Hours Chart */}
            <div className="premium-card p-6">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center justify-between">
                Weekly Working Hours
                <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-md">Last 7 Days</span>
              </h3>
              <GenericBarChart data={getWeeklyData()} xKey="day" dataKey="hours" label="Hours Worked" />
            </div>

            {/* Monthly Attendance Chart */}
            <div className="premium-card p-6">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center justify-between">
                Monthly Attendance
                <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-md">This Month</span>
              </h3>
              <DepartmentPieChart data={getMonthlyAttendancePie()} />
            </div>
          </div>

          {/* Today's Activity Timeline */}
          <div className="premium-card p-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6">Today's Activity</h3>
            {todayRecord?.checkInTime ? (
              <div className="relative border-l border-slate-200 dark:border-slate-800 ml-3 space-y-6 pb-2">
                <div className="relative pl-6">
                  <div className="absolute w-3 h-3 bg-emerald-500 rounded-full -left-[6.5px] top-1.5 border-2 border-white dark:border-slate-900" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Checked In</p>
                  <p className="text-xs text-slate-500 mt-0.5">{new Date(todayRecord.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
                
                {todayRecord?.breaks?.map((b, i) => (
                  <div key={i} className="relative pl-6">
                    <div className="absolute w-3 h-3 bg-orange-400 rounded-full -left-[6.5px] top-1.5 border-2 border-white dark:border-slate-900" />
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Break</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(b.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                      {b.end ? ` - ${new Date(b.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : ' (Ongoing)'}
                    </p>
                  </div>
                ))}
                
                {todayRecord?.checkOutTime && (
                  <div className="relative pl-6">
                    <div className="absolute w-3 h-3 bg-rose-500 rounded-full -left-[6.5px] top-1.5 border-2 border-white dark:border-slate-900" />
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Checked Out</p>
                    <p className="text-xs text-slate-500 mt-0.5">{new Date(todayRecord.checkOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-slate-400">No attendance activity recorded today.</div>
            )}
          </div>
        </div>

        {/* Right Column (Info Cards) */}
        <div className="space-y-6">
          
          {/* Leave Overview */}
          <div className="premium-card p-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Plane className="w-4 h-4 text-slate-400" /> Leave Overview
            </h3>
            <div className="space-y-4">
              {leaveBalances.map(b => (
                <div key={b._id}>
                  <div className="flex justify-between text-xs font-medium mb-1.5">
                    <span className="text-slate-700 dark:text-slate-300">{b.leaveType?.name}</span>
                    <span className="text-slate-500">{(b.totalDays || 0) - (b.usedDays || 0)} left</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, (b.usedDays / (b.totalDays || 1)) * 100)}%` }} />
                  </div>
                </div>
              ))}
              {leaveBalances.length === 0 && <p className="text-xs text-slate-400">No leave balances set up.</p>}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Upcoming Leaves</h4>
              {upcomingLeaves.length > 0 ? (
                <div className="space-y-3">
                  {upcomingLeaves.map(leave => (
                    <div key={leave._id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-slate-800 dark:text-slate-200">{formatDate(leave.startDate)}</p>
                        <p className="text-xs text-slate-500">{leave.leaveType?.name}</p>
                      </div>
                      <span className="text-xs bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 px-2 py-1 rounded-md font-medium">Approved</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No upcoming leave.</p>
              )}
            </div>
          </div>

          {/* Announcements */}
          <div className="premium-card p-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-slate-400" /> Announcements
            </h3>
            <div className="space-y-4">
              {announcements.length > 0 ? announcements.map(a => (
                <div key={a._id} className="border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0 last:pb-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{a.title}</p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{a.content}</p>
                  <p className="text-[10px] text-slate-400 mt-2">{formatDate(a.createdAt)}</p>
                </div>
              )) : (
                <p className="text-xs text-slate-400 text-center py-4">No new company announcements.</p>
              )}
            </div>
          </div>

          {/* Recent Requests */}
          <div className="premium-card p-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Send className="w-4 h-4 text-slate-400" /> Recent Requests
            </h3>
            <div className="space-y-3">
              {recentRequests.length > 0 ? recentRequests.slice(0, 3).map(r => (
                <div key={r._id} className="flex justify-between items-center text-sm p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200 capitalize">{r.type.replace('_', ' ').toLowerCase()}</p>
                    <p className="text-[10px] text-slate-500">{formatDate(r.createdAt)}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-md font-semibold ${
                    r.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                    r.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {r.status}
                  </span>
                </div>
              )) : (
                <p className="text-xs text-slate-400 text-center py-2">You have no recent requests.</p>
              )}
            </div>
          </div>

          {/* Latest Payslip */}
          <div className="premium-card p-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-slate-400" /> Latest Payslip
            </h3>
            {latestPayslip ? (
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Net Salary</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mb-4">
                  ₹{latestPayslip.netSalary?.toLocaleString('en-IN') || '---'}
                </p>
                <button className="w-full py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                  View Payslip
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">Your latest payslip is not available yet.</p>
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
