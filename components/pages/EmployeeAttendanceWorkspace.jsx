'use client'

import { useEffect, useState, useCallback } from 'react'
import { DataTable } from '@/components/tables/DataTable'
import { Badge } from '@/components/common/Badge'
import { attendanceApi } from '@/services/attendanceApi'
import { formatDate } from '@/lib/utils'
import { Clock, CheckCircle, Coffee, Calendar, Camera, ChevronRight, Activity } from 'lucide-react'
import { CameraVerificationModal } from '@/components/attendance/CameraVerificationModal'
import { AttendanceDetailsDrawer } from '@/components/attendance/AttendanceDetailsDrawer'

export function EmployeeAttendanceWorkspace() {
  const [records, setRecords] = useState([])
  const [todayRecord, setTodayRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [now, setNow] = useState(new Date())
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false)
  const [cameraAction, setCameraAction] = useState(null)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [todayRes, historyRes] = await Promise.all([
        attendanceApi.getTodayStatus(),
        attendanceApi.getMyAttendance()
      ])
      setTodayRecord(todayRes.data.data)
      setRecords(historyRes.data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    let frameId
    const tick = () => { setNow(new Date()); frameId = requestAnimationFrame(tick) }
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
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
      await fetchData()
    } catch (err) {
      console.error(err)
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
      await fetchData()
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

  const columns = [
    { header: 'Date', accessor: 'date', render: (v) => <span className="font-medium">{formatDate(v)}</span> },
    { header: 'Check In', accessor: 'checkInTime', render: (v) => v ? new Date(v).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—' },
    { header: 'Check Out', accessor: 'checkOutTime', render: (v) => v ? new Date(v).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—' },
    { header: 'Working Hours', accessor: 'workingMinutes', render: (v) => v ? <span className="font-semibold text-slate-700 dark:text-slate-300">{`${Math.floor(v/60)}h ${v%60}m`}</span> : '—' },
    { header: 'Status', accessor: 'status', render: (v) => <Badge variant={v === 'PRESENT' ? 'success' : v === 'ABSENT' ? 'danger' : 'warning'}>{v}</Badge> },
    {
      header: '', accessor: '_id',
      render: (_, record) => (
        <button
          onClick={() => { setSelectedRecord(record); setIsDrawerOpen(true) }}
          className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium flex items-center justify-end w-full group"
        >
          Details <ChevronRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
        </button>
      )
    }
  ]

  return (
    <div className="animate-fade-in space-y-8 w-full pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-white">Attendance Dashboard</h1>
          </div>
        </div>
      </div>

      <div className="relative rounded-2xl overflow-hidden bg-slate-900 shadow-lg border border-slate-800/60 p-2.5 sm:px-4 sm:py-3.5 isolation-auto">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-48 h-48 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none"></div>
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
          <div className="flex-[1.2] w-full max-w-lg bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-2 sm:p-2.5 shadow-lg relative">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Present Days', value: records.filter(r => r.status === 'PRESENT').length, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { label: 'Absent Days', value: records.filter(r => r.status === 'ABSENT').length, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10' },
          { label: 'Leave Taken', value: records.filter(r => r.status === 'ON_LEAVE').length, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10' },
          { label: 'Total Hours', value: `${Math.floor(records.reduce((acc, r) => acc + (r.workingMinutes || 0), 0) / 60)}h`, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
        ].map((stat) => (
          <div key={stat.label} className="max-h-[90dvh] overflow-y-auto group relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full ${stat.bg} -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-500 ease-out`}></div>
            <div className="relative z-10">
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{stat.label}</p>
              <h3 className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg text-indigo-600 dark:text-indigo-400">
              <Calendar className="w-4 h-4" />
            </div>
            Attendance History
          </h2>
        </div>
        <div className="p-1">
          <DataTable columns={columns} data={records} isLoading={loading} searchable={false} emptyMessage="No attendance records found for this period." />
        </div>
      </div>

      <CameraVerificationModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onConfirm={handleCameraConfirm}
        locationRequired={true}
        title={cameraAction === 'check-in' ? 'Check In Verification' : 'Check Out Verification'}
      />
      <AttendanceDetailsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        record={selectedRecord}
      />
    </div>
  )
}
