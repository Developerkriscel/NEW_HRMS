'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { DataTable } from '@/components/tables/DataTable'
import { Badge } from '@/components/common/Badge'
import { attendanceApi } from '@/services/attendanceApi'
import { formatDate } from '@/lib/utils'
import { Clock, CheckCircle, Coffee, Calendar, Camera, ChevronRight, Activity } from 'lucide-react'
import { CameraVerificationModal } from '@/components/attendance/CameraVerificationModal'
import { AttendanceDetailsDrawer } from '@/components/attendance/AttendanceDetailsDrawer'
import { AttendanceCalendarView } from '@/components/attendance/AttendanceCalendarView'

function toLocalDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getRecordDateValue(record) {
  return new Date(record?.date || record?.checkInTime || record?.createdAt || 0).getTime()
}

export function EmployeeAttendanceWorkspace({ headerAction }) {
  const [viewMode, setViewMode] = useState('table') // 'table' | 'calendar'
  const [records, setRecords] = useState([])
  const [monthRecords, setMonthRecords] = useState([])
  const [todayRecord, setTodayRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [now, setNow] = useState(new Date())
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false)
  const [cameraAction, setCameraAction] = useState(null)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [dateRange, setDateRange] = useState('Today')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const fetchData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const params = {}
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      if (dateRange === 'Today') {
        params.from = toLocalDateKey(today)
        params.to = toLocalDateKey(today)
      } else if (dateRange === 'This Week') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
        params.from = toLocalDateKey(firstDay)
        params.to = toLocalDateKey(today)
      } else if (dateRange === 'Last Week') {
        const firstDay = new Date(new Date().setDate(today.getDate() - today.getDay() - 7))
        const lastDay = new Date(new Date().setDate(today.getDate() - today.getDay() - 1))
        params.from = toLocalDateKey(firstDay)
        params.to = toLocalDateKey(lastDay)
      } else if (dateRange === 'This Month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        params.from = toLocalDateKey(firstDay)
        params.to = toLocalDateKey(today)
      } else if (dateRange === 'Last Month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastDay = new Date(now.getFullYear(), now.getMonth(), 0)
        params.from = toLocalDateKey(firstDay)
        params.to = toLocalDateKey(lastDay)
      } else if (dateRange === 'All History') {
        params.from = '2000-01-01'
        params.to = toLocalDateKey(today)
      } else if (dateRange === 'Custom') {
        if (customStart) params.from = customStart
        if (customEnd) params.to = customEnd
      }

      const res = await attendanceApi.getEmployeePage(params)
      const data = res.data.data || {}
      setTodayRecord(data.todayRecord || null)
      setRecords(data.records || [])
      setMonthRecords(data.monthRecords || [])
    } catch (err) {
      console.error(err)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [dateRange, customStart, customEnd])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const isOnBreak = todayRecord?.breaks?.some(b => !b.end)

  const calculateTimes = () => {
    if (!todayRecord?.checkInTime) return { work: '00h 00m 00s', break: '00h 00m 00s' }
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
    return { work: formatMs(netWorkMs), break: formatMs(totalBreakMs) }
  }

  const times = calculateTimes()

  const handleCameraConfirm = async (data) => {
    setActionLoading(true)
    try {
      const payload = { photo: data.photo, location: data.location, source: 'WEB' }
      if (cameraAction === 'check-in') await attendanceApi.checkIn(payload)
      else if (cameraAction === 'check-out') await attendanceApi.checkOut(payload)
      await fetchData({ silent: true })
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      setActionLoading(false)
    }
  }

  const handleBreakAction = async (action) => {
    setActionLoading(true)
    try {
      if (action === 'start') await attendanceApi.startBreak()
      else await attendanceApi.endBreak()
      await fetchData({ silent: true })
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusDisplay = () => {
    if (!todayRecord?.checkInTime) return { label: 'Not Checked In', color: 'from-slate-500 to-slate-400', ring: 'ring-slate-500/30' }
    if (todayRecord?.checkOutTime) return { label: 'Checked Out', color: 'from-slate-600 to-slate-500', ring: 'ring-slate-500/30' }
    if (isOnBreak) return { label: 'On Break', color: 'from-orange-500 to-amber-500', ring: 'ring-orange-500/30', glow: 'shadow-orange-500/40' }
    return { label: 'Working', color: 'from-emerald-500 to-teal-400', ring: 'ring-emerald-500/30', glow: 'shadow-emerald-500/40', pulse: true }
  }

  const status = getStatusDisplay()

  const columns = useMemo(() => [
    { header: 'Date', accessor: 'date', render: (v, record) => <span className="font-medium">{formatDate(record.checkInTime || v)}</span> },
    { header: 'Check In', accessor: 'checkInTime', render: (v) => v ? new Date(v).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—' },
    { header: 'Check Out', accessor: 'checkOutTime', render: (v) => v ? new Date(v).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—' },
    { header: 'Working Hours', accessor: 'workingMinutes', render: (v) => v ? <span className="font-semibold text-slate-700 dark:text-slate-300">{`${Math.floor(v/60)}h ${v%60}m`}</span> : '—' },
    { header: 'Status', accessor: 'status', sortable: false, render: (v) => <Badge variant={v === 'PRESENT' ? 'success' : (v === 'ABSENT' || v === 'NOT_MARKED') ? 'danger' : 'info'}>{v === 'NOT_MARKED' ? 'ABSENT' : v?.replace('_', ' ')}</Badge> },
    {
      header: '', key: 'details', sortable: false,
      render: (_, record) => (
        <button
          onClick={() => { setSelectedRecord(record); setIsDrawerOpen(true) }}
          className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium flex items-center justify-end w-full group"
        >
          Details <ChevronRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
        </button>
      )
    }
  ], [])

  const counts = useMemo(() => {
    const list = monthRecords.length > 0 ? monthRecords : records
    return {
      present: list.filter(r => ['PRESENT', 'HALF_DAY', 'WFH'].includes(r.status)).length,
      absent: list.filter(r => r.status === 'ABSENT').length,
      leave: list.filter(r => r.status === 'ON_LEAVE').length,
    }
  }, [monthRecords, records])

  const stats = useMemo(() => {
    const dataSource = monthRecords.length > 0 ? monthRecords : records
    const totalMinutes = dataSource.reduce((acc, r) => acc + (r.workingMinutes || 0), 0)
    return [
      { key: 'PRESENT', label: 'Present Days', value: counts.present, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
      { key: 'ABSENT', label: 'Absent Days', value: counts.absent, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10' },
      { key: 'ON_LEAVE', label: 'Leave Taken', value: counts.leave, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10' },
      { key: null, label: 'Total Hours', value: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
    ]
  }, [monthRecords, records, counts])

  const displayedRecords = useMemo(() => {
    const sortByDate = (items) => [...items].sort((a, b) => getRecordDateValue(a) - getRecordDateValue(b))

    if (statusFilter === 'ALL') {
      return sortByDate(records)
    }

    let filtered = records.filter(r => {
      if (statusFilter === 'PRESENT') return ['PRESENT', 'HALF_DAY', 'WFH'].includes(r.status)
      return r.status === statusFilter
    })

    // If filtering by a status (e.g. ABSENT) while in 'Today' or narrow range where current range has 0 matches,
    // fallback to monthRecords so the user immediately sees the requested records!
    if (filtered.length === 0 && monthRecords.length > 0) {
      filtered = monthRecords.filter(r => {
        if (statusFilter === 'PRESENT') return ['PRESENT', 'HALF_DAY', 'WFH'].includes(r.status)
        return r.status === statusFilter
      })
    }

    return sortByDate(filtered)
  }, [records, monthRecords, statusFilter])

  return (
    <div className="animate-fade-in space-y-4 w-full pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400 dark:from-indigo-400 dark:to-indigo-300 hover:scale-[1.02] transition-transform duration-300 relative w-fit pb-2 after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-1/3 after:h-1 after:bg-gradient-to-r after:from-indigo-500 after:to-transparent after:rounded-full">Attendance Dashboard</h1>
            {headerAction && <div>{headerAction}</div>}
          </div>
        </div>
      </div>

      <div className="relative rounded-2xl overflow-hidden bg-slate-950 bg-gradient-to-br from-slate-900 via-indigo-950/60 to-slate-900 shadow-xl shadow-indigo-900/20 border border-indigo-500/30 p-2 sm:px-4 sm:py-2 isolation-auto">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-indigo-500/40 blur-3xl pointer-events-none animate-pulse"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 rounded-full bg-emerald-500/30 blur-3xl pointer-events-none"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-blue-500/20 blur-3xl pointer-events-none"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
          <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-30 brightness-100 contrast-150 mix-blend-overlay pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row gap-3 lg:gap-4 items-center justify-between">
          <div className="flex-1 w-full flex flex-col items-start">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-1.5">
              <span className="relative flex h-1.5 w-1.5">
                {status.pulse && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-gradient-to-r ${status.color}`}></span>}
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 bg-gradient-to-r ${status.color}`}></span>
              </span>
              <span className="text-white text-[9px] font-semibold tracking-wide uppercase">{status.label}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60 tabular-nums tracking-tighter mb-0.5">
              {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              <span className="text-sm text-white/40 ml-1.5">{now.toLocaleTimeString('en-US', { second: '2-digit' })}</span>
            </h2>
            <p className="text-slate-400 text-[10px] sm:text-[11px] font-medium tracking-wide">
              {now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex-[1.2] w-full max-w-lg bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-1.5 sm:p-2 shadow-lg relative">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="bg-white/5 rounded-lg p-1.5 sm:p-2 border border-white/5">
                <div className="flex items-center gap-1.5 text-emerald-400 mb-0.5">
                  <Activity className="w-3 h-3" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Working</span>
                </div>
                <div className="text-sm font-bold text-white tabular-nums tracking-tight">{times.work}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-1.5 sm:p-2 border border-white/5">
                <div className="flex items-center gap-1.5 text-orange-400 mb-0.5">
                  <Coffee className="w-3 h-3" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">On Break</span>
                </div>
                <div className="text-sm font-bold text-white tabular-nums tracking-tight">{times.break}</div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {!todayRecord?.checkInTime ? (
                <button
                  onClick={() => { setCameraAction('check-in'); setIsCameraModalOpen(true) }}
                  disabled={actionLoading}
                  className="w-full relative overflow-hidden group bg-emerald-500 hover:bg-emerald-600 text-white py-1.5 px-3 rounded-lg font-bold text-[13px] transition-all duration-300 shadow-[0_0_30px_-10px_rgba(16,185,129,0.5)] flex justify-center items-center gap-2"
                >
                  <Camera className="w-3.5 h-3.5" /> Check In Now
                </button>
              ) : !todayRecord?.checkOutTime ? (
                <>
                  {isOnBreak ? (
                    <button onClick={() => handleBreakAction('end')} disabled={actionLoading} className="flex-1 bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white border border-indigo-400/50 py-1.5 px-3 rounded-lg font-bold text-[13px] transition-all shadow-[0_0_20px_-10px_rgba(99,102,241,0.5)] flex justify-center items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" /> Resume
                    </button>
                  ) : (
                    <button onClick={() => handleBreakAction('start')} disabled={actionLoading} className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/10 py-1.5 px-3 rounded-lg font-bold text-[13px] transition-all flex justify-center items-center gap-1.5">
                      <Coffee className="w-3.5 h-3.5" /> Break
                    </button>
                  )}
                  <button
                    onClick={() => { setCameraAction('check-out'); setIsCameraModalOpen(true) }}
                    disabled={actionLoading || isOnBreak}
                    className="flex-1 bg-gradient-to-b from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 disabled:opacity-50 disabled:grayscale text-white border border-rose-400/50 py-1.5 px-3 rounded-lg font-bold text-[13px] transition-all shadow-[0_0_20px_-10px_rgba(244,63,94,0.5)] flex justify-center items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" /> Check Out
                  </button>
                </>
              ) : (
                <div className="w-full bg-white/5 text-white/40 py-1.5 rounded-lg font-bold text-center text-[13px] border border-white/10 flex items-center justify-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> Shift Completed
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <CameraVerificationModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onConfirm={handleCameraConfirm}
        locationRequired={true}
        title={cameraAction === 'check-in' ? 'Check In Verification' : 'Check Out Verification'}
        variant="inline"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => {
          const isActive = stat.key && statusFilter === stat.key
          return (
            <div
              key={stat.label}
              onClick={() => {
                if (stat.key) {
                  setStatusFilter(prev => (prev === stat.key ? 'ALL' : stat.key))
                }
              }}
              className={`group relative overflow-hidden bg-white dark:bg-slate-900 border ${
                isActive ? 'ring-2 ring-indigo-500 border-indigo-500 shadow-md scale-[1.02]' : 'border-slate-200 dark:border-slate-800'
              } p-3 sm:p-4 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ${stat.key ? 'cursor-pointer' : ''}`}
            >
              <div className={`absolute top-0 right-0 w-16 h-16 rounded-full ${stat.bg} -mr-4 -mt-4 transition-transform group-hover:scale-150 duration-500 ease-out`}></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{stat.label}</p>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium lowercase">this month</p>
                  </div>
                  {stat.key && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md transition-colors ${
                      isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                    }`}>
                      {isActive ? 'Filtered' : 'Click to View'}
                    </span>
                  )}
                </div>
                <h3 className={`text-xl font-bold mt-1 ${stat.color}`}>{stat.value}</h3>
              </div>
            </div>
          )
        })}
      </div>

      {/* Attendance Workspace View: Calendar View vs Table View */}
      {viewMode === 'calendar' && (
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg text-indigo-600 dark:text-indigo-400">
              <Calendar className="w-4 h-4" />
            </div>
            Attendance Calendar
          </h2>
          <button
            onClick={() => setViewMode('table')}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs sm:text-sm font-semibold transition-all shadow-2xs hover:scale-102"
          >
            <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            Hide Calendar
          </button>
        </div>
        <AttendanceCalendarView
          onSelectRecord={(rec) => {
            setSelectedRecord(rec)
            setIsDrawerOpen(true)
          }}
        />
      </div>
      )}

      {viewMode === 'table' && (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-slate-50/50 dark:bg-slate-800/20">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg text-indigo-600 dark:text-indigo-400">
              <Calendar className="w-4 h-4" />
            </div>
            Attendance History
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setViewMode('calendar')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs sm:text-sm font-semibold transition-all shadow-2xs hover:scale-102"
            >
              <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              Show Calendar
            </button>

            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 min-w-[140px]"
              >
                <option value="ALL">All Statuses</option>
                <option value="PRESENT">Present / Half Day ({counts.present})</option>
                <option value="ABSENT">Absent ({counts.absent})</option>
                <option value="ON_LEAVE">On Leave ({counts.leave})</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Date Range</label>
              <select 
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 min-w-[140px]"
              >
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="Last Week">Last Week</option>
                <option value="This Month">This Month</option>
                <option value="Last Month">Last Month</option>
                <option value="All History">All History</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
            
            {dateRange === 'Custom' && (
              <>
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Start Date</label>
                  <input 
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">End Date</label>
                  <input 
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {statusFilter !== 'ALL' && (
          <div className="px-5 py-2.5 bg-indigo-50/80 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-300">
            <span className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${statusFilter === 'ABSENT' ? 'bg-rose-500 animate-pulse' : statusFilter === 'PRESENT' ? 'bg-emerald-500' : 'bg-purple-500'}`}></span>
              Showing: <strong>{statusFilter === 'PRESENT' ? 'Present / Half Day' : statusFilter === 'ABSENT' ? 'Absent Days' : statusFilter}</strong> ({displayedRecords.length} records)
            </span>
            <button onClick={() => { setStatusFilter('ALL'); setDateRange('Today'); }} className="font-bold underline hover:text-indigo-950 dark:hover:text-white">
              Clear Filter (Back to Today)
            </button>
          </div>
        )}


        <div className="p-1">
          <DataTable 
            columns={columns} 
            data={displayedRecords} 
            isLoading={loading} 
            searchable={false} 
            disableSorting={true}
            emptyMessage={statusFilter !== 'ALL' ? `No ${statusFilter.toLowerCase().replace('_', ' ')} records found for this period.` : "No attendance records found for this period."} 
            pageSize={1000} 
          />
        </div>
      </div>
      )}

      <AttendanceDetailsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        record={selectedRecord}
      />
    </div>
  )
}
