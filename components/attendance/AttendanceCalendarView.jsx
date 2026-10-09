'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, AlertCircle } from 'lucide-react'
import { attendanceApi } from '@/services/attendanceApi'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const DAYS_HEADER = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

// Module-level client cache for instant calendar month navigation
const calendarMonthCache = new Map()

export function AttendanceCalendarView({ onSelectRecord }) {
  const today = useMemo(() => new Date(), [])
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1) // 1-12
  const [calendarData, setCalendarData] = useState(() => {
    const key = `${today.getFullYear()}-${today.getMonth() + 1}`
    return calendarMonthCache.get(key) || null
  })
  const [loading, setLoading] = useState(() => {
    const key = `${today.getFullYear()}-${today.getMonth() + 1}`
    return !calendarMonthCache.has(key)
  })
  const [error, setError] = useState(null)

  const fetchMonthCalendar = useCallback(async (m, y) => {
    const cacheKey = `${y}-${m}`
    const cached = calendarMonthCache.get(cacheKey)
    if (cached) {
      setCalendarData(cached)
      setLoading(false)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const res = await attendanceApi.getMyAttendanceCalendar({ month: m, year: y })
      const data = res.data?.data || null
      if (data) {
        calendarMonthCache.set(cacheKey, data)
        setCalendarData(data)
      }
    } catch (err) {
      console.error('Failed to load attendance calendar:', err)
      if (!calendarMonthCache.has(cacheKey)) {
        setError('Unable to load calendar data for this month.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMonthCalendar(currentMonth, currentYear)
  }, [currentMonth, currentYear, fetchMonthCalendar])

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12)
      setCurrentYear((prev) => prev - 1)
    } else {
      setCurrentMonth((prev) => prev - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1)
      setCurrentYear((prev) => prev + 1)
    } else {
      setCurrentMonth((prev) => prev + 1)
    }
  }

  const handleGoToday = () => {
    setCurrentYear(today.getFullYear())
    setCurrentMonth(today.getMonth() + 1)
  }

  // Calculate start day of week (0=SUN .. 6=SAT) for 1st day of month
  const firstDayOfWeek = useMemo(() => {
    return new Date(currentYear, currentMonth - 1, 1).getDay()
  }, [currentYear, currentMonth])

  // Map by dayNumber for fast O(1) lookup
  const daysByNumber = useMemo(() => {
    const map = new Map()
    const daysList = calendarData?.days || []
    daysList.forEach((d) => {
      map.set(d.dayNumber, d)
    })
    return map
  }, [calendarData])

  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth, 0).getDate()
  }, [currentYear, currentMonth])

  const isCurrentMonthActive = currentYear === today.getFullYear() && currentMonth === (today.getMonth() + 1)

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-7 shadow-sm overflow-hidden animate-fade-in">
      {/* Calendar Top Header: Month Navigation on Left, Legend on Right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {/* Navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevMonth}
            className="p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all shadow-2xs hover:scale-105 active:scale-95"
            title="Previous Month"
            aria-label="Previous Month"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight min-w-[170px] sm:min-w-[190px]">
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </h2>

          <button
            onClick={handleNextMonth}
            disabled={currentYear === today.getFullYear() && currentMonth === today.getMonth() + 1}
            className={`p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-2xs ${
              currentYear === today.getFullYear() && currentMonth === today.getMonth() + 1
                ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:scale-105 active:scale-95'
            }`}
            title="Next Month"
            aria-label="Next Month"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {!isCurrentMonthActive && (
            <button
              onClick={handleGoToday}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              Today
            </button>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-2xs"></span>
            <span>Present</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-2xs"></span>
            <span>Absent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-2xs"></span>
            <span>Half Day</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block shadow-2xs"></span>
            <span>Leave/Off</span>
          </div>
        </div>
      </div>

      {/* Weekday Header Columns */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-3 mb-2.5">
        {DAYS_HEADER.map((day) => (
          <div
            key={day}
            className="text-center font-bold text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-widest py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-20">
          <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-sm font-bold flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
          {/* Empty padding cells before day 1 */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="min-h-[105px] sm:min-h-[125px] rounded-2xl bg-slate-50/40 dark:bg-slate-900/20 border border-transparent pointer-events-none"
            />
          ))}

          {/* Actual days in month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1
            const dayData = daysByNumber.get(dayNum) || {
              dayNumber: dayNum,
              status: 'UPCOMING',
              isFuture: true,
            }

            const status = dayData.status
            const isPunchRecord = ['PRESENT', 'HALF_DAY', 'WFH'].includes(status) && (dayData.punchIn || dayData.checkInTime)
            const isAbsent = status === 'ABSENT'
            const isWeeklyOff = status === 'WEEKEND' || dayData.isWeeklyOff
            const isHoliday = status === 'HOLIDAY'
            const isLeave = status === 'ON_LEAVE'
            const isHalfDay = status === 'HALF_DAY'
            const isToday = dayData.isToday
            const isFuture = dayData.isFuture

            // Styling determination matching user mockup
            let cardBg = 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
            let numColor = 'text-slate-700 dark:text-slate-200'
            let badgeBg = ''
            let badgeText = dayData.badgeText || ''

            if (isWeeklyOff) {
              cardBg = 'bg-indigo-50/75 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/40'
              numColor = 'text-indigo-900 dark:text-indigo-200'
              badgeBg = 'bg-indigo-600 text-white'
              badgeText = 'WEEKLY OFF'
            } else if (isHoliday) {
              cardBg = 'bg-sky-50/75 dark:bg-sky-950/30 border-sky-100 dark:border-sky-900/40'
              numColor = 'text-sky-900 dark:text-sky-200'
              badgeBg = 'bg-sky-600 text-white'
              badgeText = 'HOLIDAY'
            } else if (isLeave) {
              cardBg = 'bg-purple-50/75 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900/40'
              numColor = 'text-purple-900 dark:text-purple-200'
              badgeBg = 'bg-purple-600 text-white'
              badgeText = 'LEAVE'
            } else if (isAbsent) {
              cardBg = 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/40'
              numColor = 'text-rose-900 dark:text-rose-200'
              badgeBg = 'bg-rose-500 text-white'
              badgeText = 'ABSENT'
            } else if (isHalfDay) {
              cardBg = 'bg-amber-50/75 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/40'
              numColor = 'text-amber-900 dark:text-amber-200'
              badgeBg = 'bg-amber-500 text-white'
              badgeText = 'HALF DAY'
            } else if (isPunchRecord) {
              cardBg = 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-800/40'
              numColor = 'text-emerald-900 dark:text-emerald-200'
              badgeBg = 'bg-emerald-600 text-white'
              badgeText = dayData.badgeText || 'ON TIME'
            } else if (isFuture) {
              cardBg = 'bg-white dark:bg-slate-900/60 border-slate-100 dark:border-slate-800/80'
              numColor = 'text-slate-400 dark:text-slate-500'
            }

            const canOpenDetails = !!dayData.checkInTime || !!dayData.workingMinutes

            return (
              <div
                key={`day-${dayNum}`}
                onClick={() => {
                  if (canOpenDetails && onSelectRecord) {
                    onSelectRecord(dayData)
                  }
                }}
                className={`min-h-[105px] sm:min-h-[125px] rounded-2xl p-2 sm:p-2.5 border flex flex-col justify-between items-center text-center transition-all duration-200 relative group ${cardBg} ${
                  isToday ? 'ring-2 ring-indigo-500 shadow-sm' : ''
                } ${canOpenDetails ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]' : ''}`}
              >
                {/* Day Number */}
                <div className="w-full flex justify-center items-center pt-0.5">
                  <span className={`text-xs sm:text-sm font-extrabold ${numColor}`}>
                    {dayNum}
                  </span>
                </div>

                {/* Status Badge */}
                <div className="my-auto py-1">
                  {badgeText ? (
                    <span
                      className={`inline-block text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-2xs whitespace-nowrap ${badgeBg}`}
                    >
                      {badgeText}
                    </span>
                  ) : null}
                </div>

                {/* Bottom punch times / notes */}
                <div className="w-full min-h-[30px] flex flex-col justify-end items-center">
                  {isPunchRecord ? (
                    <div className="text-[9px] sm:text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 leading-tight">
                      <div>In: {dayData.punchIn || '—'}</div>
                      <div>Out: {dayData.punchOut || (isToday ? 'Working...' : '—')}</div>
                    </div>
                  ) : isHalfDay && (dayData.punchIn || dayData.punchOut) ? (
                    <div className="text-[9px] sm:text-[10px] font-semibold text-amber-800 dark:text-amber-300 leading-tight">
                      <div>In: {dayData.punchIn || '—'}</div>
                      <div>Out: {dayData.punchOut || '—'}</div>
                    </div>
                  ) : isHoliday && dayData.holidayName ? (
                    <div className="text-[9px] sm:text-[10px] font-medium text-sky-800 dark:text-sky-300 truncate max-w-full px-1">
                      {dayData.holidayName}
                    </div>
                  ) : isLeave && dayData.leaveName ? (
                    <div className="text-[9px] sm:text-[10px] font-medium text-purple-800 dark:text-purple-300 truncate max-w-full px-1">
                      {dayData.leaveName}
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
